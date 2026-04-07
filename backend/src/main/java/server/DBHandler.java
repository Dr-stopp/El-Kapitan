package server;

import Tokenizer.src.PlagiarismChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

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

    public long getSubmissionID(String ObjectPath) {
        String sql = "SELECT submission_id from submissions where folder_path ='" + ObjectPath + "'";
        return jdbc.queryForObject(sql, Long.class);
    }

    public void clearResults(long submission_id) {
        String sql = "DELETE FROM RESULTS WHERE SUBMISSION_1 =" + submission_id;
        jdbc.execute(sql);
    }

    @Transactional
    public void insertCourse(String courseName) {
        String sql = "INSERT INTO public.\"Courses\" (course_name) VALUES (?)";
        jdbc.update(sql, courseName);
    }

    // -------------------- Assignments --------------------
    // columns: assign_id, course_id, language, name

    @Transactional
    public void insertAssignment(String courseId, String language, String name) {
        String sql = "INSERT INTO public.\"Assignments\" (course_id, language, name) VALUES (?, ?, ?)";
        jdbc.update(sql, courseId, language, name);
    }

    // -------------------- assignment_runs --------------------
    // columns: assignment_run_id, course_run_id, assign_id, due_date, top_k, threshold

    @Transactional
    public void insertAssignmentRun(
            String courseRunId,
            String assignId,
            OffsetDateTime dueDate,
            long topK,
            long threshold
    ) {
        String sql = """
            INSERT INTO public."assignment_runs"
            (course_run_id, assign_id, due_date, top_k, threshold)
            VALUES (?, ?, ?, ?, ?)
            """;
        jdbc.update(sql,courseRunId, assignId, dueDate, topK, threshold);
    }

    // -------------------- submissions --------------------
    // columns: submission_id, created_at, assignment_run_id, student_id, folder_path
    @Transactional
    public void insertSubmission(
            UUID assignmentRunId,
            String publicID,
            String firstName,
            String lastName,
            String email,
            String folderPath
    ) throws SQLException {

        Integer repoId = getDefaultRepo(assignmentRunId);

        String insertSql = """
        INSERT INTO public."submissions"
        (public_id, student_first_name_enc, student_last_name_enc, student_email_enc, folder_path, repository_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """;

        jdbc.update(insertSql, publicID, firstName, lastName, email, folderPath, repoId);
    }

    @Transactional
    public void insertRepositorySubmission(long repositoryId, String folderPath) {
        String insertSql = """
        INSERT INTO public."submissions"
        (repository_id, folder_path)
        VALUES (?, ?)
        """;
        jdbc.update(insertSql, repositoryId, folderPath);
    }

    @Transactional
    public void insertSubmission(
            OffsetDateTime createdAt,
            long assignmentRunId,
            long studentId,
            String folderPath,
            String repository
    ) {
        String sql = """
            INSERT INTO public."submissions"
            (created_at, assignment_run_id, student_id, folder_path, repository)
            VALUES (?, ?, ?, ?, ?)
            """;
        jdbc.update(sql,createdAt, assignmentRunId, studentId, folderPath);
    }

    public Integer getDefaultRepo(UUID assignmentRunID) {
        String repoSql = """
        select repository_id
        from repositories
        where assignment_run_id = ? and is_default = ?
        limit 1
        """;

        return jdbc.queryForObject(repoSql, Integer.class, assignmentRunID, true);
    }

    // -------------------- results --------------------
    // columns: submission_1, submission_2, score, date_created, pair_id

    @Transactional
    public void insertResult(
            long submission1,
            long submission2,
            long score,
            OffsetDateTime dateCreated,
            long pairId,
            String filePath
    ) {
        String sql = """
            INSERT INTO public."results"
            (submission_1, submission_2, score, date_created, pair_id, result_path)
            VALUES (?, ?, ?, ?, ?, ?)
            """;
        jdbc.update(sql, submission1, submission2, score, dateCreated, pairId, filePath);
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

    @Transactional
    public long insertRepository(String name, String path, UUID assignmentRunID) {
        String sql = """
                INSERT INTO public."repositories" (repository_name, repository_path, assignment_run_id)
                VALUES(?, ?, ?)
                RETURNING repository_id
                """;
        Long repositoryId = jdbc.queryForObject(sql, Long.class, name, path, assignmentRunID);
        if (repositoryId == null) {
            throw new IllegalStateException("Failed to create repository record");
        }
        return repositoryId;
    }

    @Transactional(readOnly = true)
    public List<submission_rec> getSubmissions(long repositoryId) {
        String sql = """
        SELECT submission_id, folder_path
        FROM submissions
        WHERE repository_id = ?
        ORDER BY submission_id
        """;

        return jdbc.query(sql, (rs, rowNum) -> new submission_rec(
                rs.getLong("submission_id"),
                rs.getString("folder_path")
        ), repositoryId);
    }

    @Transactional
    public int getTopK(UUID assignment) {
        String sql = """
                select top_k
                from public."assignment_runs"
                where assignment_run_id = ?
                """;
        Integer topK = jdbc.queryForObject(sql, Integer.class, assignment);
        return topK == null ? 0 : topK;
    }
    @Transactional
    public String getCourse(UUID assignmentRun) {
        String sql = """
            select course_id
            from public."assignments"
            where assign_id = (
                select assign_id
                from public."assignment_runs"
                where assignment_run_id = ?
            )
            """;
        List<String> rows = jdbc.queryForList(sql, String.class, assignmentRun);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    public String getAssignment(UUID assignmentRun) {
        String sql = """
                select assign_id
                from public."assignment_runs"
                where assignment_run_id = ?
            """;
        List<String> rows = jdbc.queryForList(sql, String.class, assignmentRun);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public String getLang(UUID assignmentRunID) {
        String sql = """
            select language
            from public."assignments"
            where assign_id = (
                select assign_id
                from public."assignment_runs"
                where assignment_run_id = ?
            )
            """;
        List<String> rows = jdbc.queryForList(sql, String.class, assignmentRunID);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public void checkPairExists(long submissionId, long submissionId1) {
        String sql = """
            DELETE FROM public."results"
            WHERE (submission_1 = ? AND submission_2 = ?)
               OR (submission_1 = ? AND submission_2 = ?)
            """;
        jdbc.update(sql, submissionId, submissionId1, submissionId1, submissionId);
    }

    @Transactional
    public String getFileExt(String assignment) {
        String sql = """
            select a."language"
            from public."assignment_runs" ar
            join public."assignments" a on a.assign_id = ar.assign_id
            where ar.assignment_run_id = ?
            """;

        List<String> rows = jdbc.queryForList(sql, String.class, UUID.fromString(assignment));
        if (rows.isEmpty() || rows.get(0) == null || rows.get(0).isBlank()) {
            return null;
        }

        String fileValue = rows.get(0).trim().toLowerCase();
        return switch (fileValue) {
            case "java" -> ".java";
            case "c" -> ".c";
            case "cpp" -> ".cpp";
            default -> null;
        };
    }
}
