package Tokenizer.src;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.*;

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

        PlagarismInfo = compareKGrams(firstkGrams, secondkGrams);

        log.info("Files are: " + PlagarismInfo.similarity * 100 + "% similar.");
    }

    public PlagiarismResult compareKGrams(List<KGram> file1, List<KGram> file2) {

        if (file1.isEmpty() || file2.isEmpty()) {
            return new PlagiarismResult(0.0, new ArrayList<>());
        }


        Map<Integer, List<Integer>> map = new HashMap<>();
        for (int j = 0; j < file2.size(); j++) {
            map.computeIfAbsent(file2.get(j).hash, x -> new ArrayList<>()).add(j);
        }


        Set<Integer> hashes1 = new HashSet<>();
        Set<Integer> hashes2 = new HashSet<>();
        Set<Integer> intersection = new HashSet<>();

        for (KGram k : file1) hashes1.add(k.hash);
        for (KGram k : file2) hashes2.add(k.hash);

        for (int h : hashes1) {
            if (hashes2.contains(h)) {
                intersection.add(h);
            }
        }

        int minUnique = Math.min(hashes1.size(), hashes2.size());
        double similarity = minUnique == 0 ? 0.0 : (double) intersection.size() / minUnique;


        List<MatchNode> matches = new ArrayList<>();

        boolean[][] visited = new boolean[file1.size()][file2.size()];

        for (int i = 0; i < file1.size(); i++) {

            KGram k1 = file1.get(i);

            if (!map.containsKey(k1.hash)) continue;

            for (int j : map.get(k1.hash)) {

                if (visited[i][j]) continue;

                int iStart = i;
                int jStart = j;

                int iEnd = i;
                int jEnd = j;


                while (iEnd + 1 < file1.size() &&
                        jEnd + 1 < file2.size() &&
                        file1.get(iEnd + 1).hash == file2.get(jEnd + 1).hash) {

                    iEnd++;
                    jEnd++;
                }

                // mark visited
                for (int x = iStart, y = jStart; x <= iEnd; x++, y++) {
                    visited[x][y] = true;
                }


                MatchNode match = new MatchNode(
                        file1.get(iStart).startLine,
                        file1.get(iEnd).endLine,
                        file2.get(jStart).startLine,
                        file2.get(jEnd).endLine
                );

                matches.add(match);
            }
        }


        matches.sort(Comparator.comparingInt(m -> m.file1Start));
        matches = removeContainedMatches(matches);

        return new PlagiarismResult(similarity, matches);
    }
    public List<MatchNode> removeContainedMatches(List<MatchNode> matches) {

        List<MatchNode> filtered = new ArrayList<>();

        for (int i = 0; i < matches.size(); i++) {
            MatchNode a = matches.get(i);
            boolean isContained = false;

            for (int j = 0; j < matches.size(); j++) {
                if (i == j) continue;

                MatchNode b = matches.get(j);

                boolean contains =
                        b.file1Start <= a.file1Start &&
                                b.file1End   >= a.file1End &&
                                b.file2Start <= a.file2Start &&
                                b.file2End   >= a.file2End;

                if (contains) {
                    isContained = true;
                    break;
                }
            }

            if (!isContained) {
                filtered.add(a);
            }
        }

        return filtered;
    }
}
