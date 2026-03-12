import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSubmissionComparison } from './InstructorApi.js';
import './InstructorDashboard.css';

export default function SubmissionComparePage() {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [comparison, setComparison] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;


        fetchSubmissionComparison(submissionId)
            .then((data) => {
                if (ignore) return;
                setComparison(data);
            })
            .catch((err) => {
                if (ignore) return;
                console.error(err);
                setError(err.message || 'Failed to load comparison.');
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
                    <h2>Source Comparison</h2>
                    <button
                        className="teacherButton teacherButtonSecondary"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>
            </div>

            {loading && (
                <div className="teacherCard teacherEmptyState">Loading comparison...</div>
            )}

            {!loading && error && (
                <div className="teacherCard teacherEmptyState">{error}</div>
            )}

            {!loading && !error && comparison && (
                <div className="teacherDashboardGrid">
                    <div className="teacherMainColumn">
                        <div className="teacherCard">
                            <div className="teacherSectionHeaderInline">
                                <h3>Submission Text</h3>
                            </div>
                            <pre className="compareBlock">{comparison.leftText || 'No submission text provided.'}</pre>
                        </div>
                    </div>

                    <div className="teacherSideColumn">
                        <div className="teacherCard">
                            <div className="teacherSectionHeaderInline">
                                <h3>Matched Source</h3>
                            </div>
                            <pre className="compareBlock">{comparison.rightText || 'No source text provided.'}</pre>
                        </div>

                        <div className="teacherCard">
                            <div className="teacherSectionHeaderInline">
                                <h3>Comparison Details</h3>
                            </div>

                            <div className="detailsStack">
                                <div className="detailRow">
                                    <span>Submission ID</span>
                                    <strong>{comparison.id}</strong>
                                </div>
                                <div className="detailRow">
                                    <span>Matched Source</span>
                                    <strong>{comparison.sourceLabel || 'Unknown source'}</strong>
                                </div>
                                <div className="detailRow">
                                    <span>Similarity</span>
                                    <strong>{comparison.similarityScore}%</strong>
                                </div>
                                <div className="detailRow detailRowBlock">
                                    <span>Notes</span>
                                    <p>{comparison.notes || 'No additional notes provided.'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}