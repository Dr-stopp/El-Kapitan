import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import {
  getMockAnalytics,
  getMockReviewQueue,
  getMockSubmissionComparison,
  getMockSubmissionReport,
} from './mockData'
import { formatShortTimestamp, getRepositoryLabel } from './utils'

function ensureSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
  }
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== null && value !== undefined)))
}

function mapUserName(submissionRow, fallbackId) {
  return parseStudentNameFromFolderPath(submissionRow?.folder_path) || `Student ${fallbackId}`
}

function getReviewStatus(score) {
  if (!Number.isFinite(score)) return 'Pending Review'
  if (score >= 75) return 'Flagged'
  if (score >= 40) return 'Needs Review'
  return 'Clear'
}

function mapAssignmentRun(row, assignmentRow) {
  return {
    assignment_run_id: row.assignment_run_id,
    course_id: assignmentRow?.course_id ?? null,
    assign_id: row.assign_id,
    due_date: row.due_date,
    top_k: row.top_k,
    threshold: row.threshold,
    name: assignmentRow?.name || 'Untitled assignment',
    language: assignmentRow?.language || 'Unknown',
    description: `Language: ${assignmentRow?.language || 'Unknown'} | Top K: ${
      row.top_k
    } | Threshold: ${row.threshold}%`,
  }
}

function sortCoursesByName(courses) {
  return [...courses].sort((left, right) =>
    String(left.course_name || '').localeCompare(String(right.course_name || ''))
  )
}

function isMissingRelation(error, relationName) {
  if (error?.code !== '42P01') {
    return false
  }

  const message = String(error?.message || '').toLowerCase()
  return message.includes(String(relationName || '').toLowerCase())
}

function resolveInstructorId(instructor) {
  const directId =
    instructor && typeof instructor === 'object' ? String(instructor.id || '').trim() : String(instructor || '').trim()

  if (directId) {
    return directId
  }

  throw new Error(
    'Unable to determine the instructor profile. Sign out and sign back in, then try again.'
  )
}

function groupResultsBySubmission(results) {
  return results.reduce((accumulator, item) => {
    const key = String(item.submission_1)
    if (!accumulator.has(key)) {
      accumulator.set(key, [])
    }
    accumulator.get(key).push(item)
    return accumulator
  }, new Map())
}

function pickBestResult(results = []) {
  if (!results.length) return null

  return [...results].sort(
    (left, right) => Number(right.score || 0) - Number(left.score || 0)
  )[0]
}

function buildReportSummary(assignmentName, score, resultCount) {
  if (!Number.isFinite(score)) {
    return 'No stored comparison results are available for this submission yet.'
  }

  if (score >= 75) {
    return `${assignmentName} has a high overlap score and ${resultCount} stored comparison match(es).`
  }

  if (score >= 40) {
    return `${assignmentName} shows moderate overlap across ${resultCount} stored comparison match(es).`
  }

  return `${assignmentName} currently shows low overlap based on ${resultCount} stored comparison match(es).`
}

