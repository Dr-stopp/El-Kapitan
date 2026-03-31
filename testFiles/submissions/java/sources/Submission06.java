/*
 * Submission 06
 * Related to: Omar Khan
 * Topic: Matrix toolkit and summary report
 */
import java.util.Locale;
import java.util.Scanner;

public class Submission06 {
    static int[][] readMatrix(Scanner scanner, int rows, int cols) {
        int[][] matrix = new int[rows][cols];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                matrix[r][c] = scanner.nextInt();
            }
        }
        return matrix;
    }

    static int[][] transpose(int[][] matrix) {
        int rows = matrix.length;
        int cols = matrix[0].length;
        int[][] output = new int[cols][rows];
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                // Swap row and column positions for the transpose.
                output[c][r] = matrix[r][c];
            }
        }
        return output;
    }

    static int[] rowSums(int[][] matrix) {
        int[] sums = new int[matrix.length];
        for (int r = 0; r < matrix.length; r++) {
            int total = 0;
            for (int c = 0; c < matrix[r].length; c++) {
                total += matrix[r][c];
            }
            sums[r] = total;
        }
        return sums;
    }

    static int[] columnSums(int[][] matrix) {
        int cols = matrix[0].length;
        int[] sums = new int[cols];
        for (int c = 0; c < cols; c++) {
            int total = 0;
            for (int r = 0; r < matrix.length; r++) {
                total += matrix[r][c];
            }
            sums[c] = total;
        }
        return sums;
    }

    static int trace(int[][] matrix) {
        int total = 0;
        int limit = Math.min(matrix.length, matrix[0].length);
        // This also works for non-square input by stopping at the shorter side.
        for (int i = 0; i < limit; i++) {
            total += matrix[i][i];
        }
        return total;
    }

    static int secondaryTrace(int[][] matrix) {
        int total = 0;
        int rows = matrix.length;
        int cols = matrix[0].length;
        int limit = Math.min(rows, cols);
        for (int i = 0; i < limit; i++) {
            total += matrix[i][cols - 1 - i];
        }
        return total;
    }

    static int maxValue(int[][] matrix) {
        int max = matrix[0][0];
        for (int[] row : matrix) {
            for (int value : row) {
                if (value > max) {
                    max = value;
                }
            }
        }
        return max;
    }

    static int minValue(int[][] matrix) {
        int min = matrix[0][0];
        for (int[] row : matrix) {
            for (int value : row) {
                if (value < min) {
                    min = value;
                }
            }
        }
        return min;
    }

    static void printMatrix(String title, int[][] matrix) {
        System.out.println(title);
        for (int[] row : matrix) {
            for (int c = 0; c < row.length; c++) {
                System.out.print(row[c]);
                if (c + 1 < row.length) {
                    System.out.print(" ");
                }
            }
            System.out.println();
        }
    }

    static void printArray(String label, int[] values) {
        System.out.print(label + ": ");
        for (int i = 0; i < values.length; i++) {
            System.out.print(values[i]);
            if (i + 1 < values.length) {
                System.out.print(" ");
            }
        }
        System.out.println();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int rows = scanner.nextInt();
        int cols = scanner.nextInt();
        int[][] matrix = readMatrix(scanner, rows, cols);
        int[][] flipped = transpose(matrix);
        int[] rowTotals = rowSums(matrix);
        int[] colTotals = columnSums(matrix);

        printMatrix("Matrix", matrix);
        printMatrix("Transpose", flipped);
        printArray("Row sums", rowTotals);
        printArray("Column sums", colTotals);
        System.out.println("Trace: " + trace(matrix));
        System.out.println("Secondary trace: " + secondaryTrace(matrix));
        System.out.println("Max: " + maxValue(matrix));
        System.out.println("Min: " + minValue(matrix));
        System.out.printf(Locale.US, "Average row sum: %.2f%n", average(rowTotals));
    }

    static double average(int[] values) {
        if (values.length == 0) {
            return 0.0;
        }
        int total = 0;
        for (int value : values) {
            total += value;
        }
        return (double) total / values.length;
    }
}
