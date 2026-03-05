// mockDB.js
// This is our fake database for now.
// Each function here will later be replaced with a real Supabase call.

const DB = {

  // Courses table — matches your Supabase schema
  courses: [
    { course_id: 10, course_name: 'Introduction to Computer Science' },
    { course_id: 11, course_name: 'Data Structures & Algorithms' },
    { course_id: 12, course_name: 'Advance Object Oriented Programming' },
  ],

  // Enrollments — which student is in which course
  enrollments: [
    { student_id: 'b4791023-acca-430f-ae05-b63499afdbc0', course_id: 10 },
    { student_id: 'b4791023-acca-430f-ae05-b63499afdbc0', course_id: 11 },
    { student_id: 'b4791023-acca-430f-ae05-b63499afdbc0', course_id: 12 },
  ],

  // NEW — the assignment templates for each course
  assignments: [
    { assign_id: 200, course_id: 10, language: 'Python', name: 'Hello World & Basics' },
    { assign_id: 201, course_id: 10, language: 'Python', name: 'Functions & Recursion' },
    { assign_id: 202, course_id: 11, language: 'Java',   name: 'Linked List Implementation' },
  ],

  // NEW — a specific instance of an assignment with a due date
  assignment_runs: [
    { assignment_run_id: 300, course_id: 10, assign_id: 200, due_date: '2026-03-10T23:59:00Z' },
    { assignment_run_id: 301, course_id: 10, assign_id: 201, due_date: '2026-03-20T23:59:00Z' },
    { assignment_run_id: 302, course_id: 11, assign_id: 202, due_date: '2026-03-15T23:59:00Z' },
  ],

};

// Helper that simulates a network delay
// Later when you call real Supabase this delay won't be needed
const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

export const mockDB = {

  // Gets all courses for a specific student
  // Called by: StudentDashboard when it first loads
  // Receives: studentId — the logged in user's id
  // Returns: array of course objects the student is enrolled in
  getStudentCourses: async (studentId) => {
    await delay();

    // Step 1 — find all course_ids this student is enrolled in
    const enrolledCourseIds = DB.enrollments
      .filter(e => e.student_id === studentId)
      .map(e => e.course_id);

    // Step 2 — get the full course object for each enrolled course_id
    return DB.courses
      .filter(c => enrolledCourseIds.includes(c.course_id));
  },

  // Gets all assignments for a specific course
  // Called by: the assignment list view when a course is clicked
  // Receives: courseId — the course the student clicked on
  // Returns: array of assignments with their due dates
  getAssignmentsForCourse: async (courseId) => {
    await delay();

    // Step 1 — find all assignment_runs for this course
    const runs = DB.assignment_runs
      .filter(ar => ar.course_id === courseId);

    // Step 2 — for each run, attach the assignment name and language
    return runs.map(ar => {
      const assignment = DB.assignments
        .find(a => a.assign_id === ar.assign_id);

      return {
        assignment_run_id: ar.assignment_run_id,
        name: assignment.name,
        language: assignment.language,
        due_date: ar.due_date,
        submitted: ar.submitted,
      };
    });
  },

};