function parseStudentNameFromFolderPath(folderPath) {
  const fileName = String(folderPath || '').split('/').filter(Boolean).pop()

  if (!fileName) return ''

  const match = fileName.match(/^([^_]+)_([^_]+)_\d+_/)

  if (!match) return ''

  return [match[1], match[2]]
    .map((part) => part.replace(/_/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function buildRepositoryLabel(submissionRow) {
  return submissionRow?.test_flag === 'repository' ? 'Repository Upload' : 'Code File'
}

function buildSourceLabel(submissionRow, submissionId) {
  const studentName = mapUserName(submissionRow, submissionId)
  return studentName ? `${studentName} (Submission #${submissionId})` : `Submission #${submissionId}`
}

function buildRangeCsv(sections) {
  if (!sections.length) return ''

  const rows = sections.map(
    (section) =>
      `${section.leftStartLine},${section.leftEndLine},${section.rightStartLine},${section.rightEndLine}`
  )

  return ['file_1_start,file_1_end,file_2_start,file_2_end', ...rows].join('\n')
}

function buildPlaceholderCode(label, sections, side) {
  const endLine = sections.reduce((maxValue, section) => {
    const nextEnd = side === 'left' ? section.leftEndLine : section.rightEndLine
    return Math.max(maxValue, nextEnd || 0)
  }, 18)

  const totalLines = Math.max(endLine, 18)

  return Array.from({ length: totalLines }, (_, index) => {
    const lineNumber = index + 1
    return `// ${label} line ${lineNumber}`
  }).join('\n')
}

function looksBinaryContent(objectPath, text) {
  if (!text) return true
  if (String(objectPath || '').toLowerCase().endsWith('.bin')) return true
  if (text.startsWith('PK')) return true
  return Array.from(text.slice(0, 512)).some((character) => character.charCodeAt(0) < 9)
}

async function readStorageText(objectPath) {
  if (!objectPath) return ''

  const { data, error } = await supabase.storage.from('Submissions').download(objectPath)

  if (error || !data) {
    return ''
  }

  const text = await data.text()

  if (looksBinaryContent(objectPath, text)) {
    return ''
  }

  return text.replace(/\r\n/g, '\n')
}

function buildNumericInFilter(values) {
  return unique(values)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(',')
}

async function loadAssignmentsByIds(assignIds) {
  if (!assignIds.length) return new Map()

  const { data, error } = await supabase
    .from('assignments')
    .select('assign_id, course_id, language, name')
    .in('assign_id', assignIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.assign_id), row]))
}

async function loadAssignmentRunsByIds(assignmentRunIds) {
  if (!assignmentRunIds.length) return new Map()

  const { data, error } = await supabase
    .from('assignment_runs')
    .select('assignment_run_id, assign_id, due_date, top_k, threshold')
    .in('assignment_run_id', assignmentRunIds)

  if (error) throw error

  const assignmentMap = await loadAssignmentsByIds(unique((data || []).map((row) => row.assign_id)))

  return new Map(
    (data || []).map((row) => [
      String(row.assignment_run_id),
      mapAssignmentRun(row, assignmentMap.get(String(row.assign_id))),
    ])
  )
}

async function loadRepositoriesByIds(repositoryIds) {
  if (!repositoryIds.length) return new Map()

  const { data, error } = await supabase
    .from('repositories')
    .select('repository_id, assignment_id, repository_path')
    .in('repository_id', repositoryIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.repository_id), row]))
}

async function loadRepositoriesByAssignmentIds(assignmentIds) {
  if (!assignmentIds.length) return new Map()

  const { data, error } = await supabase
    .from('repositories')
    .select('repository_id, assignment_id, repository_path')
    .in('assignment_id', assignmentIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.repository_id), row]))
}

async function loadSubmissionsByIds(submissionIds) {
  if (!submissionIds.length) return new Map()

  const { data, error } = await supabase
    .from('submissions')
    .select('submission_id, created_at, repository_id, student_id, folder_path, test_flag')
    .in('submission_id', submissionIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.submission_id), row]))
}

async function loadResultsBySubmissionIds(submissionIds) {
  if (!submissionIds.length) return new Map()

  const { data, error } = await supabase
    .from('results')
    .select('submission_1, submission_2, score, pair_id, date_created')
    .in('submission_1', submissionIds)

  if (error) throw error

  return groupResultsBySubmission(data || [])
}

async function loadResultSections(pairId) {
  if (!pairId) return []

  const { data, error } = await supabase
    .from('results_sections')
    .select(
      'section_id, submission_1_sec_start, submission_1_sec_end, submission_2_sec_start, submission_2_sec_end'
    )
    .eq('pair_id', pairId)
    .order('section_id', { ascending: true })

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.section_id,
    leftStartLine: row.submission_1_sec_start,
    leftEndLine: row.submission_1_sec_end,
    rightStartLine: row.submission_2_sec_start,
    rightEndLine: row.submission_2_sec_end,
  }))
}

