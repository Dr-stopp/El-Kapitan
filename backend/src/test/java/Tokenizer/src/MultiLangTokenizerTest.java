package Tokenizer.src;

import org.junit.jupiter.api.Test;

import java.nio.file.NoSuchFileException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class MultiLangTokenizerTest {

    @Test
    void tokenizesJavaSourceIntoNodes() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();

        List<Node> tokens = tokenizer.tokenize("testFiles/Test.java");

        assertFalse(tokens.isEmpty());
        assertTrue(tokens.stream().anyMatch(node -> "class".equals(node.token.getText())));
        assertTrue(tokens.stream().allMatch(node -> node.LineNumber > 0));
    }

    @Test
    void tokenizesCSourceIntoNodes() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();

        List<Node> tokens = tokenizer.tokenize("testFiles/Test.c");

        assertFalse(tokens.isEmpty());
        assertTrue(tokens.stream().anyMatch(node -> "printf".equals(node.token.getText())));
    }

    @Test
    void tokenizesCppSourceIntoNodes() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();

        List<Node> tokens = tokenizer.tokenize("testFiles/Test.cpp");

        assertFalse(tokens.isEmpty());
        assertTrue(tokens.stream().anyMatch(node -> "cout".equals(node.token.getText())));
    }

    @Test
    void commentsAreExcludedFromDefaultTokenChannel() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();

        List<Node> tokens = tokenizer.tokenize("testFiles/Test.c");
        List<String> tokenTexts = tokens.stream().map(node -> node.token.getText()).collect(Collectors.toList());

        assertFalse(tokenTexts.contains("Compile"));
        assertFalse(tokenTexts.contains("stdout.txt"));
    }

    @Test
    void filtersIgnoredTokenNames() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();
        tokenizer.ignoredTokens.add("IDENTIFIER");

        List<Node> tokens = tokenizer.tokenize("testFiles/Test.java");

        assertTrue(tokens.stream().noneMatch(node -> "Test".equals(node.token.getText())));
        assertTrue(tokens.stream().noneMatch(node -> "x".equals(node.token.getText())));
    }

    @Test
    void throwsOnUnsupportedFileTypeWhenFileExists() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();
        Path tempUnsupported = Files.createTempFile("tokenizer-unsupported", ".txt");
        try {
            Files.writeString(tempUnsupported, "plain text", StandardOpenOption.TRUNCATE_EXISTING);

            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> tokenizer.tokenize(tempUnsupported.toString())
            );

            assertEquals("Unsupported file type", ex.getMessage());
        } finally {
            Files.deleteIfExists(tempUnsupported);
        }
    }

    @Test
    void throwsWhenSupportedExtensionFileIsMissing() throws Exception {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();

        assertThrows(NoSuchFileException.class, () -> tokenizer.tokenize("testFiles/definitely-missing.java"));
    }
}
