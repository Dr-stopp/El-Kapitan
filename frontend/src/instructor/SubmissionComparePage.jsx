// React hooks
import { useEffect, useMemo, useRef, useState } from 'react'

// React Router hooks (for navigation + URL params)
import { useNavigate, useParams } from 'react-router-dom'

// API call to get comparison data
import { fetchSubmissionComparison } from './api'

// Utility functions to process comparison data
import {
  buildComparisonViewModel,
  formatAnalysisStateLabel,
  normalizeAnalysisState,
} from './utils'

export default function SubmissionComparePage() {

  /*
    Get submissionId from URL
    Example URL: /compare/123 → submissionId = 123
  */
  const { submissionId } = useParams()

  // Used to go back to previous page
  const navigate = useNavigate()

  /*
    STATE VARIABLES
  */
  const [comparison, setComparison] = useState(null) // full comparison data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /*
    Refs → used to directly access DOM elements (for scrolling)
  */
  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)

  // Prevent infinite scroll loop
  const syncingScrollRef = useRef(false)

  /*
    Fetch comparison data when page loads submissionId changes
  */
  useEffect(() => {
    let ignore = false // prevents updating state if component unmounts

    fetchSubmissionComparison(submissionId)
      .then((data) => {
        if (!ignore) {
          setComparison(data) // store API response
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
  }, [submissionId])

  /*
    Build processed view of comparison (optimized with useMemo)
    Converts raw text into:
      - lines
      - matched lines
      - sections
  */
  const comparisonView = useMemo(
    () =>
      buildComparisonViewModel(
        comparison?.leftText || '',
        comparison?.rightText || '',
        comparison?.sections || []
      ),
    [comparison]
  )

  /*
    Normalize analysis state (e.g., processing, complete, failed)
  */
  const analysisState = normalizeAnalysisState(comparison?.analysisState)

  /*
    Sync scrolling between left and right code panes
    → When you scroll one, the other scrolls too
  */
  const syncScroll = (sourceRef, targetRef) => {
    if (
      syncingScrollRef.current || 
      !sourceRef.current || 
      !targetRef.current
    ) return

    syncingScrollRef.current = true

    // Match scroll positions
    targetRef.current.scrollTop = sourceRef.current.scrollTop

    // Reset lock after frame
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  }

  /*
    UI RENDERING
  */
  return (
    <div className="dashboard instructor-shell">

      {/* Header */}
      <div className="teacherCard">
        <div className="teacherSectionHeaderInline">
          <h2>Source Comparison</h2>

          {/* Go back button */}
          <button
            className="teacherButton teacherButtonSecondary"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="teacherCard teacherEmptyState">
          Loading comparison...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="teacherCard teacherEmptyState">
          {error}
        </div>
      )}

      {/* Main content */}
      {!loading && !error && comparison && (
        <>
          {/* Top statistics */}
          <div className="teacherStatGrid">
            <div className="teacherStatCard">
              <p>Submission ID</p>
              <h3>{comparison.id}</h3>
            </div>

            <div className="teacherStatCard">
              <p>Matched Source</p>
              <h3>{comparison.sourceLabel || 'Unknown source'}</h3>
            </div>

            <div className="teacherStatCard">
              <p>Analysis State</p>
              <h3>{formatAnalysisStateLabel(analysisState)}</h3>
            </div>

            <div className="teacherStatCard">
              <p>Shared Line Signals</p>
              <h3>{comparisonView.sharedLineCount}</h3>
            </div>
          </div>

          {/* If analysis is not complete */}
          {analysisState !== 'complete' && (
            <div className="teacherCard teacherEmptyState">
              {analysisState === 'processing'
                ? 'Still processing...'
                : analysisState === 'failed'
                ? 'Comparison failed.'
                : 'No results yet.'}
            </div>
          )}

          {/* MAIN SIDE-BY-SIDE VIEW */}
          <div className="teacherDashboardGrid compareGridExpanded">

            {/* LEFT SIDE (Student submission) */}
            <div className="teacherMainColumn">
              <div className="teacherCard">
                <h3>Submission Text</h3>

                {analysisState !== 'complete' ? (
                  <div>Text will appear after processing.</div>
                ) : (
                  <div
                    ref={leftPaneRef}
                    className="codePane"
                    onScroll={() => syncScroll(leftPaneRef, rightPaneRef)}
                  >
                    {comparisonView.leftLines.map((line) => (
                      <div
                        key={`left-${line.number}`}
                        className={line.matched ? 'codeLine matched' : 'codeLine'}
                      >
                        <span>{line.number}</span>
                        <span>{line.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE (Matched source) */}
            <div className="teacherSideColumn">
              <div className="teacherCard">
                <h3>Matched Source</h3>

                {analysisState !== 'complete' ? (
                  <div>Source not available yet.</div>
                ) : (
                  <div
                    ref={rightPaneRef}
                    className="codePane"
                    onScroll={() => syncScroll(rightPaneRef, leftPaneRef)}
                  >
                    {comparisonView.rightLines.map((line) => (
                      <div
                        key={`right-${line.number}`}
                        className={line.matched ? 'codeLine matched' : 'codeLine'}
                      >
                        <span>{line.number}</span>
                        <span>{line.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DETAILS PANEL */}
              <div className="teacherCard">
                <h3>Comparison Details</h3>

                <div>
                  <div>
                    <span>Similarity</span>
                    <strong>
                      {comparison.similarityScore ?? '--'}%
                    </strong>
                  </div>

                  <div>
                    <span>Matched Sections</span>
                    <strong>{comparisonView.matchedSections.length}</strong>
                  </div>

                  <div>
                    <span>Notes</span>
                    <p>{comparison.notes || 'No notes provided.'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  )
}