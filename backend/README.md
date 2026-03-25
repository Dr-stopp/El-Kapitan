# Anamidae

Plagiarism detection service for student code submissions. Accepts ZIP archives of source code, tokenizes them using ANTLR4 lexers, and compares submissions using a K-gram hashing algorithm to identify similarities.

## Tech Stack

- **Language**: Java 21
- **Framework**: Spring Boot 3.2.2
- **Build Tool**: Apache Maven
- **Database**: PostgreSQL (hosted on Supabase)
- **File Storage**: Supabase Storage
- **Tokenization**: ANTLR4 (Java, C, C++ lexers)
- **Algorithm**: K-gram hashing for similarity detection

## Prerequisites

- JDK 21
- Maven 3.9+
- A Supabase project with:
  - A PostgreSQL database with the required schema (see [Architecture](docs/ARCHITECTURE.md#database-schema))
  - A storage bucket named `Submissions`

## Environment Setup

1. The application reads configuration from environment variables. Set the following before running:

   | Variable | Description |
   |----------|-------------|
   | `SPRING_DATASOURCE_URL` | JDBC connection string for your PostgreSQL database |
   | `SPRING_DATASOURCE_USERNAME` | Database username |
   | `SPRING_DATASOURCE_PASSWORD` | Database password |
   | `API_KEY` | Supabase service-role API key (used for storage operations) |
   | `JWT_SECRET` | Secret key for JWT token validation |

2. An example properties file is provided at `src/main/resources/application.properties.example` for reference.

> **Warning**: Never commit `application.properties` with real credentials.

## Build and Run

```bash
# Compile and package
mvn clean package

# Run the server (starts on localhost:8080)
mvn spring-boot:run
```

## Running Tests

```bash
mvn test
```

Tests require the `testFiles/` directory at the project root (included in the repository).

## Project Structure

```
├── pom.xml                                 # Maven build configuration
├── src/main/java/
│   ├── server/
│   │   ├── Anamidae.java                   # Spring Boot entry point
│   │   ├── SubmitController.java           # REST API controller
│   │   ├── DBHandler.java                  # Database operations (JDBC)
│   │   ├── SupabaseStorageService.java     # Supabase file upload/download
│   │   ├── resultsManager.java             # Plagiarism comparison orchestration
│   │   └── zipProcessor.java              # ZIP extraction and file concatenation
│   └── Tokenizer/src/
│       ├── PlagiarismChecker.java          # K-gram comparison engine
│       ├── MultiLangTokenizer.java         # Language-agnostic tokenizer
│       ├── JavaTokenizer.java              # Java-specific tokenizer + K-gram generation
│       ├── KGram.java                      # K-gram data structure
│       ├── Node.java                       # Token node
│       ├── MatchNode.java                  # Match region (line ranges)
│       ├── PlagarismResult.java            # Comparison result (similarity + matches)
│       ├── JavaLexer.java                  # Generated ANTLR4 lexer (Java)
│       ├── CLexer.java                     # Generated ANTLR4 lexer (C)
│       └── CPP14Lexer.java                 # Generated ANTLR4 lexer (C++)
├── src/main/resources/
│   ├── application.properties              # Runtime configuration (env vars)
│   └── application.properties.example      # Template with sample values
├── src/test/java/Tokenizer/src/
│   └── MultiLangTokenizerTest.java         # Tokenizer unit tests
├── grammars/                               # ANTLR4 .g4 grammar source files
├── testFiles/                              # Test fixture ZIP files
└── HTMLTEST/                               # Manual test HTML forms
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flow, database schema
- [API Reference](docs/API.md) — REST endpoint documentation
- [Development Guide](docs/DEVELOPMENT.md) — build commands, conventions, how to add languages
