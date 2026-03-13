import React, { useState, useEffect } from 'react';
//import { mockDB } from '../../mockDB.js';
import '../Dashboard.css';
import './StudentDashboard.css';
import { formatDueDate } from '../../utils.js';
import { supabase } from '../../supabaseClient.js';

export default function StudentDashboard({ user }) {

    // This is where we store the courses once they load from mockDB
    // Starts as an empty array — no courses yet
    const [courses, setCourses] = useState([]);

    // True while we're waiting for mockDB to return data
    // We use this to show "Loading..." instead of an empty screen
    const [loading, setLoading] = useState(true);

    // tracks which course the student clicked
    // null = no course selected = show course list
    // has a value = show assignments for that course
    const [selectedCourse, setSelectedCourse] = useState(null);

    // stores the assignments for the selected course
    const [assignments, setAssignments] = useState([]);

    // tracks loading while assignments are being fetched
    const [assignmentsLoading, setAssignmentsLoading] = useState(false);

    // tracks which assignment the student clicked
    // null = no assignment selected
    // has a value = show submission page for that assignment
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // The file the student picked from their computer
    const [selectedFile, setSelectedFile] = useState(null);

    // True while file is uploading — disables submit button to prevent double clicks
    const [uploading, setUploading] = useState(false);


    // Called when student clicks Submit
    // Uploads the file to Supabase Storage under submissions/userId/assignmentId/filename
    const handleSubmit = async () => {
      if (!selectedFile) return;

      setUploading(true);

      // Build the file path inside the bucket
      // e.g. submissions/123/300/hello_world.py
      const filePath = `${user.id}/${selectedAssignment.deployment_id}/${selectedFile.name}`;

      // Upload to Supabase Storage bucket called 'submissions'
      const { error } = await supabase.storage
        .from('submissions')
        .upload(filePath, selectedFile, { upsert: true });

      setUploading(false);

      if (error) {
        alert('Upload failed: ' + error.message);
      } else {
        setSelectedFile(null);
        // Update the assignment status to submitted in local state
        setSelectedAssignment({ ...selectedAssignment, submitted: true });
      }
    };


    // This runs once when the dashboard first appears on screen
    useEffect(() => {

        // Query the enrollments table for all courses this student is enrolled in
        // select('course_id, courses(course_name)') is Supabase's way of doing a JOIN
        // it follows the foreign key from enrollments → courses automatically
        supabase
          .from('enrollments')
          .select('course_id, courses(course_name)')
          .eq('student_id', user.id)        // WHERE student_id = user.id
          .then(({ data, error }) => {
            
            if (error) { 
              console.error(error); 
              return; 
            }
            
            // data comes back as:
            // [{ course_id: 1, courses: { course_name: 'Intro to CS' } }, ...]
            // we flatten it into the same shape mockDB was returning
            const courses = data.map(row => ({
              course_id:   row.course_id,
              course_name: row.courses.course_name,
            }));

            setCourses(courses);
            setLoading(false);
          });

    }, [user.id]); // runs once on mount




    // Runs whenever selectedCourse changes — fetches assignments for that course
    useEffect(() => {

        if (!selectedCourse) return; // guard — do nothing if no course selected

        // Wrapped in an async function because useEffect itself can't be async
        const fetchAssignments = async () => {

            setAssignmentsLoading(true);

            // Query assignment_deployments for all visible assignments in this course
            // select follows foreign keys to grab assignment name and description too
            const { data, error } = await supabase
                .from('assignment_deployments')
                .select('deployment_id, due_date, is_visible, assignments(name, description)')
                .eq('course_id', selectedCourse.course_id)  // WHERE course_id = selectedCourse.course_id
                .eq('is_visible', true);                     // AND is_visible = true

            if (error) {
                console.error(error);
                setAssignmentsLoading(false);
                return;
            }

            // For each assignment, check Supabase Storage to see if the student
            // already submitted a file — folder exists and has at least one file
            // Promise.all runs all checks in parallel instead of one by one
            const assignmentsWithStatus = await Promise.all(
                data.map(async (row) => {

                    // Check if a file exists at submissions/userId/deploymentId/
                    const { data: files } = await supabase.storage
                        .from('submissions')
                        .list(`${user.id}/${row.deployment_id}`);

                    return {
                        deployment_id: row.deployment_id,
                        due_date:      row.due_date,
                        is_visible:    row.is_visible,
                        name:          row.assignments.name,
                        description:   row.assignments.description,
                        submitted:     files && files.length > 0, // true if file exists
                    };
                })
            );

            setAssignments(assignmentsWithStatus);
            setAssignmentsLoading(false);
        };

        fetchAssignments(); // call the async function

    }, [selectedCourse, user.id]); // runs whenever selectedCourse changes


    return (

      <div className="dashboard">

        {/* ── Breadcrumb ── */}
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

        {/* ── Course list view — shown by default ── */}
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

        {/* ── Assignment list view — shown when a course is clicked ── */}
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


        {/* ── Submission page — shown when an assignment is clicked ── */}
        {selectedCourse && selectedAssignment && (
          <main className="student-body">

          <div className="submission-header">
            <p className="submission-assignment-number">Assignment {selectedAssignment.number}</p>
            <h2 className="submission-title">{selectedAssignment.name}</h2>
            <p className="submission-due">Due: {formatDueDate(selectedAssignment.due_date)}</p>
          </div>

          <div className="drop-zone">
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
            />
            <div className="drop-zone-icon">📂</div>
            {selectedFile ? (
              <p className="drop-zone-text">✓ {selectedFile.name}</p>
            ) : (
              <p className="drop-zone-text">Drag & drop your file here, or click to browse</p>
            )}
          </div>

          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Submit'}
          </button>

          {selectedAssignment.submitted && (
            <p className="status-submitted">
              ✓ Assignment submitted
            </p>
          )}

        </main>
        )}

      </div>
    );


}