package server;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class SubmitController {

    private final SupabaseStorageService storageService;
    private final DBHandler dbHandler;

    public SubmitController(SupabaseStorageService storageService, DBHandler dbHandler) {
        this.storageService = storageService;
        this.dbHandler = dbHandler;
    }

    @PostMapping(path = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> submit(
            @RequestPart("file") MultipartFile file
            // You can also accept fields:
            // @RequestPart(value="someField", required=false) String someField
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("No file uploaded");
        }

        try {
            String objectPath = storageService.upload(file);

            // Example: call DB handler if needed
            // dbHandler.saveUploadRecord(objectPath, file.getOriginalFilename());

            return ResponseEntity.ok("Upload complete (Supabase: " + objectPath + ")");
        } catch (Exception e) {
            return ResponseEntity.status(502).body("Upload failed: " + e.getMessage());
        }
    }
}