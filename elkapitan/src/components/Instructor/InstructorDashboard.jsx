/**
 * InstructorDashboard Component
 * 
 * This component provides an instructor-facing dashboard for managing courses and assignments.
 * - Displays a list of courses taught by the instructor.
 * - Allows selection of a course to view, create, edit, and delete assignments.
 * - Supports toggling assignment visibility and editing assignment details.
 * - Uses breadcrumbs for navigation between course list, assignment list, and assignment form views.
 * - Fetches and updates data via Supabase.
 */

import React, { useState, useEffect } from 'react';
//import { mockDB } from '../../mockDB.js';
import { supabase } from '../../supabaseClient.js';
import '../Dashboard.css';
import './InstructorDashboard.css'
import { formatDueDate } from '../../utils.js';

export default function InstructorDashboard({ user }) {

    // Starts empty, gets filled when Supabase returns data
    // Starts empty, gets filled when mockDB returns data
    const [courses, setCourses] = useState([]);

    // True while we're waiting for data from Supabase
    // Shows "Loading..." instead of empty screen
    const [loading, setLoading] = useState(true);

    // tracks which course the instructor clicked
    // null = show course list
    const [selectedCourse, setSelectedCourse] = useState(null);

    // stores assignments for the selected course
    const [assignments, setAssignments] = useState([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // Controls the View State: null (list), 'create' (new form), or assignment object (edit form).
    const [editingAssignment, setEditingAssignment] = useState(null);

    // Stores the current values of the form fields
    // Pre-filled when editing, empty when creating
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dueDate: '',
        dueTime: '',
    });


    // Runs once when the component first appears on screen
    // Runs after the component mounts to the screen - do initial data fetching here
    useEffect(() => {

        // Fetch all courses this instructor teaches
        // Query instructor_courses for all courses this instructor teaches
        // Performs a join with the 'courses' table using the foreign key to retrieve course names.
        supabase
        .from('instructor_courses')
        .select('course_id, courses(course_name)')
        .eq('instructor_id', user.id)        // WHERE instructor_id = user.id
        .then(({ data, error }) => {

            console.log('data:', data);
            console.log('error:', error);

            if (error) {
            console.error(error);
            return;
            }

            // data comes back as:
            // [{ course_id: 1, courses: { course_name: 'Intro to CS' } }, ...]
            // flatten into same shape the rest of the component expects
            const courses = data.map(row => ({
            course_id:   row.course_id,
            course_name: row.courses.course_name,
            }));

            setCourses(courses);
            setLoading(false);
        });

    }, []); // Empty array = run once on mount, never again

    // Runs whenever selectedCourse changes — fetches assignments for that course
    useEffect(() => {

        if (!selectedCourse) return;

        const fetchAssignments = async () => {

            setAssignmentsLoading(true);

            // Query assignment_deployments for all assignments in this course
            // instructor sees ALL assignments regardless of is_visible
            // follows foreign key to grab name and description from assignments table
            const { data, error } = await supabase
                .from('assignment_deployments')
                .select('deployment_id, assignment_id, due_date, is_visible, assignments(name, description)')
                .eq('course_id', selectedCourse.course_id); // WHERE course_id = selectedCourse.course_id

            if (error) {
                console.error(error);
                setAssignmentsLoading(false);
                return;
            }

            // data comes back as:
            // [{ deployment_id: 1, assignment_id: 1, due_date: '...', is_visible: true, assignments: { name: '...', description: '...' } }]
            // flatten into same shape the rest of the component expects
            const assignments = data.map(row => {

                // Convert due_date string into a real JS Date object
                const localDateObj = new Date(row.due_date);

                return {
                    deployment_id: row.deployment_id,
                    assignment_id: row.assignment_id,
                    due_date:      localDateObj, // store the object, not the string
                    is_visible:    row.is_visible,
                    name:          row.assignments.name,
                    description:   row.assignments.description,
                };
            });

            setAssignments(assignments);
            setAssignmentsLoading(false);
        };

        fetchAssignments(); // call the async function

    }, [selectedCourse]); // runs whenever selectedCourse changes


    //Handlers -----

    //Form changes are stored in formData state as the instructor types
    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Handles both create and edit form submission
    // If editingAssignment is 'create' — adds a new assignment to Supabase
    // If editingAssignment is an object — updates the existing assignment
    
    // const handleFormSubmit = async () => {

    //     // Guard — don't submit if required fields are empty
    //     if (!formData.name || !formData.dueDate || !formData.dueTime) {
    //         alert('Please fill in the assignment name, due date, and due time.');
    //         return;
    //     }

    //     // Convert local form inputs into a UTC ISO string for Supabase
    //     const localDateObj = new Date(`${formData.dueDate}T${formData.dueTime}`);
    //     const utcStringForDB = localDateObj.toISOString();

    //     if (editingAssignment === 'create') {

    //         // 1. Insert into assignments, get back the new assignment_id
    //         const { data: assignmentData, error: error1 } = await supabase
    //             .from('assignments')
    //             .insert({ name: formData.name, description: formData.description })
    //             .select()
    //             .single();

    //         if (error1) {
    //             alert('Failed to create assignment.');
    //             return;
    //         }

    //         // 2. Insert into assignment_deployments using the returned assignment_id
    //         const { data: deploymentData, error: error2 } = await supabase
    //             .from('assignment_deployments')
    //             .insert({
    //                 assignment_id: assignmentData.assignment_id,
    //                 course_id:     selectedCourse.course_id,
    //                 due_date:      utcStringForDB,
    //                 is_visible:    false,
    //             })
    //             .select()
    //             .single();

    //         if (error2) {
    //             alert('Failed to deploy assignment.');
    //             return;
    //         }

    //         // Only update local state after both inserts succeeded
    //         setAssignments((prev) => [...prev, {
    //             deployment_id: deploymentData.deployment_id,
    //             assignment_id: assignmentData.assignment_id,
    //             name:          formData.name,
    //             description:   formData.description,
    //             due_date:      localDateObj,
    //             is_visible:    false,
    //         }]);

    //     } else {

    //         // --- EDIT LOGIC ---
    //         // 1. Update core assignment info
    //         const { error: error1 } = await supabase
    //             .from('assignments')
    //             .update({ name: formData.name, description: formData.description })
    //             .eq('assignment_id', editingAssignment.assignment_id);

    //         if (error1) {
    //             alert('Failed to update assignment details.');
    //             return;
    //         }

    //         // 2. Update deployment info (due date) only if step 1 worked
    //         const { error: error2 } = await supabase
    //             .from('assignment_deployments')
    //             .update({ due_date: utcStringForDB })
    //             .eq('deployment_id', editingAssignment.deployment_id);

    //         if (error2) {
    //             alert('Failed to update assignment due date.');
    //             return;
    //         }

    //         // Only update local state after both Supabase calls succeeded
    //         setAssignments((prev) =>
    //             prev.map((a) =>
    //                 a.deployment_id === editingAssignment.deployment_id
    //                     ? { ...a, name: formData.name, description: formData.description, due_date: localDateObj }
    //                     : a
    //             )
    //         );
    //     }

    //     // Close the form after submitting
    //     setEditingAssignment(null);
    // };





    // ------Entry point for the form submission------
    // Validates input, prepares date data, then delegates to the correct handler
    const handleFormSubmit = async () => {

        // Guard — don't submit if required fields are empty
        // Same as a null check before calling a method in Java
        if (!formData.name || !formData.dueDate || !formData.dueTime) {
            alert('Please fill in the assignment name, due date, and due time.');
            return;
        }

        // Combine the separate date and time strings into a single JS Date object
        // e.g. '2025-12-01' + 'T' + '23:59' → new Date('2025-12-01T23:59')
        const localDateObj = new Date(`${formData.dueDate}T${formData.dueTime}`);

        // Convert the local Date object to a UTC ISO string for Supabase
        // Supabase expects UTC — toISOString() handles the timezone conversion
        const utcStringForDB = localDateObj.toISOString();

        // Delegate to the appropriate handler based on whether we are creating or editing
        // Similar to calling a different method based on a condition in Java
        if (editingAssignment === 'create') {
            await handleCreateAssignment(localDateObj, utcStringForDB);
        } else {
            await handleEditAssignment(localDateObj, utcStringForDB);
        }

        // Close the form after submitting regardless of create or edit
        setEditingAssignment(null);
    };


    // Handles creating a brand new assignment
    // Receives pre-built date objects from handleFormSubmit
    const handleCreateAssignment = async (localDateObj, utcStringForDB) => {

        // Step 1 — Insert the core assignment info into the assignments table
        // .select().single() returns the newly created row so we can grab its assignment_id
        const { data: assignmentData, error: error1 } = await supabase
            .from('assignments')
            .insert({ name: formData.name, description: formData.description })
            .select()
            .single();

        // If step 1 failed, stop here — no point deploying an assignment that doesn't exist
        if (error1) {
            alert('Failed to create assignment.');
            return;
        }

        // Step 2 — Deploy the assignment to this course using the assignment_id from step 1
        // Hidden by default (is_visible: false) until the instructor manually reveals it
        const { data: deploymentData, error: error2 } = await supabase
            .from('assignment_deployments')
            .insert({
                assignment_id: assignmentData.assignment_id,
                course_id:     selectedCourse.course_id,
                due_date:      utcStringForDB,
                is_visible:    false,
            })
            .select()
            .single();

        // If step 2 failed, stop here — assignment exists in DB but wasn't deployed
        if (error2) {
            alert('Failed to deploy assignment.');
            return;
        }

        // Only update local state after both inserts succeeded
        // Spreads the new assignment into the existing list — same as adding to an ArrayList in Java
        setAssignments((prev) => [...prev, {
            deployment_id: deploymentData.deployment_id,
            assignment_id: assignmentData.assignment_id,
            name:          formData.name,
            description:   formData.description,
            due_date:      localDateObj,
            is_visible:    false,
        }]);
    };


    // Handles updating an existing assignment
    // Receives pre-built date objects from handleFormSubmit
    const handleEditAssignment = async (localDateObj, utcStringForDB) => {

        // Step 1 — Update the core assignment info in the assignments table
        // Only name and description live here — due_date lives in assignment_deployments
        const { error: error1 } = await supabase
            .from('assignments')
            .update({ name: formData.name, description: formData.description })
            .eq('assignment_id', editingAssignment.assignment_id);

        // If step 1 failed, stop here — don't update the due date if the name/description failed
        if (error1) {
            alert('Failed to update assignment details.');
            return;
        }

        // Step 2 — Update the due date in assignment_deployments
        // Only runs if step 1 succeeded
        const { error: error2 } = await supabase
            .from('assignment_deployments')
            .update({ due_date: utcStringForDB })
            .eq('deployment_id', editingAssignment.deployment_id);

        // If step 2 failed, stop here — name/description updated but due date did not
        if (error2) {
            alert('Failed to update assignment due date.');
            return;
        }

        // Only update local state after both Supabase calls succeeded
        // Maps over the list and replaces only the matching assignment — like updating one element in a Java list
        setAssignments((prev) =>
            prev.map((a) =>
                a.deployment_id === editingAssignment.deployment_id
                    ? { ...a, name: formData.name, description: formData.description, due_date: localDateObj }
                    : a
            )
        );
    };





    // Flips the visible property of an assignment when the badge is clicked
    // true → false (hides from students)
    // false → true (shows to students)
    const handleToggleVisibility = async (assignmentDeployId) => {

        // Find the assignment so we know the current is_visible value to flip
        const assignment = assignments.find(a => a.deployment_id === assignmentDeployId);

        const { error } = await supabase
            .from('assignment_deployments')
            .update({ is_visible: !assignment.is_visible })
            .eq('deployment_id', assignmentDeployId);

        if (error) {
            alert('Failed to update visibility.');
            return;
        }

        // Only update local state after Supabase succeeded
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
    const handleDeleteAssignment = async (assignmentDeployId) => {

        const confirmed = window.confirm('Are you sure you want to delete this assignment?');
        if (!confirmed) return;

        const { error } = await supabase
            .from('assignment_deployments')
            .delete()
            .eq('deployment_id', assignmentDeployId);

        if (error) {
            alert('Failed to delete assignment.');
            return;
        }

        // Only update local state after Supabase succeeded
        setAssignments((prev) =>
            prev.filter(a => a.deployment_id !== assignmentDeployId)
        );
    };


    return (
        
        
        <div className="dashboard">


            {/* Breadcrumbs for navigation */}
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
                    <div className="spinner"></div>
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
                        onClick={() => {
                            setFormData({ name: '',
                                 description: '', 
                                 dueDate: '', 
                                 dueTime: '' 
                                });
                            setEditingAssignment('create');
                        }}
                    >
                    + New Assignment
                    </button>

                    {/* Show loading text while waiting for Supabase */}
                    {assignmentsLoading ? (
                    <div className="spinner"></div>
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
                                        onClick={() => {
                                            setFormData({
                                                name:        item.name,
                                                description: item.description,
                                                dueDate:     item.due_date.toLocaleDateString('en-CA'),
                                                dueTime:     item.due_date.toLocaleTimeString('en-GB', {
                                                    hour:   '2-digit',
                                                    minute: '2-digit',
                                                }),
                                            });
                                            setEditingAssignment(item);
                                        }}
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
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                  />
                </div>

                {/* Description field */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Enter assignment description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </div>

                {/* Due date field */}
                <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                    className="form-input"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleFormChange('dueDate', e.target.value)}
                />
                </div>

                {/* Due time field */}
                <div className="form-group">
                <label className="form-label">Due Time</label>
                <input
                    className="form-input"
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => handleFormChange('dueTime', e.target.value)}
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