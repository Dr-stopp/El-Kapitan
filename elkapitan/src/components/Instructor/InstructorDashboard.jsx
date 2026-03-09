import React, { useState, useEffect } from 'react';
import { mockDB } from '../../mockDB.js';
import '../Dashboard.css';
import './InstructorDashboard.css'
import { formatDueDate } from '../../utils.js';

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


    // Runs once when the component first appears on screen
    // Like a constructor in Java - do setup here
    useEffect(() => {

        // Fetch all courses this instructor teaches
        // user.id is the logged-in instructor's ID
        mockDB.getInstructorCourses(user.id).then((data) => {
            setCourses(data);   // Store the courses in state
            setLoading(false);  // Done loading
        });

    }, []); // Empty array = run once on mount, never again

    // Runs whenever selectedCourse changes — fetches assignments for that course
    useEffect(() => {
        if (!selectedCourse) return;

        setAssignmentsLoading(true);

        mockDB.getAssignmentsForCourseInstructor(selectedCourse.course_id).then((data) => {
            setAssignments(data);
            setAssignmentsLoading(false);
        });
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
    const handleFormSubmit = () => {

        // Guard — don't submit if required fields are empty
        if (!formName || !formDueDate || !formDueTime) {
            alert('Please fill in the assignment name, due date, and due time.');
            return;
        }

        // Combine date and time back into one string to match the stored format
        // e.g. '2026-03-10' + '23:59' → '2026-03-10T23:59:00Z'
        const due_date = `${formDueDate}T${formDueTime}:00Z`;

        if (editingAssignment === 'create') {

            // Build a new assignment object
            // assign_id and assignment_deploy_id are generated from timestamp (like mockDB does for users)
            const newAssignment = {
                deployment_id: Date.now(),
                assignment_id: Date.now(),
                name: formName,
                description: formDescription,
                due_date: due_date,
                is_visible: false, // new assignments are hidden by default
            };

            // Add to local state — mockDB doesn't support writes yet
            setAssignments((prev) => [...prev, newAssignment]);

        } else {

            // Update the existing assignment in local state
            // Map through assignments, replace the one that matches
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
    };

    // Flips the visible property of an assignment when the badge is clicked
    // true → false (hides from students)
    // false → true (shows to students)
    const handleToggleVisibility = (assignmentDeployId) => {

        // Map through assignments, flip visible on the one that matches
        setAssignments((prev) =>
            prev.map((a) =>
                a.deployment_id === assignmentDeployId
                    ? { ...a, is_visible: !a.is_visible }
                    : a
            )
        );
    };

    // Removes an assignment from the list when the instructor clicks delete
    // Filters out the assignment that matches the given assignment_deploy_id
    const handleDeleteAssignment = (assignmentDeployId) => {

        // Ask for confirmation before deleting
        const confirmed = window.confirm('Are you sure you want to delete this assignment?');
        if (!confirmed) return;

        // Filter out the deleted assignment from local state
        setAssignments((prev) =>
            prev.filter(a => a.deployment_id !== assignmentDeployId)
        );
    };


    return (
        
        <div className="dashboard">

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

        </div>

    );
}