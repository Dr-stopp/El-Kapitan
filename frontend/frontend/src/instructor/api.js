import { supabase } from '../lib/supabase'
import {
  getMockSubmissionComparison,
  getMockSubmissionReport,
} from './mockData'
import JSZip from 'jszip'
import { DEFAULT_REPOSITORY_LABEL, formatShortTimestamp } from './utils'

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

function buildDataAccessError(error, fallbackMessage) {
  const code = String(error?.code || '').trim()
  const message = String(error?.message || '').trim()
  const detail = String(error?.details || '').trim()

  const parts = [fallbackMessage]

  if (code) {
    parts.push(`Code: ${code}.`)
  }

  if (message) {
    parts.push(message)
  }

  if (detail) {
    parts.push(detail)
  }

  return new Error(parts.join(' ').trim())
}

function mapUserName(submissionRow, fallbackId) {
  const explicitName = [
    String(submissionRow?.student_first_name || '').trim(),
    String(submissionRow?.student_last_name || '').trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return explicitName || parseStudentNameFromFolderPath(submissionRow?.folder_path) || `Student ${fallbackId}`
}

function getReviewStatus(score) {
  if (!Number.isFinite(score)) return 'Pending Review'
  if (score >= 75) return 'Flagged'
  if (score >= 40) return 'Needs Review'
  return 'Clear'
}

function buildRepositoryName(repositoryRow) {
  const explicitName = String(repositoryRow?.repository_name || '').trim()

  if (explicitName) {
    return explicitName
  }

  const pathName = String(repositoryRow?.repository_path || '')
    .split('/')
    .filter(Boolean)
    .pop()

  return pathName || DEFAULT_REPOSITORY_LABEL
}

function hasRepositoryContent(repositoryRow) {
  if (!repositoryRow) {
    return false
  }

  const repositoryPath = String(repositoryRow.repository_path || '').trim()
  const repositoryName = String(repositoryRow.repository_name || '').trim()
  const placeholderNames = new Set([DEFAULT_REPOSITORY_LABEL, 'Default Repository'])
  const hasMeaningfulName = repositoryName && !placeholderNames.has(repositoryName)

  return Boolean(repositoryPath || hasMeaningfulName || (!repositoryRow.is_default && repositoryRow.repository_id))
}

function pickPrimaryRepository(rows = []) {
  if (!rows.length) return null

  return [...rows].sort((left, right) => {
    const leftHasContent = hasRepositoryContent(left)
    const rightHasContent = hasRepositoryContent(right)

    if (leftHasContent !== rightHasContent) {
      return leftHasContent ? -1 : 1
    }

    if (Boolean(left.is_default) !== Boolean(right.is_default)) {
      return left.is_default ? 1 : -1
    }

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  })[0]
}

function mapAssignmentRun(row, assignmentRow, repositoryRow = null) {
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
    repository_id: repositoryRow?.repository_id ?? null,
    repository_path: repositoryRow?.repository_path ?? '',
    repository_name: buildRepositoryName(repositoryRow),
    repository_created_at: repositoryRow?.created_at ?? null,
    is_default_repository: Boolean(repositoryRow?.is_default),
    has_repository: hasRepositoryContent(repositoryRow),
  }
}

function sortCoursesByName(courses) {
  return [...courses].sort((left, right) =>
    String(left.course_name || '').localeCompare(String(right.course_name || ''))
  )
}

function isMissingRelation(error, relationName) {
  const code = String(error?.code || '').trim()
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const relation = String(relationName || '').toLowerCase()

  if (!relation) {
    return false
  }

  if (code === '42P01' && message.includes(relation)) {
    return true
  }

  if (code === 'PGRST205') {
    return message.includes(relation) || details.includes(relation)
  }

  return (
    (message.includes('could not find the table') || message.includes('schema cache')) &&
    (message.includes(relation) || details.includes(relation))
  )
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
    const keys = unique([item.submission_1, item.submission_2]).map((value) => String(value))

    for (const key of keys) {
      if (!accumulator.has(key)) {
        accumulator.set(key, [])
      }
      accumulator.get(key).push(item)
    }

    return accumulator
  }, new Map())
}

function pickBestResult(results = []) {
  if (!results.length) return null

  return [...results].sort(
    (left, right) => Number(right.score || 0) - Number(left.score || 0)
  )[0]
}

