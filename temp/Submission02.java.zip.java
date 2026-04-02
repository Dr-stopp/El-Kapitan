//===== BEGIN FILE: Submission02.java =====
/*
 * Submission 02
 * Related to: Daniel Brooks
 * Topic: Gradebook analyzer
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission02 {
    static class StudentRecord {
        String name;
        double assignment;
        double quiz;
        double midterm;
        double exam;

        StudentRecord(String name, double assignment, double quiz, double midterm, double exam) {
            this.name = name;
            this.assignment = assignment;
            this.quiz = quiz;
            this.midterm = midterm;
            this.exam = exam;
        }
    }

    static StudentRecord[] readRecords(Scanner scanner, int count) {
        StudentRecord[] records = new StudentRecord[count];
        for (int i = 0; i < count; i++) {
            String name = scanner.next();
            double assignment = scanner.nextDouble();
            double quiz = scanner.nextDouble();
            double midterm = scanner.nextDouble();
            double exam = scanner.nextDouble();
            records[i] = new StudentRecord(name, assignment, quiz, midterm, exam);
        }
        return records;
    }

    static double average(StudentRecord record) {
        // Shared weighted average used across the whole report.
        return record.assignment * 0.25
                + record.quiz * 0.15
                + record.midterm * 0.25
                + record.exam * 0.35;
    }

    static String letter(double average) {
        if (average >= 90) {
            return "A";
        }
        if (average >= 80) {
            return "B";
        }
        if (average >= 70) {
            return "C";
        }
        if (average >= 60) {
            return "D";
        }
        return "F";
    }

    static int topIndex(StudentRecord[] records) {
        int best = 0;
        for (int i = 1; i < records.length; i++) {
            if (average(records[i]) > average(records[best])) {
                best = i;
            }
        }
        return best;
    }

    static int countPassing(StudentRecord[] records) {
        int passing = 0;
        for (StudentRecord record : records) {
            if (average(record) >= 50.0) {
                passing++;
            }
        }
        return passing;
    }

    static int[] orderByAverage(StudentRecord[] records) {
        int[] order = new int[records.length];
        for (int i = 0; i < records.length; i++) {
            order[i] = i;
        }
        // Selection sort is fine for these small classroom-sized lists.
        for (int i = 0; i < order.length; i++) {
            int best = i;
            for (int j = i + 1; j < order.length; j++) {
                if (average(records[order[j]]) > average(records[order[best]])) {
                    best = j;
                }
            }
            int temp = order[i];
            order[i] = order[best];
            order[best] = temp;
        }
        return order;
    }

    static int[] distribution(StudentRecord[] records) {
        int[] counts = new int[5];
        for (StudentRecord record : records) {
            String grade = letter(average(record));
            if ("A".equals(grade)) {
                counts[0]++;
            } else if ("B".equals(grade)) {
                counts[1]++;
            } else if ("C".equals(grade)) {
                counts[2]++;
            } else if ("D".equals(grade)) {
                counts[3]++;
            } else {
                counts[4]++;
            }
        }
        return counts;
    }

    static void printRecords(StudentRecord[] records) {
        for (StudentRecord record : records) {
            double avg = average(record);
            System.out.printf(Locale.US, "%s %.2f %s%n", record.name, avg, letter(avg));
        }
    }

    static void printRanking(StudentRecord[] records) {
        int[] order = orderByAverage(records);
        for (int i = 0; i < order.length; i++) {
            StudentRecord record = records[order[i]];
            double avg = average(record);
            System.out.printf(Locale.US, "#%d %s %.2f%n", i + 1, record.name, avg);
        }
    }

    static void printDistribution(StudentRecord[] records) {
        int[] counts = distribution(records);
        System.out.println("A: " + counts[0]);
        System.out.println("B: " + counts[1]);
        System.out.println("C: " + counts[2]);
        System.out.println("D: " + counts[3]);
        System.out.println("F: " + counts[4]);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int count = scanner.nextInt();
        StudentRecord[] records = readRecords(scanner, count);

        // Print a friendly fallback if no students were entered.
        if (records.length == 0) {
            System.out.println("No students found");
            return;
        }

        printRecords(records);
        printRanking(records);

        int best = topIndex(records);
        int passing = countPassing(records);
        double rate = records.length == 0 ? 0.0 : (passing * 100.0) / records.length;

        System.out.printf(Locale.US, "Top student: %s %.2f%n", records[best].name, average(records[best]));
        System.out.printf(Locale.US, "Passing rate: %.2f%%%n", rate);
        printDistribution(records);
    }
}

//===== END FILE: Submission02.java =====

