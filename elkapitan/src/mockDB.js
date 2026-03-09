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

  // assignment templates for each course
  assignments: [
    { assignment_id: 200, name: 'Hello World & Basics', description: 'Write a hello world program and basic input/output.' },
    { assignment_id: 201, name: 'Functions & Recursion', description: 'Implement recursive functions for factorial and fibonacci.' },
    { assignment_id: 202, name: 'Linked List Implementation', description: 'Build a singly linked list with insert and delete methods.' },
  ],

  assignment_deployments: [
    { deployment_id: 300, course_id: 10, assignment_id: 200, due_date: '2026-03-10T23:59:00Z', is_visible: true },
    { deployment_id: 301, course_id: 10, assignment_id: 201, due_date: '2026-03-20T23:59:00Z', is_visible: false },
    { deployment_id: 302, course_id: 11, assignment_id: 202, due_date: '2026-03-15T23:59:00Z', is_visible: true },
  ],

  // Which instructor teaches which course
  instructor_courses: [
    { instructor_id: '62b52fac-3a91-458d-b65f-ff3a5fc15a4a', course_id: 10 },
    { instructor_id: '62b52fac-3a91-458d-b65f-ff3a5fc15a4a', course_id: 11 },
    { instructor_id: '62b52fac-3a91-458d-b65f-ff3a5fc15a4a', course_id: 12 },
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

    const deployments = DB.assignment_deployments
      .filter(ad => ad.course_id === courseId);

    return deployments.map(ad => {
      const assignment = DB.assignments
        .find(a => a.assignment_id === ad.assignment_id);

      return {
          deployment_id: ad.deployment_id,
          name:          assignment.name,
          description:   assignment.description,
          is_visible:    ad.is_visible,
          due_date:      ad.due_date,
          submitted:     ad.submitted,
      };
    });
  },


  // Gets all courses for a specific instructor
  // Called by: InstructorDashboard when it first loads
  // Receives: instructorId — the logged in instructor's id
  // Returns: array of course objects the instructor teaches
  getInstructorCourses: async (instructorId) => {
    await delay();

    // Step 1 — find all course_ids this instructor teaches
    const teachingCourseIds = DB.instructor_courses
      .filter(ic => ic.instructor_id === instructorId)
      .map(ic => ic.course_id);

    // Step 2 — get the full course object for each course_id
    return DB.courses
      .filter(c => teachingCourseIds.includes(c.course_id));
  },


  // Gets all assignments for a specific course (instructor view)
  // Called by: InstructorDashboard when a course is clicked
  // Receives: courseId — the course the instructor clicked on
  // Returns: array of assignment objects combining data from assignments and assignment_runs
  getAssignmentsForCourseInstructor: async (courseId) => {
    await delay();

    const deployments = DB.assignment_deployments.filter(ad => ad.course_id === courseId);

    return deployments.map(ad => {
      const assignment = DB.assignments.find(a => a.assignment_id === ad.assignment_id);

      return {
        deployment_id: ad.deployment_id,
        assignment_id: ad.assignment_id,
        name:          assignment.name,
        description:   assignment.description,
        is_visible:    ad.is_visible,
        due_date:      ad.due_date,
      };
    });
  },

};