function getCounterpartSubmissionId(resultRow, currentSubmissionId) {
  const normalizedCurrentId = String(currentSubmissionId || '')

  if (String(resultRow?.submission_1 || '') === normalizedCurrentId) {
    return resultRow?.submission_2 ?? null
  }

  if (String(resultRow?.submission_2 || '') === normalizedCurrentId) {
    return resultRow?.submission_1 ?? null
  }

  return resultRow?.submission_2 ?? null
}

function orientSectionsForSubmission(sections, resultRow, currentSubmissionId) {
  if (
    String(resultRow?.submission_2 || '') !== String(currentSubmissionId || '') ||
    !Array.isArray(sections)
  ) {
    return sections || []
  }

  return sections.map((section) => ({
    id: section.id,
    leftStartLine: section.rightStartLine,
    leftEndLine: section.rightEndLine,
    rightStartLine: section.leftStartLine,
    rightEndLine: section.leftEndLine,
  }))
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
  return submissionRow?.test_flag === 'repository' ? 'Course Repository Upload' : 'Code File'
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

const RENDERABLE_SOURCE_EXTENSIONS = new Set([
  '.java',
  '.c',
  '.cc',
  '.cpp',
  '.cxx',
  '.h',
  '.hh',
  '.hpp',
  '.hxx',
  '.py',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cs',
  '.go',
  '.rb',
  '.php',
  '.kt',
  '.kts',
  '.swift',
  '.scala',
  '.rs',
  '.sql',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.md',
  '.txt',
])

function hasRenderableSourceExtension(fileName) {
  const normalized = String(fileName || '').toLowerCase()
  return Array.from(RENDERABLE_SOURCE_EXTENSIONS).some((extension) =>
    normalized.endsWith(extension)
  )
}

async function extractTextFromZipBlob(blob) {
  const zip = await JSZip.loadAsync(blob)
  const archiveFiles = Object.values(zip.files).filter((entry) => !entry.dir)

  if (!archiveFiles.length) {
    return ''
  }

  const preferredFiles = archiveFiles.filter((entry) => hasRenderableSourceExtension(entry.name))
  const candidateFiles = (preferredFiles.length ? preferredFiles : archiveFiles)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 12)

  const renderedFiles = []

  for (const entry of candidateFiles) {
    const text = (await entry.async('text')).replace(/\r\n/g, '\n')

    if (looksBinaryContent(entry.name, text)) {
      continue
    }

    renderedFiles.push(
      candidateFiles.length > 1 ? `// File: ${entry.name}\n${text}` : text
    )
  }

  return renderedFiles.join('\n\n').trim()
}

function looksBinaryContent(objectPath, text) {
  if (!text) return true
  if (String(objectPath || '').toLowerCase().endsWith('.bin')) return true
  if (text.startsWith('PK')) return true
  return Array.from(text.slice(0, 512)).some((character) => character.charCodeAt(0) < 9)
}

