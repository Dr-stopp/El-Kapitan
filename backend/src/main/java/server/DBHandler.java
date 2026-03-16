package server;

import Tokenizer.src.PlagiarismChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class DBHandler {

    private final JdbcTemplate jdbc;
    private static final Logger log = LoggerFactory.getLogger(DBHandler.class);

    public DBHandler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        log.info("DBHandler initialized");

    }

    public long generateSubmissionID() {
        String sql = "SELECT nextval('submissions_seq')";
        return jdbc.queryForObject(sql, Long.class);
    }

    public long generateResultID() {
        String sql = "SELECT nextval('results_seq')";
        return jdbc.queryForObject(sql, Long.class);
    }

    public void clearResults(long submission_id) {
        String sql = "DELETE FROM RESULTS WHERE SUBMISSION_1 =" + submission_id;
        jdbc.execute(sql);
    }

    @Transactional
    public void insertCourse(long courseId, String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_id, course_name) VALUES (?, ?)";
        jdbc.update(sql, courseId, courseName);
    }

    // -------------------- course_runs --------------------
    // columns: course_run_id, teacher, course_id

    @Transactional
    public void insertCourseRun(long courseRunId, long teacher, long courseId) {
        String sql = "INSERT INTO public.\"course_runs\" (course_run_id, teacher, course_id) VALUES (?, ?, ?)";
        jdbc.update(sql, courseRunId, teacher, courseId);
    }

    // -------------------- Assignments --------------------
    // columns: assign_id, course_id, language, name

    @Transactional
    public void insertAssignment(long assignId, long courseId, String language, String name) {
        String sql = "INSERT INTO public.\"Assignments\" (assign_id, course_id, language, name) VALUES (?, ?, ?, ?)";
        jdbc.update(sql, assignId, courseId, language, name);
    }

    // -------------------- assignment_runs --------------------
    // columns: assignment_run_id, course_run_id, assign_id, due_date, top_k, threshold

    @Transactional
    public void insertAssignmentRun(
            long assignmentRunId,
            long courseRunId,
            long assignId,
            OffsetDateTime dueDate,
            long topK,
            long threshold
    ) {
        String sql = """
            INSERT INTO public."assignment_runs"
            (assignment_run_id, course_run_id, assign_id, due_date, top_k, threshold)
            VALUES (?, ?, ?, ?, ?, ?)
            """;
        jdbc.update(sql, assignmentRunId, courseRunId, assignId, dueDate, topK, threshold);
    }

    // -------------------- Users --------------------
    // columns: id, type, first_name, last_name, email, password, registration_date, password_last_change

    @Transactional
    public void insertUser(
            long id,
            String type,
            String firstName,
            String lastName,
            String email,
            String password,
            OffsetDateTime registrationDate,
            OffsetDateTime passwordLastChange
    ) {
        String sql = """
            INSERT INTO public."Users"
            (id, type, first_name, last_name, email, password, registration_date, password_last_change)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbc.update(sql, id, type, firstName, lastName, email, password, registrationDate, passwordLastChange);
    }

    // -------------------- submissions --------------------
    // columns: submission_id, created_at, assignment_run_id, student_id, folder_path

    @Transactional
    public void insertSubmission(
            long submissionId,
            OffsetDateTime createdAt,
            long assignmentRunId,
            long studentId,
            String folderPath
    ) {
        String sql = """
            INSERT INTO public."submissions"
            (submission_id, created_at, assignment_run_id, student_id, folder_path)
            VALUES (?, ?, ?, ?, ?)
            """;
        jdbc.update(sql, submissionId, createdAt, assignmentRunId, studentId, folderPath);
    }

    // -------------------- results --------------------
    // columns: submission_1, submission_2, score, date_created, pair_id

    @Transactional
    public void insertResult(
            long submission1,
            long submission2,
            long score,
            OffsetDateTime dateCreated,
            long pairId
    ) {
        String sql = """
            INSERT INTO public."results"
            (submission_1, submission_2, score, date_created, pair_id)
            VALUES (?, ?, ?, ?, ?)
            """;
        jdbc.update(sql, submission1, submission2, score, dateCreated, pairId);
    }

    // -------------------- results_sections --------------------
    // columns:
    // section_id, pair_id, submission_1, submission_2,
    // submission_1_sec_start, submission_2_sec_start,
    // submission_1_sec_end, submission_2_sec_end,
    // submission_1_file_name, submission_2_file_name

    @Transactional
    public void insertResultSection(
            long sectionId,
            long pairId,
            long submission1,
            long submission2,
            long submission1SecStart,
            long submission2SecStart,
            long submission1SecEnd,
            long submission2SecEnd,
            String submission1FileName,
            String submission2FileName
    ) {
        String sql = """
            INSERT INTO public."results_sections"
            (section_id, pair_id, submission_1, submission_2,
             submission_1_sec_start, submission_2_sec_start,
             submission_1_sec_end, submission_2_sec_end,
             submission_1_file_name, submission_2_file_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        jdbc.update(sql,
                sectionId, pairId, submission1, submission2,
                submission1SecStart, submission2SecStart,
                submission1SecEnd, submission2SecEnd,
                submission1FileName, submission2FileName
        );
    }
}