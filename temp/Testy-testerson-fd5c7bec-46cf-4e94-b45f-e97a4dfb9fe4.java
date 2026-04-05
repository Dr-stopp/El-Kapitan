//===== BEGIN FILE: JavaZip2/AuthValidator.java =====
import java.util.regex.Pattern;

/**
 * Utility for validating security credentials and input formats.
 */
public class AuthValidator {
    private static final String EMAIL_REGEX = "^(.+)@(.+)$";
    private static final String PASS_REGEX = "^(?=.*[0-9])(?=.*[a-z]).{8,}$";

    public boolean isEmailValid(String email) {
        if (email == null || email.isEmpty()) return false;
        return Pattern.compile(EMAIL_REGEX).matcher(email).matches();
    }

    public boolean isPasswordStrong(String password) {
        if (password == null) return false;
        boolean matches = Pattern.compile(PASS_REGEX).matcher(password).matches();
        if (!matches) {
            System.out.println("Security Warning: Password does not meet complexity requirements.");
        }
        return matches;
    }
}

//===== END FILE: JavaZip2/AuthValidator.java =====

//===== BEGIN FILE: JavaZip2/BaseReport.java =====
import java.util.Date;

/**
 * Abstract base for generating system reports.
 */
public abstract class BaseReport {
    protected String reportId;
    protected Date generatedAt;

    public BaseReport(String id) {
        this.reportId = id;
        this.generatedAt = new Date();
    }

    public abstract void generateContent();

    public void printHeader() {
        System.out.println("Report ID: " + reportId);
        System.out.println("Timestamp: " + generatedAt.toString());
        System.out.println("----------------------------");
    }
}

//===== END FILE: JavaZip2/BaseReport.java =====

//===== BEGIN FILE: JavaZip2/BinarySearcher.java =====
/**
 * Implements a recursive binary search on a sorted integer array.
 */
public class BinarySearcher {
    public int search(int[] arr, int left, int right, int x) {
        if (right >= left) {
            int mid = left + (right - left) / 2;

            if (arr[mid] == x) return mid;

            if (arr[mid] > x) {
                return search(arr, left, mid - 1, x);
            }

            return search(arr, mid + 1, right, x);
        }
        return -1;
    }

    public void displayResult(int result) {
        if (result == -1) {
            System.out.println("Element is not present in the array.");
        } else {
            System.out.println("Element found at index: " + result);
        }
    }
}
//===== END FILE: JavaZip2/BinarySearcher.java =====

