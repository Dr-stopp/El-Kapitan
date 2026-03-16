package server;

import Tokenizer.src.PlagiarismChecker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

public class resultsManager {
    private static final Logger log = LoggerFactory.getLogger(resultsManager.class);
    private final SupabaseStorageService storageService;
    private final String BUCKET;
    public resultsManager(SupabaseStorageService storageService) {
        this.storageService = storageService;
        BUCKET = "TestFiles";
    }
    public void generateResults(MultipartFile file, String course, long assignment) throws IOException {
        log.info("Generating Results:");
        List<File> files = loadFiles(course, assignment, BUCKET);
        Path p1 = zipProcessor.concatZipFromMultipartToTemp(file, "baseFile");;
        File f1 = p1.toFile();
        log.info("Running comparison on " + files.size() + " files.");
        for (File f : files) {
            new PlagiarismChecker(f1, f);
        }

        Path temp = Path.of("temp");
        try (var walk = Files.walk(temp)) {
            walk.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        }
    }

    private List<File> loadFiles(String course, long assignment, String bucket) throws IOException {
        List<File> files = new LinkedList<>();
        //String prefix = course + "/" + assignment; // matches your upload path format

        List<String> allPaths = storageService.listAllFiles(null, bucket);
        int i = 1;

        for (String objectPath : allPaths) {
            // adjust this filter if your uploaded extension changes
            if (!objectPath.toLowerCase().endsWith(".zip")) continue;

            byte[] content = storageService.downloadFile(objectPath, bucket);

            MultipartFile mf = new MockMultipartFile(
                    "file",
                    Path.of(objectPath).getFileName().toString(),
                    "application/zip",
                    content
            );

            Path tempPath = zipProcessor.concatZipFromMultipartToTemp(mf, "file" + i);
            files.add(tempPath.toFile());
            i++;
        }

        return files;
    }
}