async function removeSubmissionStorageObjects(storagePaths) {
  const objectPaths = unique(storagePaths)

  if (!objectPaths.length) {
    return
  }

  const { error } = await supabase.storage.from('Submissions').remove(objectPaths)

  if (error) {
    console.warn('Failed to remove one or more storage objects while deleting instructor data.', error)
  }
}

async function deleteStoredComparisonRows(submissionIds) {
  const filterValues = buildNumericInFilter(submissionIds)

  if (!filterValues) {
    return
  }

  const submissionFilter = `submission_1.in.(${filterValues}),submission_2.in.(${filterValues})`
  const { data: resultRows, error: resultsLookupError } = await supabase
    .from('results')
    .select('pair_id')
    .or(submissionFilter)

  if (resultsLookupError) {
    if (isMissingRelation(resultsLookupError, 'results')) {
      return
    }

    throw resultsLookupError
  }

  const pairIds = unique((resultRows || []).map((row) => row.pair_id))

  if (pairIds.length) {
    const { error: sectionsError } = await supabase
      .from('results_sections')
      .delete()
      .in('pair_id', pairIds)

    if (sectionsError && !isMissingRelation(sectionsError, 'results_sections')) {
      throw sectionsError
    }
  }

  const { error: resultsDeleteError } = await supabase
    .from('results')
    .delete()
    .or(submissionFilter)

  if (resultsDeleteError && !isMissingRelation(resultsDeleteError, 'results')) {
    throw resultsDeleteError
  }
}

async function deleteAssignmentRunGraph(assignmentRunIds, options = {}) {
  const normalizedAssignmentRunIds = unique(assignmentRunIds)

  if (!normalizedAssignmentRunIds.length) {
    return { assignIds: [] }
  }

  const { deleteOrphanAssignments = false } = options
  const { data: assignmentRunRows, error: assignmentRunLookupError } = await supabase
    .from('assignment_runs')
    .select('assignment_run_id, assign_id')
    .in('assignment_run_id', normalizedAssignmentRunIds)

  if (assignmentRunLookupError) throw assignmentRunLookupError

  if (!assignmentRunRows?.length) {
    return { assignIds: [] }
  }

  const assignIds = unique(assignmentRunRows.map((row) => row.assign_id))
  const { data: repositoryRows, error: repositoriesLookupError } = await supabase
    .from('repositories')
    .select('repository_id, repository_path')
    .in('assignment_id', normalizedAssignmentRunIds)

  if (repositoriesLookupError) throw repositoriesLookupError

  const repositoryIds = unique((repositoryRows || []).map((row) => row.repository_id))
  let submissionRows = []

  if (repositoryIds.length) {
    const { data, error: submissionsLookupError } = await supabase
      .from('submissions')
      .select('submission_id, folder_path')
      .in('repository_id', repositoryIds)

    if (submissionsLookupError) throw submissionsLookupError
    submissionRows = data || []
  }

  const submissionIds = unique(submissionRows.map((row) => row.submission_id))
  const storagePaths = unique([
    ...(repositoryRows || []).map((row) => row.repository_path),
    ...submissionRows.map((row) => row.folder_path),
  ])

  await deleteStoredComparisonRows(submissionIds)

  if (submissionIds.length) {
    const { error: submissionsDeleteError } = await supabase
      .from('submissions')
      .delete()
      .in('submission_id', submissionIds)

    if (submissionsDeleteError) throw submissionsDeleteError
  }

  if (repositoryIds.length) {
    const { error: repositoriesDeleteError } = await supabase
      .from('repositories')
      .delete()
      .in('repository_id', repositoryIds)

    if (repositoriesDeleteError) throw repositoriesDeleteError
  }

  const { error: assignmentRunsDeleteError } = await supabase
    .from('assignment_runs')
    .delete()
    .in('assignment_run_id', normalizedAssignmentRunIds)

  if (assignmentRunsDeleteError) throw assignmentRunsDeleteError

  if (deleteOrphanAssignments && assignIds.length) {
    const { data: remainingAssignmentRuns, error: remainingRunsError } = await supabase
      .from('assignment_runs')
      .select('assign_id')
      .in('assign_id', assignIds)

    if (remainingRunsError) throw remainingRunsError

    const remainingAssignIds = new Set(
      (remainingAssignmentRuns || []).map((row) => String(row.assign_id))
    )
    const orphanAssignIds = assignIds.filter(
      (assignId) => !remainingAssignIds.has(String(assignId))
    )

    if (orphanAssignIds.length) {
      const { error: assignmentsDeleteError } = await supabase
        .from('assignments')
        .delete()
        .in('assign_id', orphanAssignIds)

      if (assignmentsDeleteError) throw assignmentsDeleteError
    }
  }

  await removeSubmissionStorageObjects(storagePaths)

  return { assignIds }
}

