import { supabase } from './supabase'
import {
  submitStudentWorkToBackend,
  uploadRepositorySourceToBackend,
} from './analysisApi'

export const UPLOAD_OPTIONS = {
  file: {
    label: 'Code File',
    acceptedExtensions: ['.zip', '.c', '.cpp', '.java'],
    acceptAttr: '.zip,.c,.cpp,.java',
    submitLabel: 'Submit File',
    helperText: 'Upload a source file or archive for this assignment.',
  },
  repository: {
    label: 'Course Repository (.zip)',
    acceptedExtensions: ['.zip'],
    acceptAttr: '.zip',
    submitLabel: 'Upload Course Repository',
    helperText: 'Zip the course repository first, then upload the archive here.',
  },
}

const DEFAULT_REPOSITORY_NAMES = new Set([
  'Default Repository',
  'Assignment Repository',
  'Course Repository',
])

function extractPublicSubmissionId(payload) {
  return String(
    payload?.public_id ||
      payload?.publicId ||
      payload?.submissionReference ||
      payload?.encryptedSubmissionId ||
      payload?.submission_public_id ||
      ''
  ).trim()
}

export function sanitizePathSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildStudentId(email, firstName, lastName) {
  const seed = `${String(email || '').trim().toLowerCase()}|${String(firstName || '').trim().toLowerCase()}|${String(lastName || '').trim().toLowerCase()}`
  let hash = 0n

  for (const character of seed) {
    hash = (hash * 131n + BigInt(character.charCodeAt(0))) % 9007199254740991n
  }

  return Number(hash || 1n)
}

export function validateSubmissionFile(file, submissionKind = 'file') {
  if (!file) return 'Please select a file.'

  const option = UPLOAD_OPTIONS[submissionKind]

  if (!option) {
    return 'Unsupported upload type.'
  }

  const ext = '.' + String(file.name || '').split('.').pop().toLowerCase()
  if (!option.acceptedExtensions.includes(ext)) {
    return `Invalid file type. Accepted: ${option.acceptedExtensions.join(', ')}`
  }

  return null
}

function ensureSupabaseConfigured() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
  }
}

async function loadAssignmentRun(assignmentRunId) {
  const normalizedAssignmentRunId = String(assignmentRunId || '').trim()
  if (!normalizedAssignmentRunId) {
    throw new Error('Missing assignment key.')
  }

  const { data: assignmentRun, error: lookupError } = await supabase
    .from('assignment_runs')
    .select('assignment_run_id, assign_id')
    .eq('assignment_run_id', normalizedAssignmentRunId)
    .single()

  if (lookupError || !assignmentRun) {
    throw new Error('Invalid assignment key. Please check the key and try again.')
  }

  return assignmentRun
}

function hasRepositoryContent(repositoryRow) {
  if (!repositoryRow) {
    return false
  }

  const repositoryPath = String(repositoryRow.repository_path || '').trim()
  const repositoryName = String(repositoryRow.repository_name || '').trim()
  const hasMeaningfulName = repositoryName && !DEFAULT_REPOSITORY_NAMES.has(repositoryName)

  return Boolean(repositoryPath || hasMeaningfulName)
}

