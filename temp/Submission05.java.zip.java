//===== BEGIN FILE: Submission05.java =====
/*
 * Submission 05
 * Related to: Hannah Lee
 * Topic: Word frequency and repetition reporter
 */
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

public class Submission05 {
    static String[] tokenize(String text) {
        // Normalize case and punctuation before splitting the text.
        String cleaned = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ");
        String trimmed = cleaned.trim();
        if (trimmed.isEmpty()) {
            return new String[0];
        }
        return trimmed.split("\\s+");
    }

    static Map<String, Integer> buildFrequency(String[] words) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String word : words) {
            counts.put(word, counts.getOrDefault(word, 0) + 1);
        }
        return counts;
    }

    static String[] sortWordsByCount(Map<String, Integer> counts) {
        String[] words = counts.keySet().toArray(new String[0]);
        // Order by frequency first, then alphabetically for ties.
        for (int i = 0; i < words.length; i++) {
            int best = i;
            for (int j = i + 1; j < words.length; j++) {
                int left = counts.get(words[j]);
                int right = counts.get(words[best]);
                if (left > right || (left == right && words[j].compareTo(words[best]) < 0)) {
                    best = j;
                }
            }
            String hold = words[i];
            words[i] = words[best];
            words[best] = hold;
        }
        return words;
    }

    static int totalCharacters(String[] words) {
        int total = 0;
        for (String word : words) {
            total += word.length();
        }
        return total;
    }

    static List<String> repeatedWords(Map<String, Integer> counts) {
        List<String> repeated = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getValue() > 1) {
                repeated.add(entry.getKey());
            }
        }
        return repeated;
    }

    static String longestWord(String[] words) {
        String best = "";
        for (String word : words) {
            if (word.length() > best.length()) {
                best = word;
            }
        }
        return best;
    }

    static String shortestWord(String[] words) {
        String best = "";
        for (String word : words) {
            if (best.isEmpty() || word.length() < best.length()) {
                best = word;
            }
        }
        return best;
    }

    static int numericTokens(String[] words) {
        int count = 0;
        for (String word : words) {
            if (word.matches("\\d+")) {
                count++;
            }
        }
        return count;
    }

    static void printFrequencyTable(Map<String, Integer> counts) {
        String[] ordered = sortWordsByCount(counts);
        for (String word : ordered) {
            System.out.println(word + " -> " + counts.get(word));
        }
    }

    static void printSummary(String[] words, Map<String, Integer> counts) {
        int characters = totalCharacters(words);
        int unique = counts.size();
        int total = words.length;
        double averageLength = total == 0 ? 0.0 : (double) characters / total;

        System.out.println("Total words: " + total);
        System.out.println("Unique words: " + unique);
        System.out.printf(Locale.US, "Average length: %.2f%n", averageLength);

        List<String> repeated = repeatedWords(counts);
        System.out.println("Repeated words: " + repeated.size());
        for (String word : repeated) {
            System.out.println("Repeated " + word + " count=" + counts.get(word));
        }

        System.out.println("Longest word: " + longestWord(words));
        System.out.println("Shortest word: " + shortestWord(words));
        System.out.println("Numeric tokens: " + numericTokens(words));
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int lineCount = Integer.parseInt(scanner.nextLine().trim());
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < lineCount; i++) {
            builder.append(scanner.nextLine());
            builder.append(' ');
        }

        String[] words = tokenize(builder.toString());
        Map<String, Integer> counts = buildFrequency(words);
        printFrequencyTable(counts);
        printSummary(words, counts);
    }
}

//===== END FILE: Submission05.java =====

