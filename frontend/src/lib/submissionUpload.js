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

  // Look up assignment run to get the numeric assign_id
  const { data: assignmentRun, error: lookupError } = await supabase
    .from('assignment_runs')
    .select('assignment_run_id, assign_id')
    .eq('assignment_run_id', normalizedAssignmentRunId)
    .single()

  if (lookupError || !assignmentRun) {
    throw new Error('Invalid assignment key. Please check the key and try again.')
  }

  // Look up course_id from the assignment
  const { data: assignmentRow, error: assignmentError } = await supabase
    .from('assignments')
    .select('assign_id, course_id')
    .eq('assign_id', assignmentRun.assign_id)
    .single()

  if (assignmentError || !assignmentRow) {
    throw new Error('Could not find the assignment associated with this key.')
  }

  const studentId = buildStudentId(email, firstName, lastName)

  // POST to backend — it handles storage upload, DB inserts, and plagiarism analysis
  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('student', String(studentId))
  formData.append('assignment', String(assignmentRun.assign_id))
  formData.append('course', String(assignmentRow.course_id))

  const res = await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || 'Upload failed. Please try again.')
  }

  return { assignmentRun }
}
