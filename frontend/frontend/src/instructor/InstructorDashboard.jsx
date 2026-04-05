import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  UPLOAD_OPTIONS,
  uploadInstructorSourceAsset,
  validateSubmissionFile,
} from '../lib/submissionUpload'
import { generateAssignmentResult } from '../lib/analysisApi'
import {
  buildAssignmentExportZip,
  createInstructorCourse,
  createInstructorAssignment,
  deleteInstructorAssignment,
  deleteInstructorCourse,
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
  formatShortTimestamp,
  getInitialPrivacyMode,
  persistPrivacyMode,
} from './utils'

function sortAssignments(assignments) {
  return [...assignments].sort(
    (left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime()
  )
}

function sortCourses(courses) {
  return [...courses].sort((left, right) =>
    String(left.course_name || '').localeCompare(String(right.course_name || ''))
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

const VALID_TABS = new Set(['assignments', 'review', 'analytics'])

export default function InstructorDashboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const pendingCourseIdRef = useRef(searchParams.get('courseId'))
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [formName, setFormName] = useState('')
  const [formLanguage, setFormLanguage] = useState('java')
  const [formTopK, setFormTopK] = useState('3')
  const [formThreshold, setFormThreshold] = useState('70')
  const [formDueDate, setFormDueDate] = useState('')
  const [formDueTime, setFormDueTime] = useState('')
  const [uploadingAssignment, setUploadingAssignment] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [exportingAssignmentId, setExportingAssignmentId] = useState(null)
  const [generatingAssignmentId, setGeneratingAssignmentId] = useState('')
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return VALID_TABS.has(tabParam) ? tabParam : 'assignments'
  })
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

  useEffect(() => {
    persistPrivacyMode(privacyMode)
  }, [privacyMode])

  useEffect(() => {
    let ignore = false

    fetchInstructorCourses(user)
      .then((data) => {
        if (!ignore) {
          setCourses(sortCourses(data))
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
  }, [user])

  useEffect(() => {
    if (!pendingCourseIdRef.current || courses.length === 0) return
    const targetId = pendingCourseIdRef.current
    pendingCourseIdRef.current = null
    const match = courses.find((c) => String(c.course_id) === targetId)
    if (match) handleCourseSelection(match)
  }, [courses])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedCourse?.course_id) {
      params.set('courseId', String(selectedCourse.course_id))
    }
    if (activeTab && activeTab !== 'assignments') {
      params.set('tab', activeTab)
    }
    setSearchParams(params, { replace: true })
  }, [selectedCourse, activeTab, setSearchParams])

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
    setEditingCourse(null)
    setEditingAssignment(null)
    setUploadingAssignment(null)
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
    setFormLanguage('java')
    setFormTopK('3')
    setFormThreshold('70')
    setFormDueDate('')
    setFormDueTime('')
  }

  const openCreateAssignmentForm = () => {
    setEditingAssignment('create')
    setUploadingAssignment(null)
    resetAssignmentForm()
  }

  const openCreateCourseForm = () => {
    setSelectedCourse(null)
    setEditingAssignment(null)
    setUploadingAssignment(null)
    setEditingCourse('create')
    setCourseName('')
    setAssignments([])
  }

  const openEditAssignmentForm = (assignment) => {
    setEditingAssignment(assignment)
    setUploadingAssignment(null)
    setFormName(assignment.name)
    setFormLanguage(assignment.language)
    setFormTopK(String(assignment.top_k))
    setFormThreshold(String(assignment.threshold))

    const dueDate = new Date(assignment.due_date)
    setFormDueDate(dueDate.toISOString().slice(0, 10))
    setFormDueTime(dueDate.toISOString().slice(11, 16))
  }

  const resetRepositoryUploadForm = () => {
    setUploadFile(null)
    setUploadError('')
    setUploadSuccess('')
  }

  const openRepositoryUploadForm = (assignment) => {
    setEditingAssignment(null)
    setUploadingAssignment(assignment)
    resetRepositoryUploadForm()
  }

  const closeRepositoryUploadForm = () => {
    setUploadingAssignment(null)
    resetRepositoryUploadForm()
  }

  const handleRepositoryFileChange = (nextFile) => {
    const nextError = validateSubmissionFile(nextFile, 'repository')

    if (nextError) {
      setUploadError(nextError)
      setUploadFile(null)
      return
    }

    setUploadError('')
    setUploadSuccess('')
    setUploadFile(nextFile)
  }

  const handleCourseSelectChange = (event) => {
    const nextCourse =
      courses.find((course) => String(course.course_id) === event.target.value) ?? null
    handleCourseSelection(nextCourse)
  }

  const handleCourseFormSubmit = async () => {
    if (!courseName.trim()) {
      window.alert('Please enter a course name.')
      return
    }

    if (!user?.email) {
      window.alert('Unable to determine the signed-in instructor.')
      return
    }

    try {
      const createdCourse = await createInstructorCourse({
        courseName,
        instructor: user,
      })

      setCourses((previous) => sortCourses([...previous, createdCourse]))
      setCourseName('')
      handleCourseSelection(createdCourse)
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to create course.')
    }
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

  const refreshSubmissionData = (courseId) => {
    setSubmissionsLoading(true)
    setSubmissionsError('')

    fetchReviewQueue(courseId)
      .then((data) => {
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
      })
      .catch((error) => {
        console.error(error)
        setSubmissionsError(error.message || 'Failed to load review queue.')
        setSubmissions([])
      })
      .finally(() => {
        setSubmissionsLoading(false)
      })
  }

  const refreshAssignmentData = (courseId) => {
    setAssignmentsLoading(true)

    fetchInstructorAssignments(courseId)
      .then((data) => {
        setAssignments(sortAssignments(data))
      })
      .catch((error) => {
        console.error(error)
        setAssignments([])
      })
      .finally(() => {
        setAssignmentsLoading(false)
      })
  }

  const refreshAnalyticsData = (courseId) => {
    setAnalyticsLoading(true)
    setAnalyticsError('')

    fetchAnalytics(courseId)
      .then((data) => {
        setAnalytics({
          metrics: data.metrics ?? null,
          priorityCases: Array.isArray(data.priorityCases) ? data.priorityCases : [],
          languageCounts: Array.isArray(data.languageCounts) ? data.languageCounts : [],
        })
      })
      .catch((error) => {
        console.error(error)
        setAnalyticsError(error.message || 'Failed to load analytics.')
        setAnalytics({
          metrics: null,
          priorityCases: [],
          languageCounts: [],
        })
      })
      .finally(() => {
        setAnalyticsLoading(false)
      })
  }

  const refreshCurrentCourseData = () => {
    if (!selectedCourse?.course_id) {
      return
    }

    refreshAssignmentData(selectedCourse.course_id)
    refreshSubmissionData(selectedCourse.course_id)
    refreshAnalyticsData(selectedCourse.course_id)
  }

  const handleRepositoryUploadSubmit = async () => {
    if (!uploadingAssignment) {
      setUploadSuccess('')
      setUploadError('Select an assignment run first.')
      return
    }

    const nextError = validateSubmissionFile(uploadFile, 'repository')
    if (nextError) {
      setUploadSuccess('')
      setUploadError(nextError)
      return
    }

    setUploadLoading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const response = await uploadInstructorSourceAsset({
        assignmentRunId: uploadingAssignment.assignment_run_id,
        file: uploadFile,
        sourceKind: 'repository',
      })

      const backendMessage = String(
        response?.backendResponse?.message ||
          response?.message ||
          'Repository uploaded successfully for this assignment run.'
      ).trim()
      const syncedRepository = response?.repository || null
      const repositoryIdMatch = backendMessage.match(/repository_id\s*=\s*(\d+)/i)
      const filesUploadedMatch = backendMessage.match(/files_uploaded\s*=\s*(\d+)/i)
      const repositoryId = syncedRepository?.repository_id ?? (repositoryIdMatch ? Number(repositoryIdMatch[1]) : null)
      const filesUploaded = filesUploadedMatch ? Number(filesUploadedMatch[1]) : null

      if (filesUploaded === 0) {
        setUploadSuccess('')
        setUploadError(
          'The backend created the repository record, but it did not extract any files from this zip. Re-zip the repository folder and try again.'
        )
        return
      }

      setAssignments((previous) =>
        sortAssignments(
          previous.map((item) =>
            item.assignment_run_id === uploadingAssignment.assignment_run_id
              ? {
                  ...item,
                  repository_id: repositoryId ?? item.repository_id,
                  repository_name:
                    syncedRepository?.repository_name ||
                    uploadFile?.name ||
                    item.repository_name ||
                    'Uploaded Repository',
                  repository_path:
                    syncedRepository?.repository_path || item.repository_path || uploadFile?.name || '',
                  repository_created_at:
                    syncedRepository?.created_at || new Date().toISOString(),
                  is_default_repository: Boolean(syncedRepository?.is_default ?? true),
                  has_repository: true,
                }
              : item
          )
        )
      )

      setUploadingAssignment((previous) =>
        previous && previous.assignment_run_id === uploadingAssignment.assignment_run_id
          ? {
              ...previous,
              repository_id: repositoryId ?? previous.repository_id,
              repository_name:
                syncedRepository?.repository_name ||
                uploadFile?.name ||
                previous.repository_name ||
                'Uploaded Repository',
              repository_path:
                syncedRepository?.repository_path ||
                previous.repository_path ||
                uploadFile?.name ||
                '',
              repository_created_at:
                syncedRepository?.created_at || new Date().toISOString(),
              is_default_repository: Boolean(syncedRepository?.is_default ?? true),
              has_repository: true,
            }
          : previous
      )

      setUploadError('')
      setUploadSuccess(backendMessage)
      setUploadFile(null)

      if (selectedCourse?.course_id) {
        refreshSubmissionData(selectedCourse.course_id)
        refreshAnalyticsData(selectedCourse.course_id)
      }
    } catch (error) {
      console.error(error)
      setUploadSuccess('')
      setUploadError(error.message || 'Failed to upload source.')
    } finally {
      setUploadLoading(false)
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
      if (selectedCourse?.course_id) {
        refreshSubmissionData(selectedCourse.course_id)
        refreshAnalyticsData(selectedCourse.course_id)
      }
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to delete assignment.')
    }
  }

  const handleGenerateResults = async (assignment) => {
    if (!selectedCourse) {
      window.alert('Select a course first.')
      return
    }

    if (!assignment?.repository_id || !assignment?.has_repository) {
      window.alert('Upload a course repository for this assignment run before generating results.')
      return
    }

    setGeneratingAssignmentId(String(assignment.assignment_run_id))

    try {
      const response = await generateAssignmentResult({
        assignmentRunId: assignment.assignment_run_id,
        repositoryId: assignment.repository_id,
      })

      refreshAssignmentData(selectedCourse.course_id)
      refreshSubmissionData(selectedCourse.course_id)
      refreshAnalyticsData(selectedCourse.course_id)
      window.alert(
        response?.message ||
          `Analysis started for ${assignment.name}. Refresh the review queue in a moment if results take time to appear.`
      )
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to start the analysis.')
    } finally {
      setGeneratingAssignmentId('')
    }
  }

  const [copiedKeyId, setCopiedKeyId] = useState(null)

  const handleCopyKey = async (assignmentRunId) => {
    try {
      await navigator.clipboard.writeText(assignmentRunId)
      setCopiedKeyId(assignmentRunId)
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch {
      window.alert('Failed to copy to clipboard.')
    }
  }

  const handleExportAssignment = async (assignment) => {
    setExportingAssignmentId(assignment.assignment_run_id)
    try {
      await buildAssignmentExportZip(assignment)
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to export assignment data.')
    } finally {
      setExportingAssignmentId(null)
    }
  }

  const handleDeleteCourse = async () => {
    if (!selectedCourse) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${selectedCourse.course_name}" and all of its assignments, repositories, submissions, and stored comparison results?`
    )

    if (!confirmed) {
      return
    }

    setDeletingCourse(true)

    try {
      await deleteInstructorCourse({
        courseId: selectedCourse.course_id,
        instructor: user,
      })

      setCourses((previous) =>
        previous.filter((course) => course.course_id !== selectedCourse.course_id)
      )
      handleCourseSelection(null)
    } catch (error) {
      console.error(error)
      window.alert(error.message || 'Failed to delete course.')
    } finally {
      setDeletingCourse(false)
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
            Manage course offerings, attach one course repository to each assignment run, and
            review stored comparison results from the EL Kapitan instructor flow.
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

          <div className="toolbarField">
            <label>Data Refresh</label>
            <button
              className="teacherButton teacherButtonSecondary"
              onClick={refreshCurrentCourseData}
              disabled={
                !selectedCourse ||
                assignmentsLoading ||
                submissionsLoading ||
                analyticsLoading
              }
            >
              {assignmentsLoading || submissionsLoading || analyticsLoading
                ? 'Refreshing...'
                : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'assignments' && (
        <>
          <div className="breadcrumb">
            <span
              className={!selectedCourse && !editingCourse ? 'breadcrumb-current' : 'breadcrumb-link'}
              onClick={() => {
                setEditingCourse(null)
                handleCourseSelection(null)
              }}
            >
              Courses
            </span>

            {editingCourse && (
              <>
                <span className="breadcrumb-separator">-&gt;</span>
                <span className="breadcrumb-current">New Course</span>
              </>
            )}

            {selectedCourse && (
              <>
                <span className="breadcrumb-separator">-&gt;</span>
                <span
                  className={
                    !editingAssignment && !uploadingAssignment
                      ? 'breadcrumb-current'
                      : 'breadcrumb-link'
                  }
                  onClick={() => {
                    setEditingAssignment(null)
                    setUploadingAssignment(null)
                  }}
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

            {uploadingAssignment && (
              <>
                <span className="breadcrumb-separator">-&gt;</span>
                <span className="breadcrumb-current">Upload Course Repository</span>
              </>
            )}
          </div>

          {!selectedCourse && !editingCourse && (
            <>
              <div className="course-actions-row">
                <button className="btn-new-assignment" onClick={openCreateCourseForm}>
                  + New Course
                </button>
              </div>

              <div className="course-list">
                {loading ? (
                  <p>Loading courses...</p>
                ) : courses.length === 0 ? (
                  <div className="teacherCard teacherEmptyState course-empty-state">
                    <h3>No courses yet</h3>
                    <p>Create your first course to start adding assignment runs.</p>
                    <button className="btn-new-assignment" onClick={openCreateCourseForm}>
                      Create Course
                    </button>
                  </div>
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
            </>
          )}

          {editingCourse && (
            <div className="assignment-form-shell teacherCard">
              <div className="teacherSectionHeaderInline">
                <h3>Create course</h3>
                <span className="teacherSectionMeta">
                  Courses are stored in the courses table and linked to the current instructor.
                </span>
              </div>

              <div className="assignment-form">
                <div className="form-group">
                  <label className="form-label">Course Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter course name"
                    value={courseName}
                    onChange={(event) => setCourseName(event.target.value)}
                  />
                </div>

                <div className="form-action-row">
                  <button className="btn-form-submit" onClick={handleCourseFormSubmit}>
                    Create Course
                  </button>
                  <button
                    className="teacherButton teacherButtonSecondary"
                    onClick={() => setEditingCourse(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCourse && !editingAssignment && !uploadingAssignment && (
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
                <div className="course-actions-row course-actions-row-inline">
                  <button className="btn-new-assignment" onClick={openCreateAssignmentForm}>
                    + New Assignment Run
                  </button>
                  <button
                    className="btn-delete btn-delete-course"
                    onClick={handleDeleteCourse}
                    disabled={deletingCourse}
                  >
                    {deletingCourse ? 'Deleting Course...' : 'Delete Course'}
                  </button>
                </div>

                {assignmentsLoading ? (
                  <p>Loading assignments...</p>
                ) : assignments.length === 0 ? (
                  <div className="teacherCard teacherEmptyState assignment-empty-state">
                    <h3>No assignment runs yet</h3>
                    <p>
                      This course is ready. Add the first assignment run to start collecting
                      submissions.
                    </p>
                    <button className="btn-new-assignment" onClick={openCreateAssignmentForm}>
                      Create First Assignment
                    </button>
                  </div>
                ) : (
                  <>
                    {assignments.map((item, index) => (
                      <div
                        className="assignment-card assignment-offering-card"
                        key={item.assignment_run_id}
                      >
                        <div className="assignment-card-left">
                          <p className="assignment-number">Assignment {index + 1}</p>
                          <h2 className="assignment-name">{item.name}</h2>
                          <p className="assignment-key">Key: {item.assignment_run_id}</p>
                          <p className="assignment-due">Due: {formatDueDate(item.due_date)}</p>
                          <p className="assignment-preview">
                            {item.has_repository
                              ? `Stored course repository: ${item.repository_name}`
                              : item.repository_id
                                ? 'Course repository placeholder is ready. Upload the source archive to populate it.'
                                : 'No course repository uploaded yet.'}
                          </p>
                          {item.repository_created_at && (
                            <p className="teacherSectionMeta">
                              Last upload: {formatShortTimestamp(item.repository_created_at)}
                            </p>
                          )}
                        </div>

                        <div className="assignment-card-right">
                          <span className="status-visible">{item.language === 'cpp' ? 'C++' : item.language === 'java' ? 'Java' : item.language?.toUpperCase()}</span>
                          <span className="status-hidden">
                            Top K {item.top_k} | Threshold {item.threshold}%
                          </span>
                          <span
                            className={
                              item.has_repository ? 'statusBadge status-complete' : 'statusBadge status-queued'
                            }
                          >
                            {item.has_repository
                              ? 'Course Repository Ready'
                              : 'Course Repository Pending'}
                          </span>

                          <button className="btn-edit" onClick={() => openEditAssignmentForm(item)}>
                            Edit
                          </button>

                          <button
                            className="btn-upload"
                            onClick={() => openRepositoryUploadForm(item)}
                          >
                            Upload Course Repo
                          </button>

                          <button
                            className="btn-export"
                            onClick={() => handleCopyKey(item.assignment_run_id)}
                          >
                            {copiedKeyId === item.assignment_run_id ? 'Copied!' : 'Copy Key'}
                          </button>

                          <button
                            className="btn-generate"
                            onClick={() => handleGenerateResults(item)}
                            disabled={
                              generatingAssignmentId === String(item.assignment_run_id) ||
                              !item.has_repository
                            }
                          >
                            {generatingAssignmentId === String(item.assignment_run_id)
                              ? 'Generating...'
                              : 'Generate Result'}
                          </button>

                          <button
                            className="btn-export"
                            onClick={() => handleExportAssignment(item)}
                            disabled={exportingAssignmentId === item.assignment_run_id}
                          >
                            {exportingAssignmentId === item.assignment_run_id
                              ? 'Exporting...'
                              : 'Export'}
                          </button>

                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteAssignment(item.assignment_run_id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
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
                      <option value="java">Java</option>
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
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

          {selectedCourse && uploadingAssignment && (
            <div className="assignment-form-shell teacherCard">
              <div className="teacherSectionHeaderInline">
                <h3>Upload course repository</h3>
                <span className="teacherSectionMeta">
                  Store the single course repository for {uploadingAssignment.name}. The backend
                  uses this repository when Generate Result is triggered.
                </span>
              </div>

              <div className="assignment-form">
                {uploadError && <div className="upload-feedback upload-feedback-error">{uploadError}</div>}
                {uploadSuccess && (
                  <div className="upload-feedback upload-feedback-success">{uploadSuccess}</div>
                )}

                <div className="form-group">
                  <label className="form-label">{UPLOAD_OPTIONS.repository.label}</label>
                  <input
                    className="form-input"
                    type="file"
                    accept={UPLOAD_OPTIONS.repository.acceptAttr}
                    onChange={(event) => handleRepositoryFileChange(event.target.files?.[0] ?? null)}
                  />
                  <p className="upload-helper-text">
                    {uploadFile
                      ? `Selected file: ${uploadFile.name}`
                      : 'Zip the course repository first, then upload the archive here.'}
                  </p>
                </div>

                <div className="form-action-row">
                  <button
                    className="btn-form-submit"
                    onClick={handleRepositoryUploadSubmit}
                    disabled={uploadLoading}
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload Course Repository'}
                  </button>
                  <button
                    className="teacherButton teacherButtonSecondary"
                    onClick={closeRepositoryUploadForm}
                    disabled={uploadLoading}
                  >
                    Cancel
                  </button>
                </div>
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
        />
      )}
    </div>
  )
}
