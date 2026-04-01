//===== BEGIN FILE: Submission04.java =====
/*
 * Submission 04
 * Related to: Miguel Alvarez
 * Topic: Palindrome and text cleanup analyzer
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission04 {
    static String normalize(String text) {
        StringBuilder cleaned = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            // Ignore punctuation so the palindrome check focuses on content.
            if (Character.isLetterOrDigit(ch)) {
                cleaned.append(Character.toLowerCase(ch));
            }
        }
        return cleaned.toString();
    }

    static boolean isPalindrome(String cleaned) {
        int left = 0;
        int right = cleaned.length() - 1;
        while (left < right) {
            if (cleaned.charAt(left) != cleaned.charAt(right)) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }

    static int vowelCount(String text) {
        int count = 0;
        String lower = text.toLowerCase(Locale.ROOT);
        for (int i = 0; i < lower.length(); i++) {
            char ch = lower.charAt(i);
            if (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u') {
                count++;
            }
        }
        return count;
    }

    static String reversed(String text) {
        StringBuilder builder = new StringBuilder();
        for (int i = text.length() - 1; i >= 0; i--) {
            builder.append(text.charAt(i));
        }
        return builder.toString();
    }

    static int longestMirrorPrefix(String cleaned) {
        int best = 0;
        for (int size = 1; size <= cleaned.length(); size++) {
            String prefix = cleaned.substring(0, size);
            String reversePrefix = reversed(prefix);
            // This is a loose heuristic rather than a strict palindrome metric.
            if (cleaned.contains(reversePrefix)) {
                best = size;
            }
        }
        return best;
    }

    static void analyzeLine(String line, int index) {
        String cleaned = normalize(line);
        boolean palindrome = isPalindrome(cleaned);
        int vowels = vowelCount(line);
        int mirrorPrefix = longestMirrorPrefix(cleaned);

        System.out.println("Line " + index + ": " + line);
        System.out.println("Cleaned: " + cleaned);
        System.out.println("Palindrome: " + palindrome);
        System.out.println("Vowels: " + vowels);
        System.out.println("Mirror prefix size: " + mirrorPrefix);
        System.out.println("Reverse: " + reversed(cleaned));
    }

    static int countPalindromes(String[] lines) {
        int count = 0;
        for (String line : lines) {
            if (isPalindrome(normalize(line))) {
                count++;
            }
        }
        return count;
    }

    static String longestCleaned(String[] lines) {
        String best = "";
        for (String line : lines) {
            String cleaned = normalize(line);
            if (cleaned.length() > best.length()) {
                best = cleaned;
            }
        }
        return best;
    }

    static int totalCharacters(String[] lines) {
        int total = 0;
        for (String line : lines) {
            total += normalize(line).length();
        }
        return total;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int count = Integer.parseInt(scanner.nextLine().trim());
        String[] lines = new String[count];
        for (int i = 0; i < count; i++) {
            lines[i] = scanner.nextLine();
        }

        for (int i = 0; i < lines.length; i++) {
            analyzeLine(lines[i], i + 1);
        }

        int palindromes = countPalindromes(lines);
        String longest = longestCleaned(lines);
        int totalChars = totalCharacters(lines);
        double averageLength = lines.length == 0 ? 0.0 : (double) totalChars / lines.length;

        System.out.println("Palindrome lines: " + palindromes);
        System.out.println("Longest cleaned token count: " + longest.length());
        System.out.printf(Locale.US, "Average cleaned length: %.2f%n", averageLength);
    }
}

//===== END FILE: Submission04.java =====

