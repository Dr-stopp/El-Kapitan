import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSubmissionReport } from './InstructorApi.js';
import './InstructorDashboard.css';

export default function SubmissionReportPage() {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;


        fetchSubmissionReport(submissionId)
            .then((data) => {
                if (ignore) return;
                setReport(data);
            })
            .catch((err) => {
                if (ignore) return;
                console.error(err);
                setError(err.message || 'Failed to load report.');
            })
            .finally(() => {
                if (ignore) return;
                setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [submissionId]);

    return (
        <div className="dashboard instructor-shell">
            <div className="teacherCard">
                <div className="teacherSectionHeaderInline">
                    <h2>Submission Report</h2>
                    <button
                        className="teacherButton teacherButtonSecondary"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>
            </div>

            {loading && (
                <div className="teacherCard teacherEmptyState">Loading report...</div>
            )}

            {!loading && error && (
                <div className="teacherCard teacherEmptyState">{error}</div>
            )}

            {!loading && !error && report && (
                <>
                    <div className="teacherStatGrid">
                        <div className="teacherStatCard">
                            <p className="teacherStatLabel">Student</p>
                            <h3 className="teacherStatValue">{report.studentName}</h3>
                        </div>

                        <div className="teacherStatCard">
                            <p className="teacherStatLabel">Assignment</p>
                            <h3 className="teacherStatValue">{report.assignmentName}</h3>
                        </div>

                        <div className="teacherStatCard">
                            <p className="teacherStatLabel">Similarity</p>
                            <h3 className="teacherStatValue">{report.similarityScore}%</h3>
                        </div>

                        <div className="teacherStatCard">
                            <p className="teacherStatLabel">Status</p>
                            <h3 className="teacherStatValue">{report.status}</h3>
                        </div>
                    </div>

                    <div className="teacherDashboardGrid">
                        <div className="teacherMainColumn">
                            <div className="teacherCard">
                                <div className="teacherSectionHeaderInline">
                                    <h3>Engine Summary</h3>
                                </div>
                                <p>{report.summary || 'No summary available.'}</p>
                            </div>

                            <div className="teacherCard">
                                <div className="teacherSectionHeaderInline">
                                    <h3>Matched Segments</h3>
                                </div>

                                {!report.matches || report.matches.length === 0 ? (
                                    <div className="teacherEmptyInline">No matches found.</div>
                                ) : (
                                    <div className="priorityList">
                                        {report.matches.map((match, index) => (
                                            <div className="priorityItem" key={index}>
                                                <div>
                                                    <p className="priorityTitle">{match.sourceLabel}</p>
                                                    <p className="priorityMeta">{match.reason}</p>
                                                </div>
                                                <div className="priorityScore">{match.score}%</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="teacherSideColumn">
                            <div className="teacherCard">
                                <div className="teacherSectionHeaderInline">
                                    <h3>Metadata</h3>
                                </div>

                                <div className="detailsStack">
                                    <div className="detailRow">
                                        <span>Submission ID</span>
                                        <strong>{report.id}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Language</span>
                                        <strong>{report.language}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Submitted At</span>
                                        <strong>{report.submittedAt}</strong>
                                    </div>
                                    <div className="detailRow">
                                        <span>Engine Version</span>
                                        <strong>{report.engineVersion || 'N/A'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}