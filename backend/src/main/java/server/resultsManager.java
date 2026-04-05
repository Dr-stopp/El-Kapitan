package server;

import Tokenizer.src.MatchNode;
import Tokenizer.src.PlagiarismChecker;
import Tokenizer.src.PlagiarismResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.OffsetDateTime;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class resultsManager {
    private static final Logger log = LoggerFactory.getLogger(resultsManager.class);
    private final SupabaseStorageService storageService;
    private final DBHandler dbHandler;
    private final String SUBMISSIONBUCKET;
    private final String RESULTBUCKET;
    public resultsManager(SupabaseStorageService storageService, DBHandler dbHandler) {
        this.storageService = storageService;
        this.dbHandler = dbHandler;
        SUBMISSIONBUCKET = "Submissions";
        RESULTBUCKET = "Results";
    }
    public void generateResults(UUID assignmentRunID, long repositoryID) throws IOException {
        log.info("Generating Results:");
        String lang = dbHandler.getLang(assignmentRunID);
        List<submission_rec> submissions = loadFiles(SUBMISSIONBUCKET, dbHandler.getDefaultRepo(assignmentRunID), lang);
        List<submission_rec> repo = loadFiles(SUBMISSIONBUCKET, repositoryID, lang);
        try {
            List<Long> scores = new LinkedList<>();
            //int topK = dbHandler.getTopK(assignmentRunID);
            log.info("Running comparison for " + submissions.size() + " files. On " + repo.size() + " files.");
            int i = 0;

            for (submission_rec s: submissions) {
                for (submission_rec rs : repo) {
                    try {
                        dbHandler.checkPairExists(s.submission_ID, rs.submission_ID);
                        PlagiarismChecker pc = new PlagiarismChecker(s.file, rs.file);
                        scores.add((long) pc.PlagarismInfo.similarity*100);
                        String resultPath = resultsSections(pc.PlagarismInfo, assignmentRunID, repositoryID, s.submission_ID, rs.submission_ID);
                        log.info(String.valueOf(pc.PlagarismInfo.similarity));
                        dbHandler.insertResult(s.submission_ID,rs.submission_ID,(long) (pc.PlagarismInfo.similarity*100) , OffsetDateTime.now(), dbHandler.generateResultID(), resultPath);

                    } catch (Exception e) {
                        log.error("Checker failed on file index={} name={}", i, s.file.getName(), e);
                        throw e; // keep failing fast so submit returns error
                    }
                    i++;
                }
            }

            log.info("All comparisons complete");
            log.info("Results generated");
        } finally {
            cleanupSubmissionTemps(submissions);
            cleanupSubmissionTemps(repo);
        }
    }

    private List<submission_rec> loadFiles(String bucket, long repositoryID, String language) throws IOException {
        List<submission_rec> files = new LinkedList<>();
        List<submission_rec> toLoad = dbHandler.getSubmissions(repositoryID);
        String suffix = "." + language;
        log.info("Suffix: " + suffix);

        for (submission_rec sr: toLoad) {
            byte[] content = storageService.downloadFile(sr.filePath, bucket);

            Path temp = Files.createTempFile("results-", suffix);
            Files.write(temp, content, StandardOpenOption.TRUNCATE_EXISTING);
            File file = temp.toFile();
            file.deleteOnExit();
            submission_rec currSub = new submission_rec(sr.submission_ID, sr.filePath, file);
            files.add(currSub);
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

    private String resultsSections(PlagiarismResult info, UUID assignmentRunID, long repositoryID, long s1, long s2) {
        List<MatchNode> matchNodes = (info == null || info.matches == null) ? List.of() : info.matches;
        Path csvPath = null;
        try {
            csvPath = Files.createTempFile("results-sections-", ".csv");
            StringBuilder csv = new StringBuilder();
            csv.append("F1start,F1end,F2start,F2End").append(System.lineSeparator());

            for (MatchNode m : matchNodes) {
                csv.append(m.file1Start).append(",")
                        .append(m.file1End).append(",")
                        .append(m.file2Start).append(",")
                        .append(m.file2End)
                        .append(System.lineSeparator());
            }

            Files.writeString(csvPath, csv.toString(), StandardOpenOption.TRUNCATE_EXISTING);
            File toSubmit = csvPath.toFile();
            return storageService.uploadResult(toSubmit, assignmentRunID, repositoryID, s1, s2, RESULTBUCKET);

        } catch (IOException e) {
            throw new RuntimeException("Failed to create results CSV", e);
        } finally {
            if (csvPath != null) {
                try {
                    Files.deleteIfExists(csvPath);
                } catch (IOException cleanupError) {
                    log.warn("Failed to delete temp results CSV {}", csvPath, cleanupError);
                }
            }
        }
    }

    private void cleanupSubmissionTemps(List<submission_rec> records) {
        if (records == null) {
            return;
        }
        for (submission_rec rec : records) {
            if (rec == null || rec.file == null) {
                continue;
            }
            try {
                Files.deleteIfExists(rec.file.toPath());
            } catch (IOException e) {
                log.warn("Failed to delete temp submission file {}", rec.file.getAbsolutePath(), e);
            }
        }
    }

}