async function loadRepositoriesForAssignmentRun(assignmentRunId) {
  const { data, error } = await supabase
    .from('repositories')
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .eq('assignment_run_id', assignmentRunId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

async function uploadFileToStorage({
  assignmentRunId,
  file,
  assetKind,
  ownerSegment,
  storageRoot = 'submissions',
}) {
  const timestamp = Date.now()
  const safeName = sanitizePathSegment(file.name)
  const normalizedOwnerSegment = sanitizePathSegment(ownerSegment || 'source')
  const storagePath = `${sanitizePathSegment(storageRoot)}/${assignmentRunId}/${assetKind}/${normalizedOwnerSegment}_${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage.from('Submissions').upload(storagePath, file)

  if (uploadError) {
    throw new Error('File upload failed. Please try again.')
  }

  return storagePath
}

async function insertRepositoryRecord(
  assignmentRunId,
  storagePath,
  repositoryName,
  isDefault = false
) {
  const fileName = String(repositoryName || '').trim()
  const fallbackName =
    String(storagePath || '').split('/').filter(Boolean).pop() || 'repository.zip'
  const { data, error } = await supabase
    .from('repositories')
    .insert({
      assignment_run_id: assignmentRunId,
      repository_path: storagePath,
      repository_name: fileName || fallbackName,
      is_default: isDefault,
    })
    .select(
      'repository_id, assignment_run_id, repository_path, repository_name, is_default, created_at'
    )
    .single()

  if (error || !data) {
    throw error || new Error('Failed to create the repository record.')
  }

  return data
}

async function ensureDefaultRepositoryPlaceholder(assignmentRunId) {
  const existingRepositories = await loadRepositoriesForAssignmentRun(assignmentRunId)
  const defaultRepository = existingRepositories.find((repositoryRow) => repositoryRow.is_default)

  if (defaultRepository) {
    return defaultRepository
  }

  return insertRepositoryRecord(assignmentRunId, '', 'Default Repository', true)
}

async function syncInstructorRepositoryRecord({ assignmentRunId, file }) {
  await ensureDefaultRepositoryPlaceholder(assignmentRunId)

  const existingRepositories = await loadRepositoriesForAssignmentRun(assignmentRunId)
  const existingRepository = existingRepositories.find(
    (repositoryRow) => !repositoryRow.is_default && hasRepositoryContent(repositoryRow)
  )

  if (existingRepository) {
    return {
      repository: existingRepository,
      storagePath: existingRepository.repository_path || '',
    }
  }

  const storagePath = await uploadFileToStorage({
    assignmentRunId,
    file,
    assetKind: 'repository',
    ownerSegment: 'instructor_source',
    storageRoot: 'instructor-sources',
  })

  try {
    const repository = await insertRepositoryRecord(
      assignmentRunId,
      storagePath,
      file?.name,
      false
    )

    return {
      repository,
      storagePath,
    }
  } catch (error) {
    await supabase.storage.from('Submissions').remove([storagePath])
    throw error
  }
}

export async function uploadSubmissionAsset({
  assignmentRunId,
  firstName,
  lastName,
  email,
  file,
  submissionKind = 'file',
}) {
  const fileError = validateSubmissionFile(file, submissionKind)
  if (fileError) {
    throw new Error(fileError)
  }

  const studentId = buildStudentId(email, firstName, lastName)
  const backendResponse = await submitStudentWorkToBackend({
    assignmentRunId,
    studentId,
    firstName,
    lastName,
    email,
    file,
    submissionKind,
  })

  return {
    assignmentRunId,
    studentId,
    backendResponse,
    publicSubmissionId: extractPublicSubmissionId(backendResponse),
  }
}

export async function uploadInstructorSourceAsset({
  assignmentRunId,
  file,
  sourceKind = 'repository',
}) {
  ensureSupabaseConfigured()

  const fileError = validateSubmissionFile(file, sourceKind)
  if (fileError) {
    throw new Error(fileError)
  }

  const assignmentRun = await loadAssignmentRun(assignmentRunId)
  const backendResponse = await uploadRepositorySourceToBackend({
    assignmentRunId: assignmentRun.assignment_run_id,
    repositoryName: file?.name || 'Default Repository',
    file,
  })

  let repository = null
  let storagePath = ''

  try {
    // The dashboard reads repository metadata from Supabase. If the backend leaves only
    // a default placeholder row behind, try to persist the uploaded source here as a fallback.
    ;({ repository, storagePath } = await syncInstructorRepositoryRecord({
      assignmentRunId: assignmentRun.assignment_run_id,
      file,
    }))
  } catch (error) {
    console.warn(
      'Repository fallback sync failed after backend upload. Keeping the backend upload result.',
      error
    )
  }

  return {
    assignmentRun,
    backendResponse,
    repository,
    storagePath,
  }
}