export async function fetchInstructorCourses(instructor) {
  if (instructor === null || instructor === undefined || instructor === '') {
    return []
  }

  const normalizedInstructorId = resolveInstructorId(instructor)
  ensureSupabase()

  const { data, error } = await supabase
    .from('courses')
    .select('course_id, course_name, instructor')
    .eq('instructor', normalizedInstructorId)
    .order('course_name', { ascending: true })

  if (error) throw error

  return sortCoursesByName(data || [])
}

export async function createInstructorCourse({ courseName, instructor }) {
  const normalizedCourseName = String(courseName || '').trim()
  const normalizedInstructorId = resolveInstructorId(instructor)

  if (!normalizedCourseName) {
    throw new Error('Please enter a course name.')
  }

  ensureSupabase()

  const { data, error } = await supabase
    .from('courses')
    .insert({
      course_name: normalizedCourseName,
      instructor: normalizedInstructorId,
    })
    .select('course_id, course_name, instructor')
    .single()

  if (error) throw error

  return data
}

export async function fetchInstructorAssignments(courseId) {
  ensureSupabase()

  const { data: assignmentRows, error: assignmentsError } = await supabase
    .from('assignments')
    .select('assign_id, course_id, language, name')
    .eq('course_id', courseId)

  if (assignmentsError) throw assignmentsError

  if (!assignmentRows?.length) {
    return []
  }

  const assignmentMap = new Map(
    assignmentRows.map((row) => [String(row.assign_id), row])
  )

  const { data: runRows, error: runsError } = await supabase
    .from('assignment_runs')
    .select('assignment_run_id, assign_id, due_date, top_k, threshold')
    .in(
      'assign_id',
      assignmentRows.map((row) => row.assign_id)
    )
    .order('due_date', { ascending: true })

  if (runsError) throw runsError

  return (runRows || []).map((row) => mapAssignmentRun(row, assignmentMap.get(String(row.assign_id))))
}

export async function createInstructorAssignment({
  courseId,
  name,
  language,
  due_date,
  top_k,
  threshold,
}) {
  ensureSupabase()

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      course_id: courseId,
      name,
      language,
    })
    .select('assign_id, course_id, language, name')
    .single()

  if (assignmentError) throw assignmentError

  const { data: assignmentRun, error: assignmentRunError } = await supabase
    .from('assignment_runs')
    .insert({
      assign_id: assignment.assign_id,
      due_date,
      top_k,
      threshold,
    })
    .select('assignment_run_id, assign_id, due_date, top_k, threshold')
    .single()

  if (assignmentRunError) throw assignmentRunError

  return mapAssignmentRun(assignmentRun, assignment)
}

export async function updateInstructorAssignment({
  assignmentRunId,
  assignId,
  courseId,
  name,
  language,
  due_date,
  top_k,
  threshold,
}) {
  ensureSupabase()

  const { error: assignmentError } = await supabase
    .from('assignments')
    .update({
      course_id: courseId,
      name,
      language,
    })
    .eq('assign_id', assignId)

  if (assignmentError) throw assignmentError

  const { data: assignmentRun, error: assignmentRunError } = await supabase
    .from('assignment_runs')
    .update({
      assign_id: assignId,
      due_date,
      top_k,
      threshold,
    })
    .eq('assignment_run_id', assignmentRunId)
    .select('assignment_run_id, assign_id, due_date, top_k, threshold')
    .single()

  if (assignmentRunError) throw assignmentRunError

  return mapAssignmentRun(assignmentRun, {
    assign_id: assignId,
    course_id: courseId,
    language,
    name,
  })
}

