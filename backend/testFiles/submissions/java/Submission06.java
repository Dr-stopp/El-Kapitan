import java.util.Scanner;

public class Submission06 {
    static int[][] transpose(int[][] matrix, int rows, int cols) {
        int[][] out = new int[cols][rows];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                out[j][i] = matrix[i][j];
            }
        }
        return out;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int r = sc.nextInt();
        int c = sc.nextInt();
        int[][] data = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                data[i][j] = sc.nextInt();
            }
        }

        int[][] t = transpose(data, r, c);
        for (int i = 0; i < t.length; i++) {
            for (int j = 0; j < t[i].length; j++) {
                System.out.print(t[i][j] + (j + 1 == t[i].length ? "" : " "));
            }
            System.out.println();
        }
    }
}
