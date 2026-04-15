import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  compactOpaqueIdentifier,
  formatAnalysisStateLabel,
  getDisplayStudentName,
  normalizeAnalysisState,
} from './utils'

export default function ReviewQueuePanel({
  selectedCourse,
  submissions,
  loading,
  error,
  selectedAssignmentRunId,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [languageFilter, setLanguageFilter] = useState('All')
  const [sortBy, setSortBy] = useState('similarity')
  const [selectedId, setSelectedId] = useState(null)
  const navigate = useNavigate()

  const scopedSubmissions = useMemo(() => {
    if (!selectedCourse) return []

    return submissions
      .filter((item) => {
        if (!selectedAssignmentRunId || selectedAssignmentRunId === 'all') {
          return true
        }

        return String(item.assignmentRunId || '') === String(selectedAssignmentRunId)
      })
      .map((item) => ({
        ...item,
        analysisState: normalizeAnalysisState(item.analysisState),
        displayStudentName: getDisplayStudentName(item.studentName, item.id),
        fullStudentName: String(item.studentName || '').trim() || `Student ${item.id}`,
        submissionReference: item.publicId || `#${item.id}`,
        compactSubmissionReference: compactOpaqueIdentifier(item.publicId || `#${item.id}`),
        repositoryLabel: item.repositoryLabel || 'Course Repository',
      }))
  }, [selectedAssignmentRunId, selectedCourse, submissions])

  const availableLanguages = useMemo(() => {
    const uniqueLanguages = Array.from(
      new Set(scopedSubmissions.map((item) => item.language).filter(Boolean))
    )
    return uniqueLanguages.sort()
  }, [scopedSubmissions])

  const filteredSubmissions = useMemo(() => {
    let results = [...scopedSubmissions]

    if (search.trim()) {
      const query = search.toLowerCase()
      results = results.filter((item) =>
        item.displayStudentName.toLowerCase().includes(query) ||
        item.assignmentName?.toLowerCase().includes(query) ||
        item.language?.toLowerCase().includes(query) ||
        item.repositoryLabel?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'All') {
      results = results.filter((item) => item.status === statusFilter)
    }

    if (languageFilter !== 'All') {
      results = results.filter((item) => item.language === languageFilter)
    }

    results.sort((left, right) => {
      if (sortBy === 'similarity') return (right.similarityScore ?? 0) - (left.similarityScore ?? 0)
      if (sortBy === 'student') {
        return (left.displayStudentName ?? '').localeCompare(right.displayStudentName ?? '')
      }
      if (sortBy === 'assignment') {
        return (left.assignmentName ?? '').localeCompare(right.assignmentName ?? '')
      }
      return 0
    })

    return results
  }, [languageFilter, scopedSubmissions, search, sortBy, statusFilter])

  const effectiveSelectedId = filteredSubmissions.some((item) => item.id === selectedId)
    ? selectedId
    : (filteredSubmissions[0]?.id ?? null)

  const selectedSubmission =
    filteredSubmissions.find((item) => item.id === effectiveSelectedId) ?? null

  const handleExportQueue = () => {
    const exportRows = filteredSubmissions.map((item) => ({
      ...item,
      studentName: item.displayStudentName,
    }))

    const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = selectedCourse
      ? `${selectedCourse.course_name.replace(/\s+/g, '-').toLowerCase()}-review-queue.json`
      : 'review-queue.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleOpenReport = () => {
    if (!selectedSubmission) return
    if (normalizeAnalysisState(selectedSubmission.analysisState) !== 'complete') return
    navigate(`/report/${selectedSubmission.id}`)
  }

  return (
    <div className="teacherPageShell">
      <div className="teacherHero teacherCard">
        <div>
          <p className="teacherEyebrow">Review Queue</p>
          <h2 className="teacherHeroTitle">Submission screening workspace</h2>
          <p className="teacherHeroText">
            Review recent submissions, filter flagged work, and inspect likely integrity concerns.
          </p>
        </div>
        <div className="teacherHeroActions">
          <button className="teacherButton teacherButtonSecondary" onClick={handleExportQueue}>
            Export Queue
          </button>
          <button
            className="teacherButton teacherButtonPrimary"
            onClick={handleOpenReport}
            disabled={
              !selectedSubmission || normalizeAnalysisState(selectedSubmission.analysisState) !== 'complete'
            }
          >
            Open Report
          </button>
        </div>
      </div>

      {!selectedCourse && (
        <div className="teacherCard teacherEmptyState">
          Select a course from the workspace controls to review submissions for that course.
        </div>
      )}

      {selectedCourse && loading && (
        <div className="teacherCard teacherEmptyState">Loading review queue...</div>
      )}

      {selectedCourse && !loading && error && (
        <div className="teacherCard teacherEmptyState">{error}</div>
      )}

      {selectedCourse && !loading && !error && (
        <div className="teacherDashboardGrid">
          <div className="teacherMainColumn">
            <div className="teacherCard">
              <div className="teacherSectionHeader">
                <div>
                  <h3>Filters</h3>
                  <p className="teacherSectionMeta">
                    Narrow the queue by student label, language, or review status.
                  </p>
                </div>
              </div>

              <div className="toolbarGrid">
                <div className="toolbarField toolbarFieldWide">
                  <label>Search</label>
                  <input
                    className="teacherInput"
                    type="text"
                    placeholder="Search by student label, assignment, language, or course repository"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="toolbarField">
                  <label>Status</label>
                  <select
                    className="teacherSelect"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option>All</option>
                    <option>Pending Review</option>
                    <option>Clear</option>
                    <option>Needs Review</option>
                    <option>Flagged</option>
                  </select>
                </div>

                <div className="toolbarField">
                  <label>Language</label>
                  <select
                    className="teacherSelect"
                    value={languageFilter}
                    onChange={(event) => setLanguageFilter(event.target.value)}
                  >
                    <option>All</option>
                    {availableLanguages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="toolbarField">
                  <label>Sort By</label>
                  <select
                    className="teacherSelect"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    <option value="similarity">Similarity</option>
                    <option value="student">Student</option>
                    <option value="assignment">Assignment</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="teacherCard">
              <div className="teacherSectionHeaderInline">
                <h3>Submission Queue</h3>
                <span className="teacherSectionMeta">{filteredSubmissions.length} item(s)</span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="teacherEmptyInline">
                  No submissions matched the current filters.
                </div>
              ) : (
                <div className="reviewTableWrap">
                    <table className="reviewTable">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Assignment</th>
                          <th>Course Repository</th>
                          <th>Language</th>
                          <th>Similarity</th>
                          <th>Analysis</th>
                          <th>Review</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.map((item) => (
                          <tr
                            key={item.id}
                            className={selectedSubmission?.id === item.id ? 'reviewRowActive' : ''}
                            onClick={() => setSelectedId(item.id)}
                          >
                            <td>
                              <div
                                className="submissionPrimary reviewLongLabel"
                                title={item.fullStudentName}
                              >
                                {item.displayStudentName}
                              </div>
                            </td>
                            <td>
                              <div className="submissionSecondary">{item.assignmentName}</div>
                            </td>
                            <td>{item.repositoryLabel}</td>
                            <td>{item.language}</td>
                            <td>
                              <span className="similarityPill">
                                {item.similarityScore ?? '--'}
                                {item.similarityScore !== null && item.similarityScore !== undefined
                                  ? '%'
                                  : ''}
                              </span>
                            </td>
                            <td>
                              <span className={`statusBadge status-${normalizeAnalysisState(item.analysisState)}`}>
                                {formatAnalysisStateLabel(item.analysisState)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`statusBadge status-${String(item.status || 'Pending Review')
                                  .toLowerCase()
                                  .replace(/\s+/g, '-')}`}
                              >
                                {item.status || 'Pending Review'}
                              </span>
                            </td>
                            <td>{item.submittedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              )}
            </div>
          </div>

          <div className="teacherSideColumn">
            <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Selected Submission</h3>
                  <span
                    className="teacherSectionMeta selectedSubmissionMeta"
                    title={selectedSubmission?.submissionReference || ''}
                  >
                  {selectedSubmission
                    ? selectedSubmission.compactSubmissionReference
                    : 'None'}
                </span>
              </div>

              {!selectedSubmission ? (
                <div className="teacherEmptyInline">Select a submission to inspect details.</div>
              ) : (
                <div className="detailsStack">
                  <div className="detailRow">
                    <span>Submission ID</span>
                    <strong
                      className="detailValueBreak"
                      title={selectedSubmission.submissionReference}
                    >
                      {selectedSubmission.submissionReference}
                    </strong>
                  </div>
                  <div className="detailRow">
                    <span>Student</span>
                    <strong
                      className="detailValueBreak"
                      title={selectedSubmission.fullStudentName}
                    >
                      {selectedSubmission.displayStudentName}
                    </strong>
                  </div>
                  <div className="detailRow">
                    <span>Assignment</span>
                    <strong>{selectedSubmission.assignmentName}</strong>
                  </div>
                  <div className="detailRow">
                    <span>Course Repository</span>
                    <strong>{selectedSubmission.repositoryLabel}</strong>
                  </div>
                  <div className="detailRow">
                    <span>Language</span>
                    <strong>{selectedSubmission.language}</strong>
                  </div>
                  <div className="detailRow">
                    <span>Analysis State</span>
                    <strong>{formatAnalysisStateLabel(selectedSubmission.analysisState)}</strong>
                  </div>
                  <div className="detailRow">
                    <span>Similarity</span>
                    <strong>
                      {selectedSubmission.similarityScore ?? '--'}
                      {selectedSubmission.similarityScore !== null &&
                      selectedSubmission.similarityScore !== undefined
                        ? '%'
                        : ''}
                    </strong>
                  </div>
                  <div className="detailRow">
                    <span>Review Status</span>
                    <strong>{selectedSubmission.status || 'Pending Review'}</strong>
                  </div>
                  <div className="detailRow">
                    <span>Submitted</span>
                    <strong>{selectedSubmission.submittedAt}</strong>
                  </div>
                  <div className="detailRow detailRowBlock">
                    <span>Detection Notes</span>
                    <p>{selectedSubmission.excerpt || 'No notes provided by the engine.'}</p>
                  </div>

                  <div className="selectedActions">
                    <button
                      className="teacherButton teacherButtonPrimary"
                      onClick={() => navigate(`/report/${selectedSubmission.id}`)}
                      disabled={normalizeAnalysisState(selectedSubmission.analysisState) !== 'complete'}
                    >
                      Open Full Report
                    </button>

                    <button
                      className="teacherButton teacherButtonSecondary"
                      onClick={() => navigate(`/compare/${selectedSubmission.id}`)}
                      disabled={normalizeAnalysisState(selectedSubmission.analysisState) !== 'complete'}
                    >
                      Compare Sources
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
