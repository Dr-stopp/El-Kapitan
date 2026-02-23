package server;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DBHandler {

    private final JdbcTemplate jdbc;

    public DBHandler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        System.out.println("DBHandler initialized");

    }

    @Transactional
    public void insertCourse(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertCourseRun(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertAssignment(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertAssignmentRun(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertUser(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertSubmission(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertResult(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    @Transactional
    public void insertResultSection(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }
}