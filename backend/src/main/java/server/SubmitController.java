package server;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
public class SubmitController {

    private final SupabaseStorageService storageService;
    private final DBHandler dbHandler;
    private final resultsManager results;
    private static final Logger log = LoggerFactory.getLogger(SubmitController.class);
    private final submissionEncryption encrypter;

    public SubmitController(SupabaseStorageService storageService, DBHandler dbHandler, submissionEncryption encrypter) {
        this.storageService = storageService;
        this.dbHandler = dbHandler;
        this.results = new resultsManager(storageService, dbHandler);
        this.encrypter = encrypter;
    }

    @PostMapping(path = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> submit(
            @RequestParam("file") MultipartFile file,
            @RequestParam("studentFirst") String studentFirst,
            @RequestParam("studentLast") String studentLast,
            @RequestParam("studentEmail") String studentEmail,
            @RequestParam("assignment") String assignment
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file uploaded");
        }
        try {
            log.info("Submit start studentFirst={} studentLast={} studentEmail={} assignment={}", studentFirst, studentLast, studentEmail, assignment);
            UUID assignmentRunId = UUID.fromString(assignment);
            String course = dbHandler.getCourse(assignmentRunId);
            String assignmentId = dbHandler.getAssignment(assignmentRunId);

            if (course == null || course.isBlank()) {
                log.warn("No course found for assignment_run_id={}", assignment);
                return ResponseEntity.badRequest().body("Unknown assignment_run_id: " + assignment);
            }
            if (assignmentId == null || assignmentId.isBlank()) {
                log.warn("No assignment found for assignment_run_id={}", assignment);
                return ResponseEntity.badRequest().body("No assignment found for assignment_run_id: " + assignment);
            }

            String publicID = encrypter.generatePublicID(studentFirst, studentLast, studentEmail, assignment);
            String firstEnc = encrypter.encryptString(studentFirst);
            String lastEnc = encrypter.encryptString(studentLast);
            String emailEnc = encrypter.encryptString(studentEmail);

            Path fileToUpload = zipProcessor.concatZipFromMultipartToTemp(file, publicID + "-" + assignment);
            byte[] toUpload = Files.readAllBytes(fileToUpload);
            String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            String fileExt = dbHandler.getFileExt(assignment);

            String objectPath = storageService.uploadSubmission(toUpload, contentType, publicID, assignmentId, assignment, course,"Submissions", fileExt);
            log.info("Upload ok path={}", objectPath);

            boolean inserted = false;
            try {
                dbHandler.insertSubmission(assignmentRunId, publicID, firstEnc, lastEnc, emailEnc, objectPath);
                inserted = true;
            } catch (DataIntegrityViolationException dup) {
                String root = dup.getMostSpecificCause() != null
                        ? dup.getMostSpecificCause().getMessage()
                        : dup.getMessage();
                String normalized = root == null ? "" : root.toLowerCase();
                if (normalized.contains("duplicate") || normalized.contains("unique")) {
                    // duplicate submission row: ignore, but keep request successful
                    log.warn("Submission already exists for studentName={} assignment={}", publicID, assignment, dup);
                } else {
                    throw dup;
                }
            }
            if (inserted) {
                log.info("DB insertSubmission ok");
            }

            return ResponseEntity.ok("Upload complete (Supabase: " + objectPath + ")");
        } catch (DataAccessException dae) {
            log.error("Database error during submit", dae);
            String root = dae.getMostSpecificCause() != null ? dae.getMostSpecificCause().getMessage() : dae.getMessage();
            return ResponseEntity.status(500).body("Database error: " + root);
        }
        catch (Exception e) {
            return ResponseEntity.status(502).body("Upload failed: " + e.getMessage());
        }

    }

    @PostMapping(path = "/result", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> result(
            @RequestParam("assignment") String assignmentRunID,
            @RequestParam("repository") long repositoryID
    ) throws IOException {
        log.info("Results requested");
        results.generateResults(UUID.fromString(assignmentRunID), repositoryID);
        return null;
    }

    @PostMapping(path = "/repository", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> repository (
            @RequestParam("file") MultipartFile file,
            @RequestParam("assignmentRun") String assignmentRun,
            @RequestParam("repositoryName") String repositoryName

    ){
        try {
            UUID assignmentRunId = UUID.fromString(assignmentRun);
            String course = dbHandler.getCourse(assignmentRunId);
            String assignmentId = dbHandler.getAssignment(assignmentRunId);
            if (course == null || course.isBlank()) {
                return ResponseEntity.badRequest().body("Unknown assignment_run_id: " + assignmentRun);
            }
            if (assignmentId == null || assignmentId.isBlank()) {
                return ResponseEntity.badRequest().body("No assignment found for assignment_run_id: " + assignmentRun);
            }
            log.info(assignmentRunId.toString());
            log.info(repositoryName);
            String repoPath = course + "/" + assignmentId + "/" + assignmentRun + "/" + repositoryName;
            long repositoryID = dbHandler.insertRepository(repositoryName, repoPath, assignmentRunId);
            List<MultipartFile> zipList = zipProcessor.createZipList(file);
            int uploadedFiles = 0;
            for (MultipartFile f : zipList) {
                String sourceName = f.getName();


                Path toSubmitPath = zipProcessor.concatZipFromMultipartToTemp(f, sourceName);
                File toSubmitFile = toSubmitPath.toFile();
                String objectPath = storageService.uploadRepository(
                        toSubmitFile,
                        course,
                        assignmentId,
                        assignmentRunId,
                        repositoryID,
                        "Submissions"
                );
                dbHandler.insertRepositorySubmission(repositoryID, objectPath);
                uploadedFiles++;
            }
            log.info("Files uploaded");

            return ResponseEntity.ok("repository_id=" + repositoryID + ", files_uploaded=" + uploadedFiles);
        } catch (IOException e) {
            log.error(e.getMessage());
            return ResponseEntity.status(500).body("Repository upload failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("Repository processing failed", e);
            return ResponseEntity.status(500).body("Repository processing failed: " + e.getMessage());
        }
    }

}
