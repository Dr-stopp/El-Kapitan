import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export default function ReviewQueuePanel({ selectedCourse, assignments, submissions, loading, error }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [languageFilter, setLanguageFilter] = useState('All');
    const [sortBy, setSortBy] = useState('similarity');
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate();
    const availableAssignmentNames = useMemo(() => {
        return assignments.map((item) => item.name);
    }, [assignments]);

    const availableLanguages = useMemo(() => {
        const unique = Array.from(new Set(submissions.map((item) => item.language).filter(Boolean)));
        return unique.sort();
    }, [submissions]);

    const normalizedSubmissions = useMemo(() => {
        if (!selectedCourse) return [];

        return submissions.filter((item) => {
            if (availableAssignmentNames.length === 0) return true;
            return availableAssignmentNames.includes(item.assignmentName);
        });
    }, [selectedCourse, submissions, availableAssignmentNames]);

    const filteredSubmissions = useMemo(() => {
        let results = [...normalizedSubmissions];

        if (search.trim()) {
            const q = search.toLowerCase();
            results = results.filter((item) =>
                item.studentName?.toLowerCase().includes(q) ||
                item.assignmentName?.toLowerCase().includes(q) ||
                item.language?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'All') {
            results = results.filter((item) => item.status === statusFilter);
        }

        if (languageFilter !== 'All') {
            results = results.filter((item) => item.language === languageFilter);
        }

        results.sort((a, b) => {
            if (sortBy === 'similarity') return (b.similarityScore ?? 0) - (a.similarityScore ?? 0);
            if (sortBy === 'student') return (a.studentName ?? '').localeCompare(b.studentName ?? '');
            if (sortBy === 'assignment') return (a.assignmentName ?? '').localeCompare(b.assignmentName ?? '');
            return 0;
        });

        return results;
    }, [normalizedSubmissions, search, statusFilter, languageFilter, sortBy]);

    const effectiveSelectedId = filteredSubmissions.some((item) => item.id === selectedId)
        ? selectedId
        : (filteredSubmissions[0]?.id ?? null);

    const selectedSubmission =
        filteredSubmissions.find((item) => item.id === effectiveSelectedId) ?? null;

    const handleExportQueue = () => {
        const blob = new Blob([JSON.stringify(filteredSubmissions, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedCourse ? `${selectedCourse.course_name.replace(/\s+/g, '-').toLowerCase()}-review-queue.json` : 'review-queue.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleOpenReport = () => {
        if (!selectedSubmission) return;
        navigate(`/instructor/report/${selectedSubmission.id}`);
    };

    return (
        <div className="teacherPageShell">
            <div className="teacherHero teacherCard">
                <div>
                    <p className="teacherEyebrow">Review Queue</p>
                    <h2 className="teacherHeroTitle">Submission screening workspace</h2>
                    <p className="teacherHeroText">
                        Review recent submissions, filter flagged work, and inspect likely integrity concerns.
                    </p>
                </div>
                <div className="teacherHeroActions">
                    <button className="teacherButton teacherButtonSecondary" onClick={handleExportQueue}>Export Queue</button>
                    <button className="teacherButton teacherButtonPrimary" onClick={handleOpenReport} disabled={!selectedSubmission}>Open Report</button>
                </div>
            </div>

            {!selectedCourse && (
                <div className="teacherCard teacherEmptyState">
                    Select a course in the Assignments tab first, then return here to review submissions for that course.
                </div>
            )}

            {selectedCourse && loading && (
                <div className="teacherCard teacherEmptyState">Loading review queue...</div>
            )}

            {selectedCourse && !loading && error && (
                <div className="teacherCard teacherEmptyState">{error}</div>
            )}

            {selectedCourse && !loading && !error && (
                <div className="teacherDashboardGrid">
                    <div className="teacherMainColumn">
                        <div className="teacherCard">
                            <div className="teacherSectionHeader">
                                <div>
                                    <h3>Filters</h3>
                                    <p className="teacherSectionMeta">
                                        Narrow the queue by student, language, status, or priority.
                                    </p>
                                </div>
                            </div>

                            <div className="toolbarGrid">
                                <div className="toolbarField toolbarFieldWide">
                                    <label>Search</label>
                                    <input
                                        className="teacherInput"
                                        type="text"
                                        placeholder="Search by student, assignment, or language"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <div className="toolbarField">
                                    <label>Status</label>
                                    <select
                                        className="teacherSelect"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option>All</option>
                                        <option>Clear</option>
                                        <option>Needs Review</option>
                                        <option>Flagged</option>
                                    </select>
                                </div>

                                <div className="toolbarField">
                                    <label>Language</label>
                                    <select
                                        className="teacherSelect"
                                        value={languageFilter}
                                        onChange={(e) => setLanguageFilter(e.target.value)}
                                    >
                                        <option>All</option>
                                        {availableLanguages.map((language) => (
                                            <option key={language} value={language}>{language}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="toolbarField">
                                    <label>Sort By</label>
                                    <select
                                        className="teacherSelect"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="similarity">Similarity</option>
                                        <option value="student">Student</option>
                                        <option value="assignment">Assignment</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="teacherCard">
                            <div className="teacherSectionHeaderInline">
                                <h3>Submission Queue</h3>
                                <span className="teacherSectionMeta">{filteredSubmissions.length} item(s)</span>
                            </div>

                            {filteredSubmissions.length === 0 ? (
                                <div className="teacherEmptyInline">
                                    No submissions matched the current filters.
                                </div>
                            ) : (
                                <div className="reviewTableWrap">
                                    <table className="reviewTable">
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>Assignment</th>
                                                <th>Language</th>
                                                <th>Similarity</th>
                                                <th>Status</th>
                                                <th>Submitted</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubmissions.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className={selectedSubmission?.id === item.id ? 'reviewRowActive' : ''}
                                                    onClick={() => setSelectedId(item.id)}
                                                >
                                                    <td>
                                                        <div className="submissionPrimary">{item.studentName}</div>
                                                    </td>
                                                    <td>
                                                        <div className="submissionSecondary">{item.assignmentName}</div>
                                                    </td>
                                                    <td>{item.language}</td>
                                                    <td>
                                                        <span className="similarityPill">{item.similarityScore}%</span>
                                                    </td>
                                                    <td>
                                                        <span className={`statusBadge status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td>{item.submittedAt}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="teacherSideColumn">
                        <div className="teacherCard">
                            <div className="teacherSectionHeaderInline">
                                <h3>Selected Submission</h3>
                                <span className="teacherSectionMeta">
                                    {selectedSubmission ? `#${selectedSubmission.id}` : 'None'}
                                </span>
                            </div>

                            {!selectedSubmission ? (
                                <div className="teacherEmptyInline">Select a submission to inspect details.</div>
                            ) : (
                                <div className="detailsStack">
                                    <div className="detailRow">
                                        <span>Student</span>
                                        <strong>{selectedSubmission.studentName}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Assignment</span>
                                        <strong>{selectedSubmission.assignmentName}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Language</span>
                                        <strong>{selectedSubmission.language}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Similarity</span>
                                        <strong>{selectedSubmission.similarityScore}%</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Status</span>
                                        <strong>{selectedSubmission.status}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Submitted</span>
                                        <strong>{selectedSubmission.submittedAt}</strong>
                                    </div>
                                    <div className="detailRow detailRowBlock">
                                        <span>Detection Notes</span>
                                        <p>{selectedSubmission.excerpt || 'No notes provided by the engine.'}</p>
                                    </div>

                                    <div className="selectedActions">
                                        <button
                                        className="teacherButton teacherButtonPrimary"
                                        onClick={() => navigate(`/instructor/report/${selectedSubmission.id}`)}
                                       >
                                         Open Full Report
                                      </button>

                                     <button
                                            className="teacherButton teacherButtonSecondary"
                                            onClick={() => navigate(`/instructor/compare/${selectedSubmission.id}`)}
                                        >
                                            Compare Sources
                                        </button>
                                    </div>
                                    
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}