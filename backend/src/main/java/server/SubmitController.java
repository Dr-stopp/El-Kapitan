package server;

import Tokenizer.src.PlagiarismChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
        this.results = new resultsManager(storageService);
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
            log.info("Received");
            String objectPath = storageService.upload(file, student, assignment, course, "Submissions");
            log.info("Uploaded");
            long submissionID = dbHandler.generateSubmissionID();
            log.info("ID Generated");
            results.generateResults(file, course, assignment);
            dbHandler.insertSubmission(submissionID, OffsetDateTime.now(), assignment, student, objectPath);
            log.info("Complete");
            return ResponseEntity.ok("Upload complete (Supabase: " + objectPath + ")");
        } catch (Exception e) {
            return ResponseEntity.status(502).body("Upload failed: " + e.getMessage());
        }
    }
}