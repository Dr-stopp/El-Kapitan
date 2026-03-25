# Architecture

## Overview

Anamidae is a plagiarism detection service that processes student code submissions. When a student submits a ZIP archive of source code, the system:

1. Uploads the ZIP to Supabase Storage
2. Records the submission in PostgreSQL
3. Downloads all existing submissions for the same assignment
4. Tokenizes each submission using ANTLR4 lexers
5. Compares the new submission against all existing ones using K-gram hashing
6. Stores the top-K most similar results in the database

## Request Flow

```
Client
  │  POST /submit (ZIP file, studentId, assignmentId, course)
  ▼
SubmitController
  ├── SupabaseStorageService.upload()
  │     └── Uploads ZIP to Supabase Storage bucket "Submissions"
  │         Path: {course}/{assignmentId}/{studentId}-{assignmentId}.bin
  │
  ├── DBHandler.insertSubmission()
  │     └── Records submission metadata in PostgreSQL
  │         (handles duplicates: clears old results, reuses submission ID)
  │
  └── resultsManager.generateResults()
        │
        ├── storageService.listAllFiles()
        │     └── Lists all .bin files under {course}/{assignmentId}/
        │
        ├── storageService.downloadFile() (for each existing submission)
        │     └── Downloads file content from Supabase Storage
        │
        ├── zipProcessor.concatZipFromMultipartToTemp()
        │     └── Extracts ZIP, concatenates source files into single temp file
        │         (filters by extension of first file found in archive)
        │
        ├── PlagiarismChecker (for each existing submission)
        │     ├── JavaTokenizer
        │     │     ├── MultiLangTokenizer.tokenize()
        │     │     │     └── ANTLR4 lexer (Java/C/C++ based on file extension)
        │     │     └── Generates K-grams from token stream
        │     └── compareKGrams()
        │           └── Hash comparison → similarity score + match regions
        │
        ├── getTopScores()
        │     └── Selects top-K highest similarity scores
        │
        └── DBHandler.insertResult() (for each top-K result)
              └── Stores pair_id, scores, and match sections
```

## Components

### Server Package (`server.*`)

**Anamidae** — Spring Boot application entry point. Bootstraps the server on port 8080.

**SubmitController** — REST controller exposing the `POST /submit` endpoint. Accepts multipart form data (ZIP file + metadata), orchestrates the upload-store-compare pipeline, and returns the result. Handles duplicate submissions by clearing previous results.

**DBHandler** — Spring `@Service` wrapping `JdbcTemplate` for all database operations. Provides insert methods for every table, ID generation via PostgreSQL sequences, and result cleanup. Uses raw JDBC (no ORM).

**SupabaseStorageService** — Spring `@Service` using WebFlux `WebClient` to interact with the Supabase Storage REST API. Handles file upload (with upsert), recursive directory listing, and file download. Authenticates via the `API_KEY` environment variable.

**resultsManager** — Orchestrates the plagiarism comparison pipeline. Downloads all existing submissions for an assignment, runs `PlagiarismChecker` against each, selects the top-K scores, inserts results into the database, and cleans up temporary files.

**zipProcessor** — Static utility that extracts a ZIP archive from a `MultipartFile`, detects the source language from the first file's extension, and concatenates all matching files into a single temporary file at `./temp/`. File boundaries are marked with comment delimiters.

### Tokenizer Package (`Tokenizer.src.*`)

**MultiLangTokenizer** — Language-agnostic tokenizer that selects the appropriate ANTLR4 lexer based on file extension (`.java` → `JavaLexer`, `.c` → `CLexer`, `.cpp` → `CPP14Lexer`). Produces a list of `Node` tokens, filtering out comments and whitespace (default channel only).

**JavaTokenizer** — Wraps `MultiLangTokenizer` and generates K-grams from the token list. Despite the name, it works with any language supported by `MultiLangTokenizer`. Produces a `List<KGram>` used for comparison.

**PlagiarismChecker** — Core comparison engine. Takes two files, tokenizes both, and compares their K-gram hash sets. Produces a `PlagarismResult` containing a similarity score and a list of matching line regions.

**KGram** — Data structure representing a K-gram: a rolling window of K consecutive tokens. Stores the hash value and the start/end line numbers in the source file.

**Node** — Represents a single token with its line number, the ANTLR `Token` object, and the symbolic token name.

**MatchNode** — Stores a matching region between two files: start and end line numbers for both file 1 and file 2.

**PlagarismResult** — Holds the comparison output: a `double similarity` score (0.0–1.0) and a `List<MatchNode>` of matching regions.

### Generated Lexers

**JavaLexer**, **CLexer**, **CPP14Lexer** — ANTLR4-generated lexer classes. Source grammars are in the `grammars/` directory. These should not be edited directly; regenerate from the `.g4` files instead.

