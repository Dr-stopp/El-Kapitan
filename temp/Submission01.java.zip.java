//===== BEGIN FILE: Submission01.java =====
/*
 * Submission 01
 * Related to: Sarah Bennett
 * Topic: Expense ledger and category summary
 */
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

public class Submission01 {
    static class Expense {
        String category;
        String label;
        double amount;

        Expense(String category, String label, double amount) {
            this.category = category;
            this.label = label;
            this.amount = amount;
        }
    }

    static String normalizeCategory(String raw) {
        String cleaned = raw.trim().toLowerCase(Locale.ROOT);
        if (cleaned.isEmpty()) {
            return "misc";
        }
        return Character.toUpperCase(cleaned.charAt(0)) + cleaned.substring(1);
    }

    static List<Expense> readExpenses(Scanner scanner, int count) {
        List<Expense> expenses = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String category = normalizeCategory(scanner.next());
            String label = scanner.next();
            double amount = scanner.nextDouble();
            expenses.add(new Expense(category, label, amount));
        }
        return expenses;
    }

    static Map<String, Double> totalsByCategory(List<Expense> expenses) {
        Map<String, Double> totals = new LinkedHashMap<>();
        for (Expense expense : expenses) {
            // Keep category order stable so the report follows input order.
            totals.put(expense.category, totals.getOrDefault(expense.category, 0.0) + expense.amount);
        }
        return totals;
    }

    static double totalAmount(List<Expense> expenses) {
        double total = 0.0;
        for (Expense expense : expenses) {
            total += expense.amount;
        }
        return total;
    }

    static Expense highestExpense(List<Expense> expenses) {
        Expense best = expenses.get(0);
        for (Expense expense : expenses) {
            if (expense.amount > best.amount) {
                best = expense;
            }
        }
        return best;
    }

    static Expense lowestExpense(List<Expense> expenses) {
        Expense best = expenses.get(0);
        for (Expense expense : expenses) {
            if (expense.amount < best.amount) {
                best = expense;
            }
        }
        return best;
    }

    static int countOverLimit(List<Expense> expenses, double limit) {
        int count = 0;
        for (Expense expense : expenses) {
            if (expense.amount > limit) {
                count++;
            }
        }
        return count;
    }

    static void printEntries(List<Expense> expenses) {
        for (int i = 0; i < expenses.size(); i++) {
            Expense expense = expenses.get(i);
            System.out.printf(
                    Locale.US,
                    "%d. %s %s %.2f%n",
                    i + 1,
                    expense.category,
                    expense.label,
                    expense.amount
            );
        }
    }

    static void printCategoryTotals(Map<String, Double> totals, double grandTotal) {
        for (Map.Entry<String, Double> entry : totals.entrySet()) {
            double share = grandTotal == 0.0 ? 0.0 : (entry.getValue() * 100.0) / grandTotal;
            System.out.printf(
                    Locale.US,
                    "Category %s total=%.2f share=%.2f%%%n",
                    entry.getKey(),
                    entry.getValue(),
                    share
            );
        }
    }

    static void printSummary(List<Expense> expenses, double limit) {
        double grandTotal = totalAmount(expenses);
        Map<String, Double> totals = totalsByCategory(expenses);
        Expense biggest = highestExpense(expenses);
        Expense smallest = lowestExpense(expenses);
        int overLimit = countOverLimit(expenses, limit);
        double average = expenses.isEmpty() ? 0.0 : grandTotal / expenses.size();

        System.out.printf(Locale.US, "Total expenses: %d%n", expenses.size());
        System.out.printf(Locale.US, "Grand total: %.2f%n", grandTotal);
        System.out.printf(Locale.US, "Average expense: %.2f%n", average);
        System.out.printf(Locale.US, "Largest expense: %s %.2f%n", biggest.label, biggest.amount);
        System.out.printf(Locale.US, "Smallest expense: %s %.2f%n", smallest.label, smallest.amount);
        System.out.printf(Locale.US, "Entries over limit %.2f: %d%n", limit, overLimit);
        printCategoryTotals(totals, grandTotal);
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int count = scanner.nextInt();
        List<Expense> expenses = readExpenses(scanner, count);
        double limit = scanner.nextDouble();

        // Avoid generating a report for empty input.
        if (expenses.isEmpty()) {
            System.out.println("No expenses supplied");
            return;
        }

        printEntries(expenses);
        printSummary(expenses, limit);
    }
}

//===== END FILE: Submission01.java =====

