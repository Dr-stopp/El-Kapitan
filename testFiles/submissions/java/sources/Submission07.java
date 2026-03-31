/*
 * Submission 07
 * Related to: Chloe Martin
 * Topic: Prime generator and factor report
 */
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;

public class Submission07 {
    static List<Integer> sieve(int limit) {
        boolean[] composite = new boolean[limit + 1];
        List<Integer> primes = new ArrayList<>();
        for (int number = 2; number <= limit; number++) {
            if (!composite[number]) {
                primes.add(number);
                // Start marking at number^2 because smaller multiples are already covered.
                if ((long) number * number <= limit) {
                    for (int multiple = number * number; multiple <= limit; multiple += number) {
                        composite[multiple] = true;
                    }
                }
            }
        }
        return primes;
    }

    static List<Integer> factors(int value, List<Integer> primes) {
        List<Integer> parts = new ArrayList<>();
        int remaining = value;
        for (int prime : primes) {
            if ((long) prime * prime > remaining) {
                break;
            }
            while (remaining % prime == 0) {
                parts.add(prime);
                remaining /= prime;
            }
        }
        if (remaining > 1) {
            parts.add(remaining);
        }
        return parts;
    }

    static int largestGap(List<Integer> primes) {
        int gap = 0;
        for (int i = 1; i < primes.size(); i++) {
            gap = Math.max(gap, primes.get(i) - primes.get(i - 1));
        }
        return gap;
    }

    static int twinPairs(List<Integer> primes) {
        int count = 0;
        for (int i = 1; i < primes.size(); i++) {
            if (primes.get(i) - primes.get(i - 1) == 2) {
                count++;
            }
        }
        return count;
    }

    static int digitSum(int value) {
        int remaining = Math.abs(value);
        int sum = 0;
        while (remaining > 0) {
            sum += remaining % 10;
            remaining /= 10;
        }
        return sum;
    }

    static void printPrimeList(List<Integer> primes) {
        for (int i = 0; i < primes.size(); i++) {
            System.out.print(primes.get(i));
            if (i + 1 < primes.size()) {
                System.out.print(" ");
            }
        }
        System.out.println();
    }

    static void printFactorReports(List<Integer> primes) {
        for (int prime : primes) {
            if (prime < 10) {
                continue;
            }
            // Using prime - 1 gives the report a bit more variety.
            List<Integer> parts = factors(prime - 1, primes);
            System.out.print((prime - 1) + ":");
            for (int part : parts) {
                System.out.print(" " + part);
            }
            System.out.println();
        }
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int limit = scanner.nextInt();
        List<Integer> primes = sieve(limit);

        printPrimeList(primes);
        System.out.println("Prime count: " + primes.size());
        System.out.println("Largest gap: " + largestGap(primes));
        System.out.println("Twin pairs: " + twinPairs(primes));

        if (!primes.isEmpty()) {
            int last = primes.get(primes.size() - 1);
            System.out.println("Largest prime: " + last);
            System.out.println("Digit sum of largest prime: " + digitSum(last));
        }

        System.out.printf(Locale.US, "Average prime value: %.2f%n", average(primes));
        printFactorReports(primes);
    }

    static double average(List<Integer> values) {
        if (values.isEmpty()) {
            return 0.0;
        }
        long total = 0;
        for (int value : values) {
            total += value;
        }
        return (double) total / values.size();
    }
}
