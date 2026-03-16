package server;

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
            LoggerFactory.getLogger("Received");
            String objectPath = storageService.upload(file, student, assignment, course, "Submissions");
            LoggerFactory.getLogger("Uploaded");
            long submissionID = dbHandler.generateSubmissionID();
            LoggerFactory.getLogger("ID Generated");
            results.generateResults(file, course, assignment);
            dbHandler.insertSubmission(submissionID, OffsetDateTime.now(), assignment, student, objectPath);
            LoggerFactory.getLogger("Complete");
            return ResponseEntity.ok("Upload complete (Supabase: " + objectPath + ")");
        } catch (Exception e) {
            return ResponseEntity.status(502).body("Upload failed: " + e.getMessage());
        }
    }
}