function normalizeStoragePath(objectPath) {
  return String(objectPath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

function getParentStoragePrefix(objectPath) {
  const normalized = normalizeStoragePath(objectPath)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length <= 1) return ''
  return segments.slice(0, -1).join('/')
}

function buildStorageCandidateScore(candidatePath, originalPath) {
  const normalizedCandidate = String(candidatePath || '').toLowerCase()
  const originalSegments = normalizeStoragePath(originalPath).split('/').filter(Boolean)
  const originalFileName = String(originalSegments[originalSegments.length - 1] || '').toLowerCase()
  const originalStem = originalFileName.replace(/\.[^.]+$/, '')
  const candidateFileName = getFileNameFromPath(candidatePath).toLowerCase()

  let score = 0

  if (candidateFileName === originalFileName) score += 120
  if (originalStem && candidateFileName.includes(originalStem)) score += 60
  if (hasRenderableSourceExtension(candidateFileName)) score += 30
  if (candidateFileName.endsWith('.zip') || candidateFileName.includes('.zip.')) score += 20

  const originalPrefix = getParentStoragePrefix(originalPath)
  if (originalPrefix && normalizedCandidate.startsWith(originalPrefix.toLowerCase())) score += 10

  score -= normalizedCandidate.split('/').length

  return score
}

async function listStorageFilesRecursively(prefix, depthLimit = 3, fileLimit = 40) {
  const normalizedPrefix = normalizeStoragePath(prefix)
  const queue = [{ prefix: normalizedPrefix, depth: 0 }]
  const discoveredFiles = []
  const visitedPrefixes = new Set()

  while (queue.length && discoveredFiles.length < fileLimit) {
    const { prefix: currentPrefix, depth } = queue.shift()
    const cacheKey = `${currentPrefix}|${depth}`
    if (visitedPrefixes.has(cacheKey)) continue
    visitedPrefixes.add(cacheKey)

    const { data, error } = await supabase.storage.from('Submissions').list(currentPrefix, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error || !Array.isArray(data) || !data.length) {
      continue
    }

    for (const entry of data) {
      const entryName = String(entry?.name || '').trim()
      if (!entryName) continue

      const fullPath = currentPrefix ? `${currentPrefix}/${entryName}` : entryName
      const isFile = Boolean(entry?.id || entry?.metadata)

      if (isFile) {
        discoveredFiles.push(fullPath)
        if (discoveredFiles.length >= fileLimit) {
          break
        }
        continue
      }

      if (depth < depthLimit) {
        queue.push({ prefix: fullPath, depth: depth + 1 })
      }
    }
  }

  return discoveredFiles
}

async function downloadResolvedStorageBlob(objectPath) {
  const normalizedPath = normalizeStoragePath(objectPath)
  if (!normalizedPath) {
    return { path: '', blob: null }
  }

  const directDownload = await supabase.storage.from('Submissions').download(normalizedPath)
  if (!directDownload.error && directDownload.data) {
    return { path: normalizedPath, blob: directDownload.data }
  }

  const candidatePrefixes = unique([
    normalizedPath,
    getParentStoragePrefix(normalizedPath),
  ]).filter(Boolean)

  let discoveredFiles = []

  for (const prefix of candidatePrefixes) {
    const listedFiles = await listStorageFilesRecursively(prefix)
    if (listedFiles.length) {
      discoveredFiles = discoveredFiles.concat(listedFiles)
    }
  }

  const bestPath = unique(discoveredFiles)
    .sort(
      (left, right) =>
        buildStorageCandidateScore(right, normalizedPath) -
        buildStorageCandidateScore(left, normalizedPath)
    )[0]

  if (!bestPath) {
    return { path: normalizedPath, blob: null }
  }

  const fallbackDownload = await supabase.storage.from('Submissions').download(bestPath)
  if (fallbackDownload.error || !fallbackDownload.data) {
    return { path: bestPath, blob: null }
  }

  return { path: bestPath, blob: fallbackDownload.data }
}

async function readStorageText(objectPath) {
  if (!objectPath) return ''

  const { path: resolvedPath, blob: data } = await downloadResolvedStorageBlob(objectPath)

  if (!data) {
    return ''
  }

  const normalizedPath = String(resolvedPath || objectPath || '').toLowerCase()

  if (normalizedPath.endsWith('.zip') || normalizedPath.includes('.zip.')) {
    try {
      const extractedText = await extractTextFromZipBlob(data)
      if (extractedText) {
        return extractedText
      }
    } catch {
      // Fall through to plain-text read in case the file only looks like a zip by name.
    }
  }

  const text = await data.text()

  if (looksBinaryContent(resolvedPath || objectPath, text)) {
    try {
      const extractedText = await extractTextFromZipBlob(data)
      return extractedText || ''
    } catch {
      return ''
    }
  }

  return text.replace(/\r\n/g, '\n')
}

function parseStoredSections(text) {
  const normalizedText = String(text || '').trim()

  if (!normalizedText) {
    return []
  }

  try {
    const parsed = JSON.parse(normalizedText)
    if (Array.isArray(parsed)) {
      return parsed
        .map((row, index) => ({
          id: row.id ?? index + 1,
          leftStartLine: Number(row.leftStartLine ?? row.file_1_start ?? row.submission_1_sec_start),
          leftEndLine: Number(row.leftEndLine ?? row.file_1_end ?? row.submission_1_sec_end),
          rightStartLine: Number(
            row.rightStartLine ?? row.file_2_start ?? row.submission_2_sec_start
          ),
          rightEndLine: Number(
            row.rightEndLine ?? row.file_2_end ?? row.submission_2_sec_end
          ),
        }))
        .filter(
          (row) =>
            Number.isFinite(row.leftStartLine) &&
            Number.isFinite(row.leftEndLine) &&
            Number.isFinite(row.rightStartLine) &&
            Number.isFinite(row.rightEndLine)
        )
    }
  } catch {
    // Fall through to CSV parsing.
  }

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const dataLines =
    lines[0]?.toLowerCase().includes('file_1_start') || lines[0]?.toLowerCase().includes('left')
      ? lines.slice(1)
      : lines

  return dataLines
    .map((line, index) => {
      const [leftStart, leftEnd, rightStart, rightEnd] = line
        .split(',')
        .map((value) => Number(value.trim()))

      return {
        id: index + 1,
        leftStartLine: leftStart,
        leftEndLine: leftEnd,
        rightStartLine: rightStart,
        rightEndLine: rightEnd,
      }
    })
    .filter(
      (row) =>
        Number.isFinite(row.leftStartLine) &&
        Number.isFinite(row.leftEndLine) &&
        Number.isFinite(row.rightStartLine) &&
        Number.isFinite(row.rightEndLine)
    )
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
  const repositoryMap = await loadRepositoriesByAssignmentRunIds(
    unique((data || []).map((row) => row.assignment_run_id))
  )

  return new Map(
    (data || []).map((row) => [
      String(row.assignment_run_id),
      mapAssignmentRun(
        row,
        assignmentMap.get(String(row.assign_id)),
        repositoryMap.get(String(row.assignment_run_id)) || null
      ),
    ])
  )
}

async function loadRepositoriesByIds(repositoryIds) {
  if (!repositoryIds.length) return new Map()

  const { data, error } = await supabase
    .from('repositories')
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .in('repository_id', repositoryIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.repository_id), row]))
}

