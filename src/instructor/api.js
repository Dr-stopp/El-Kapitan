import { supabase } from '../lib/supabase'
import {
  demoInstructorCourses,
  getMockAnalytics,
  getMockReviewQueue,
  getMockSubmissionComparison,
  getMockSubmissionReport,
  readDemoAssignments,
  writeDemoAssignments,
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

function mapUserName(userRow, fallbackId) {
  const fullName = [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ').trim()
  return fullName || userRow?.email || `Student ${fallbackId}`
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
    course_id: row.course_id,
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

function sortAssignmentsByDueDate(assignments) {
  return [...assignments].sort(
    (left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime()
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

function buildSourceLabel(userRow, submissionId) {
  const studentName = userRow ? mapUserName(userRow, submissionId) : null
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
    .select('assignment_run_id, course_id, assign_id, due_date, top_k, threshold')
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

async function loadUsersByIds(userIds) {
  if (!userIds.length) return new Map()

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', userIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.id), row]))
}

async function loadSubmissionsByIds(submissionIds) {
  if (!submissionIds.length) return new Map()

  const { data, error } = await supabase
    .from('submissions')
    .select('submission_id, created_at, assignment_run_id, student_id, folder_path')
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

export async function fetchInstructorCourses() {
  try {
    ensureSupabase()

    const { data, error } = await supabase
      .from('courses')
      .select('course_id, course_name')
      .order('course_name', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.warn('Falling back to demo instructor courses.', error)
    return demoInstructorCourses
  }
}

export async function fetchInstructorAssignments(courseId) {
  try {
    ensureSupabase()

    const { data, error } = await supabase
      .from('assignment_runs')
      .select('assignment_run_id, course_id, assign_id, due_date, top_k, threshold')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true })

    if (error) throw error

    const assignmentMap = await loadAssignmentsByIds(unique((data || []).map((row) => row.assign_id)))

    return (data || []).map((row) => mapAssignmentRun(row, assignmentMap.get(String(row.assign_id))))
  } catch (error) {
    console.warn('Falling back to demo instructor assignments.', error)
    const assignments = readDemoAssignments()
    return sortAssignmentsByDueDate(assignments[courseId] || [])
  }
}

export async function createInstructorAssignment({
  courseId,
  name,
  language,
  due_date,
  top_k,
  threshold,
}) {
  try {
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
        course_id: courseId,
        assign_id: assignment.assign_id,
        due_date,
        top_k,
        threshold,
      })
      .select('assignment_run_id, course_id, assign_id, due_date, top_k, threshold')
      .single()

    if (assignmentRunError) throw assignmentRunError

    return mapAssignmentRun(assignmentRun, assignment)
  } catch (error) {
    console.warn('Falling back to demo assignment creation.', error)
    const assignments = readDemoAssignments()
    const nextAssignment = {
      assignment_run_id: Date.now(),
      assign_id: Date.now() + 1,
      course_id: courseId,
      due_date,
      top_k,
      threshold,
      name,
      language,
      description: `Language: ${language} | Top K: ${top_k} | Threshold: ${threshold}%`,
    }

    assignments[courseId] = sortAssignmentsByDueDate([...(assignments[courseId] || []), nextAssignment])
    writeDemoAssignments(assignments)
    return nextAssignment
  }
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
  try {
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
        course_id: courseId,
        assign_id: assignId,
        due_date,
        top_k,
        threshold,
      })
      .eq('assignment_run_id', assignmentRunId)
      .select('assignment_run_id, course_id, assign_id, due_date, top_k, threshold')
      .single()

    if (assignmentRunError) throw assignmentRunError

    return mapAssignmentRun(assignmentRun, {
      assign_id: assignId,
      course_id: courseId,
      language,
      name,
    })
  } catch (error) {
    console.warn('Falling back to demo assignment update.', error)
    const assignments = readDemoAssignments()

    assignments[courseId] = (assignments[courseId] || []).map((item) =>
      String(item.assignment_run_id) === String(assignmentRunId)
        ? {
            ...item,
            assign_id: assignId,
            name,
            language,
            due_date,
            top_k,
            threshold,
            description: `Language: ${language} | Top K: ${top_k} | Threshold: ${threshold}%`,
          }
        : item
    )

    assignments[courseId] = sortAssignmentsByDueDate(assignments[courseId] || [])
    writeDemoAssignments(assignments)

    return assignments[courseId].find(
      (item) => String(item.assignment_run_id) === String(assignmentRunId)
    )
  }
}

export async function deleteInstructorAssignment({ assignmentRunId, courseId }) {
  try {
    ensureSupabase()

    const { error } = await supabase
      .from('assignment_runs')
      .delete()
      .eq('assignment_run_id', assignmentRunId)

    if (error) throw error

    return true
  } catch (error) {
    console.warn('Falling back to demo assignment deletion.', error)
    const assignments = readDemoAssignments()
    assignments[courseId] = (assignments[courseId] || []).filter(
      (item) => String(item.assignment_run_id) !== String(assignmentRunId)
    )
    writeDemoAssignments(assignments)
    return true
  }
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

    const { data: submissionRows, error: submissionsError } = await supabase
      .from('submissions')
      .select('submission_id, created_at, assignment_run_id, student_id, folder_path')
      .in(
        'assignment_run_id',
        assignments.map((item) => item.assignment_run_id)
      )
      .order('created_at', { ascending: false })

    if (submissionsError) throw submissionsError

    const submissions = submissionRows || []
    const [usersMap, resultsMap] = await Promise.all([
      loadUsersByIds(unique(submissions.map((row) => row.student_id))),
      loadResultsBySubmissionIds(unique(submissions.map((row) => row.submission_id))),
    ])

    return {
      submissions: submissions.map((submission) => {
        const assignment = assignmentMap.get(String(submission.assignment_run_id))
        const bestResult = pickBestResult(resultsMap.get(String(submission.submission_id)) || [])
        const similarityScore = Number.isFinite(Number(bestResult?.score))
          ? Number(bestResult.score)
          : null

        return {
          id: submission.submission_id,
          studentName: mapUserName(
            usersMap.get(String(submission.student_id)),
            submission.student_id
          ),
          assignmentName: assignment?.name || `Assignment #${submission.assignment_run_id}`,
          language: assignment?.language || 'Unknown',
          similarityScore,
          status: getReviewStatus(similarityScore),
          analysisState: bestResult ? 'complete' : 'queued',
          repositoryKey: 'current',
          repositoryLabel: getRepositoryLabel('current'),
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

    const [usersMap, assignmentRunsMap, resultsMap] = await Promise.all([
      loadUsersByIds([submission.student_id]),
      loadAssignmentRunsByIds([submission.assignment_run_id]),
      loadResultsBySubmissionIds([submissionId]),
    ])

    const submissionResults = (resultsMap.get(String(submissionId)) || []).sort(
      (left, right) => Number(right.score || 0) - Number(left.score || 0)
    )
    const sourceSubmissionIds = unique(submissionResults.map((row) => row.submission_2))
    const sourceSubmissionsMap = await loadSubmissionsByIds(sourceSubmissionIds)
    const sourceUsersMap = await loadUsersByIds(
      unique(
        Array.from(sourceSubmissionsMap.values()).map((row) => row.student_id)
      )
    )
    const assignment = assignmentRunsMap.get(String(submission.assignment_run_id))
    const bestScore = Number.isFinite(Number(submissionResults[0]?.score))
      ? Number(submissionResults[0].score)
      : null

    return {
      id: submission.submission_id,
      studentName: mapUserName(usersMap.get(String(submission.student_id)), submission.student_id),
      assignmentName: assignment?.name || `Assignment #${submission.assignment_run_id}`,
      language: assignment?.language || 'Unknown',
      submittedAt: formatShortTimestamp(submission.created_at),
      similarityScore: bestScore,
      status: getReviewStatus(bestScore),
      analysisState: submissionResults.length ? 'complete' : 'queued',
      summary: buildReportSummary(
        assignment?.name || `Assignment #${submission.assignment_run_id}`,
        bestScore,
        submissionResults.length
      ),
      engineVersion: submissionResults.length ? 'Supabase results table' : null,
      matches: submissionResults.slice(0, 5).map((resultRow) => {
        const sourceSubmission = sourceSubmissionsMap.get(String(resultRow.submission_2))
        const sourceUser = sourceSubmission
          ? sourceUsersMap.get(String(sourceSubmission.student_id))
          : null
        const sourceLabel = buildSourceLabel(sourceUser, resultRow.submission_2)

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
    const sourceUsersMap = await loadUsersByIds(
      unique([submission.student_id, sourceSubmission?.student_id])
    )

    const sourceLabel = buildSourceLabel(
      sourceUsersMap.get(String(sourceSubmission?.student_id)),
      bestResult.submission_2
    )

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
