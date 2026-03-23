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
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

public class resultsManager {
    private static final Logger log = LoggerFactory.getLogger(resultsManager.class);
    private final SupabaseStorageService storageService;
    private final DBHandler dbHandler;
    private final String BUCKET;
    public resultsManager(SupabaseStorageService storageService, DBHandler dbHandler) {
        this.storageService = storageService;
        this.dbHandler = dbHandler;
        BUCKET = "Submissions";
    }
    public void generateResults(MultipartFile file, String course, long assignment, long submissionID) throws IOException {
        log.info("Generating Results:");
        String prefix = course + "/" + assignment;
        List<File> files = loadFiles(course, assignment, BUCKET, prefix);
        List<Long> scores = new LinkedList<Long>();
        Path p1 = zipProcessor.concatZipFromMultipartToTemp(file, "baseFile");;
        File f1 = p1.toFile();
        log.info("Running comparison on " + files.size() + " files.");
        int topK = dbHandler.getTopK(assignment);
        int i = 1;

        for (File f : files) {
            try {
                log.info("Starting checker on file index={} name={}", i, f.getName());
                PlagiarismChecker pc = new PlagiarismChecker(f1, f);
                scores.add(pc.index);

                log.info("Checker completed on file index={}", i);
            } catch (Exception e) {
                log.error("Checker failed on file index={} name={}", i, f.getName(), e);
                throw e; // keep failing fast so submit returns error
            }
            i++;
        }
        int[] toSubmit = getTopScores(topK, scores);
        for (int j = 0; j < topK; j++) {
            dbHandler.insertResult(submissionID, j+1, scores.get(toSubmit[j]), OffsetDateTime.now(), dbHandler.generateResultID());
        }
        log.info("All comparisons complete");
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
        log.info("Temp files deleted");
    }

    private List<File> loadFiles(String course, long assignment, String bucket, String prefix) throws IOException {
        List<File> files = new LinkedList<>();

        List<String> allPaths = storageService.listAllFiles(prefix, bucket);
        int i = 1;

        for (String objectPath : allPaths) {
            // adjust this filter if your uploaded extension changes
            if (!objectPath.toLowerCase().endsWith(".bin")) continue;

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

    private int[] getTopScores(int size, List<Long> scores) {
        int[] toReturn = new int[size];
        Long[] temp = scores.toArray(new Long[0]);
        for (int i = 0; i < size; i++) {
            int largest = findLargestIndex(temp);
            toReturn[i] = largest;
            temp[largest] = 0L;
        }
        return toReturn;
    }

    private int findLargestIndex(Long[] scores) {
        int toReturn = 0;
        for (int i = 1; i < scores.length; i++) {
            if (scores[i] > scores[toReturn]) {
                toReturn = i;
            }
        }
        return toReturn;
    }
}