export async function deleteInstructorAssignment({ assignmentRunId }) {
  ensureSupabase()

  const normalizedAssignmentRunId = String(assignmentRunId || '').trim()

  if (!normalizedAssignmentRunId) {
    throw new Error('Missing assignment run id.')
  }

  await deleteAssignmentRunGraph([normalizedAssignmentRunId], {
    deleteOrphanAssignments: true,
  })

  return true
}

export async function deleteInstructorCourse({ courseId, instructor }) {
  ensureSupabase()

  const normalizedCourseId = String(courseId || '').trim()
  const normalizedInstructorId = resolveInstructorId(instructor)

  if (!normalizedCourseId) {
    throw new Error('Missing course id.')
  }

  const { data: courseRow, error: courseLookupError } = await supabase
    .from('courses')
    .select('course_id')
    .eq('course_id', normalizedCourseId)
    .eq('instructor', normalizedInstructorId)
    .maybeSingle()

  if (courseLookupError) throw courseLookupError

  if (!courseRow) {
    throw new Error('Course not found or you do not have permission to delete it.')
  }

  const { data: assignmentRows, error: assignmentsLookupError } = await supabase
    .from('assignments')
    .select('assign_id')
    .eq('course_id', normalizedCourseId)

  if (assignmentsLookupError) throw assignmentsLookupError

  const assignIds = unique((assignmentRows || []).map((row) => row.assign_id))

  if (assignIds.length) {
    const { data: assignmentRunRows, error: assignmentRunsLookupError } = await supabase
      .from('assignment_runs')
      .select('assignment_run_id')
      .in('assign_id', assignIds)

    if (assignmentRunsLookupError) throw assignmentRunsLookupError

    await deleteAssignmentRunGraph(
      unique((assignmentRunRows || []).map((row) => row.assignment_run_id))
    )

    const { error: assignmentsDeleteError } = await supabase
      .from('assignments')
      .delete()
      .in('assign_id', assignIds)

    if (assignmentsDeleteError) throw assignmentsDeleteError
  }

  const { error: courseDeleteError } = await supabase
    .from('courses')
    .delete()
    .eq('course_id', normalizedCourseId)
    .eq('instructor', normalizedInstructorId)

  if (courseDeleteError) throw courseDeleteError

  return true
}

export async function fetchReviewQueue(courseId) {
  try {
    ensureSupabase()

    const assignments = await fetchInstructorAssignments(courseId)

    if (!assignments.length) {
      return { submissions: [] }
    }

    const assignmentMap = new Map(
      assignments.map((item) => [String(item.assignment_run_id), item])
    )
    const repositoriesMap = await loadRepositoriesByAssignmentIds(
      assignments.map((item) => item.assignment_run_id)
    )
    const repositoryIds = Array.from(repositoriesMap.keys())

    if (!repositoryIds.length) {
      return { submissions: [] }
    }

    const { data: submissionRows, error: submissionsError } = await supabase
      .from('submissions')
      .select('submission_id, created_at, repository_id, student_id, folder_path, test_flag')
      .in('repository_id', repositoryIds)
      .order('created_at', { ascending: false })

    if (submissionsError) throw submissionsError

    const submissions = submissionRows || []
    const resultsMap = await loadResultsBySubmissionIds(
      unique(submissions.map((row) => row.submission_id))
    )

    return {
      submissions: submissions.map((submission) => {
        const repository = repositoriesMap.get(String(submission.repository_id))
        const assignment = assignmentMap.get(String(repository?.assignment_id))
        const bestResult = pickBestResult(resultsMap.get(String(submission.submission_id)) || [])
        const similarityScore = Number.isFinite(Number(bestResult?.score))
          ? Number(bestResult.score)
          : null

        return {
          id: submission.submission_id,
          studentName: mapUserName(submission, submission.student_id),
          assignmentName: assignment?.name || `Assignment #${repository?.assignment_id || submission.repository_id}`,
          language: assignment?.language || 'Unknown',
          similarityScore,
          status: getReviewStatus(similarityScore),
          analysisState: bestResult ? 'complete' : 'queued',
          repositoryKey: 'current',
          repositoryLabel: buildRepositoryLabel(submission) || getRepositoryLabel('current'),
          excerpt: bestResult
            ? `Highest recorded similarity is ${similarityScore}% against submission #${bestResult.submission_2}.`
            : 'No stored comparison results are available for this submission yet.',
          submittedAt: formatShortTimestamp(submission.created_at),
        }
      }),
    }
  } catch (error) {
    console.warn('Falling back to demo review queue.', error)
    return getMockReviewQueue(courseId)
  }
}

