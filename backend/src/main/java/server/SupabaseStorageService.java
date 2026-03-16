package server;

import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.reactive.function.client.WebClientResponseException;



@Service
public class SupabaseStorageService {

    // ==== Supabase config (REPLACE) ====
    private static final String SUPABASE_URL = "https://dtrzuwcjxvxueepzgjol.supabase.co";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient;
    private final String apiKey;

    public SupabaseStorageService(WebClient.Builder builder, @Value("${api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.webClient = builder
                .baseUrl(SUPABASE_URL)
                .defaultHeader("Authorization", "Bearer " + this.apiKey)
                .defaultHeader("apikey", this.apiKey)
                .build();
    }

    public String upload(MultipartFile file, long student, long assignment, String course, String bucket) throws Exception {
        String fileName = student + "-" + assignment + ".bin";

        String objectPath =  course + "/" + assignment + "/" + sanitizeObjectName(fileName);

        String endpoint = "/storage/v1/object/" + bucket + "/" + urlPathEncode(objectPath);

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

    public List<String> listAllFiles(String prefix, String bucket) throws IOException {
        List<String> out = new ArrayList<>();
        listAllFilesRecursive(prefix == null ? "" : prefix, out, bucket);
        return out;
    }

    private void listAllFilesRecursive(String prefix, List<String> out, String bucket) throws IOException {
        String body = """
        {
          "prefix": "%s",
          "limit": 1000,
          "offset": 0
        }
        """.formatted(prefix);

        String json = webClient.post()
                .uri("/storage/v1/object/list/" + bucket)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .map(msg -> new RuntimeException("Supabase list failed: " + msg)))
                .bodyToMono(String.class)
                .block();

        if (json == null || json.isBlank()) return;

        JsonNode arr = objectMapper.readTree(json);
        for (JsonNode item : arr) {
            String name = item.path("name").asText();
            boolean isFile = !item.path("id").isNull(); // folders have id = null
            String fullPath = prefix == null || prefix.isBlank() ? name : prefix + "/" + name;

            if (isFile) {
                out.add(fullPath);
            } else {
                listAllFilesRecursive(fullPath, out, bucket);
            }
        }
    }

    public byte[] downloadFile(String objectPath, String bucket) {
        String endpoint = "/storage/v1/object/" + bucket + "/" + urlPathEncode(objectPath);

        try {
            return webClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .map(msg -> new RuntimeException("Supabase download failed for " + objectPath + ": " + msg)))
                    .bodyToMono(byte[].class)
                    .block();
        } catch (WebClientResponseException e) {
            throw new RuntimeException("Download failed [" + e.getStatusCode() + "] for " + objectPath, e);
        }
    }
}
