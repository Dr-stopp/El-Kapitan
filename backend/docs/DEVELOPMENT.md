# Development Guide

## Build Commands

```bash
# Compile only
mvn clean compile

# Compile + run tests + package JAR
mvn clean package

# Run in development mode (starts on port 8080)
mvn spring-boot:run

# Run tests only
mvn test
```

## Project Conventions

- **Package structure**: `server.*` for Spring Boot components (controller, services, DB), `Tokenizer.src.*` for the plagiarism detection engine
- **Database access**: Raw JDBC via Spring's `JdbcTemplate` — no ORM (Hibernate/JPA)
- **HTTP client**: Spring WebFlux `WebClient` for Supabase Storage API calls
- **No DTO layer**: The controller accepts raw `@RequestParam` values directly
- **Logging**: SLF4J via `LoggerFactory` throughout
- **Temp files**: Processed submissions are written to `./temp/` and cleaned up after each request

## Adding a New Language

To add support for a new programming language:

1. **Add a grammar**: Place a new `.g4` lexer grammar in `grammars/`
2. **Generate the lexer**: Run the ANTLR4 tool to generate the lexer class, and place the output in `src/main/java/Tokenizer/src/`
3. **Register the extension**: Add a new `else if` branch in `MultiLangTokenizer.tokenize()` (`src/main/java/Tokenizer/src/MultiLangTokenizer.java:36`) that maps the file extension to the new lexer
4. **Add test fixtures**: Create sample ZIP files in `testFiles/` and add test cases to `MultiLangTokenizerTest`

## Testing

- **Framework**: JUnit 5 (via `spring-boot-starter-test`)
- **Test location**: `src/test/java/Tokenizer/src/MultiLangTokenizerTest.java`
- **Current coverage**: Tokenizer layer only — Java, C, and C++ tokenization, comment filtering, ignored tokens, unsupported file types, missing files
- **Test fixtures**: `testFiles/` at the project root contains 7 ZIP files (`JavaZip1`–`JavaZip7`) and sample submission directories
- **Running**: Tests execute from the project root; file paths in tests are relative to root

## Known Issues

<!--
  Add known bugs and technical debt items here as they are discovered.
  Format: short description, affected file(s), and any workaround.
-->

*No known issues documented yet. Add entries here as they are discovered.*