export async function fetchAnalytics(courseId) {
  try {
    const [assignments, queueData] = await Promise.all([
      fetchInstructorAssignments(courseId),
      fetchReviewQueue(courseId),
    ])

    const submissions = queueData.submissions || []
    const totalSubmissions = submissions.length
    const flaggedCases = submissions.filter((item) => item.status === 'Flagged').length
    const reviewCases = submissions.filter((item) => item.status === 'Needs Review').length

    const languageCounts = Object.entries(
      submissions.reduce((accumulator, item) => {
        const key = item.language || 'Unknown'
        accumulator[key] = (accumulator[key] || 0) + 1
        return accumulator
      }, {})
    )
      .map(([language, count]) => ({
        language,
        count,
        percent: totalSubmissions === 0 ? 0 : Math.round((count / totalSubmissions) * 100),
      }))
      .sort((left, right) => right.count - left.count)

    return {
      metrics: {
        totalSubmissions,
        flaggedCases,
        reviewCases,
        configuredRuns: assignments.length,
      },
      priorityCases: [...submissions]
        .filter((item) => Number.isFinite(item.similarityScore))
        .sort((left, right) => (right.similarityScore || 0) - (left.similarityScore || 0))
        .slice(0, 5),
      languageCounts,
    }
  } catch (error) {
    console.warn('Falling back to demo analytics.', error)
    return getMockAnalytics(courseId)
  }
}

export async function fetchSubmissionReport(submissionId) {
  try {
    ensureSupabase()

    const submissionMap = await loadSubmissionsByIds([submissionId])
    const submission = submissionMap.get(String(submissionId))

    if (!submission) {
      throw new Error('Submission not found.')
    }

    const repositoriesMap = await loadRepositoriesByIds([submission.repository_id])
    const repository = repositoriesMap.get(String(submission.repository_id))

    const [assignmentRunsMap, resultsMap] = await Promise.all([
      loadAssignmentRunsByIds(repository?.assignment_id ? [repository.assignment_id] : []),
      loadResultsBySubmissionIds([submissionId]),
    ])

    const submissionResults = (resultsMap.get(String(submissionId)) || []).sort(
      (left, right) => Number(right.score || 0) - Number(left.score || 0)
    )
    const sourceSubmissionIds = unique(submissionResults.map((row) => row.submission_2))
    const sourceSubmissionsMap = await loadSubmissionsByIds(sourceSubmissionIds)
    const assignment = assignmentRunsMap.get(String(repository?.assignment_id))
    const bestScore = Number.isFinite(Number(submissionResults[0]?.score))
      ? Number(submissionResults[0].score)
      : null

    return {
      id: submission.submission_id,
      studentName: mapUserName(submission, submission.student_id),
      assignmentName: assignment?.name || `Assignment #${repository?.assignment_id || submission.repository_id}`,
      language: assignment?.language || 'Unknown',
      submittedAt: formatShortTimestamp(submission.created_at),
      similarityScore: bestScore,
      status: getReviewStatus(bestScore),
      analysisState: submissionResults.length ? 'complete' : 'queued',
      summary: buildReportSummary(
        assignment?.name || `Assignment #${repository?.assignment_id || submission.repository_id}`,
        bestScore,
        submissionResults.length
      ),
      engineVersion: submissionResults.length ? 'Supabase results table' : null,
      matches: submissionResults.slice(0, 5).map((resultRow) => {
        const sourceSubmission = sourceSubmissionsMap.get(String(resultRow.submission_2))
        const sourceLabel = buildSourceLabel(sourceSubmission, resultRow.submission_2)

        return {
          pairId: resultRow.pair_id,
          sourceSubmissionId: resultRow.submission_2,
          sourceLabel,
          score: Number(resultRow.score || 0),
          reason: `Stored result pair ${resultRow.pair_id} reports ${Number(
            resultRow.score || 0
          )}% similarity against ${sourceLabel}.`,
        }
      }),
    }
  } catch (error) {
    console.warn('Falling back to demo submission report.', error)
    return getMockSubmissionReport(submissionId)
  }
}

