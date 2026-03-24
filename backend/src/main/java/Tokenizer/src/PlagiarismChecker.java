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
    public PlagarismResult PlagarismInfo;
    public PlagiarismChecker(File f1, File f2) throws IOException {
        JavaTokenizer tokenizer1 = new JavaTokenizer(f1);
        JavaTokenizer tokenizer2 = new JavaTokenizer(f2);
        firstkGrams = tokenizer1.kGrams;
        secondkGrams = tokenizer2.kGrams;
        PlagarismInfo =  (compareKGrams(firstkGrams,secondkGrams));
        log.info("Files are: " + PlagarismInfo.similarity*100 + "% similar.");
        for (MatchNode m : PlagarismInfo.matches) {
            System.out.println(
                    "File1 lines " + m.file1Start + "-" + m.file1End +
                            " matches File2 lines " + m.file2Start + "-" + m.file2End
            );
        }
    }

    public PlagarismResult compareKGrams(List<KGram> file1, List<KGram> file2) {

        if (file1.isEmpty() || file2.isEmpty()) {
            return new PlagarismResult(0.0, new LinkedList<>());
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

        return new PlagarismResult(similarity, matches);
    }
}