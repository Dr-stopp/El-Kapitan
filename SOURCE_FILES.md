# Source File Documentation

This document is a quick map of the primary backend source files in El-Kapitan.
It focuses on implementation files used by the backend and excludes generated build output (for example `backend/target/**`).

## Backend (Spring Boot / Java)

### Server Layer (`backend/src/main/java/server`)

- `Anamidae.java`: Spring Boot application entry point.
- `SubmitController.java`: REST controller for submission and comparison endpoints.
- `DBHandler.java`: JDBC data-access helper for courses, assignments, submissions, and result persistence.
- `SupabaseStorageService.java`: Upload/download integration with Supabase Storage.
- `resultsManager.java`: Coordinates plagiarism analysis runs and result aggregation.
- `zipProcessor.java`: Extracts and normalizes uploaded ZIP submissions for analysis.
- `submission_rec.java`: Submission record/model used in request-processing flow.

### Tokenizer & Plagiarism Engine (`backend/src/main/java/Tokenizer/src`)

- `MultiLangTokenizer.java`: Language-aware tokenizer dispatcher (Java/C/C++).
- `JavaTokenizer.java`: Java token normalization and K-gram preparation.
- `PlagiarismChecker.java`: Similarity computation engine using K-gram matching.
- `PlagiarismResult.java`: Result model containing similarity score and match metadata.
- `KGram.java`: K-gram value object used during hashing/comparison.
- `Node.java`: Token node representation used by tokenizer/comparison logic.
- `MatchNode.java`: Represents matched regions and related line-range data.
- `JavaLexer.java`: Generated ANTLR lexer for Java tokenization.
- `CLexer.java`: Generated ANTLR lexer for C tokenization.
- `CLexerBase.java`: Shared base behavior for C lexer processing.
- `CPP14Lexer.java`: Generated ANTLR lexer for C++14 tokenization.

### Grammar Sources (`backend/grammars`)

- `JavaLexer.g4`: ANTLR lexer grammar source for Java.
- `CLexer.g4`: ANTLR lexer grammar source for C.
- `CPP14Lexer.g4`: ANTLR lexer grammar source for C++14.

### Backend Config / Tests

- `backend/src/main/resources/application.properties`: Local runtime configuration.
- `backend/src/main/resources/application.properties.example`: Configuration template.
- `backend/src/main/resources/Ignore.txt`: Ignore/filter list for tokenizer pipeline.
- `backend/src/test/java/Tokenizer/src/MultiLangTokenizerTest.java`: Tokenizer unit tests across supported languages.

## Supporting Project Files

- `backend/pom.xml`: Backend dependencies, build plugins, and Java/Maven settings.

## Notes

- Existing backend docs remain the source of truth for architecture and API behavior:
  - `backend/docs/ARCHITECTURE.md`
  - `backend/docs/API.md`
- Update this file when adding, removing, or substantially repurposing backend source files.