export async function fetchSubmissionComparison(submissionId) {
  try {
    ensureSupabase()

    const submissionMap = await loadSubmissionsByIds([submissionId])
    const submission = submissionMap.get(String(submissionId))

    if (!submission) {
      throw new Error('Submission not found.')
    }

    const resultsMap = await loadResultsBySubmissionIds([submissionId])
    const bestResult = pickBestResult(resultsMap.get(String(submissionId)) || [])

    if (!bestResult) {
      return {
        id: submission.submission_id,
        pairId: null,
        sourceLabel: 'No stored comparison match',
        similarityScore: null,
        analysisState: 'queued',
        leftText: '',
        rightText: '',
        notes: 'No stored comparison results are available for this submission yet.',
        sections: [],
        sectionsCsv: '',
      }
    }

    const [sourceSubmissionMap, sections] = await Promise.all([
      loadSubmissionsByIds([bestResult.submission_2]),
      loadResultSections(bestResult.pair_id),
    ])

    const sourceSubmission = sourceSubmissionMap.get(String(bestResult.submission_2))
    const sourceLabel = buildSourceLabel(sourceSubmission, bestResult.submission_2)

    const [leftText, rightText] = await Promise.all([
      readStorageText(submission.folder_path),
      readStorageText(sourceSubmission?.folder_path),
    ])

    const fallbackNotes =
      leftText && rightText
        ? 'Highlighted lines come from the stored results_sections ranges when available.'
        : 'Original file contents were not readable from storage, so this comparison view shows placeholder lines for the stored match ranges.'

    return {
      id: submission.submission_id,
      pairId: bestResult.pair_id,
      sourceLabel,
      similarityScore: Number(bestResult.score || 0),
      analysisState: 'complete',
      leftText: leftText || buildPlaceholderCode('Current submission', sections, 'left'),
      rightText: rightText || buildPlaceholderCode(sourceLabel, sections, 'right'),
      notes: fallbackNotes,
      sections,
      sectionsCsv: buildRangeCsv(sections),
    }
  } catch (error) {
    console.warn('Falling back to demo submission comparison.', error)
    return getMockSubmissionComparison(submissionId)
  }
}

async function downloadStorageBlob(objectPath) {
  if (!objectPath) return null

  const { data, error } = await supabase.storage.from('Submissions').download(objectPath)

  if (error || !data) return null

  return data
}

async function fetchExportData(assignmentRunId) {
  ensureSupabase()

  const { data: repoRows, error: repoError } = await supabase
    .from('repositories')
    .select('repository_id, assignment_run_id, repository_path')
    .eq('assignment_run_id', assignmentRunId)

  if (repoError) throw repoError

  const repositoryIds = (repoRows || []).map((row) => String(row.repository_id))

  if (!repositoryIds.length) {
    return { submissions: [], resultsMap: new Map() }
  }

  const { data: submissionRows, error: submissionsError } = await supabase
    .from('submissions')
    .select('submission_id, created_at, repository_id, student_id, folder_path, test_flag')
    .in('repository_id', repositoryIds)
    .order('created_at', { ascending: true })

  if (submissionsError) throw submissionsError

  const submissions = submissionRows || []
  const resultsMap = await loadResultsBySubmissionIds(
    unique(submissions.map((row) => row.submission_id))
  )

  return { submissions, resultsMap }
}

