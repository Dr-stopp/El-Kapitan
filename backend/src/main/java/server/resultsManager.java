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
        int topK = dbHandler.getTopK(assignmentRunID);
        log.info("Submitting: " + topK + " results");
        log.info("Running comparison for " + submissions.size() + " files. On " + repo.size() + " files.");
        int i = 0;

        for (submission_rec s: submissions) {
            List<ComparisonCandidate> candidates = new LinkedList<>();

            for (submission_rec rs : repo) {
                try {
                    dbHandler.checkPairExists(s.submission_ID, rs.submission_ID);
                    PlagiarismChecker pc = new PlagiarismChecker(s.file, rs.file);
                    long score = (long) (pc.PlagarismInfo.similarity * 100);
                    candidates.add(new ComparisonCandidate(rs.submission_ID, score, pc.PlagarismInfo));
                    log.info(String.valueOf(pc.PlagarismInfo.similarity));

                } catch (Exception e) {
                    log.error("Checker failed on file index={} name={}", i, s.file.getName(), e);
                    throw e; // keep failing fast so submit returns error
                }
            }

            int limit = Math.min(Math.max(topK, 0), candidates.size());
            candidates.sort(Comparator.comparingLong(ComparisonCandidate::score).reversed());

            for (int j = 0; j < limit; j++) {
                ComparisonCandidate candidate = candidates.get(j);
                String resultPath = resultsSections(
                        candidate.plagiarismResult(),
                        assignmentRunID,
                        repositoryID,
                        s.submission_ID,
                        candidate.comparedSubmissionId()
                );
                dbHandler.insertResult(
                        s.submission_ID,
                        candidate.comparedSubmissionId(),
                        candidate.score(),
                        OffsetDateTime.now(),
                        dbHandler.generateResultID(),
                        resultPath
                );
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

    private record ComparisonCandidate(long comparedSubmissionId, long score, PlagiarismResult plagiarismResult) { }

}