## Database Schema

All tables live in the `public` schema. No migration tool (Flyway/Liquibase) is configured — schema changes must be applied manually in Supabase.

### Tables

**Courses**
| Column | Type | Description |
|--------|------|-------------|
| `course_id` | long | Primary key |
| `course_name` | string | Course name |

**course_runs**
| Column | Type | Description |
|--------|------|-------------|
| `course_run_id` | long | Primary key |
| `teacher` | long | Teacher user ID |
| `course_id` | long | FK → Courses |

**Assignments**
| Column | Type | Description |
|--------|------|-------------|
| `assign_id` | long | Primary key |
| `course_id` | long | FK → Courses |
| `language` | string | Expected programming language |
| `name` | string | Assignment name |

**assignment_runs**
| Column | Type | Description |
|--------|------|-------------|
| `assignment_run_id` | long | Primary key |
| `course_run_id` | long | FK → course_runs |
| `assign_id` | long | FK → Assignments |
| `due_date` | timestamptz | Due date |
| `top_k` | long | Number of top results to store per submission |
| `threshold` | long | Similarity threshold |

**Users**
| Column | Type | Description |
|--------|------|-------------|
| `id` | long | Primary key |
| `type` | string | User type (e.g., student, teacher) |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `email` | string | Email address |
| `password` | string | Hashed password |
| `registration_date` | timestamptz | Account creation date |
| `password_last_change` | timestamptz | Last password change |

**submissions**
| Column | Type | Description |
|--------|------|-------------|
| `submission_id` | long | Primary key (from `submissions_seq`) |
| `created_at` | timestamptz | Submission timestamp |
| `assignment_run_id` | long | FK → assignment_runs |
| `student_id` | long | FK → Users |
| `folder_path` | string | Supabase Storage object path |

**results**
| Column | Type | Description |
|--------|------|-------------|
| `pair_id` | long | Primary key (from `results_seq`) |
| `submission_1` | long | FK → submissions (the new submission) |
| `submission_2` | long | FK → submissions (the compared submission) |
| `score` | long | Similarity score |
| `date_created` | timestamptz | Comparison timestamp |

**results_sections**
| Column | Type | Description |
|--------|------|-------------|
| `section_id` | long | Primary key |
| `pair_id` | long | FK → results |
| `submission_1` | long | FK → submissions |
| `submission_2` | long | FK → submissions |
| `submission_1_sec_start` | long | Start line in submission 1 |
| `submission_1_sec_end` | long | End line in submission 1 |
| `submission_2_sec_start` | long | Start line in submission 2 |
| `submission_2_sec_end` | long | End line in submission 2 |
| `submission_1_file_name` | string | Source filename in submission 1 |
| `submission_2_file_name` | string | Source filename in submission 2 |

### Sequences

- `submissions_seq` — generates `submission_id` values
- `results_seq` — generates `pair_id` values

## Supabase Storage

- **Bucket**: `Submissions`
- **Object path format**: `{course}/{assignmentId}/{studentId}-{assignmentId}.bin`
- Upload uses upsert (`x-upsert: true`), so re-submitting overwrites the previous file
- All files are stored as `.bin` regardless of the original ZIP contents

## ANTLR4 Grammars

Grammar source files are located in `grammars/`:

| Grammar | Language | File |
|---------|----------|------|
| `JavaLexer.g4` | Java | `grammars/JavaLexer.g4` |
| `CLexer.g4` | C | `grammars/CLexer.g4` |
| `CPP14Lexer.g4` | C++ | `grammars/CPP14Lexer.g4` |

Generated lexer classes are checked into `src/main/java/Tokenizer/src/`. To regenerate, run the ANTLR4 tool against the `.g4` files and place the output in that directory.

## Plagiarism Detection Algorithm

1. **Extract**: `zipProcessor` extracts the ZIP and concatenates all source files of the same language into a single file, preserving file boundaries with comment markers
2. **Tokenize**: `MultiLangTokenizer` selects the ANTLR4 lexer by file extension and produces a token stream, keeping only default-channel tokens (skips comments and whitespace)
3. **K-gram generation**: `JavaTokenizer` creates K-grams — rolling windows of K consecutive tokens (K=5). Each K-gram stores a hash and the source line range
4. **Comparison**: `PlagiarismChecker.compareKGrams()` builds a hash map of file 2's K-grams, then iterates file 1's K-grams looking for hash matches
5. **Scoring**: Similarity = `|unique matching K-gram hashes| / min(|file1 K-grams|, |file2 K-grams|)`
6. **Match regions**: Each hash match records the corresponding line ranges from both files as `MatchNode` objects
7. **Top-K selection**: `resultsManager` selects the K most similar existing submissions (where K is configured per assignment run) and stores those results
