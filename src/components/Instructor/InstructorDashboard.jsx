import React, { useState, useEffect } from 'react';
//import { mockDB } from '../../mockDB.js';
import { supabase } from '../../supabaseClient.js';
import '../Dashboard.css';
import './InstructorDashboard.css'
import { formatDueDate } from '../../utils.js';
import ReviewQueuePanel from './ReviewQueuePanel.jsx';
import AnalyticsPanel from './AnalyticsPanel.jsx';
import { fetchReviewQueue, fetchAnalytics } from './InstructorApi.js';

export default function InstructorDashboard({ user }) {

    // Stores the list of courses this instructor teaches
    // Starts empty, gets filled when mockDB returns data
    const [courses, setCourses] = useState([]);

    // True while we're waiting for data from mockDB
    // Shows "Loading..." instead of empty screen
    const [loading, setLoading] = useState(true);

    // tracks which course the instructor clicked
    // null = show course list
    const [selectedCourse, setSelectedCourse] = useState(null);

    // stores assignments for the selected course
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // null = no form open
    // 'create' = creating new assignment
    // assignment object = editing existing assignment
    const [editingAssignment, setEditingAssignment] = useState(null);

    // Stores the current values of the form fields
    // Pre-filled when editing, empty when creating
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDueDate, setFormDueDate] = useState('');
    const [formDueTime, setFormDueTime] = useState('');

    // Tracks which instructor workspace tab is open
    const [activeTab, setActiveTab] = useState('assignments');

    // Stores review queue data from the engine/backend API
    const [submissions, setSubmissions] = useState([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [submissionsError, setSubmissionsError] = useState('');

    // Stores analytics data from the engine/backend API
    const [analytics, setAnalytics] = useState({
        metrics: null,
        priorityCases: [],
        languageCounts: [],
    });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');

    // Runs once when the component first appears on screen
    // Like a constructor in Java - do setup here
    useEffect(() => {

        // Fetch all courses this instructor teaches
        // Query instructor_courses for all courses this instructor teaches
        // follows foreign key from instructor_courses → courses to get course name
        supabase
        .from('instructor_courses')
        .select('course_id, courses(course_name)')
        .eq('instructor_id', user.id)        // WHERE instructor_id = user.id
        .then(({ data, error }) => {

            console.log('data:', data);
            console.log('error:', error);

            if (error) {
            console.error(error);
            setLoading(false);
            return;
            }

            // data comes back as:
            // [{ course_id: 1, courses: { course_name: 'Intro to CS' } }, ...]
            // flatten into same shape the rest of the component expects
            const courses = (data || []).map(row => ({
            course_id:   row.course_id,
            course_name: row.courses?.course_name || 'Untitled Course',
            }));

            setCourses(courses);
            setLoading(false);
        });

    }, []); // Empty array = run once on mount, never again

    // Runs whenever selectedCourse changes — fetches assignments for that course
    useEffect(() => {
        if (!selectedCourse) return;

        setAssignmentsLoading(true);

        // Query assignment_deployments for all assignments in this course
        // instructor sees ALL assignments regardless of is_visible
        // follows foreign key to grab name and description from assignments table
        supabase
        .from('assignment_deployments')
        .select('deployment_id, assignment_id, due_date, is_visible, assignments(name, description)')
        .eq('course_id', selectedCourse.course_id)  // WHERE course_id = selectedCourse.course_id
        .then(({ data, error }) => {

            if (error) {
            console.error(error);
            setAssignmentsLoading(false);
            return;
            }

            // data comes back as:
            // [{ deployment_id: 1, assignment_id: 1, due_date: '...', is_visible: true, assignments: { name: '...', description: '...' } }]
            // flatten into same shape the rest of the component expects
            const assignments = (data || []).map(row => ({
            deployment_id: row.deployment_id,
            assignment_id: row.assignment_id,
            due_date:      row.due_date,
            is_visible:    row.is_visible,
            name:          row.assignments?.name || 'Untitled Assignment',
            description:   row.assignments?.description || '',
            }));

            setAssignments(assignments);
            setAssignmentsLoading(false);
        });
    }, [selectedCourse]);


    // Runs whenever selectedCourse changes — fetches review queue from engine/backend
    useEffect(() => {
        if (!selectedCourse) {
            setSubmissions([]);
            setSubmissionsError('');
            return;
        }

        let ignore = false;
        setSubmissionsLoading(true);
        setSubmissionsError('');

        fetchReviewQueue(selectedCourse.course_id)
            .then((data) => {
                if (ignore) return;
                setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
            })
            .catch((error) => {
                if (ignore) return;
                console.error(error);
                setSubmissionsError(error.message || 'Failed to load review queue.');
                setSubmissions([]);
            })
            .finally(() => {
                if (ignore) return;
                setSubmissionsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [selectedCourse]);


    // Runs whenever selectedCourse changes — fetches analytics from engine/backend
    useEffect(() => {
        if (!selectedCourse) {
            setAnalytics({
                metrics: null,
                priorityCases: [],
                languageCounts: [],
            });
            setAnalyticsError('');
            return;
        }

        let ignore = false;
        setAnalyticsLoading(true);
        setAnalyticsError('');

        fetchAnalytics(selectedCourse.course_id)
            .then((data) => {
                if (ignore) return;
                setAnalytics({
                    metrics: data.metrics ?? null,
                    priorityCases: Array.isArray(data.priorityCases) ? data.priorityCases : [],
                    languageCounts: Array.isArray(data.languageCounts) ? data.languageCounts : [],
                });
            })
            .catch((error) => {
                if (ignore) return;
                console.error(error);
                setAnalyticsError(error.message || 'Failed to load analytics.');
                setAnalytics({
                    metrics: null,
                    priorityCases: [],
                    languageCounts: [],
                });
            })
            .finally(() => {
                if (ignore) return;
                setAnalyticsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [selectedCourse]);


    // Runs whenever editingAssignment changes
    // If editing — pre-fill the form with the assignment's current values
    // If creating — clear all fields
    useEffect(() => {
        if (editingAssignment === 'create' || editingAssignment === null) {
            // Clear all form fields for new assignment or when form is closed
            setFormName('');
            setFormDescription('');
            setFormDueDate('');
            setFormDueTime('');
        } else {
            // Pre-fill form with existing assignment data
            setFormName(editingAssignment.name);
            setFormDescription(editingAssignment.description);
            // due_date is stored as '2026-03-10T23:59:00Z'
            // split on 'T' to separate the date and time parts
            const [date, time] = editingAssignment.due_date.split('T');
            setFormDueDate(date);
            setFormDueTime(time.slice(0, 5)); // keep only HH:MM, drop seconds and Z
        }
    }, [editingAssignment]);


    // Handles both create and edit form submission
    // If editingAssignment is 'create' — adds a new assignment to mockDB
    // If editingAssignment is an object — updates the existing assignment
    const handleFormSubmit = async () => {

        // Guard — don't submit if required fields are empty
        if (!formName || !formDueDate || !formDueTime) {
            alert('Please fill in the assignment name, due date, and due time.');
            return;
        }

        // Combine date and time back into one string to match the stored format
        // e.g. '2026-03-10' + '23:59' → '2026-03-10T23:59:00Z'
        const due_date = `${formDueDate}T${formDueTime}:00Z`;

        try {
            if (editingAssignment === 'create') {

                const { data: createdAssignment, error: assignmentError } = await supabase
                    .from('assignments')
                    .insert({
                        name: formName,
                        description: formDescription,
                    })
                    .select('assignment_id, name, description')
                    .single();

                if (assignmentError) throw assignmentError;

                const { data: createdDeployment, error: deploymentError } = await supabase
                    .from('assignment_deployments')
                    .insert({
                        assignment_id: createdAssignment.assignment_id,
                        course_id: selectedCourse.course_id,
                        due_date,
                        is_visible: false,
                    })
                    .select('deployment_id, assignment_id, due_date, is_visible')
                    .single();

                if (deploymentError) throw deploymentError;

                const newAssignment = {
                    deployment_id: createdDeployment.deployment_id,
                    assignment_id: createdDeployment.assignment_id,
                    name: createdAssignment.name,
                    description: createdAssignment.description,
                    due_date: createdDeployment.due_date,
                    is_visible: createdDeployment.is_visible,
                };

                setAssignments((prev) => [...prev, newAssignment]);

            } else {

                const { error: updateAssignmentError } = await supabase
                    .from('assignments')
                    .update({
                        name: formName,
                        description: formDescription,
                    })
                    .eq('assignment_id', editingAssignment.assignment_id);

                if (updateAssignmentError) throw updateAssignmentError;

                const { error: updateDeploymentError } = await supabase
                    .from('assignment_deployments')
                    .update({
                        due_date,
                    })
                    .eq('deployment_id', editingAssignment.deployment_id);

                if (updateDeploymentError) throw updateDeploymentError;

                setAssignments((prev) =>
                    prev.map((a) =>
                        a.deployment_id === editingAssignment.deployment_id
                            ? { ...a, name: formName, description: formDescription, due_date: due_date }
                            : a
                    )
                );
            }

            // Close the form after submitting
            setEditingAssignment(null);
        } catch (error) {
            console.error(error);
            alert(error.message || 'Failed to save assignment.');
        }
    };

    // Flips the visible property of an assignment when the badge is clicked
    // true → false (hides from students)
    // false → true (shows to students)
    const handleToggleVisibility = async (assignmentDeployId) => {

        const target = assignments.find((a) => a.deployment_id === assignmentDeployId);
        if (!target) return;

        const nextValue = !target.is_visible;

        try {
            const { error } = await supabase
                .from('assignment_deployments')
                .update({ is_visible: nextValue })
                .eq('deployment_id', assignmentDeployId);

            if (error) throw error;

            // Map through assignments, flip visible on the one that matches
            setAssignments((prev) =>
                prev.map((a) =>
                    a.deployment_id === assignmentDeployId
                        ? { ...a, is_visible: nextValue }
                        : a
                )
            );
        } catch (error) {
            console.error(error);
            alert(error.message || 'Failed to update assignment visibility.');
        }
    };

    // Removes an assignment from the list when the instructor clicks delete
    // Filters out the assignment that matches the given assignment_deploy_id
    const handleDeleteAssignment = async (assignmentDeployId) => {

        // Ask for confirmation before deleting
        const confirmed = window.confirm('Are you sure you want to delete this assignment?');
        if (!confirmed) return;

        try {
            const target = assignments.find((a) => a.deployment_id === assignmentDeployId);
            if (!target) return;

            const { error: deploymentError } = await supabase
                .from('assignment_deployments')
                .delete()
                .eq('deployment_id', assignmentDeployId);

            if (deploymentError) throw deploymentError;

            const { error: assignmentError } = await supabase
                .from('assignments')
                .delete()
                .eq('assignment_id', target.assignment_id);

            if (assignmentError) throw assignmentError;

            // Filter out the deleted assignment from local state
            setAssignments((prev) =>
                prev.filter(a => a.deployment_id !== assignmentDeployId)
            );
        } catch (error) {
            console.error(error);
            alert(error.message || 'Failed to delete assignment.');
        }
    };


    return (
        
        <div className="dashboard instructor-shell">

            <div className="instructor-header">
                <div>
                    <h1 className="instructor-title">Instructor Workspace</h1>
                    <p className="instructor-subtitle">
                        Manage assignments, review submissions, and monitor academic integrity activity.
                    </p>
                </div>
            </div>

            <div className="instructor-tabs">
                <button
                    className={activeTab === 'assignments' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('assignments')}
                >
                    Assignments
                </button>

                <button
                    className={activeTab === 'review' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('review')}
                >
                    Review Queue
                </button>

                <button
                    className={activeTab === 'analytics' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab('analytics')}
                >
                    Analytics
                </button>
            </div>

            {activeTab === 'assignments' && (
                <>
                    {/* ── Breadcrumb ── */}
                    {/* Shows the current navigation path: Courses → Course Name → Form */}
                    <div className="breadcrumb">

                        {/* Level 1 — always visible */}
                        {/* If a course is selected, this becomes a clickable link back to course list */}
                        {/* Clicking it resets both selectedCourse and editingAssignment */}
                        <span
                            className={!selectedCourse ? 'breadcrumb-current' : 'breadcrumb-link'}
                            onClick={() => {
                            setSelectedCourse(null);
                            setEditingAssignment(null);
                            }}
                        >
                            Courses
                        </span>

                        {/* Level 2 — only visible when a course is selected */}
                        {/* If the form is open, this becomes a clickable link back to assignment list */}
                        {/* Clicking it closes the form without losing the selected course */}
                        {selectedCourse && (
                            <>
                            <span className="breadcrumb-separator">→</span>
                            <span
                                className={!editingAssignment ? 'breadcrumb-current' : 'breadcrumb-link'}
                                onClick={() => setEditingAssignment(null)}
                            >
                                {selectedCourse.course_name}
                            </span>
                            </>
                        )}

                        {/* Level 3 — only visible when the create or edit form is open */}
                        {/* Shows 'New Assignment' for create, 'Edit Assignment' for edit */}
                        {editingAssignment && (
                            <>
                            <span className="breadcrumb-separator">→</span>
                            <span className="breadcrumb-current">
                                {editingAssignment === 'create' ? 'New Assignment' : 'Edit Assignment'}
                            </span>
                            </>
                        )}

                    </div>

                    {/* ── Course list view — shown by default ── */}
                    {/* Renders when no course has been selected yet */}
                    {!selectedCourse && (
                        <div className="course-list">
                            {loading ? (
                            <p>Loading...</p>
                            ) : (
                            courses.map((course) => (
                                <div
                                className="course-card"
                                key={course.course_id}
                                onClick={() => setSelectedCourse(course)}
                                >
                                <h2>{course.course_name}</h2>
                                </div>
                            ))
                            )}
                        </div>

                    )}


                    {/* ── Assignment list view — shown when a course is clicked ── */}
                    {/* Renders when a course is selected but the form is not open */}
                    {selectedCourse && !editingAssignment && (

                        <div className="assignment-list">

                            {/* Button to open the create form */}
                            {/* Sets editingAssignment to 'create' which triggers the form view */}
                            <button
                            className="btn-new-assignment"
                            onClick={() => setEditingAssignment('create')}
                            >
                            + New Assignment
                            </button>

                            {/* Show loading text while waiting for mockDB */}
                            {assignmentsLoading ? (
                            <p>Loading...</p>
                            ) : (

                                /* Each card shows assignment info with edit and visibility controls */
                                assignments.map((item, index) => (
                                    <div className="assignment-card" key={item.deployment_id}>

                                        {/* Left side — assignment info */}
                                        <div className="assignment-card-left">
                                            <p className="assignment-number">Assignment {index + 1}</p>
                                            <h2 className="assignment-name">{item.name}</h2>
                                            <p className="assignment-due">Due: {formatDueDate(item.due_date)}</p>
                                        </div>

                                        {/* Right side — edit and visibility controls */}
                                        <div className="assignment-card-right">

                                            {/* Visibility toggle — shows current state, clicking flips it */}
                                            <span 
                                                className={item.is_visible ? 'status-visible' : 'status-hidden'}
                                                onClick={() => handleToggleVisibility(item.deployment_id)}
                                            >
                                            {item.is_visible ? 'Visible' : 'Hidden'}
                                            </span>

                                            {/* Pencil button — opens edit form pre-filled with this assignment */}
                                            <button
                                            className="btn-edit"
                                            onClick={() => setEditingAssignment(item)}
                                            >
                                            ✏️
                                            </button>

                                            {/* Delete button — removes assignment after confirmation */}
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDeleteAssignment(item.deployment_id)}
                                            >
                                                🗑️
                                            </button>

                                        </div>

                                    </div>

                                ))

                            )}

                        </div>

                    )}


                    {/* ── Create / Edit form — shown when editingAssignment is set ── */}
                    {/* Same form for both create and edit — fields are empty or pre-filled */}
                    {selectedCourse && editingAssignment && (
                    <div className="assignment-form">

                        {/* Assignment name field */}
                        <div className="form-group">
                        <label className="form-label">Assignment Name</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Enter assignment name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                        />
                        </div>

                        {/* Description field */}
                        <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Enter assignment description"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                        />
                        </div>

                        {/* Due date field */}
                        <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <input
                            className="form-input"
                            type="date"
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                        />
                        </div>

                        {/* Due time field */}
                        <div className="form-group">
                        <label className="form-label">Due Time</label>
                        <input
                            className="form-input"
                            type="time"
                            value={formDueTime}
                            onChange={(e) => setFormDueTime(e.target.value)}
                        />
                        </div>

                        {/* Submit button — label changes based on create or edit */}
                        <button
                        className="btn-form-submit"
                        onClick={handleFormSubmit}
                        >
                        {editingAssignment === 'create' ? 'Create Assignment' : 'Save Changes'}
                        </button>

                    </div>
                    )}
                </>
            )}

            {activeTab === 'review' && (
                <ReviewQueuePanel
                    selectedCourse={selectedCourse}
                    assignments={assignments}
                    submissions={submissions}
                    loading={submissionsLoading}
                    error={submissionsError}
                />
            )}

            {activeTab === 'analytics' && (
                <AnalyticsPanel
                    selectedCourse={selectedCourse}
                    assignments={assignments}
                    metrics={analytics.metrics}
                    priorityCases={analytics.priorityCases}
                    languageCounts={analytics.languageCounts}
                    loading={analyticsLoading}
                    error={analyticsError}
                />
            )}

        </div>

    );
}