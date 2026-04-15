const backendApiBaseUrl = String(
  import.meta.env.VITE_ANALYSIS_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
)
  .trim()
  .replace(/\/+$/, '')

const analysisEndpointPath = String(
  import.meta.env.VITE_ANALYSIS_ENDPOINT || '/result'
).trim()

const studentSubmitEndpointPath = String(
  import.meta.env.VITE_STUDENT_SUBMIT_ENDPOINT || '/submit'
).trim()

const repositoryEndpointPath = String(
  import.meta.env.VITE_REPOSITORY_ENDPOINT || '/repository'
).trim()

function buildBackendUrl(path, missingMessage) {
  if (!backendApiBaseUrl) {
    throw new Error(missingMessage)
  }

  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`

  return `${backendApiBaseUrl}${normalizedPath}`
}

function buildNetworkErrorMessage() {
  return 'Unable to reach the analysis backend. Check that the Railway URL is correct, the backend is running, and CORS allows this frontend origin.'
}

async function parseAnalysisResponse(response) {
  const responseText = await response.text()

  if (!responseText) {
    return { message: '' }
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return { message: responseText }
  }
}

function buildTextMessage(payload, fallbackMessage) {
  return (
    String(payload?.message || payload?.detail || payload?.error || '').trim() || fallbackMessage
  )
}

export async function generateAssignmentResult({ assignmentRunId, repositoryId }) {
  const normalizedAssignmentRunId = String(assignmentRunId || '').trim()
  const normalizedRepositoryId = String(repositoryId || '').trim()

  if (!normalizedAssignmentRunId) {
    throw new Error('Missing assignment run id for analysis.')
  }

  if (!normalizedRepositoryId) {
    throw new Error('Missing repository id for analysis.')
  }

  const formData = new FormData()
  formData.append('repository', normalizedRepositoryId)
  formData.append('assignment', normalizedAssignmentRunId)

  let response

  try {
    response = await fetch(
      buildBackendUrl(
        analysisEndpointPath,
        'Missing VITE_ANALYSIS_API_BASE_URL. Add the backend URL before generating results.'
      ),
      {
        method: 'POST',
        body: formData,
      }
    )
  } catch {
    throw new Error(buildNetworkErrorMessage())
  }

  const payload = await parseAnalysisResponse(response)
  const message = buildTextMessage(
    payload,
    response.ok
      ? 'Analysis started successfully. Refresh the review queue in a moment if results take time to appear.'
      : 'The analysis service did not return a message.'
  )

  if (!response.ok) {
    throw new Error(message)
  }

  return {
    ...payload,
    message,
  }
}

export async function submitStudentWorkToBackend({
  assignmentRunId,
  studentId,
  firstName,
  lastName,
  email,
  file,
}) {
  const normalizedAssignmentRunId = String(assignmentRunId || '').trim()

  if (!normalizedAssignmentRunId) {
    throw new Error('Missing assignment key.')
  }

  if (!file) {
    throw new Error('Please select a file.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('assignment', normalizedAssignmentRunId)
  formData.append('student', String(studentId))
  formData.append('studentFirst', String(firstName || '').trim())
  formData.append('studentLast', String(lastName || '').trim())
  formData.append('studentEmail', String(email || '').trim())

  let response

  try {
    response = await fetch(
      buildBackendUrl(
        studentSubmitEndpointPath,
        'Missing VITE_ANALYSIS_API_BASE_URL. Add the backend URL before using student submit.'
      ),
      {
        method: 'POST',
        body: formData,
      }
    )
  } catch {
    throw new Error(buildNetworkErrorMessage())
  }

  const payload = await parseAnalysisResponse(response)
  const message = buildTextMessage(payload, 'The backend did not return a submission message.')

  if (!response.ok) {
    throw new Error(message)
  }

  return {
    ...payload,
    message,
  }
}

export async function uploadRepositorySourceToBackend({
  assignmentRunId,
  repositoryName,
  file,
}) {
  const normalizedAssignmentRunId = String(assignmentRunId || '').trim()

  if (!normalizedAssignmentRunId) {
    throw new Error('Missing assignment run id for repository upload.')
  }

  if (!file) {
    throw new Error('Please select a repository archive.')
  }

  const formData = new FormData()
  formData.append('file', file, file.name)
  formData.append('assignmentRun', normalizedAssignmentRunId)
  formData.append('repositoryName', String(repositoryName || file.name || '').trim())

  let response

  try {
    response = await fetch(
      buildBackendUrl(
        repositoryEndpointPath,
        'Missing VITE_ANALYSIS_API_BASE_URL. Add the backend URL before uploading repositories.'
      ),
      {
        method: 'POST',
        body: formData,
      }
    )
  } catch {
    throw new Error(buildNetworkErrorMessage())
  }

  const payload = await parseAnalysisResponse(response)
  const message = buildTextMessage(payload, 'The repository service did not return a message.')

  if (!response.ok) {
    throw new Error(message)
  }

  return {
    ...payload,
    message,
  }
}
