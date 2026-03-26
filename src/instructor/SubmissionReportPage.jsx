// Import React hooks
import { useEffect, useState } from 'react'

// Import React Router hooks
// useParams -> read values from URL
// useNavigate -> move to another page / go back
import { useNavigate, useParams } from 'react-router-dom'

// API function that gets the submission report from the backend
import { fetchSubmissionReport } from './api'

// Utility/helper functions
import {
  formatAnalysisStateLabel, // turns raw state into a user-friendly label
  getDisplayStudentName,    // decides how student name should appear
  getInitialPrivacyMode,    // gets saved privacy mode when page first loads
  getSimilarityBand,        // converts similarity score into a risk band
  normalizeAnalysisState,   // standardizes analysis state values
  persistPrivacyMode,       // saves privacy mode
} from './utils'

export default function SubmissionReportPage() {
  /*
    Get submissionId from the URL
    Example:
    /submission-report/25
    submissionId = 25
  */
  const { submissionId } = useParams()

  // Hook used for navigation, like going back
  const navigate = useNavigate()

  /*
    STATE VARIABLES
  */

  // Stores the full report returned by backend
  const [report, setReport] = useState(null)

  // Used to show loading state while waiting for API response
  const [loading, setLoading] = useState(true)

  // Stores any error message if the API call fails
  const [error, setError] = useState('')

  // Stores privacy mode: masked or revealed
  const [privacyMode, setPrivacyMode] = useState(getInitialPrivacyMode)

  /*
    Whenever privacyMode changes,
    save it so the setting is remembered
  */
  useEffect(() => {
    persistPrivacyMode(privacyMode)
  }, [privacyMode])

  /*
    Fetch report data when page loads
    or when submissionId changes
  */
  useEffect(() => {
    let ignore = false

    fetchSubmissionReport(submissionId)
      .then((data) => {
        if (!ignore) {
          setReport(data)
        }
      })
      .catch((nextError) => {
        if (!ignore) {
          console.error(nextError)
          setError(nextError.message || 'Failed to load report.')
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    // Cleanup function:
    // prevents state update if component unmounts before request finishes
    return () => {
      ignore = true
    }
  }, [submissionId])

  /*
    DERIVED VALUES
    These are values calculated from report data
  */

  // Example: similarity 85 -> High Risk
  const similarityBand = getSimilarityBand(report?.similarityScore ?? 0)

  // Makes sure analysis state is in a clean expected format
  const analysisState = normalizeAnalysisState(report?.analysisState)

  /*
    Student name may be masked or revealed depending on privacy mode
    If report is not loaded yet, use empty string
  */
  const displayStudentName = report
    ? getDisplayStudentName(report.studentName, report.id, privacyMode)
    : ''

  /*
    UI
  */
  return (
    <div className="dashboard instructor-shell">
      {/* Top header card */}
      <div className="teacherCard">
        <div className="teacherSectionHeaderInline">
          <h2>Submission Report</h2>

          <div className="teacherHeroActions">
            {/* Privacy mode toggle */}
            <div className="modeSwitch">
              <button
                className={privacyMode === 'masked' ? 'modeBtn active' : 'modeBtn'}
                onClick={() => setPrivacyMode('masked')}
              >
                Masked
              </button>

              <button
                className={privacyMode === 'revealed' ? 'modeBtn active' : 'modeBtn'}
                onClick={() => setPrivacyMode('revealed')}
              >
                Reveal
              </button>
            </div>

            {/* Back button */}
            <button
              className="teacherButton teacherButtonSecondary"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Show loading message while report is being fetched */}
      {loading && (
        <div className="teacherCard teacherEmptyState">
          Loading report...
        </div>
      )}

      {/* Show error if fetch failed */}
      {!loading && error && (
        <div className="teacherCard teacherEmptyState">
          {error}
        </div>
      )}

      {/* Main content: only show when loading is done, no error, and report exists */}
      {!loading && !error && report && (
        <>
          {/* Top statistics section */}
          <div className="teacherStatGrid">
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Student</p>
              <h3 className="teacherStatValue">{displayStudentName}</h3>
            </div>

            <div className="teacherStatCard">
              <p className="teacherStatLabel">Assignment</p>
              <h3 className="teacherStatValue">{report.assignmentName}</h3>
            </div>

            <div className="teacherStatCard">
              <p className="teacherStatLabel">Analysis State</p>
              <h3 className="teacherStatValue">
                {formatAnalysisStateLabel(analysisState)}
              </h3>
            </div>

            <div className="teacherStatCard">
              <p className="teacherStatLabel">Risk Band</p>
              <h3 className="teacherStatValue">{similarityBand.label}</h3>
            </div>
          </div>

          {/* If analysis is not finished, show a message */}
          {analysisState !== 'complete' && (
            <div className="teacherCard teacherEmptyState">
              {analysisState === 'processing'
                ? 'This submission is still being analyzed.'
                : analysisState === 'failed'
                  ? 'The stored review failed for this submission.'
                  : 'No stored comparison results are available for this submission yet.'}
            </div>
          )}

          {/* Main layout */}
          <div className="teacherDashboardGrid">
            {/* Left/main column */}
            <div className="teacherMainColumn">
              {/* Engine summary card */}
              <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Engine Summary</h3>

                  {/* Risk label badge */}
                  <span className={`riskPill risk-${similarityBand.tone}`}>
                    {similarityBand.label}
                  </span>
                </div>

                <p>
                  {analysisState === 'complete'
                    ? report.summary || 'No summary available.'
                    : 'Detailed analysis summary will appear here once stored comparison data exists.'}
                </p>
              </div>

              {/* Matched segments card */}
              <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Matched Segments</h3>
                  <span className="teacherSectionMeta">
                    {report.matches?.length ?? 0} source match(es)
                  </span>
                </div>

                {/* If analysis is incomplete */}
                {analysisState !== 'complete' ? (
                  <div className="teacherEmptyInline">
                    Matched sections are unavailable until a comparison result is stored.
                  </div>

                /* If analysis is complete but no matches exist */
                ) : !report.matches || report.matches.length === 0 ? (
                  <div className="teacherEmptyInline">No matches found.</div>

                /* If matches exist */
                ) : (
                  <div className="priorityList">
                    {report.matches.map((match, index) => (
                      <div className="priorityItem" key={index}>
                        <div>
                          {/* Source that matched */}
                          <p className="priorityTitle">{match.sourceLabel}</p>

                          {/* Why it matched / explanation */}
                          <p className="priorityMeta">{match.reason}</p>
                        </div>

                        {/* Match score */}
                        <div className="priorityScore">{match.score}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right/side column */}
            <div className="teacherSideColumn">
              <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Metadata</h3>
                </div>

                {/* Details list */}
                <div className="detailsStack">
                  <div className="detailRow">
                    <span>Submission ID</span>
                    <strong>{report.id}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Student Label</span>
                    <strong>{displayStudentName}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Language</span>
                    <strong>{report.language}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Submitted At</span>
                    <strong>{report.submittedAt}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Analysis State</span>
                    <strong>{formatAnalysisStateLabel(analysisState)}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Review Status</span>
                    <strong>{report.status || 'Pending Review'}</strong>
                  </div>

                  <div className="detailRow">
                    <span>Engine Version</span>
                    <strong>{report.engineVersion || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}