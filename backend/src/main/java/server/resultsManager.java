package server;

import Tokenizer.src.PlagiarismChecker;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;

public class resultsManager {
    public static void generateResults(MultipartFile file, String course, long assignment) throws IOException {
        System.out.println("Generating Results:");
        List<File> files = new LinkedList<>();
        MultipartFile mpf1;
        MultipartFile mpf2;
        Path p1;
        File f1;
        p1 = zipProcessor.concatZipFromMultipartToTemp(file, "baseFile");
        f1 = p1.toFile();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(Path.of("backend/testFiles"))) {
            int i = 1;
            for (Path path : stream) {
                if (Files.isRegularFile(path)) {
                    try (InputStream is = Files.newInputStream(path)) {
                        MultipartFile mf = new MockMultipartFile(
                                "file",
                                path.getFileName().toString(),
                                Files.probeContentType(path),
                                is
                        );
                        Path tempPath = zipProcessor.concatZipFromMultipartToTemp(mf, "file" + i);
                        files.add(tempPath.toFile());
                    }
                }
                i++;
            }
        }
        System.out.println("Running comparison on " + files.size() + " files.");
        for (File f : files) {
            new PlagiarismChecker(f1, f);
        }
        Path temp = Path.of("temp");
        try (var walk = Files.walk(temp)) {
            walk.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        }
    }

}