async function loadRepositoriesByAssignmentRunIds(assignmentRunIds) {
  if (!assignmentRunIds.length) return new Map()

  const { data, error } = await supabase
    .from('repositories')
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .in('assignment_run_id', assignmentRunIds)

  if (error) throw error

  return (data || []).reduce((accumulator, row) => {
    const key = String(row.assignment_run_id)
    const existing = accumulator.get(key)
    accumulator.set(key, pickPrimaryRepository([existing, row].filter(Boolean)))
    return accumulator
  }, new Map())
}

async function loadAllRepositoriesByAssignmentRunIds(assignmentRunIds) {
  if (!assignmentRunIds.length) return new Map()

  const { data, error } = await supabase
    .from('repositories')
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .in('assignment_run_id', assignmentRunIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.repository_id), row]))
}

async function createDefaultRepositoryRecord(assignmentRunId) {
  const { data: existingRows, error: existingError } = await supabase
    .from('repositories')
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .eq('assignment_run_id', assignmentRunId)
    .eq('is_default', true)
    .limit(1)

  if (existingError) {
    throw existingError
  }

  if ((existingRows || []).length) {
    return existingRows[0]
  }

  const { data, error } = await supabase
    .from('repositories')
    .insert({
      assignment_run_id: assignmentRunId,
      repository_path: '',
      is_default: true,
      repository_name: 'Default Repository',
    })
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .single()

  if (error || !data) {
    throw error || new Error('Failed to create the default repository row.')
  }

  return data
}

async function loadCourseSubmissionDataset(courseId) {
  const assignments = await fetchInstructorAssignments(courseId)

  if (!assignments.length) {
    return {
      assignments: [],
      assignmentMap: new Map(),
      repositoriesMap: new Map(),
      submissions: [],
    }
  }

  const assignmentMap = new Map(
    assignments.map((item) => [String(item.assignment_run_id), item])
  )
  const repositoriesMap = await loadAllRepositoriesByAssignmentRunIds(
    assignments.map((item) => item.assignment_run_id)
  )
  const repositoryIds = Array.from(repositoriesMap.keys())

  if (!repositoryIds.length) {
    return {
      assignments,
      assignmentMap,
      repositoriesMap,
      submissions: [],
    }
  }

  const { data: submissionRows, error: submissionsError } = await supabase
    .from('submissions')
    .select('submission_id, created_at, repository_id, student_first_name, student_last_name, folder_path')
    .in('repository_id', repositoryIds)
    .order('created_at', { ascending: false })

  if (submissionsError) throw submissionsError

  return {
    assignments,
    assignmentMap,
    repositoriesMap,
    submissions: submissionRows || [],
  }
}

async function loadSubmissionsByIds(submissionIds) {
  if (!submissionIds.length) return new Map()

  const { data, error } = await supabase
    .from('submissions')
    .select('submission_id, created_at, repository_id, student_first_name, student_last_name, folder_path')
    .in('submission_id', submissionIds)

  if (error) throw error

  return new Map((data || []).map((row) => [String(row.submission_id), row]))
}

