package server;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class SupabaseStorageService {

    // ==== Supabase config (REPLACE) ====
    private static final String SUPABASE_URL = "https://dtrzuwcjxvxueepzgjol.supabase.co";
    private static final String API_KEY = "API_KEY";
    private static final String BUCKET = "Bucket";

    private final WebClient webClient;

    public SupabaseStorageService(WebClient.Builder builder) {
        this.webClient = builder
                .baseUrl(SUPABASE_URL)
                .defaultHeader("Authorization", "Bearer " + API_KEY)
                .defaultHeader("apikey", API_KEY)
                .build();
    }

    public String upload(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) filename = "upload.bin";

        String objectPath = "uploads/" + sanitizeObjectName(filename);

        String endpoint = "/storage/v1/object/" + BUCKET + "/" + urlPathEncode(objectPath);

        MediaType contentType = (file.getContentType() != null)
                ? MediaType.parseMediaType(file.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;

        // Supabase returns JSON sometimes; you can capture it if you want.
        webClient.post()
                .uri(endpoint)
                .header("x-upsert", "true")
                .header(HttpHeaders.CONTENT_TYPE, contentType.toString())
                .bodyValue(file.getBytes())
                .retrieve()
                .toBodilessEntity()
                .block();

        return objectPath;
    }

    private static String sanitizeObjectName(String name) {
        String n = name.replace("\\", "/");
        int slash = n.lastIndexOf('/');
        if (slash >= 0) n = n.substring(slash + 1);
        return n.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private static String urlPathEncode(String path) {
        // Encode each segment while keeping slashes
        String[] parts = path.split("/");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) sb.append('/');
            sb.append(URLEncoder.encode(parts[i], StandardCharsets.UTF_8)
                    .replace("+", "%20"));
        }
        return sb.toString();
    }
}