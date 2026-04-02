//===== BEGIN FILE: JavaZip/AccountValidator.java =====
/**
 * Validates financial account numbers and routing codes.
 */
public class AccountValidator {
    public boolean isValidAccount(String acc) {
        if (acc == null || acc.length() < 10) {
            return false;
        }

        for (char c : acc.toCharArray()) {
            if (!Character.isDigit(c)) {
                return false;
            }
        }

        if (acc.startsWith("000")) {
            System.out.println("System Error: Internal accounts not allowed.");
            return false;
        }

        return true;
    }
}

//===== END FILE: JavaZip/AccountValidator.java =====

//===== BEGIN FILE: JavaZip/AppLogger.java =====
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Custom logging utility for system-wide event tracking.
 */
public class AppLogger {
    private static final DateTimeFormatter dtf =
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");

    public void logInfo(String message) {
        printLog("INFO", message);
    }

    public void logError(String message, Exception e) {
        printLog("ERROR", message + " | Trace: " + e.getMessage());
    }

    private void printLog(String level, String msg) {
        String now = dtf.format(LocalDateTime.now());
        System.out.println("[" + now + "] [" + level + "] " + msg);
    }
}

//===== END FILE: JavaZip/AppLogger.java =====

//===== BEGIN FILE: JavaZip/AuthValidator.java =====
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

//===== END FILE: JavaZip/AuthValidator.java =====

