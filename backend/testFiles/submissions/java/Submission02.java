import java.util.Scanner;

public class Submission02 {
    static String letter(double avg) {
        if (avg >= 90) return "A";
        if (avg >= 80) return "B";
        if (avg >= 70) return "C";
        if (avg >= 60) return "D";
        return "F";
    }

    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int count = in.nextInt();
        double sum = 0;

        for (int i = 0; i < count; i++) {
            sum += in.nextDouble();
        }

        double average = (count == 0) ? 0 : sum / count;
        System.out.printf("%.2f %s%n", average, letter(average));
    }
}
