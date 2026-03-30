import { supabase } from './supabase'

export const UPLOAD_OPTIONS = {
  file: {
    label: 'Code File',
    acceptedExtensions: ['.zip', '.c', '.cpp', '.java'],
    acceptAttr: '.zip,.c,.cpp,.java',
    submitLabel: 'Submit File',
    helperText: 'Upload a source file or archive for this assignment.',
  },
  repository: {
    label: 'Repository (.zip)',
    acceptedExtensions: ['.zip'],
    acceptAttr: '.zip',
    submitLabel: 'Upload Repository',
    helperText: 'Zip your repository first, then upload the archive here.',
  },
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

export async function uploadSubmissionAsset({
  assignmentRunId,
  firstName,
  lastName,
  email,
  file,
  submissionKind = 'file',
}) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    )
  }

  const fileError = validateSubmissionFile(file, submissionKind)
  if (fileError) {
    throw new Error(fileError)
  }

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

  const timestamp = Date.now()
  const safeName = sanitizePathSegment(file.name)
  const storagePath = `submissions/${assignmentRun.assignment_run_id}/${submissionKind}/${sanitizePathSegment(
    firstName
  )}_${sanitizePathSegment(lastName)}_${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('Submissions')
    .upload(storagePath, file)

  if (uploadError) {
    throw new Error('File upload failed. Please try again.')
  }

  const { data: repositoryRow, error: repositoryError } = await supabase
    .from('repositories')
    .insert({
      assignment_id: assignmentRun.assignment_run_id,
      repository_path: storagePath,
    })
    .select('repository_id, assignment_id, repository_path, created_at')
    .single()

  if (repositoryError || !repositoryRow) {
    await supabase.storage.from('Submissions').remove([storagePath])
    throw new Error('The upload succeeded, but creating the repository record failed.')
  }

  const { data: submissionRow, error: submissionError } = await supabase
    .from('submissions')
    .insert({
      repository_id: repositoryRow.repository_id,
      student_id: buildStudentId(email, firstName, lastName),
      folder_path: storagePath,
      test_flag: submissionKind,
    })
    .select('submission_id, created_at, repository_id, student_id, folder_path, test_flag')
    .single()

  if (submissionError || !submissionRow) {
    await supabase.from('repositories').delete().eq('repository_id', repositoryRow.repository_id)
    await supabase.storage.from('Submissions').remove([storagePath])
    throw new Error('The upload finished, but saving the submission to the database failed.')
  }

  return {
    assignmentRun,
    repository: repositoryRow,
    submission: submissionRow,
    storagePath,
  }
}
