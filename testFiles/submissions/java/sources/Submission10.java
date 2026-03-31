/*
 * Submission 10
 * Related to: Lucas Nguyen
 * Topic: Route planner variant
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission10 {
    static String[] scanNames(Scanner scanner, int amount) {
        String[] names = new String[amount];
        for (int i = 0; i < amount; i++) {
            names[i] = scanner.next();
        }
        return names;
    }

    static int[][] scanTable(Scanner scanner, int amount) {
        int[][] table = new int[amount][amount];
        for (int row = 0; row < amount; row++) {
            for (int col = 0; col < amount; col++) {
                table[row][col] = scanner.nextInt();
            }
        }
        return table;
    }

    static int[] chooseTour(int[][] table, int startIndex) {
        int size = table.length;
        int[] tour = new int[size];
        boolean[] taken = new boolean[size];
        tour[0] = startIndex;
        taken[startIndex] = true;

        // Repeatedly take the shortest available next hop.
        for (int step = 1; step < size; step++) {
            int previous = tour[step - 1];
            int candidate = -1;
            int shortest = Integer.MAX_VALUE;
            for (int next = 0; next < size; next++) {
                int distance = table[previous][next];
                if (!taken[next] && distance > 0 && distance < shortest) {
                    shortest = distance;
                    candidate = next;
                }
            }
            if (candidate == -1) {
                // This fallback guarantees every location appears once.
                for (int next = 0; next < size; next++) {
                    if (!taken[next]) {
                        candidate = next;
                        break;
                    }
                }
            }
            tour[step] = candidate;
            taken[candidate] = true;
        }
        return tour;
    }

    static int sumTour(int[][] table, int[] tour) {
        int total = 0;
        for (int i = 1; i < tour.length; i++) {
            total += table[tour[i - 1]][tour[i]];
        }
        return total;
    }

    static int maxStep(int[][] table, int[] tour) {
        int result = 0;
        for (int i = 1; i < tour.length; i++) {
            result = Math.max(result, table[tour[i - 1]][tour[i]]);
        }
        return result;
    }

    static int countUsableEdges(int[][] table) {
        int usable = 0;
        for (int row = 0; row < table.length; row++) {
            for (int col = 0; col < table[row].length; col++) {
                if (row != col && table[row][col] > 0) {
                    usable++;
                }
            }
        }
        return usable;
    }

    static void showTour(String[] names, int[] tour) {
        for (int i = 0; i < tour.length; i++) {
            System.out.print(names[tour[i]]);
            if (i + 1 < tour.length) {
                System.out.print(" -> ");
            }
        }
        System.out.println();
    }

    static void showTable(String[] names, int[][] table) {
        System.out.print("    ");
        for (String name : names) {
            System.out.printf("%8s", name);
        }
        System.out.println();
        for (int row = 0; row < table.length; row++) {
            System.out.printf("%4s", names[row]);
            for (int col = 0; col < table[row].length; col++) {
                System.out.printf("%8d", table[row][col]);
            }
            System.out.println();
        }
    }

    static double meanStep(int[][] table, int[] tour) {
        if (tour.length <= 1) {
            return 0.0;
        }
        return (double) sumTour(table, tour) / (tour.length - 1);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int amount = scanner.nextInt();
        String[] names = scanNames(scanner, amount);
        int[][] table = scanTable(scanner, amount);
        int startIndex = scanner.nextInt();

        int[] tour = chooseTour(table, startIndex);
        showTable(names, table);
        showTour(names, tour);

        System.out.println("Total distance: " + sumTour(table, tour));
        System.out.println("Longest leg: " + maxStep(table, tour));
        System.out.println("Reachable edges: " + countUsableEdges(table));
        System.out.printf(Locale.US, "Average leg: %.2f%n", meanStep(table, tour));
    }
}
