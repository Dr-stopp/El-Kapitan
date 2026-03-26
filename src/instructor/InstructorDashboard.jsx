import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/useAuth'
import {
  createInstructorAssignment,
  deleteInstructorAssignment,
  fetchAnalytics,
  fetchInstructorAssignments,
  fetchInstructorCourses,
  fetchReviewQueue,
  updateInstructorAssignment,
} from './api'
import AnalyticsPanel from './AnalyticsPanel'
import ReviewQueuePanel from './ReviewQueuePanel'
import {
  formatDueDate,
  getInitialPrivacyMode,
  persistPrivacyMode,
  REPOSITORY_SCOPE_OPTIONS,
} from './utils'

function sortAssignments(assignments) {
  return [...assignments].sort(
    (left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime()
  )
}

function getNextDueLabel(assignments) {
  const nextDue = [...assignments]
    .sort((left, right) => new Date(left.due_date) - new Date(right.due_date))
    .find((item) => new Date(item.due_date).getTime() > Date.now())

  return nextDue ? formatDueDate(nextDue.due_date) : 'No upcoming due date'
}

function getLanguageBreakdown(assignments) {
  const counts = assignments.reduce((accumulator, item) => {
    const key = item.language || 'Unknown'
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})

  const topLanguage = Object.entries(counts).sort((left, right) => right[1] - left[1])[0]
  return topLanguage ? `${topLanguage[0]} (${topLanguage[1]})` : 'No assignments'
}

export default function InstructorDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [formName, setFormName] = useState('')
  const [formLanguage, setFormLanguage] = useState('Java')
  const [formTopK, setFormTopK] = useState('3')
  const [formThreshold, setFormThreshold] = useState('70')
  const [formDueDate, setFormDueDate] = useState('')
  const [formDueTime, setFormDueTime] = useState('')
  const [activeTab, setActiveTab] = useState('assignments')
  const [submissions, setSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsError, setSubmissionsError] = useState('')
  const [analytics, setAnalytics] = useState({
    metrics: null,
    priorityCases: [],
    languageCounts: [],
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [privacyMode, setPrivacyMode] = useState(getInitialPrivacyMode)
  const [selectedRepositories, setSelectedRepositories] = useState(['current'])

  useEffect(() => {
    persistPrivacyMode(privacyMode)
  }, [privacyMode])

  useEffect(() => {
    let ignore = false

    fetchInstructorCourses(user?.id)
      .then((data) => {
        if (!ignore) {
          setCourses(data)
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error(error)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!selectedCourse) return

    let ignore = false

    fetchInstructorAssignments(selectedCourse.course_id)
      .then((data) => {
        if (!ignore) {
          setAssignments(sortAssignments(data))
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error(error)
          setAssignments([])
        }
      })
      .finally(() => {
        if (!ignore) {
          setAssignmentsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedCourse) return

    let ignore = false

    fetchReviewQueue(selectedCourse.course_id)
      .then((data) => {
        if (!ignore) {
          setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error(error)
          setSubmissionsError(error.message || 'Failed to load review queue.')
          setSubmissions([])
        }
      })
      .finally(() => {
        if (!ignore) {
          setSubmissionsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedCourse])

  useEffect(() => {
    if (!selectedCourse) return

    let ignore = false

    fetchAnalytics(selectedCourse.course_id)
      .then((data) => {
        if (!ignore) {
          setAnalytics({
            metrics: data.metrics ?? null,
            priorityCases: Array.isArray(data.priorityCases) ? data.priorityCases : [],
            languageCounts: Array.isArray(data.languageCounts) ? data.languageCounts : [],
          })
        }
      })
      .catch((error) => {
        if (!ignore) {
          console.error(error)
          setAnalyticsError(error.message || 'Failed to load analytics.')
          setAnalytics({
            metrics: null,
            priorityCases: [],
            languageCounts: [],
          })
        }
      })
      .finally(() => {
        if (!ignore) {
          setAnalyticsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedCourse])

  const handleCourseSelection = (course) => {
    setSelectedCourse(course)
    setEditingAssignment(null)
    setAssignmentsLoading(Boolean(course))
    setSubmissionsLoading(Boolean(course))
    setAnalyticsLoading(Boolean(course))
    setSubmissionsError('')
    setAnalyticsError('')

    if (!course) {
      setAssignments([])
      setSubmissions([])
      setAnalytics({
        metrics: null,
        priorityCases: [],
        languageCounts: [],
      })
    }
  }

  const resetAssignmentForm = () => {
    setFormName('')
    setFormLanguage('Java')
    setFormTopK('3')
    setFormThreshold('70')
    setFormDueDate('')
    setFormDueTime('')
  }

  const openCreateAssignmentForm = () => {
    setEditingAssignment('create')
    resetAssignmentForm()
  }

  const openEditAssignmentForm = (assignment) => {
    setEditingAssignment(assignment)
    setFormName(assignment.name)
    setFormLanguage(assignment.language)
    setFormTopK(String(assignment.top_k))
    setFormThreshold(String(assignment.threshold))

    const dueDate = new Date(assignment.due_date)
    setFormDueDate(dueDate.toISOString().slice(0, 10))
    setFormDueTime(dueDate.toISOString().slice(11, 16))
  }

  const handleCourseSelectChange = (event) => {
    const nextCourse =
      courses.find((course) => String(course.course_id) === event.target.value) ?? null
    handleCourseSelection(nextCourse)
  }

  const handleToggleRepositoryScope = (scopeId) => {
    setSelectedRepositories((previous) => {
      const exists = previous.includes(scopeId)
      if (exists) {
        return previous.length === 1 ? previous : previous.filter((item) => item !== scopeId)
      }

      return [...previous, scopeId]
    })
  }

  const handleFormSubmit = async () => {
    if (!formName || !formDueDate || !formDueTime || !selectedCourse) {
      window.alert('Please fill in the assignment name, due date, and due time.')
      return
    }

    const due_date = `${formDueDate}T${formDueTime}:00Z`
    const top_k = Number(formTopK)
    const threshold = Number(formThreshold)

    try {
      if (editingAssignment === 'create') {
        const createdAssignment = await createInstructorAssignment({
          courseId: selectedCourse.course_id,
          name: formName,
          language: formLanguage,
          due_date,
          top_k,
          threshold,
        })

        setAssignments((previous) => sortAssignments([...previous, createdAssignment]))
      } else {
        const updatedAssignment = await updateInstructorAssignment({
          assignmentRunId: editingAssignment.assignment_run_id,
          assignId: editingAssignment.assign_id,
          courseId: selectedCourse.course_id,
          name: formName,
          language: formLanguage,
          due_date,
          top_k,
          threshold,
        })

        setAssignments((previous) =>
          sortAssignments(
            previous.map((item) =>
              item.assignment_run_id === updatedAssignment.assignment_run_id
                ? updatedAssignment
                : item
            )
          )
        )
      }

      setEditingAssignment(null)
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to save assignment.')
    }
  }

  const handleDeleteAssignment = async (assignmentRunId) => {
    const confirmed = window.confirm('Are you sure you want to delete this assignment run?')
    if (!confirmed) return

    try {
      await deleteInstructorAssignment({
        assignmentRunId,
        courseId: selectedCourse?.course_id,
      })
      setAssignments((previous) =>
        previous.filter((item) => item.assignment_run_id !== assignmentRunId)
      )
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to delete assignment.')
    }
  }

  const assignmentStats = useMemo(
    () => ({
      total: assignments.length,
      uniqueAssignments: new Set(assignments.map((item) => item.assign_id)).size,
      nextDue: getNextDueLabel(assignments),
      topLanguage: getLanguageBreakdown(assignments),
    }),
    [assignments]
  )

  return (
    <div className="dashboard instructor-shell">
      <div className="instructor-header">
        <div>
          <h1 className="instructor-title">Instructor Workspace</h1>
          <p className="instructor-subtitle">
            Manage course offerings, review stored submission results, and inspect detailed
            comparison data from the EL Kapitan instructor flow.
          </p>
          {user?.firstName && (
            <p className="teacherSectionMeta">Signed in as {user.firstName} {user.lastName}</p>
          )}
        </div>
      </div>

      <div className="instructor-tabs">
        <button
          className={activeTab === 'assignments' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>
        <button
          className={activeTab === 'review' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('review')}
        >
          Review Queue
        </button>
        <button
          className={activeTab === 'analytics' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      <div className="teacherCard workspaceControlCard">
        <div className="workspaceControlGrid">
          <div className="toolbarField">
            <label>Active Course</label>
            <select
              className="teacherSelect"
              value={selectedCourse?.course_id ?? ''}
              onChange={handleCourseSelectChange}
              disabled={loading}
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbarField">
            <label>Privacy Mode</label>
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
          </div>
        </div>

        <div className="scopeSection">
          <div>
            <p className="teacherEyebrow scopeEyebrow">Analysis Scope</p>
            <p className="teacherSectionMeta">
              Choose which repositories the instructor client should include in view filters.
            </p>
          </div>

          <div className="scopeChipGrid">
            {REPOSITORY_SCOPE_OPTIONS.map((option) => {
              const active = selectedRepositories.includes(option.id)
              return (
                <button
                  key={option.id}
                  className={active ? 'scopeChip active' : 'scopeChip'}
                  onClick={() => handleToggleRepositoryScope(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.note}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {activeTab === 'assignments' && (
        <>
          <div className="breadcrumb">
            <span
              className={!selectedCourse ? 'breadcrumb-current' : 'breadcrumb-link'}
              onClick={() => handleCourseSelection(null)}
            >
              Courses
            </span>

            {selectedCourse && (
              <>
                <span className="breadcrumb-separator">-&gt;</span>
                <span
                  className={!editingAssignment ? 'breadcrumb-current' : 'breadcrumb-link'}
                  onClick={() => setEditingAssignment(null)}
                >
                  {selectedCourse.course_name}
                </span>
              </>
            )}

            {editingAssignment && (
              <>
                <span className="breadcrumb-separator">-&gt;</span>
                <span className="breadcrumb-current">
                  {editingAssignment === 'create' ? 'New Assignment Run' : 'Edit Assignment Run'}
                </span>
              </>
            )}
          </div>

          {!selectedCourse && (
            <div className="course-list">
              {loading ? (
                <p>Loading courses...</p>
              ) : (
                courses.map((course) => (
                  <button
                    type="button"
                    className="course-card"
                    key={course.course_id}
                    onClick={() => handleCourseSelection(course)}
                  >
                    <h2>{course.course_name}</h2>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedCourse && !editingAssignment && (
            <>
              <div className="teacherStatGrid offeringStatsGrid">
                <div className="teacherStatCard">
                  <p className="teacherStatLabel">Assignment Runs</p>
                  <h3 className="teacherStatValue">{assignmentStats.total}</h3>
                  <p className="teacherStatNote">Current rows loaded from assignment_runs</p>
                </div>
                <div className="teacherStatCard">
                  <p className="teacherStatLabel">Unique Assignments</p>
                  <h3 className="teacherStatValue">{assignmentStats.uniqueAssignments}</h3>
                  <p className="teacherStatNote">Distinct assign_id values in this course</p>
                </div>
                <div className="teacherStatCard">
                  <p className="teacherStatLabel">Top Language</p>
                  <h3 className="teacherStatValue offeringStatValueSmall">
                    {assignmentStats.topLanguage}
                  </h3>
                  <p className="teacherStatNote">Most common language across current runs</p>
                </div>
                <div className="teacherStatCard">
                  <p className="teacherStatLabel">Next Due</p>
                  <h3 className="teacherStatValue offeringStatValueSmall">
                    {assignmentStats.nextDue}
                  </h3>
                  <p className="teacherStatNote">Closest upcoming assignment deadline</p>
                </div>
              </div>

              <div className="assignment-list">
                <button className="btn-new-assignment" onClick={openCreateAssignmentForm}>
                  + New Assignment Run
                </button>

                {assignmentsLoading ? (
                  <p>Loading assignments...</p>
                ) : (
                  assignments.map((item, index) => (
                    <div
                      className="assignment-card assignment-offering-card"
                      key={item.assignment_run_id}
                    >
                      <div className="assignment-card-left">
                        <p className="assignment-number">Assignment {index + 1}</p>
                        <h2 className="assignment-name">{item.name}</h2>
                        <p className="assignment-due">Due: {formatDueDate(item.due_date)}</p>
                        <p className="assignment-preview">{item.description}</p>
                      </div>

                      <div className="assignment-card-right">
                        <span className="status-visible">{item.language}</span>
                        <span className="status-hidden">
                          Top K {item.top_k} | Threshold {item.threshold}%
                        </span>

                        <button className="btn-edit" onClick={() => openEditAssignmentForm(item)}>
                          Edit
                        </button>

                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteAssignment(item.assignment_run_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {selectedCourse && editingAssignment && (
            <div className="assignment-form-shell teacherCard">
              <div className="teacherSectionHeaderInline">
                <h3>
                  {editingAssignment === 'create'
                    ? 'Create assignment run'
                    : 'Edit assignment run'}
                </h3>
                <span className="teacherSectionMeta">
                  Assignment rows are stored in assignments and assignment_runs.
                </span>
              </div>

              <div className="assignment-form">
                <div className="form-group">
                  <label className="form-label">Assignment Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter assignment name"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select
                      className="form-input"
                      value={formLanguage}
                      onChange={(event) => setFormLanguage(event.target.value)}
                    >
                      <option value="Java">Java</option>
                      <option value="C">C</option>
                      <option value="C++">C++</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Top K</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={formTopK}
                      onChange={(event) => setFormTopK(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Threshold</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      max="100"
                      value={formThreshold}
                      onChange={(event) => setFormThreshold(event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={formDueDate}
                      onChange={(event) => setFormDueDate(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input
                      className="form-input"
                      type="time"
                      value={formDueTime}
                      onChange={(event) => setFormDueTime(event.target.value)}
                    />
                  </div>
                </div>

                <button className="btn-form-submit" onClick={handleFormSubmit}>
                  {editingAssignment === 'create' ? 'Create Assignment Run' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'review' && (
        <ReviewQueuePanel
          selectedCourse={selectedCourse}
          assignments={assignments}
          submissions={submissions}
          loading={submissionsLoading}
          error={submissionsError}
          privacyMode={privacyMode}
          selectedRepositories={selectedRepositories}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPanel
          selectedCourse={selectedCourse}
          assignments={assignments}
          metrics={analytics.metrics}
          priorityCases={analytics.priorityCases}
          languageCounts={analytics.languageCounts}
          loading={analyticsLoading}
          error={analyticsError}
          selectedRepositories={selectedRepositories}
        />
      )}
    </div>
  )
}
