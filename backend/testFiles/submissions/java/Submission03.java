import java.util.Scanner;

public class Submission03 {
    static String grade(double mean) {
        if (mean >= 90) return "A";
        if (mean >= 80) return "B";
        if (mean >= 70) return "C";
        if (mean >= 60) return "D";
        return "F";
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int totalMarks = scanner.nextInt();
        double running = 0;

        for (int i = 0; i < totalMarks; i++) {
            running += scanner.nextDouble();
        }

        double mean = (totalMarks == 0) ? 0 : running / totalMarks;
        System.out.printf("%.2f %s%n", mean, grade(mean));
    }
}
