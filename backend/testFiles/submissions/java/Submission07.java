import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Submission07 {
    static List<Integer> primesUpTo(int n) {
        boolean[] composite = new boolean[n + 1];
        List<Integer> result = new ArrayList<>();

        for (int i = 2; i <= n; i++) {
            if (!composite[i]) {
                result.add(i);
                if ((long) i * i <= n) {
                    for (int j = i * i; j <= n; j += i) {
                        composite[j] = true;
                    }
                }
            }
        }
        return result;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        List<Integer> primes = primesUpTo(n);
        for (int p : primes) {
            System.out.print(p + " ");
        }
        System.out.println();
    }
}
