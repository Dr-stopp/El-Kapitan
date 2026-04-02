package Tokenizer.src;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.*;

/**
 *

 @author jakes*/

public class PlagiarismChecker {
    private static final Logger log = LoggerFactory.getLogger(PlagiarismChecker.class);
    List<KGram> firstkGrams;
    List<KGram> secondkGrams;
    public PlagiarismResult PlagarismInfo;
    public PlagiarismChecker(File f1, File f2) throws IOException {
        JavaTokenizer tokenizer1 = new JavaTokenizer(f1);
        JavaTokenizer tokenizer2 = new JavaTokenizer(f2);
        firstkGrams = tokenizer1.kGrams;
        secondkGrams = tokenizer2.kGrams;
        PlagarismInfo =  (compareKGrams(firstkGrams,secondkGrams));
        log.info("Files are: " + PlagarismInfo.similarity*100 + "% similar.");
    }

    public PlagiarismResult compareKGrams(List<KGram> file1, List<KGram> file2) {

        if (file1.isEmpty() || file2.isEmpty()) {
            return new PlagiarismResult(0.0, new LinkedList<>());
        }

        // Map hash → list of KGrams in file2
        Map<Integer, List<KGram>> map = new HashMap<>();

        for (KGram k : file2) {
            map.computeIfAbsent(k.hash, x -> new LinkedList<>()).add(k);
        }

        List<MatchNode> matches = new LinkedList<>();
        Set<Integer> uniqueMatches = new HashSet<>();

        int matchCount = 0;

        for (KGram k1 : file1) {
            if (map.containsKey(k1.hash)) {

                for (KGram k2 : map.get(k1.hash)) {

                    matches.add(new MatchNode(
                            k1.startLine,
                            k1.endLine,
                            k2.startLine,
                            k2.endLine
                    ));

                    uniqueMatches.add(k1.hash);
                    matchCount++;
                }
            }
        }

        int minSize = Math.min(file1.size(), file2.size());
        double similarity = (double) uniqueMatches.size() / minSize;
        matches = mergeMatches(matches);
        return new PlagiarismResult(similarity, matches);
    }
    public List<MatchNode> mergeMatches(List<MatchNode> matches) {

        if (matches.isEmpty()) return matches;

        // Remove duplicates
        Set<MatchNode> unique = new HashSet<>(matches);

        List<MatchNode> list = new ArrayList<>(unique);

        // Sort by file1 start, then file2 start
        list.sort(Comparator
                .comparingInt((MatchNode m) -> m.file1Start)
                .thenComparingInt(m -> m.file2Start));

        List<MatchNode> merged = new ArrayList<>();

        MatchNode current = list.get(0);

        for (int i = 1; i < list.size(); i++) {
            MatchNode next = list.get(i);

            // Check overlap in BOTH files
            boolean overlapFile1 = next.file1Start <= current.file1End + 1;
            boolean overlapFile2 = next.file2Start <= current.file2End + 1;

            if (overlapFile1 && overlapFile2) {
                // Merge regions
                current.file1End = Math.max(current.file1End, next.file1End);
                current.file2End = Math.max(current.file2End, next.file2End);
            } else {
                merged.add(current);
                current = next;
            }
        }

        merged.add(current);

        return merged;
    }
}