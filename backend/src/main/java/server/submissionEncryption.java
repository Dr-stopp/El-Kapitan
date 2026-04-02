package server;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.security.SecureRandom;

@Service
public class submissionEncryption {
    private final String secretKey;
    private final String piiKey;
    private static final String ALG = "HmacSHA256";
    private static final String ENC_ALG = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private final SecureRandom secureRandom = new SecureRandom();

    public submissionEncryption(@Value("${encryption.secret.key}") String secretKey,
                                @Value("${encryption.pii.key}") String piiKey){
        this.secretKey = secretKey;
        this.piiKey = piiKey;
    }
    public String generatePublicID(String firstName, String lastName, String email, String assignmentRunID) {
        String unencrypted = email + "|" + lastName + "|"  + firstName + "|"  + assignmentRunID;
        byte[] keyBytes = Base64.getDecoder().decode(secretKey);
        try {
            Mac mac = Mac.getInstance(ALG);
            mac.init(new SecretKeySpec(keyBytes, ALG));
            byte[] digest = mac.doFinal(unencrypted.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest); // 64-char hex
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute HMAC", e);
        }



    }

    public String encryptString(String studentLast) {
        if (studentLast == null) {
            return null;
        }

        try {
            byte[] keyBytes = Base64.getDecoder().decode(piiKey);
            SecretKeySpec keySpec = new SecretKeySpec(keyBytes, "AES");

            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ENC_ALG);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(studentLast.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(cipherText);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt PII", e);
        }
    }
}
