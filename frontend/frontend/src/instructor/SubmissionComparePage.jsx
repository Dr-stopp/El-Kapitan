import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  fetchRepositoryComparisonSource,
  fetchSubmissionComparison,
} from './api'
import {
  buildComparisonViewModel,
  extractComparisonFileLabel,
  formatAnalysisStateLabel,
  normalizeAnalysisState,
  parseStructuredSourceFiles,
} from './utils'

function mergeRanges(ranges) {
  if (!ranges.length) return []

  const sortedRanges = [...ranges].sort((left, right) => left.start - right.start)
  const merged = [sortedRanges[0]]

  for (let index = 1; index < sortedRanges.length; index += 1) {
    const current = sortedRanges[index]
    const previous = merged[merged.length - 1]

    if (current.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, current.end)
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

const MATCH_PALETTE = [
  'rgba(100, 181, 246, 0.35)',
  'rgba(129, 199, 132, 0.35)',
  'rgba(255, 183, 77, 0.35)',
  'rgba(186, 104, 200, 0.30)',
  'rgba(240, 98, 146, 0.30)',
  'rgba(77, 208, 225, 0.35)',
  'rgba(255, 213, 79, 0.35)',
  'rgba(161, 136, 127, 0.35)',
  'rgba(121, 134, 203, 0.35)',
  'rgba(174, 213, 129, 0.35)',
  'rgba(255, 138, 128, 0.35)',
  'rgba(128, 203, 196, 0.35)',
]

function findBlockIndex(lineNumber, matchedBlocks, side) {
  for (let index = 0; index < matchedBlocks.length; index += 1) {
    const block = matchedBlocks[index]
    if (
      lineNumber >= Number(block[`${side}StartLine`] || 1) &&
      lineNumber <= Number(block[`${side}EndLine`] || 1)
    ) {
      return index
    }
  }

  return -1
}

function buildRenderedRows(lines, matchedBlocks, viewMode, activeIndex, side, contextLines = 2) {
  if (viewMode === 'full' || !matchedBlocks.length) {
    return lines.map((line) => {
      const blockIndex = findBlockIndex(line.number, matchedBlocks, side)
      return {
        blockIndex,
        type: 'line',
        line,
        active: blockIndex >= 0 && blockIndex === activeIndex,
      }
    })
  }

  const ranges = mergeRanges(
    matchedBlocks.map((block) => ({
      start: Math.max(1, Number(block[`${side}StartLine`] || 1) - contextLines),
      end: Math.min(lines.length, Number(block[`${side}EndLine`] || 1) + contextLines),
    }))
  )

  const rows = []
  let currentRangeIndex = 0

  if (lines[0]) {
    const firstLine = lines[0]
    const firstRangeContainsHeader = ranges.some(
      (range) => firstLine.number >= range.start && firstLine.number <= range.end
    )

    if (!firstRangeContainsHeader) {
      const blockIndex = findBlockIndex(firstLine.number, matchedBlocks, side)
      rows.push({
        type: 'line',
        line: firstLine,
        blockIndex,
        active: blockIndex >= 0 && blockIndex === activeIndex,
      })
      if (lines.length > 1) {
        rows.push({
          type: 'gap',
          id: 'header-gap',
          hiddenCount: Math.max(0, ranges[0]?.start - firstLine.number - 1),
        })
      }
    }
  }

  ranges.forEach((range, index) => {
    const slicedLines = lines.filter(
      (line) => line.number >= range.start && line.number <= range.end
    )

    slicedLines.forEach((line) => {
      const blockIndex = findBlockIndex(line.number, matchedBlocks, side)
      rows.push({
        type: 'line',
        line,
        blockIndex,
        active: blockIndex >= 0 && blockIndex === activeIndex,
      })
    })

    currentRangeIndex = index

    if (index < ranges.length - 1) {
      const nextRange = ranges[index + 1]
      rows.push({
        type: 'gap',
        id: `gap-${index + 1}`,
        hiddenCount: Math.max(0, nextRange.start - range.end - 1),
      })
    }
  })

  if (!ranges.length) {
    return lines.map((line) => {
      const blockIndex = findBlockIndex(line.number, matchedBlocks, side)
      return {
        blockIndex,
        type: 'line',
        line,
        active: blockIndex >= 0 && blockIndex === activeIndex,
      }
    })
  }

  const lastRenderedLine = ranges[currentRangeIndex]?.end ?? 0
  if (lastRenderedLine < lines.length) {
    rows.push({
      type: 'gap',
      id: 'tail-gap',
      hiddenCount: Math.max(0, lines.length - lastRenderedLine),
    })
  }

  return rows
}

function scrollPaneToLine(paneRef, lineNumber) {
  if (!paneRef.current || !lineNumber) return

  const lineElement = paneRef.current.querySelector(`[data-line-number="${lineNumber}"]`)
  if (!lineElement) return

  lineElement.scrollIntoView({
    block: 'center',
  })
}

function normalizeFileLabel(label) {
  const normalized = String(label || '')
    .trim()
    .split(/[\\/]/)
    .pop()
    ?.toLowerCase() || ''

  return normalized
}

function buildFileMatchScore(file, preferredLabels = []) {
  const candidateLabel = normalizeFileLabel(file?.label)
  if (!candidateLabel) return 0

  return preferredLabels.reduce((bestScore, preferredLabel) => {
    const normalizedPreferred = normalizeFileLabel(preferredLabel)
    if (!normalizedPreferred) return bestScore
    if (candidateLabel === normalizedPreferred) return Math.max(bestScore, 100)

    const preferredStem = normalizedPreferred.replace(/\.[^.]+$/, '')
    const candidateStem = candidateLabel.replace(/\.[^.]+$/, '')

    if (candidateStem === preferredStem) return Math.max(bestScore, 80)
    if (candidateStem.includes(preferredStem) || preferredStem.includes(candidateStem)) {
      return Math.max(bestScore, 60)
    }

    return bestScore
  }, 0)
}

function uniqueLabels(labels = []) {
  return Array.from(
    new Set(
      labels
        .map((label) => String(label || '').trim())
        .filter(Boolean)
    )
  )
}

export default function SubmissionComparePage() {
  const { submissionId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const pairId = searchParams.get('pairId')

  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('focus')
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState(-1)
  const [selectedLeftFileId, setSelectedLeftFileId] = useState('')
  const [selectedRightRepositoryId, setSelectedRightRepositoryId] = useState('')
  const [selectedRightFileId, setSelectedRightFileId] = useState('')
  const [repositorySourcesById, setRepositorySourcesById] = useState({})
  const [repositorySourceErrorsById, setRepositorySourceErrorsById] = useState({})

  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)
  const syncingScrollRef = useRef(false)

  useEffect(() => {
    let ignore = false

    fetchSubmissionComparison(submissionId, { pairId })
      .then((data) => {
        if (!ignore) {
          setComparison(data)
          setSelectedLeftFileId('')
          setSelectedRightRepositoryId('')
          setSelectedRightFileId('')
          setActiveBlockIndex(0)
          setHoveredBlockIndex(-1)
        }
      })
      .catch((nextError) => {
        if (!ignore) {
          console.error(nextError)
          setError(nextError.message || 'Failed to load comparison.')
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
  }, [pairId, submissionId])

  const leftFiles = useMemo(
    () =>
      parseStructuredSourceFiles(
        comparison?.leftText || '',
        `Submission #${comparison?.id || submissionId}`
      ),
    [comparison?.id, comparison?.leftText, submissionId]
  )
  const repositoryOptions = comparison?.repositoryOptions || []
  const effectiveLeftFileId = leftFiles.some((file) => file.id === selectedLeftFileId)
    ? selectedLeftFileId
    : leftFiles[0]?.id || ''
  const effectiveRightRepositoryId = repositoryOptions.some(
    (option) => option.repositoryId === selectedRightRepositoryId
  )
    ? selectedRightRepositoryId
    : String(comparison?.defaultRepositoryId || repositoryOptions[0]?.repositoryId || '')

  useEffect(() => {
    let ignore = false

    if (
      !effectiveRightRepositoryId ||
      repositorySourcesById[effectiveRightRepositoryId] ||
      repositorySourceErrorsById[effectiveRightRepositoryId]
    ) {
      return undefined
    }

    fetchRepositoryComparisonSource(effectiveRightRepositoryId)
      .then((data) => {
        if (ignore) return
        setRepositorySourcesById((previous) => ({
          ...previous,
          [data.repositoryId]: data,
        }))
      })
      .catch((nextError) => {
        if (ignore) return
        console.error(nextError)
        setRepositorySourceErrorsById((previous) => ({
          ...previous,
          [effectiveRightRepositoryId]:
            nextError.message || 'Failed to load repository files for comparison.',
        }))
      })

    return () => {
      ignore = true
    }
  }, [
    effectiveRightRepositoryId,
    repositorySourceErrorsById,
    repositorySourcesById,
  ])

  const selectedLeftFile =
    leftFiles.find((file) => file.id === effectiveLeftFileId) || leftFiles[0] || null
  const repositorySource = repositorySourcesById[effectiveRightRepositoryId] || null
  const repositorySourceError = repositorySourceErrorsById[effectiveRightRepositoryId] || ''
  const rightFiles = useMemo(() => repositorySource?.files || [], [repositorySource])
  const preferredRightFileId = useMemo(() => {
    if (!rightFiles.length) return ''

    const originalRightLabel = extractComparisonFileLabel(
      comparison?.rightText,
      comparison?.sourceLabel || 'Matched source'
    )
    const preferredLabels = uniqueLabels([
      selectedLeftFile?.label,
      originalRightLabel,
      comparison?.sourceLabel,
    ])

    const scoredFiles = [...rightFiles]
      .map((file) => ({
        file,
        score: buildFileMatchScore(file, preferredLabels),
      }))
      .sort((left, right) => right.score - left.score)

    return scoredFiles[0]?.file?.id || rightFiles[0]?.id || ''
  }, [comparison?.rightText, comparison?.sourceLabel, rightFiles, selectedLeftFile?.label])
  const effectiveRightFileId = rightFiles.some((file) => file.id === selectedRightFileId)
    ? selectedRightFileId
    : preferredRightFileId
  const selectedRightFile =
    rightFiles.find((file) => file.id === effectiveRightFileId) || rightFiles[0] || null
  const selectedRepositoryOption =
    comparison?.repositoryOptions?.find(
      (option) => option.repositoryId === effectiveRightRepositoryId
    ) || null
  const isRepositorySourceLoading = Boolean(
    effectiveRightRepositoryId && !repositorySource && !repositorySourceError
  )
  const leftComparisonText = selectedLeftFile?.text || ''
  const rightComparisonText = selectedRightFile?.text || ''

  const comparisonView = useMemo(
    () =>
      buildComparisonViewModel(
        leftComparisonText,
        rightComparisonText,
        []
      ),
    [leftComparisonText, rightComparisonText]
  )

  const analysisState = normalizeAnalysisState(comparison?.analysisState)
  const isUsingPlaceholderText =
    Boolean(comparison?.usedPlaceholderLeft) || Boolean(comparison?.usedPlaceholderRight)
  const isMissingStoredSections = Boolean(comparison?.missingSections)
  const matchedBlockCount = comparisonView.matchedBlocks.length
  const effectiveActiveBlockIndex = matchedBlockCount
    ? Math.min(activeBlockIndex, matchedBlockCount - 1)
    : 0
  const activeBlock = comparisonView.matchedBlocks[effectiveActiveBlockIndex] || null

  const leftFileLabel =
    selectedLeftFile?.label ||
    extractComparisonFileLabel(comparison?.leftText, `Submission #${comparison?.id || submissionId}`)
  const rightFileLabel =
    selectedRightFile?.label ||
    extractComparisonFileLabel(rightComparisonText, selectedRepositoryOption?.repositoryName || 'Repository file')
  const selectedRepositoryName =
    selectedRepositoryOption?.repositoryName ||
    repositorySource?.repositoryName ||
    'Select a repository'

  const leftRenderedRows = useMemo(
    () =>
      buildRenderedRows(
        comparisonView.leftLines,
        comparisonView.matchedBlocks,
        viewMode,
        effectiveActiveBlockIndex,
        'left'
      ),
    [
      comparisonView.leftLines,
      comparisonView.matchedBlocks,
      effectiveActiveBlockIndex,
      viewMode,
    ]
  )

  const rightRenderedRows = useMemo(
    () =>
      buildRenderedRows(
        comparisonView.rightLines,
        comparisonView.matchedBlocks,
        viewMode,
        effectiveActiveBlockIndex,
        'right'
      ),
    [
      comparisonView.matchedBlocks,
      comparisonView.rightLines,
      effectiveActiveBlockIndex,
      viewMode,
    ]
  )

  useEffect(() => {
    if (!activeBlock) return

    scrollPaneToLine(leftPaneRef, activeBlock.leftStartLine)
    scrollPaneToLine(rightPaneRef, activeBlock.rightStartLine)
  }, [activeBlock, viewMode])

  const syncScroll = (sourceRef, targetRef) => {
    if (syncingScrollRef.current || !sourceRef.current || !targetRef.current) return

    syncingScrollRef.current = true
    targetRef.current.scrollTop = sourceRef.current.scrollTop

    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  }

  return (
    <div className="dashboard instructor-shell">
      <div className="teacherCard">
        <div className="teacherSectionHeaderInline">
          <div>
            <h2>Source Comparison</h2>
            <p className="teacherSectionMeta">
              Compare stored source files side by side and focus on the strongest overlap.
            </p>
          </div>

          <button className="teacherButton teacherButtonSecondary" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {loading && <div className="teacherCard teacherEmptyState">Loading comparison...</div>}

      {!loading && error && <div className="teacherCard teacherEmptyState">{error}</div>}

      {!loading && !error && comparison && (
        <>
          {(isUsingPlaceholderText || isMissingStoredSections) && (
            <div className="teacherCard teacherEmptyState">
              {isUsingPlaceholderText && isMissingStoredSections
                ? 'Stored match data exists, but the original source text and line-match sections were not available. The side-by-side panes below use placeholder code, so treat this view as a high-level reference only.'
                : isUsingPlaceholderText
                  ? 'The original source text could not be read from storage. The side-by-side panes below use placeholder code instead of the real files.'
                  : 'Stored line-match sections were not available for this result. The selected files below are compared using inferred shared-line highlights instead.'}
            </div>
          )}

          <div className="teacherStatGrid">
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Submission ID</p>
              <h3 className="teacherStatValue compareLongValue">
                {comparison.publicId || `#${comparison.id}`}
              </h3>
              <p className="teacherStatNote">{leftFileLabel}</p>
            </div>
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Reference Repository</p>
              <h3 className="teacherStatValue compareSourceValue compareLongValue">
                {selectedRepositoryName}
              </h3>
              <p className="teacherStatNote">{rightFileLabel || 'Choose a repository file below.'}</p>
            </div>
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Similarity</p>
              <h3 className="teacherStatValue">
                {comparison.similarityScore ?? '--'}
                {comparison.similarityScore !== null && comparison.similarityScore !== undefined
                  ? '%'
                  : ''}
              </h3>
              <p className="teacherStatNote">
                {matchedBlockCount} matched region{matchedBlockCount === 1 ? '' : 's'}
              </p>
            </div>
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Analysis State</p>
              <h3 className="teacherStatValue">{formatAnalysisStateLabel(analysisState)}</h3>
              <p className="teacherStatNote">
                {comparisonView.sharedLineCount} shared line signal
                {comparisonView.sharedLineCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {analysisState !== 'complete' && (
            <div className="teacherCard teacherEmptyState">
              {analysisState === 'processing'
                ? 'Still processing...'
                : analysisState === 'failed'
                  ? 'Comparison failed.'
                  : 'No results yet.'}
            </div>
          )}

          {analysisState === 'complete' && (
            <div className="teacherCard compareControlBar">
              <div className="compareControlGroup">
                <span className="teacherSectionMeta compareControlLabel">View</span>
                <div className="compareToggle">
                  <button
                    className={viewMode === 'focus' ? 'compareToggleButton active' : 'compareToggleButton'}
                    onClick={() => setViewMode('focus')}
                    disabled={!matchedBlockCount}
                  >
                    Matched Sections
                  </button>
                  <button
                    className={viewMode === 'full' ? 'compareToggleButton active' : 'compareToggleButton'}
                    onClick={() => setViewMode('full')}
                  >
                    Full File
                  </button>
                </div>
              </div>

              <div className="compareControlGroup">
                <span className="teacherSectionMeta compareControlLabel">Navigate</span>
                <div className="compareNav">
                  <button
                    className="teacherButton teacherButtonSecondary"
                    onClick={() =>
                      setActiveBlockIndex((previous) =>
                        matchedBlockCount ? Math.max(previous - 1, 0) : 0
                      )
                    }
                    disabled={!matchedBlockCount || effectiveActiveBlockIndex === 0}
                  >
                    Previous Match
                  </button>
                  <span className="compareNavStatus">
                    {matchedBlockCount
                      ? `Match ${effectiveActiveBlockIndex + 1} of ${matchedBlockCount}`
                      : 'No matched regions'}
                  </span>
                  <button
                    className="teacherButton teacherButtonSecondary"
                    onClick={() =>
                      setActiveBlockIndex((previous) =>
                        matchedBlockCount
                          ? Math.min(previous + 1, matchedBlockCount - 1)
                          : previous
                      )
                    }
                    disabled={
                      !matchedBlockCount ||
                      effectiveActiveBlockIndex >= matchedBlockCount - 1
                    }
                  >
                    Next Match
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="teacherDashboardGrid compareGridExpanded">
            <div className="teacherMainColumn">
              <div className="teacherCard comparePaneCard">
                <div className="comparePaneHeader">
                  <div className="comparePaneHeaderMain">
                    <h3>Submission Text</h3>
                    <p className="teacherSectionMeta">{leftFileLabel}</p>
                  </div>
                  <div className="comparePaneHeaderTools">
                    <label className="compareInlineField" htmlFor="compare-left-file">
                      <span>File</span>
                      <select
                        id="compare-left-file"
                        className="teacherSelect compareSelect compareSelectCompact"
                        value={effectiveLeftFileId}
                        onChange={(event) => {
                          setSelectedLeftFileId(event.target.value)
                          setActiveBlockIndex(0)
                        }}
                        disabled={!leftFiles.length}
                      >
                        {leftFiles.map((file) => (
                          <option key={file.id} value={file.id}>
                            {file.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="comparePaneBadge">
                      {comparisonView.leftLines.length} line
                      {comparisonView.leftLines.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {analysisState !== 'complete' ? (
                  <div>Text will appear after processing.</div>
                ) : (
                  <div
                    ref={leftPaneRef}
                    className="codePane"
                    onScroll={() => syncScroll(leftPaneRef, rightPaneRef)}
                  >
                    {leftRenderedRows.map((row) =>
                      row.type === 'gap' ? (
                        <div key={row.id} className="codeGap">
                          <span>...</span>
                          <span>{row.hiddenCount} line(s) hidden</span>
                        </div>
                      ) : (
                        <div
                          key={`left-${row.line.number}`}
                          className={`codeLine${row.blockIndex >= 0 ? ' matchColored' : ''}${row.blockIndex >= 0 && (row.blockIndex === hoveredBlockIndex || row.blockIndex === effectiveActiveBlockIndex) ? ' matchEmphasis' : ''}${row.blockIndex >= MATCH_PALETTE.length ? ' matchDashed' : ''}`}
                          style={
                            row.blockIndex >= 0
                              ? {
                                  backgroundColor:
                                    MATCH_PALETTE[row.blockIndex % MATCH_PALETTE.length],
                                }
                              : undefined
                          }
                          data-line-number={row.line.number}
                          onMouseEnter={
                            row.blockIndex >= 0
                              ? () => setHoveredBlockIndex(row.blockIndex)
                              : undefined
                          }
                          onMouseLeave={
                            row.blockIndex >= 0 ? () => setHoveredBlockIndex(-1) : undefined
                          }
                        >
                          <span className="codeLineNumber">{row.line.number}</span>
                          <span className="codeLineText">{row.line.text || ' '}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="teacherSideColumn compareSideColumn">
              <div className="teacherCard comparePaneCard">
                <div className="comparePaneHeader">
                  <div className="comparePaneHeaderMain">
                    <h3>Repository File</h3>
                    <p className="teacherSectionMeta">
                      {selectedRepositoryName}
                      {rightFileLabel ? ` - ${rightFileLabel}` : ''}
                    </p>
                  </div>
                  <div className="comparePaneHeaderTools comparePaneHeaderToolsRight">
                    <label className="compareInlineField" htmlFor="compare-right-repository">
                      <span>Repository</span>
                      <select
                        id="compare-right-repository"
                        className="teacherSelect compareSelect compareSelectCompact"
                        value={effectiveRightRepositoryId}
                        onChange={(event) => {
                          setSelectedRightRepositoryId(event.target.value)
                          setSelectedRightFileId('')
                          setActiveBlockIndex(0)
                        }}
                        disabled={!comparison?.repositoryOptions?.length}
                      >
                        {(comparison?.repositoryOptions || []).map((option) => (
                          <option key={option.repositoryId} value={option.repositoryId}>
                            {option.repositoryName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="compareInlineField" htmlFor="compare-right-file">
                      <span>File</span>
                      <select
                        id="compare-right-file"
                        className="teacherSelect compareSelect compareSelectCompact"
                        value={effectiveRightFileId}
                        onChange={(event) => {
                          setSelectedRightFileId(event.target.value)
                          setActiveBlockIndex(0)
                        }}
                        disabled={isRepositorySourceLoading || !rightFiles.length}
                      >
                        {rightFiles.length ? (
                          rightFiles.map((file) => (
                            <option key={file.id} value={file.id}>
                              {file.label}
                            </option>
                          ))
                        ) : (
                          <option value="">
                            {isRepositorySourceLoading
                              ? 'Loading files...'
                              : 'No readable files found'}
                          </option>
                        )}
                      </select>
                    </label>
                    <span className="comparePaneBadge">
                      {comparisonView.rightLines.length} line
                      {comparisonView.rightLines.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {repositorySourceError && (
                  <div className="upload-feedback upload-feedback-error">{repositorySourceError}</div>
                )}

                {analysisState !== 'complete' ? (
                  <div>Source not available yet.</div>
                ) : isRepositorySourceLoading ? (
                  <div>Loading repository files...</div>
                ) : !selectedRightFile ? (
                  <div>Select a repository file to compare against.</div>
                ) : (
                  <div
                    ref={rightPaneRef}
                    className="codePane"
                    onScroll={() => syncScroll(rightPaneRef, leftPaneRef)}
                  >
                    {rightRenderedRows.map((row) =>
                      row.type === 'gap' ? (
                        <div key={row.id} className="codeGap">
                          <span>...</span>
                          <span>{row.hiddenCount} line(s) hidden</span>
                        </div>
                      ) : (
                        <div
                          key={`right-${row.line.number}`}
                          className={`codeLine${row.blockIndex >= 0 ? ' matchColored' : ''}${row.blockIndex >= 0 && (row.blockIndex === hoveredBlockIndex || row.blockIndex === effectiveActiveBlockIndex) ? ' matchEmphasis' : ''}${row.blockIndex >= MATCH_PALETTE.length ? ' matchDashed' : ''}`}
                          style={
                            row.blockIndex >= 0
                              ? {
                                  backgroundColor:
                                    MATCH_PALETTE[row.blockIndex % MATCH_PALETTE.length],
                                }
                              : undefined
                          }
                          data-line-number={row.line.number}
                          onMouseEnter={
                            row.blockIndex >= 0
                              ? () => setHoveredBlockIndex(row.blockIndex)
                              : undefined
                          }
                          onMouseLeave={
                            row.blockIndex >= 0 ? () => setHoveredBlockIndex(-1) : undefined
                          }
                        >
                          <span className="codeLineNumber">{row.line.number}</span>
                          <span className="codeLineText">{row.line.text || ' '}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="teacherCard compareDetailCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Comparison Details</h3>
                  <span className="teacherSectionMeta">
                    {activeBlock ? `Focused block ${effectiveActiveBlockIndex + 1}` : 'Overview'}
                  </span>
                </div>

                <div className="compareDetailGrid">
                  <div className="compareDetailItem">
                    <span>Similarity</span>
                    <strong>
                      {comparison.similarityScore ?? '--'}
                      {comparison.similarityScore !== null &&
                      comparison.similarityScore !== undefined
                        ? '%'
                        : ''}
                    </strong>
                  </div>
                  <div className="compareDetailItem">
                    <span>Matched Regions</span>
                    <strong>{matchedBlockCount}</strong>
                  </div>
                  <div className="compareDetailItem">
                    <span>Stored Sections</span>
                    <strong>{comparisonView.matchedSections.length}</strong>
                  </div>
                  <div className="compareDetailItem">
                    <span>Shared Lines</span>
                    <strong>{comparisonView.sharedLineCount}</strong>
                  </div>
                </div>

                {activeBlock && (
                  <div className="compareRangeCard">
                    <p className="compareRangeTitle">Focused match window</p>
                    <p className="compareRangeValue">
                      Left lines {activeBlock.leftStartLine}-{activeBlock.leftEndLine}
                    </p>
                    <p className="compareRangeValue">
                      Right lines {activeBlock.rightStartLine}-{activeBlock.rightEndLine}
                    </p>
                  </div>
                )}

                <div className="detailRow detailRowBlock">
                  <span>Notes</span>
                  <p>
                    {comparison.notes || 'No notes provided.'}{' '}
                    {analysisState === 'complete'
                      ? 'The file pickers above let you manually compare the current submission against any readable file in the selected repository.'
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
