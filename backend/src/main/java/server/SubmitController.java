package server;

import Tokenizer.src.PlagiarismChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;

@RestController
public class SubmitController {

    private final SupabaseStorageService storageService;
    private final DBHandler dbHandler;
    private final resultsManager results;
    private static final Logger log = LoggerFactory.getLogger(SubmitController.class);

    public SubmitController(SupabaseStorageService storageService, DBHandler dbHandler) {
        this.storageService = storageService;
        this.dbHandler = dbHandler;
        this.results = new resultsManager(storageService, dbHandler);
    }

    @PostMapping(path = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> submit(
            @RequestParam("file") MultipartFile file,
            @RequestParam("student") long student,
            @RequestParam("assignment") long assignment,
            @RequestParam("course") String course
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file uploaded");
        }

        try {
            log.info("Submit start student={} assignment={} course={}", student, assignment, course);

            String objectPath = storageService.upload(file, student, assignment, course, "Submissions");
            log.info("Upload ok path={}", objectPath);

            long submissionID = dbHandler.generateSubmissionID();
            log.info("Generated submissionID={}", submissionID);

            try {
                dbHandler.insertSubmission(submissionID, OffsetDateTime.now(), assignment, student, objectPath);
            } catch (DataIntegrityViolationException dup) {
                // duplicate submission row: ignore, but keep request successful
                long foundSubmission_ID = dbHandler.getSubmissionID(objectPath);
                dbHandler.clearResults(foundSubmission_ID);
                log.warn("Submission already exists for student={} assignment={}", student, assignment, dup);
            }
            log.info("DB insertSubmission ok id={}", submissionID);

            results.generateResults(file, course, assignment, submissionID);
            log.info("Results generated");

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
}