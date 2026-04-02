import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchSubmissionComparison } from './api'
import {
  buildComparisonViewModel,
  extractComparisonFileLabel,
  formatAnalysisStateLabel,
  normalizeAnalysisState,
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

function buildRenderedRows(lines, matchedBlocks, viewMode, activeIndex, side, contextLines = 2) {
  if (viewMode === 'full' || !matchedBlocks.length) {
    return lines.map((line) => ({
      type: 'line',
      line,
      active:
        activeIndex >= 0 &&
        line.number >= matchedBlocks[activeIndex]?.[`${side}StartLine`] &&
        line.number <= matchedBlocks[activeIndex]?.[`${side}EndLine`],
    }))
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
      rows.push({
        type: 'line',
        line: firstLine,
        active: false,
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
      const active =
        activeIndex >= 0 &&
        line.number >= matchedBlocks[activeIndex]?.[`${side}StartLine`] &&
        line.number <= matchedBlocks[activeIndex]?.[`${side}EndLine`]

      rows.push({
        type: 'line',
        line,
        active,
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
    return lines.map((line) => ({
      type: 'line',
      line,
      active: false,
    }))
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

export default function SubmissionComparePage() {
  const { submissionId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const pairId = searchParams.get('pairId')

  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('full')
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)

  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)

  useEffect(() => {
    let ignore = false

    fetchSubmissionComparison(submissionId, { pairId })
      .then((data) => {
        if (!ignore) {
          setComparison(data)
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
  }, [submissionId, pairId])

  const comparisonView = useMemo(
    () =>
      buildComparisonViewModel(
        comparison?.leftText || '',
        comparison?.rightText || '',
        comparison?.sections || []
      ),
    [comparison]
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

  const leftFileLabel = extractComparisonFileLabel(
    comparison?.leftText,
    `Submission #${comparison?.id || submissionId}`
  )
  const rightFileLabel = extractComparisonFileLabel(
    comparison?.rightText,
    comparison?.sourceLabel || 'Matched source'
  )

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
                  : 'The comparison loaded, but no stored line-match sections were available. The panes may show real text without highlighted overlap ranges.'}
            </div>
          )}

          <div className="teacherStatGrid">
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Submission ID</p>
              <h3 className="teacherStatValue">{comparison.id}</h3>
              <p className="teacherStatNote">{leftFileLabel}</p>
            </div>
            <div className="teacherStatCard">
              <p className="teacherStatLabel">Matched Source</p>
              <h3 className="teacherStatValue compareSourceValue">
                {comparison.sourceLabel || 'Unknown source'}
              </h3>
              <p className="teacherStatNote">{rightFileLabel}</p>
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
                  <div>
                    <h3>Submission Text</h3>
                    <p className="teacherSectionMeta">{leftFileLabel}</p>
                  </div>
                  <span className="comparePaneBadge">
                    {comparisonView.leftLines.length} line
                    {comparisonView.leftLines.length === 1 ? '' : 's'}
                  </span>
                </div>

                {analysisState !== 'complete' ? (
                  <div>Text will appear after processing.</div>
                ) : (
                  <div
                    ref={leftPaneRef}
                    className="codePane"
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
                          className={`codeLine${row.line.matched ? ' matched' : ''}${row.active ? ' activeMatch' : ''}`}
                          data-line-number={row.line.number}
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
                  <div>
                    <h3>Matched Source</h3>
                    <p className="teacherSectionMeta">{rightFileLabel}</p>
                  </div>
                  <span className="comparePaneBadge">
                    {comparisonView.rightLines.length} line
                    {comparisonView.rightLines.length === 1 ? '' : 's'}
                  </span>
                </div>

                {analysisState !== 'complete' ? (
                  <div>Source not available yet.</div>
                ) : (
                  <div
                    ref={rightPaneRef}
                    className="codePane"
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
                          className={`codeLine${row.line.matched ? ' matched' : ''}${row.active ? ' activeMatch' : ''}`}
                          data-line-number={row.line.number}
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
                  <p>{comparison.notes || 'No notes provided.'}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
