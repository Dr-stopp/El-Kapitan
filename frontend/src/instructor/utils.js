export const REPOSITORY_SCOPE_OPTIONS = [
  {
    id: 'current',
    label: 'Current Course',
    note: 'Review submissions stored for the active offering.',
  },
  {
    id: 'archive',
    label: 'Previous Offerings',
    note: 'Use archived course data when those repositories are added.',
  },
  {
    id: 'secondary',
    label: 'Secondary Repository',
    note: 'Reserve space for department-maintained reference repos.',
  },
  {
    id: 'public',
    label: 'Public Samples',
    note: 'Track overlap against curated public examples when available.',
  },
]

const PRIVACY_STORAGE_KEY = 'elkapitan-instructor-privacy-mode'

export function formatDueDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No due date'
  }

  const datePart = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${datePart} ${timePart}`
}

export function formatShortTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getRepositoryLabel(repositoryKey) {
  return (
    REPOSITORY_SCOPE_OPTIONS.find((option) => option.id === repositoryKey)?.label ||
    'Current Course'
  )
}

export function getInitialPrivacyMode() {
  if (typeof window === 'undefined') return 'masked'
  return window.localStorage.getItem(PRIVACY_STORAGE_KEY) || 'masked'
}

export function persistPrivacyMode(mode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRIVACY_STORAGE_KEY, mode)
}

export function getDisplayStudentName(studentName, fallbackId, privacyMode = 'masked') {
  if (privacyMode === 'revealed') {
    return studentName || `Student ${fallbackId}`
  }

  const stableId = String(fallbackId ?? studentName ?? '0000')
    .replace(/\W+/g, '')
    .slice(-4)
    .padStart(4, '0')

  return `Student ${stableId}`
}

export function getSimilarityBand(score = 0) {
  if (score >= 75) return { label: 'High overlap', tone: 'high' }
  if (score >= 40) return { label: 'Moderate overlap', tone: 'medium' }
  return { label: 'Low overlap', tone: 'low' }
}

export function normalizeAnalysisState(value = '') {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'processing' || normalized === 'complete' || normalized === 'failed') {
    return normalized
  }

  return 'queued'
}

export function formatAnalysisStateLabel(value = '') {
  const state = normalizeAnalysisState(value)
  return state.charAt(0).toUpperCase() + state.slice(1)
}

const normalizeCodeLine = (line) => line.trim().replace(/\s+/g, ' ')

export function buildComparisonViewModel(leftText = '', rightText = '', sections = []) {
  const leftRawLines = String(leftText || '').split('\n')
  const rightRawLines = String(rightText || '').split('\n')
  const rightNormalizedSet = new Set(
    rightRawLines.map(normalizeCodeLine).filter((line) => line.length > 3)
  )
  const sharedLines = new Set(
    leftRawLines
      .map(normalizeCodeLine)
      .filter((line) => line.length > 3 && rightNormalizedSet.has(line))
  )

  const matchedLineNumbers = {
    left: new Set(),
    right: new Set(),
  }

  sections.forEach((section) => {
    for (let line = section.leftStartLine; line <= section.leftEndLine; line += 1) {
      matchedLineNumbers.left.add(line)
    }
    for (let line = section.rightStartLine; line <= section.rightEndLine; line += 1) {
      matchedLineNumbers.right.add(line)
    }
  })

  const toLineModels = (lines, side) =>
    lines.map((text, index) => {
      const normalized = normalizeCodeLine(text)
      const lineNumber = index + 1
      const hasStoredMatches = matchedLineNumbers[side].size > 0

      return {
        number: lineNumber,
        text,
        matched: hasStoredMatches
          ? matchedLineNumbers[side].has(lineNumber)
          : normalized.length > 3 && sharedLines.has(normalized),
      }
    })

  return {
    leftLines: toLineModels(leftRawLines, 'left'),
    rightLines: toLineModels(rightRawLines, 'right'),
    sharedLineCount: matchedLineNumbers.left.size || sharedLines.size,
    matchedSections: sections,
  }
}
