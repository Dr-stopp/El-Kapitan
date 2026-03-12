package Tokenizer.src;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 *

 @author jakes*/

public class PlagirismChecker {
    public PlagirismChecker(File f1, File f2) throws IOException {
        JavaTokenizer tokenizer1 = new JavaTokenizer(f1);
        JavaTokenizer tokenizer2 = new JavaTokenizer(f2);
        List<KGram> firstkGrams = tokenizer1.kGrams;
        List<KGram> secondkGrams = tokenizer2.kGrams;
        System.out.println("Files are: " + compareKGrams(firstkGrams,secondkGrams)*100 + "% similar.");
    }

    public double compareKGrams(List<KGram> file1, List<KGram> file2) {

        if (file1.isEmpty() || file2.isEmpty()) {
            return 0.0;
        }

        Set<Integer> hashes1 = new HashSet<>();
        Set<Integer> hashes2 = new HashSet<>();

        for (KGram k : file1) {
            hashes1.add(k.hash);
        }

        for (KGram k : file2) {
            hashes2.add(k.hash);
        }

        int matches = 0;

        for (Integer h : hashes1) {
            if (hashes2.contains(h)) {
                matches++;
            }
        }

        int minSize = Math.min(hashes1.size(), hashes2.size());

        return (double) matches / minSize;
    }

    public static void main(String[] args) throws IOException {
        PlagirismChecker j = new PlagirismChecker(new File("backend/testFiles/Test.java"),new File("backend/testFiles/Test.java"));
    }
}