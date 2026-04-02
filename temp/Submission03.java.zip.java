//===== BEGIN FILE: Submission03.java =====
/*
 * Submission 03
 * Related to: Priya Shah
 * Topic: Gradebook analyzer variant
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission03 {
    static class LearnerRow {
        String learner;
        double coursework;
        double quizMark;
        double midtermMark;
        double finalExam;

        LearnerRow(String learner, double coursework, double quizMark, double midtermMark, double finalExam) {
            this.learner = learner;
            this.coursework = coursework;
            this.quizMark = quizMark;
            this.midtermMark = midtermMark;
            this.finalExam = finalExam;
        }
    }

    static LearnerRow[] loadRows(Scanner scanner, int size) {
        LearnerRow[] rows = new LearnerRow[size];
        for (int index = 0; index < size; index++) {
            String learner = scanner.next();
            double coursework = scanner.nextDouble();
            double quizMark = scanner.nextDouble();
            double midtermMark = scanner.nextDouble();
            double finalExam = scanner.nextDouble();
            rows[index] = new LearnerRow(learner, coursework, quizMark, midtermMark, finalExam);
        }
        return rows;
    }

    static double weightedMean(LearnerRow row) {
        // Same grading policy, expressed with different identifiers.
        return row.coursework * 0.25
                + row.quizMark * 0.15
                + row.midtermMark * 0.25
                + row.finalExam * 0.35;
    }

    static String band(double mean) {
        if (mean >= 90) {
            return "A";
        }
        if (mean >= 80) {
            return "B";
        }
        if (mean >= 70) {
            return "C";
        }
        if (mean >= 60) {
            return "D";
        }
        return "F";
    }

    static int strongestIndex(LearnerRow[] rows) {
        int strongest = 0;
        for (int i = 1; i < rows.length; i++) {
            if (weightedMean(rows[i]) > weightedMean(rows[strongest])) {
                strongest = i;
            }
        }
        return strongest;
    }

    static int successfulCount(LearnerRow[] rows) {
        int total = 0;
        for (LearnerRow row : rows) {
            if (weightedMean(row) >= 50.0) {
                total++;
            }
        }
        return total;
    }

    static int[] buildOrdering(LearnerRow[] rows) {
        int[] ordering = new int[rows.length];
        for (int i = 0; i < rows.length; i++) {
            ordering[i] = i;
        }
        // Manual sorting keeps the control flow easy to follow.
        for (int i = 0; i < ordering.length; i++) {
            int strongest = i;
            for (int j = i + 1; j < ordering.length; j++) {
                if (weightedMean(rows[ordering[j]]) > weightedMean(rows[ordering[strongest]])) {
                    strongest = j;
                }
            }
            int hold = ordering[i];
            ordering[i] = ordering[strongest];
            ordering[strongest] = hold;
        }
        return ordering;
    }

    static int[] buildHistogram(LearnerRow[] rows) {
        int[] histogram = new int[5];
        for (LearnerRow row : rows) {
            String gradeBand = band(weightedMean(row));
            if ("A".equals(gradeBand)) {
                histogram[0]++;
            } else if ("B".equals(gradeBand)) {
                histogram[1]++;
            } else if ("C".equals(gradeBand)) {
                histogram[2]++;
            } else if ("D".equals(gradeBand)) {
                histogram[3]++;
            } else {
                histogram[4]++;
            }
        }
        return histogram;
    }

    static void showRows(LearnerRow[] rows) {
        for (LearnerRow row : rows) {
            double mean = weightedMean(row);
            System.out.printf(Locale.US, "%s %.2f %s%n", row.learner, mean, band(mean));
        }
    }

    static void showRanking(LearnerRow[] rows) {
        int[] ordering = buildOrdering(rows);
        for (int i = 0; i < ordering.length; i++) {
            LearnerRow row = rows[ordering[i]];
            double mean = weightedMean(row);
            System.out.printf(Locale.US, "#%d %s %.2f%n", i + 1, row.learner, mean);
        }
    }

    static void showHistogram(LearnerRow[] rows) {
        int[] histogram = buildHistogram(rows);
        System.out.println("A: " + histogram[0]);
        System.out.println("B: " + histogram[1]);
        System.out.println("C: " + histogram[2]);
        System.out.println("D: " + histogram[3]);
        System.out.println("F: " + histogram[4]);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int size = scanner.nextInt();
        LearnerRow[] rows = loadRows(scanner, size);

        // Handle an empty class list without crashing.
        if (rows.length == 0) {
            System.out.println("No learners found");
            return;
        }

        showRows(rows);
        showRanking(rows);

        int strongest = strongestIndex(rows);
        int successful = successfulCount(rows);
        double successRate = rows.length == 0 ? 0.0 : (successful * 100.0) / rows.length;

        System.out.printf(Locale.US, "Top student: %s %.2f%n", rows[strongest].learner, weightedMean(rows[strongest]));
        System.out.printf(Locale.US, "Passing rate: %.2f%%%n", successRate);
        showHistogram(rows);
    }
}

//===== END FILE: Submission03.java =====