async function loadResultsBySubmissionIds(submissionIds) {
  if (!submissionIds.length) return new Map()

  const filterValues = buildNumericInFilter(submissionIds)
  if (!filterValues) return new Map()

  const { data, error } = await supabase
    .from('results')
    .select('submission_1, submission_2, score, pair_id, date_created, result_path')
    .or(`submission_1.in.(${filterValues}),submission_2.in.(${filterValues})`)

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

  if (error) {
    if (isMissingRelation(error, 'results_sections')) {
      return []
    }

    throw error
  }

  return (data || []).map((row) => ({
    id: row.section_id,
    leftStartLine: row.submission_1_sec_start,
    leftEndLine: row.submission_1_sec_end,
    rightStartLine: row.submission_2_sec_start,
    rightEndLine: row.submission_2_sec_end,
  }))
}

async function loadComparisonSections(resultRow) {
  if (!resultRow) return []

  const directSections = await loadResultSections(resultRow.pair_id)

  if (directSections.length || !resultRow.result_path) {
    return directSections
  }

  return parseStoredSections(await readStorageText(resultRow.result_path))
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
    return []
  }

  const submissionFilter = `submission_1.in.(${filterValues}),submission_2.in.(${filterValues})`
  const { data: resultRows, error: resultsLookupError } = await supabase
    .from('results')
    .select('pair_id, result_path')
    .or(submissionFilter)

  if (resultsLookupError) {
    if (isMissingRelation(resultsLookupError, 'results')) {
      return []
    }

    throw resultsLookupError
  }

  const pairIds = unique((resultRows || []).map((row) => row.pair_id))
  const resultPaths = unique((resultRows || []).map((row) => row.result_path))

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

  return resultPaths
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
    .in('assignment_run_id', normalizedAssignmentRunIds)

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
  const comparisonPaths = await deleteStoredComparisonRows(submissionIds)
  const storagePaths = unique([
    ...(repositoryRows || []).map((row) => row.repository_path),
    ...submissionRows.map((row) => row.folder_path),
    ...comparisonPaths,
  ])

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

  const repositoryMap = await loadRepositoriesByAssignmentRunIds(
    unique((runRows || []).map((row) => row.assignment_run_id))
  )

  return (runRows || []).map((row) =>
    mapAssignmentRun(
      row,
      assignmentMap.get(String(row.assign_id)),
      repositoryMap.get(String(row.assignment_run_id)) || null
    )
  )
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

  let defaultRepository = null

  try {
    defaultRepository = await createDefaultRepositoryRecord(assignmentRun.assignment_run_id)
  } catch (repositoryError) {
    await supabase
      .from('assignment_runs')
      .delete()
      .eq('assignment_run_id', assignmentRun.assignment_run_id)

    await supabase.from('assignments').delete().eq('assign_id', assignment.assign_id)

    throw repositoryError
  }

  return mapAssignmentRun(assignmentRun, assignment, defaultRepository)
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

    const { assignmentMap, repositoriesMap, submissions } = await loadCourseSubmissionDataset(courseId)

    if (!submissions.length) {
      return { submissions: [] }
    }
    let resultsMap = new Map()

    try {
      resultsMap = await loadResultsBySubmissionIds(
        unique(submissions.map((row) => row.submission_id))
      )
    } catch (resultsError) {
      console.warn(
        'Stored results could not be loaded for the review queue. Showing submissions without similarity scores.',
        resultsError
      )
    }

    return {
      submissions: submissions.map((submission) => {
        const repository = repositoriesMap.get(String(submission.repository_id))
        const assignment = assignmentMap.get(String(repository?.assignment_run_id))
        const bestResult = pickBestResult(resultsMap.get(String(submission.submission_id)) || [])
        const similarityScore = Number.isFinite(Number(bestResult?.score))
          ? Number(bestResult.score)
          : null

        return {
          id: submission.submission_id,
          studentName: mapUserName(submission, submission.submission_id),
          assignmentName: assignment?.name || `Assignment #${repository?.assignment_run_id || submission.repository_id}`,
          language: assignment?.language || 'Unknown',
          similarityScore,
          status: getReviewStatus(similarityScore),
          analysisState: bestResult ? 'complete' : 'queued',
          repositoryKey: 'current',
          repositoryLabel:
            buildRepositoryName(repository) || buildRepositoryLabel(submission) || DEFAULT_REPOSITORY_LABEL,
          excerpt: bestResult
            ? `Highest recorded similarity is ${similarityScore}% against submission #${getCounterpartSubmissionId(bestResult, submission.submission_id)}.`
            : 'No stored comparison results are available for this submission yet.',
          submittedAt: formatShortTimestamp(submission.created_at),
        }
      }),
    }
  } catch (error) {
    console.error('Failed to load review queue from live data.', error)
    throw buildDataAccessError(error, 'Failed to load review queue from the database.')
  }
}