function buildStudentFolderName(folderPath) {
  const fileName = String(folderPath || '').split('/').filter(Boolean).pop()
  if (!fileName) return null

  const match = fileName.match(/^([^_]+)_([^_]+)_\d+_/)
  if (!match) return null

  return `${match[1]}_${match[2]}`.toLowerCase()
}

function getFileNameFromPath(folderPath) {
  const segments = String(folderPath || '').split('/').filter(Boolean)
  return segments.length ? segments[segments.length - 1] : 'submission'
}

function escapeCsvField(value) {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function batchProcess(items, batchSize, processFn) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(batch.map(processFn))
    results.push(...batchResults)
  }
  return results
}

export async function buildAssignmentExportZip(assignment) {
  const { submissions, resultsMap } = await fetchExportData(assignment.assignment_run_id)

  const zip = new JSZip()
  const submissionsFolder = zip.folder('submissions')

  // Group submissions by student folder name, handling duplicates
  const folderCounts = new Map()
  const submissionEntries = submissions.map((submission) => {
    let folderName = buildStudentFolderName(submission.folder_path) || `student_${submission.student_id}`
    const count = folderCounts.get(folderName) || 0
    folderCounts.set(folderName, count + 1)
    if (count > 0) {
      folderName = `${folderName}_${submission.submission_id}`
    }
    return { submission, folderName }
  })

  // Download all submission files in batches of 5
  const blobs = await batchProcess(
    submissionEntries,
    5,
    async (entry) => downloadStorageBlob(entry.submission.folder_path)
  )

  // Build zip contents for each submission
  const csvRows = []

  for (let i = 0; i < submissionEntries.length; i++) {
    const { submission, folderName } = submissionEntries[i]
    const studentFolder = submissionsFolder.folder(folderName)
    const blobResult = blobs[i]

    // Add submission file or error note
    if (blobResult.status === 'fulfilled' && blobResult.value) {
      const fileName = getFileNameFromPath(submission.folder_path)
      studentFolder.file(fileName, blobResult.value)
    } else {
      studentFolder.file(
        'download_error.txt',
        'The submitted file could not be retrieved from storage.'
      )
    }

    // Build plagiarism result JSON
    const submissionResults = resultsMap.get(String(submission.submission_id)) || []
    const studentName = parseStudentNameFromFolderPath(submission.folder_path) || `Student ${submission.student_id}`

    const plagiarismResult = {
      submission_id: submission.submission_id,
      student: studentName,
      submitted_at: submission.created_at,
      results: submissionResults.map((result) => ({
        pair_id: result.pair_id,
        compared_with: result.submission_2,
        score: Number(result.score || 0),
        date: result.date_created,
      })),
    }

    studentFolder.file('plagiarism_result.json', JSON.stringify(plagiarismResult, null, 2))

    // Collect CSV row
    const bestResult = submissionResults.length
      ? submissionResults.reduce((best, r) => (Number(r.score || 0) > Number(best.score || 0) ? r : best), submissionResults[0])
      : null

    csvRows.push([
      studentName,
      folderName,
      submission.submission_id,
      submission.created_at,
      bestResult ? Number(bestResult.score || 0) : '',
      bestResult ? bestResult.submission_2 : '',
      getFileNameFromPath(submission.folder_path),
    ])
  }

  // Add previous_offerings placeholder
  const prevFolder = zip.folder('previous_offerings')
  prevFolder.file(
    'README.txt',
    'Previous Offerings\n\nThis folder is reserved for submissions from prior course offerings.\nThis feature is not yet available. When enabled, archived submissions\nused for cross-offering comparison will appear here.\n'
  )

  // Build summary.csv
  const csvHeader = 'student_name,student_folder,submission_id,submitted_at,highest_score,matched_submission_id,file_name'
  const csvBody = csvRows
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\n')
  zip.file('summary.csv', csvHeader + '\n' + csvBody + '\n')

  // Generate and trigger download
  const blob = await zip.generateAsync({ type: 'blob' })
  const safeName = String(assignment.name || 'assignment')
    .replace(/\s+/g, '-')
    .toLowerCase()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}-export.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
