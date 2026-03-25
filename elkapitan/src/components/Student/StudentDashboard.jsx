/**
 * StudentDashboard Component
 * 
 * Responsibilities (what this file owns):
 *   - Fetching and displaying the student's course list
 *   - Fetching and displaying assignments for a selected course
 *   - Tracking which course / assignment the student has clicked (navigation state)
 *   - Rendering the breadcrumb
 * 
 * NOT responsible for:
 *   - File picking, zipping, uploading — that all lives in SubmissionPage.jsx
 * 
 * Props received:
 *   user — the logged-in student object from Supabase auth (has user.id, user.email etc.)
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';
import SubmissionPage from './SubmissionPage.jsx'; // handles everything after student clicks an assignment
import '../Dashboard.css';
import './StudentDashboard.css';
import { formatDueDate } from '../../utils.js';

export default function StudentDashboard({ user }) {

    // ── State ────────────────────────────────────────────────────────────────

    // Stores the list of courses this student is enrolled in
    // IN: populated by Supabase query on mount
    // OUT: rendered as course cards in the course list view
    const [courses, setCourses] = useState([]);

    // True while the initial courses fetch is in flight
    // IN: set to true before fetch, false after
    // OUT: controls whether spinner or course list is shown
    const [loading, setLoading] = useState(true);

    // Tracks which course the student clicked
    // null = show course list view
    // object = show assignment list view for that course
    // shape: { course_id, course_name }
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Stores the assignments for the currently selected course
    // IN: populated by Supabase query when selectedCourse changes
    // OUT: rendered as assignment cards in the assignment list view
    const [assignments, setAssignments] = useState([]);

    // True while assignments are being fetched for a course
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // Tracks which assignment the student clicked
    // null = show assignment list view
    // object = show SubmissionPage for that assignment
    // shape: { deployment_id, name, description, due_date, submitted, number }
    const [selectedAssignment, setSelectedAssignment] = useState(null);


    // ── Data fetching ────────────────────────────────────────────────────────

    // Runs once on mount — fetches all courses this student is enrolled in
    // Like a constructor call in Java — runs when the component first appears
    useEffect(() => {

        // Supabase JOIN: enrollments → courses
        // equivalent to: SELECT course_id, course_name FROM enrollments
        //                JOIN courses USING (course_id)
        //                WHERE student_id = user.id
        supabase
            .from('enrollments')
            .select('course_id, courses(course_name)')
            .eq('student_id', user.id)
            .then(({ data, error }) => {

                if (error) {
                    console.error(error);
                    return;
                }

                // data shape from Supabase:
                // [{ course_id: 1, courses: { course_name: 'Intro to CS' } }, ...]
                // flatten into a simpler shape for the rest of the component
                const courses = data.map(row => ({
                    course_id:   row.course_id,
                    course_name: row.courses.course_name,
                }));

                setCourses(courses);
                setLoading(false);
            });

    }, [user.id]); // only re-runs if user.id changes (effectively once)


    // Runs whenever selectedCourse changes — fetches assignments for that course
    // Like a setter with a side effect in Java
    useEffect(() => {

        if (!selectedCourse) return; // guard — nothing to fetch if no course selected

        const fetchAssignments = async () => {

            setAssignmentsLoading(true);

            // Fetch visible assignments for this course
            // JOIN: assignment_deployments → assignments
            const { data, error } = await supabase
                .from('assignment_deployments')
                .select('deployment_id, due_date, is_visible, assignments(name, description, language)')
                .eq('course_id', selectedCourse.course_id)
                .eq('is_visible', true); // student only sees visible assignments

            if (error) {
                console.error(error);
                setAssignmentsLoading(false);
                return;
            }

            // For each assignment check the submissions table to see if this student
            // already has a row — if yes, mark it as submitted
            // Promise.all runs all checks in parallel (like CompletableFuture.allOf in Java)
            const assignmentsWithStatus = await Promise.all(
                data.map(async (row) => {

                    // Check submissions table for a row matching this student + deployment
                    // Instead of checking Storage, we now check the DB table directly
                    const { data: submission } = await supabase
                        .from('submissions')
                        .select('submission_id')
                        .eq('student_id', user.id)
                        .eq('deployment_id', row.deployment_id)
                        .maybeSingle(); // returns null if not found, no error

                    return {
                        deployment_id: row.deployment_id,
                        due_date:      row.due_date,
                        is_visible:    row.is_visible,
                        name:          row.assignments.name,
                        description:   row.assignments.description,
                        language:      row.assignments.language,
                        submitted:     submission !== null, // true if a row exists
                    };
                })
            );

            setAssignments(assignmentsWithStatus);
            setAssignmentsLoading(false);
        };

        fetchAssignments();

    }, [selectedCourse, user.id]);


    // ── Handler ──────────────────────────────────────────────────────────────

    // Called by SubmissionPage after a successful submission
    // Updates the assignment card in the list to show 'Submitted'
    // IN:  deployment_id of the assignment that was just submitted
    // OUT: flips submitted = true on that item in assignments state
    const handleSubmissionSuccess = (deploymentId) => {
        setAssignments(prev =>
            prev.map(a =>
                a.deployment_id === deploymentId
                    ? { ...a, submitted: true } // only update the matching one
                    : a
            )
        );
    };


    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="dashboard">

            {/* ── Breadcrumb ── */}
            {/* Shows: Courses → [Course Name] → [Assignment Name] */}
            {/* Each segment is clickable to navigate back */}
            <div className="breadcrumb">

                <span
                    className={!selectedCourse ? 'breadcrumb-current' : 'breadcrumb-link'}
                    onClick={() => {
                        setSelectedCourse(null);
                        setSelectedAssignment(null);
                    }}
                >
                    Courses
                </span>

                {selectedCourse && (
                    <>
                        <span className="breadcrumb-separator">→</span>
                        <span
                            className={!selectedAssignment ? 'breadcrumb-current' : 'breadcrumb-link'}
                            onClick={() => setSelectedAssignment(null)}
                        >
                            {selectedCourse.course_name}
                        </span>
                    </>
                )}

                {selectedAssignment && (
                    <>
                        <span className="breadcrumb-separator">→</span>
                        <span className="breadcrumb-current">
                            {selectedAssignment.name}
                        </span>
                    </>
                )}

            </div>


            {/* ── View 1: Course list — shown when no course is selected ── */}
            {!selectedCourse && (
                <main className="student-body">
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <div className="course-list">
                            {courses.map((course) => (
                                <div
                                    className="course-card"
                                    key={course.course_id}
                                    onClick={() => setSelectedCourse(course)}
                                >
                                    <h2>{course.course_name}</h2>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            )}


            {/* ── View 2: Assignment list — shown when a course is selected ── */}
            {selectedCourse && !selectedAssignment && (
                <main className="student-body">
                    {assignmentsLoading ? (
                        <div className="spinner"></div>
                    ) : (
                        <div className="assignment-list">
                            {assignments.map((item, index) => (
                                <div
                                    className="assignment-card"
                                    key={item.deployment_id}
                                    onClick={() => setSelectedAssignment({ ...item, number: index + 1 })}
                                >
                                    <div className="assignment-card-left">
                                        <p className="assignment-number">Assignment {index + 1}</p>
                                        <h2 className="assignment-name">{item.name}</h2>
                                        <p className="assignment-due">Due: {formatDueDate(item.due_date)}</p>
                                    </div>

                                    <div className="assignment-card-right">
                                        <span className={item.submitted ? 'status-submitted' : 'status-pending'}>
                                            {item.submitted ? 'Submitted' : 'Not Submitted'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            )}


            {/* ── View 3: Submission page — rendered by SubmissionPage component ── */}
            {/* Shown when a student clicks an assignment */}
            {/* Passes down everything SubmissionPage needs as props */}
            {/* onSubmissionSuccess is a callback — like passing a listener in Java */}
            {selectedCourse && selectedAssignment && (
                <SubmissionPage
                    user={user}                                  // who is submitting
                    selectedAssignment={selectedAssignment}      // which assignment
                    selectedCourse={selectedCourse}              // which course
                    onSubmissionSuccess={handleSubmissionSuccess} // callback to update assignment list
                />
            )}

        </div>
    );
}