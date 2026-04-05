//===== BEGIN FILE: Submission08.java =====
/*
 * Submission 08
 * Related to: Ethan Cooper
 * Topic: Route planner
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission08 {
    static String[] readCities(Scanner scanner, int count) {
        String[] cities = new String[count];
        for (int i = 0; i < count; i++) {
            cities[i] = scanner.next();
        }
        return cities;
    }

    static int[][] readGraph(Scanner scanner, int count) {
        int[][] graph = new int[count][count];
        for (int row = 0; row < count; row++) {
            for (int col = 0; col < count; col++) {
                graph[row][col] = scanner.nextInt();
            }
        }
        return graph;
    }

    static int[] greedyRoute(int[][] graph, int start) {
        int n = graph.length;
        int[] route = new int[n];
        boolean[] used = new boolean[n];
        route[0] = start;
        used[start] = true;

        // Choose the nearest unused city at each step.
        for (int step = 1; step < n; step++) {
            int previous = route[step - 1];
            int next = -1;
            int bestDistance = Integer.MAX_VALUE;
            for (int city = 0; city < n; city++) {
                int distance = graph[previous][city];
                if (!used[city] && distance > 0 && distance < bestDistance) {
                    bestDistance = distance;
                    next = city;
                }
            }
            if (next == -1) {
                // Fallback keeps the route complete even if the graph is sparse.
                for (int city = 0; city < n; city++) {
                    if (!used[city]) {
                        next = city;
                        break;
                    }
                }
            }
            route[step] = next;
            used[next] = true;
        }
        return route;
    }

    static int routeDistance(int[][] graph, int[] route) {
        int total = 0;
        for (int i = 1; i < route.length; i++) {
            total += graph[route[i - 1]][route[i]];
        }
        return total;
    }

    static int longestLeg(int[][] graph, int[] route) {
        int longest = 0;
        for (int i = 1; i < route.length; i++) {
            longest = Math.max(longest, graph[route[i - 1]][route[i]]);
        }
        return longest;
    }

    static int reachableEdges(int[][] graph) {
        int count = 0;
        for (int row = 0; row < graph.length; row++) {
            for (int col = 0; col < graph[row].length; col++) {
                if (row != col && graph[row][col] > 0) {
                    count++;
                }
            }
        }
        return count;
    }

    static void printRoute(String[] cities, int[] route) {
        for (int i = 0; i < route.length; i++) {
            System.out.print(cities[route[i]]);
            if (i + 1 < route.length) {
                System.out.print(" -> ");
            }
        }
        System.out.println();
    }

    static void printMatrix(String[] cities, int[][] graph) {
        System.out.print("    ");
        for (String city : cities) {
            System.out.printf("%8s", city);
        }
        System.out.println();
        for (int row = 0; row < graph.length; row++) {
            System.out.printf("%4s", cities[row]);
            for (int col = 0; col < graph[row].length; col++) {
                System.out.printf("%8d", graph[row][col]);
            }
            System.out.println();
        }
    }

    static double averageLeg(int[][] graph, int[] route) {
        if (route.length <= 1) {
            return 0.0;
        }
        return (double) routeDistance(graph, route) / (route.length - 1);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int count = scanner.nextInt();
        String[] cities = readCities(scanner, count);
        int[][] graph = readGraph(scanner, count);
        int start = scanner.nextInt();

        int[] route = greedyRoute(graph, start);
        printMatrix(cities, graph);
        printRoute(cities, route);

        System.out.println("Total distance: " + routeDistance(graph, route));
        System.out.println("Longest leg: " + longestLeg(graph, route));
        System.out.println("Reachable edges: " + reachableEdges(graph));
        System.out.printf(Locale.US, "Average leg: %.2f%n", averageLeg(graph, route));
    }
}

//===== END FILE: Submission08.java =====