export async function fetchAnalytics(courseId) {
  try {
    ensureSupabase()

    const { assignments, assignmentMap, repositoriesMap, submissions } =
      await loadCourseSubmissionDataset(courseId)
    const totalSubmissions = submissions.length
    let resultsMap = new Map()

    try {
      resultsMap = await loadResultsBySubmissionIds(
        unique(submissions.map((row) => row.submission_id))
      )
    } catch (resultsError) {
      console.warn(
        'Stored results could not be loaded for analytics. Showing submission totals without similarity scores.',
        resultsError
      )
    }

    const queueLikeSubmissions = submissions.map((submission) => {
      const repository = repositoriesMap.get(String(submission.repository_id))
      const assignment = assignmentMap.get(String(repository?.assignment_run_id))
      const bestResult = pickBestResult(resultsMap.get(String(submission.submission_id)) || [])
      const similarityScore = Number.isFinite(Number(bestResult?.score))
        ? Number(bestResult.score)
        : null

      return {
        id: submission.submission_id,
        language: assignment?.language || 'Unknown',
        similarityScore,
        status: getReviewStatus(similarityScore),
      }
    })

    const flaggedCases = queueLikeSubmissions.filter((item) => item.status === 'Flagged').length
    const reviewCases = queueLikeSubmissions.filter((item) => item.status === 'Needs Review').length

    const languageCounts = Object.entries(
      queueLikeSubmissions.reduce((accumulator, item) => {
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
      priorityCases: [...queueLikeSubmissions]
        .filter((item) => Number.isFinite(item.similarityScore))
        .sort((left, right) => (right.similarityScore || 0) - (left.similarityScore || 0))
        .slice(0, 5),
      languageCounts,
    }
  } catch (error) {
    console.error('Failed to load analytics from live data.', error)
    throw buildDataAccessError(error, 'Failed to load analytics from the database.')
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
      loadAssignmentRunsByIds(repository?.assignment_run_id ? [repository.assignment_run_id] : []),
      loadResultsBySubmissionIds([submissionId]),
    ])

    const submissionResults = (resultsMap.get(String(submissionId)) || []).sort(
      (left, right) => Number(right.score || 0) - Number(left.score || 0)
    )
    const sourceSubmissionIds = unique(
      submissionResults.map((row) => getCounterpartSubmissionId(row, submissionId))
    )
    const sourceSubmissionsMap = await loadSubmissionsByIds(sourceSubmissionIds)
    const assignment = assignmentRunsMap.get(String(repository?.assignment_run_id))
    const bestScore = Number.isFinite(Number(submissionResults[0]?.score))
      ? Number(submissionResults[0].score)
      : null

    const fallbackAssignmentName = `Assignment #${repository?.assignment_run_id || submission.repository_id}`

    return {
      id: submission.submission_id,
      studentName: mapUserName(submission, submission.submission_id),
      assignmentName: assignment?.name || fallbackAssignmentName,
      language: assignment?.language || 'Unknown',
      submittedAt: formatShortTimestamp(submission.created_at),
      similarityScore: bestScore,
      status: getReviewStatus(bestScore),
      analysisState: submissionResults.length ? 'complete' : 'queued',
      summary: buildReportSummary(
        assignment?.name || fallbackAssignmentName,
        bestScore,
        submissionResults.length
      ),
      engineVersion: submissionResults.length ? 'Supabase results table' : null,
      matches: submissionResults.slice(0, 5).map((resultRow) => {
        const sourceSubmissionId = getCounterpartSubmissionId(resultRow, submissionId)
        const sourceSubmission = sourceSubmissionsMap.get(String(sourceSubmissionId))
        const sourceLabel = buildSourceLabel(sourceSubmission, sourceSubmissionId)

        return {
          pairId: resultRow.pair_id,
          sourceSubmissionId,
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

export async function fetchSubmissionComparison(submissionId, { pairId } = {}) {
  try {
    ensureSupabase()

    const submissionMap = await loadSubmissionsByIds([submissionId])
    const submission = submissionMap.get(String(submissionId))

    if (!submission) {
      throw new Error('Submission not found.')
    }

    const resultsMap = await loadResultsBySubmissionIds([submissionId])
    const allResults = resultsMap.get(String(submissionId)) || []
    const bestResult = pairId
      ? allResults.find((r) => String(r.pair_id) === String(pairId)) || pickBestResult(allResults)
      : pickBestResult(allResults)

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

    const sourceSubmissionId = getCounterpartSubmissionId(bestResult, submissionId)

    const [sourceSubmissionMap, rawSections] = await Promise.all([
      loadSubmissionsByIds([sourceSubmissionId]),
      loadComparisonSections(bestResult),
    ])

    const sourceSubmission = sourceSubmissionMap.get(String(sourceSubmissionId))
    const sourceLabel = buildSourceLabel(sourceSubmission, sourceSubmissionId)
    const sections = orientSectionsForSubmission(rawSections, bestResult, submissionId)

    const [leftText, rightText] = await Promise.all([
      readStorageText(submission.folder_path),
      readStorageText(sourceSubmission?.folder_path),
    ])
    const usedPlaceholderLeft = !leftText
    const usedPlaceholderRight = !rightText
    const missingSections = sections.length === 0

    const fallbackNotes =
      leftText && rightText
        ? bestResult.result_path
          ? 'Highlighted lines come from the stored result details saved for this comparison.'
          : 'Highlighted lines come from the stored comparison ranges when available.'
        : 'Original file contents were not readable from storage, so this comparison view shows placeholder lines for the stored match ranges.'

    return {
      id: submission.submission_id,
      pairId: bestResult.pair_id,
      sourceLabel,
      similarityScore: Number(bestResult.score || 0),
      analysisState: 'complete',
      leftText: leftText || buildPlaceholderCode('Current submission', sections, 'left'),
      rightText: rightText || buildPlaceholderCode(sourceLabel, sections, 'right'),
      usedPlaceholderLeft,
      usedPlaceholderRight,
      missingSections,
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

  const { blob } = await downloadResolvedStorageBlob(objectPath)
  return blob
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
    .select('submission_id, created_at, repository_id, student_first_name, student_last_name, folder_path')
    .in('repository_id', repositoryIds)
    .order('created_at', { ascending: true })

  if (submissionsError) throw submissionsError

  const submissions = submissionRows || []
  const resultsMap = await loadResultsBySubmissionIds(
    unique(submissions.map((row) => row.submission_id))
  )

  return { submissions, resultsMap }
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

  // Download all submission files in batches of 5
  const blobs = await batchProcess(
    submissions,
    5,
    async (submission) => downloadStorageBlob(submission.folder_path)
  )

  // Build a ZIP per student submission + collect CSV rows
  const csvRows = []

  for (let i = 0; i < submissions.length; i++) {
    const submission = submissions[i]
    const blobResult = blobs[i]

    // Create an inner ZIP for this submission, named by submission_id
    if (blobResult.status === 'fulfilled' && blobResult.value) {
      const innerZip = new JSZip()
      const fileName = getFileNameFromPath(submission.folder_path)
      innerZip.file(fileName, blobResult.value)
      const innerBlob = await innerZip.generateAsync({ type: 'blob' })
      zip.file(`${submission.submission_id}.zip`, innerBlob)
    }

    // Collect CSV row
    const submissionResults = resultsMap.get(String(submission.submission_id)) || []
    const studentName = mapUserName(submission, submission.submission_id)
    const bestResult = submissionResults.length
      ? submissionResults.reduce((best, r) => (Number(r.score || 0) > Number(best.score || 0) ? r : best), submissionResults[0])
      : null

    csvRows.push([
      studentName,
      submission.submission_id,
      submission.created_at,
      bestResult ? Number(bestResult.score || 0) : '',
      bestResult ? bestResult.submission_2 : '',
      getFileNameFromPath(submission.folder_path),
    ])
  }

  // Build summary.csv
  const csvHeader = 'student_name,submission_id,submitted_at,highest_score,matched_submission_id,file_name'
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
  link.download = `${safeName}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
