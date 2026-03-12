package server;

import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.springframework.mock.web.MockMultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

public class zipProcessor {

    /**
     * Reads a ZIP from MultipartFile, concatenates files with the same extension as
     * the first file found, and writes output to ./temp/combined.<ext>
     */
    public static Path concatZipFromMultipartToTemp(MultipartFile zipFile) throws IOException {
        Path tempDir = Paths.get("temp");
        Files.createDirectories(tempDir);

        // First pass: detect extension from first non-directory file
        String targetExt;
        try (ZipInputStream zis = new ZipInputStream(zipFile.getInputStream(), StandardCharsets.UTF_8)) {
            targetExt = findFirstFileExtension(zis);
        }

        if (targetExt == null || targetExt.isBlank()) {
            throw new IOException("No valid files with extension found in zip.");
        }

        Path outputFile = tempDir.resolve("combined." + targetExt);

        // Second pass: concatenate matching files
        try (
                ZipInputStream zis = new ZipInputStream(zipFile.getInputStream(), StandardCharsets.UTF_8);
                BufferedWriter writer = Files.newBufferedWriter(
                        outputFile,
                        StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE,
                        StandardOpenOption.TRUNCATE_EXISTING
                )
        ) {
            ZipEntry entry;
            char[] buffer = new char[8192];

            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    String ext = getExtension(entry.getName());
                    if (targetExt.equalsIgnoreCase(ext)) {
                        writer.write("===== BEGIN FILE: " + entry.getName() + " =====");
                        writer.newLine();

                        Reader reader = new InputStreamReader(zis, StandardCharsets.UTF_8);
                        int n;
                        while ((n = reader.read(buffer)) != -1) {
                            writer.write(buffer, 0, n);
                        }

                        writer.newLine();
                        writer.write("===== END FILE: " + entry.getName() + " =====");
                        writer.newLine();
                        writer.newLine();
                    }
                }
                zis.closeEntry();
            }
        }

        return outputFile;
    }

    private static String findFirstFileExtension(ZipInputStream zis) throws IOException {
        ZipEntry entry;
        while ((entry = zis.getNextEntry()) != null) {
            if (!entry.isDirectory()) {
                String ext = getExtension(entry.getName());
                if (!ext.isBlank()) {
                    return ext;
                }
            }
            zis.closeEntry();
        }
        return null;
    }

    private static String getExtension(String name) {
        String fileName = Paths.get(name).getFileName().toString();
        int dot = fileName.lastIndexOf('.');
        if (dot <= 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static void main(String[] args) throws IOException {
        Path path1 = Path.of("backend/testFiles/zipTest1.zip");
        Path path2 = Path.of("backend/testFiles/zipTest2.zip");
        MultipartFile f1;
        MultipartFile f2;
        try (InputStream is1 = Files.newInputStream(path1); InputStream is2 = Files.newInputStream(path2)) {
            f1 = new MockMultipartFile(
                    "file",                      // form field name
                    path1.getFileName().toString(), // original filename
                    "application/zip",           // content type
                    is1
            );
            f2 = new MockMultipartFile(
                    "file",                      // form field name
                    path2.getFileName().toString(), // original filename
                    "application/zip",           // content type
                    is2
            );
        }
        Path p1 = concatZipFromMultipartToTemp(f1);
        Path p2 = concatZipFromMultipartToTemp(f2);

    }
}