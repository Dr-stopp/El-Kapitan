export const DEFAULT_REPOSITORY_LABEL = 'Course Repository'

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

export function getRepositoryLabel() {
  return DEFAULT_REPOSITORY_LABEL
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

function buildContiguousBlocksFromLines(lineModels = []) {
  const blocks = []
  let currentStart = null
  let currentEnd = null

  lineModels.forEach((line) => {
    if (!line?.matched) {
      if (currentStart !== null) {
        blocks.push({ start: currentStart, end: currentEnd })
        currentStart = null
        currentEnd = null
      }
      return
    }

    if (currentStart === null) {
      currentStart = line.number
      currentEnd = line.number
      return
    }

    if (line.number === currentEnd + 1) {
      currentEnd = line.number
      return
    }

    blocks.push({ start: currentStart, end: currentEnd })
    currentStart = line.number
    currentEnd = line.number
  })

  if (currentStart !== null) {
    blocks.push({ start: currentStart, end: currentEnd })
  }

  return blocks
}

function buildMatchedBlocks(leftLines, rightLines, sections) {
  if (Array.isArray(sections) && sections.length) {
    return sections.map((section, index) => ({
      id: section.id ?? `stored-${index + 1}`,
      leftStartLine: section.leftStartLine,
      leftEndLine: section.leftEndLine,
      rightStartLine: section.rightStartLine,
      rightEndLine: section.rightEndLine,
      inferred: false,
    }))
  }

  const leftBlocks = buildContiguousBlocksFromLines(leftLines)
  const rightBlocks = buildContiguousBlocksFromLines(rightLines)
  const totalBlocks = Math.max(leftBlocks.length, rightBlocks.length)

  return Array.from({ length: totalBlocks }, (_, index) => {
    const leftBlock = leftBlocks[index] || leftBlocks[leftBlocks.length - 1]
    const rightBlock = rightBlocks[index] || rightBlocks[rightBlocks.length - 1]

    return {
      id: `inferred-${index + 1}`,
      leftStartLine: leftBlock?.start ?? 1,
      leftEndLine: leftBlock?.end ?? leftBlock?.start ?? 1,
      rightStartLine: rightBlock?.start ?? 1,
      rightEndLine: rightBlock?.end ?? rightBlock?.start ?? 1,
      inferred: true,
    }
  }).filter(
    (block) =>
      Number.isFinite(Number(block.leftStartLine)) && Number.isFinite(Number(block.rightStartLine))
  )
}

export function extractComparisonFileLabel(text = '', fallback = 'Source file') {
  const candidateLines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)

  for (const line of candidateLines) {
    const beginFileMatch = line.match(/begin file:\s*(.+?)\s*=*$/i)
    if (beginFileMatch?.[1]) {
      return beginFileMatch[1].trim()
    }

    if (/^[\w.-]+\.[a-z0-9]+$/i.test(line)) {
      return line
    }
  }

  return fallback
}

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

  const leftLines = toLineModels(leftRawLines, 'left')
  const rightLines = toLineModels(rightRawLines, 'right')
  const matchedBlocks = buildMatchedBlocks(leftLines, rightLines, sections)

  return {
    leftLines,
    rightLines,
    sharedLineCount: matchedLineNumbers.left.size || sharedLines.size,
    matchedSections: sections,
    matchedBlocks,
  }
}
