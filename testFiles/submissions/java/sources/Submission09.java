/*
 * Submission 09
 * Related to: Aisha Patel
 * Topic: Route planner variant
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission09 {
    static String[] loadStops(Scanner scanner, int count) {
        String[] stops = new String[count];
        for (int index = 0; index < count; index++) {
            stops[index] = scanner.next();
        }
        return stops;
    }

    static int[][] loadDistances(Scanner scanner, int count) {
        int[][] distances = new int[count][count];
        for (int row = 0; row < count; row++) {
            for (int col = 0; col < count; col++) {
                distances[row][col] = scanner.nextInt();
            }
        }
        return distances;
    }

    static int[] buildTrip(int[][] distances, int origin) {
        int size = distances.length;
        int[] trip = new int[size];
        boolean[] seen = new boolean[size];
        trip[0] = origin;
        seen[origin] = true;

        // Greedy next-stop selection mirrors a common beginner graph approach.
        for (int hop = 1; hop < size; hop++) {
            int current = trip[hop - 1];
            int choice = -1;
            int shortest = Integer.MAX_VALUE;
            for (int stop = 0; stop < size; stop++) {
                int length = distances[current][stop];
                if (!seen[stop] && length > 0 && length < shortest) {
                    shortest = length;
                    choice = stop;
                }
            }
            if (choice == -1) {
                // If no direct edge works, just take the next unseen stop.
                for (int stop = 0; stop < size; stop++) {
                    if (!seen[stop]) {
                        choice = stop;
                        break;
                    }
                }
            }
            trip[hop] = choice;
            seen[choice] = true;
        }
        return trip;
    }

    static int tripLength(int[][] distances, int[] trip) {
        int total = 0;
        for (int i = 1; i < trip.length; i++) {
            total += distances[trip[i - 1]][trip[i]];
        }
        return total;
    }

    static int biggestHop(int[][] distances, int[] trip) {
        int biggest = 0;
        for (int i = 1; i < trip.length; i++) {
            biggest = Math.max(biggest, distances[trip[i - 1]][trip[i]]);
        }
        return biggest;
    }

    static int availableConnections(int[][] distances) {
        int total = 0;
        for (int row = 0; row < distances.length; row++) {
            for (int col = 0; col < distances[row].length; col++) {
                if (row != col && distances[row][col] > 0) {
                    total++;
                }
            }
        }
        return total;
    }

    static void printTrip(String[] stops, int[] trip) {
        for (int i = 0; i < trip.length; i++) {
            System.out.print(stops[trip[i]]);
            if (i + 1 < trip.length) {
                System.out.print(" -> ");
            }
        }
        System.out.println();
    }

    static void printDistances(String[] stops, int[][] distances) {
        System.out.print("    ");
        for (String stop : stops) {
            System.out.printf("%8s", stop);
        }
        System.out.println();
        for (int row = 0; row < distances.length; row++) {
            System.out.printf("%4s", stops[row]);
            for (int col = 0; col < distances[row].length; col++) {
                System.out.printf("%8d", distances[row][col]);
            }
            System.out.println();
        }
    }

    static double meanHop(int[][] distances, int[] trip) {
        if (trip.length <= 1) {
            return 0.0;
        }
        return (double) tripLength(distances, trip) / (trip.length - 1);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int count = scanner.nextInt();
        String[] stops = loadStops(scanner, count);
        int[][] distances = loadDistances(scanner, count);
        int origin = scanner.nextInt();

        int[] trip = buildTrip(distances, origin);
        printDistances(stops, distances);
        printTrip(stops, trip);

        System.out.println("Total distance: " + tripLength(distances, trip));
        System.out.println("Longest leg: " + biggestHop(distances, trip));
        System.out.println("Reachable edges: " + availableConnections(distances));
        System.out.printf(Locale.US, "Average leg: %.2f%n", meanHop(distances, trip));
    }
}
