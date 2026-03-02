import React, { useState, useEffect } from 'react';
import { mockDB } from './mockDB.js';
import './StudentDashboard.css';

export default function StudentDashboard({ user, onLogout, onToggleTheme, theme }) {

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


    // This runs once when the dashboard first appears on screen
    // Same idea as a constructor in Java — do your setup here
    useEffect(() => {

      // Call mockDB, pass the logged in user's id
      // When it comes back, store the result in courses state
      mockDB.getStudentCourses(user.id).then((data) => {
        setCourses(data);   // store the courses
        setLoading(false);  // done loading
      });

    }, []); // the [] means run once on load, never again

    useEffect(() => {

      if (!selectedCourse) return; // guard — do nothing if no course selected
        
        setAssignmentsLoading(true);

        mockDB.getAssignmentsForCourse(selectedCourse.course_id).then((data) => {
          setAssignments(data);
          setAssignmentsLoading(false);
        });
    }, [selectedCourse]); // runs whenever selectedCourse changes


    return (
      <div className="student-dashboard">

        {/* Header — never changes */}
        <header className="student-header">
          <div className="student-header-left">
            <img src="/perseverance.svg" alt="Logo" className="student-header-logo" />
            <span className="student-header-brand">EL Kapitan</span>
          </div>
          <div className="student-header-right">
            <span className="student-greeting">
              {user.firstName} {user.lastName}
            </span>
            <button className="btn-theme" onClick={onToggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {/* ── Breadcrumb ── */}
        <div className="breadcrumb">

          <span
            className={!selectedCourse ? 'breadcrumb-current' : 'breadcrumb-link'}
            onClick={() => {
              setSelectedCourse(null);
            }}
          >
            Courses
          </span>

          {selectedCourse && (
            <>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">
                {selectedCourse.course_name}
              </span>
            </>
          )}

        </div>

        {/* ── Course list view — shown by default ── */}
        {!selectedCourse && (
          <main className="student-body">
            
            {loading ? (
              <p>Loading...</p>
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
        {selectedCourse && (
          <main className="student-body">
            
            
            {assignmentsLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="assignment-list">
                {assignments.map((item, index) => (
                  <div className="assignment-card" key={item.assignment_run_id}>

                    <div className="assignment-card-left">
                      <p className="assignment-number">Assignment {index + 1}</p>
                      <h2 className="assignment-name">{item.name}</h2>
                      <p className="assignment-due">Due: {item.due_date}</p>
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

      </div>
    );


}