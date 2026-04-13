export default function AnalyticsPanel({
  selectedCourse,
  assignments,
  metrics,
  priorityCases,
  languageCounts,
  loading,
  error,
}) {
  const safeMetrics = metrics ?? {
    totalSubmissions: 0,
    flaggedCases: 0,
    reviewCases: 0,
    configuredRuns: assignments.length,
  }

  const cards = [
    {
      label: 'Total Submissions',
      value: safeMetrics.totalSubmissions,
      note: 'Across the current review dataset',
    },
    {
      label: 'Flagged Cases',
      value: safeMetrics.flaggedCases,
      note: 'High-similarity items needing attention',
    },
    {
      label: 'Needs Review',
      value: safeMetrics.reviewCases,
      note: 'Moderate overlap, manual check recommended',
    },
    {
      label: 'Assignment Runs',
      value: safeMetrics.configuredRuns,
      note: 'Current assignment_runs rows loaded for this course',
    },
  ]

  return (
    <div className="teacherPageShell">
      <div className="teacherHero teacherCard">
        <div>
          <p className="teacherEyebrow">Analytics</p>
          <h2 className="teacherHeroTitle">Instructor monitoring overview</h2>
          <p className="teacherHeroText">
            Track activity levels, identify high-risk cases, and understand the submission mix.
          </p>
        </div>
      </div>

      {!selectedCourse && (
        <div className="teacherCard teacherEmptyState">
          Select a course from the workspace controls to view analytics.
        </div>
      )}

      {selectedCourse && loading && (
        <div className="teacherCard teacherEmptyState">Loading analytics...</div>
      )}

      {selectedCourse && !loading && error && (
        <div className="teacherCard teacherEmptyState">{error}</div>
      )}

      {selectedCourse && !loading && !error && (
        <>
          <div className="teacherStatGrid">
            {cards.map((item) => (
              <div key={item.label} className="teacherStatCard">
                <p className="teacherStatLabel">{item.label}</p>
                <h3 className="teacherStatValue">{item.value}</h3>
                <p className="teacherStatNote">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="teacherDashboardGrid">
            <div className="teacherMainColumn">
              <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Priority Cases</h3>
                  <span className="teacherSectionMeta">Top similarity scores</span>
                </div>

                <div className="priorityList">
                  {priorityCases.length === 0 ? (
                    <div className="teacherEmptyInline">No priority cases found.</div>
                  ) : (
                    priorityCases.map((item) => (
                      <div className="priorityItem" key={item.id}>
                        <div>
                          <p className="priorityTitle">
                            {item.publicId || `Submission #${item.id}`}
                          </p>
                          <p className="priorityMeta">
                            {item.language} | {item.status}
                          </p>
                        </div>
                        <div className="priorityScore">{item.similarityScore}%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="teacherSideColumn">
              <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                  <h3>Language Distribution</h3>
                  <span className="teacherSectionMeta">Current dataset</span>
                </div>

                <div className="languageStats">
                  {languageCounts.length === 0 ? (
                    <div className="teacherEmptyInline">No language data available.</div>
                  ) : (
                    languageCounts.map((item) => (
                      <div className="languageRow" key={item.language}>
                        <div className="languageTop">
                          <span>{item.language}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="languageBarTrack">
                          <div
                            className="languageBarFill"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
