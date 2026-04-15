# El-Kapitan

A web-based plagiarism detection system for student code submissions. Instructors manage courses and assignments while students submit code through a public submission page — no student login required.

Built for **COSC 4P02 — Group 7**.

## Features

- **Code plagiarism detection** using K-gram hashing with configurable similarity thresholds
- **Multi-language support** — Java, C, and C++ via ANTLR4 lexers (extensible)
- **Anonymous student submissions** — students submit via assignment key, no account needed
- **Instructor dashboard** — manage courses, assignments, and view comparison results
- **File upload** — supports `.zip`, `.c`, `.cpp`, and `.java` files with drag-and-drop
- **Match regions** — highlights specific line ranges where plagiarism is detected

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend | Java 21, Spring Boot 3.2, Maven, ANTLR4 |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage |

## Project Structure

```
El-Kapitan/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # Layout, Navbar, Footer, ProtectedRoute
│   │   ├── context/        # AuthContext (Supabase auth state)
│   │   ├── pages/          # Landing, Login, Signup, Submit, Dashboard, Courses, Compare
│   │   └── lib/            # Supabase client
│   └── docs/               # Frontend documentation
├── backend/                # Spring Boot API
│   ├── src/main/java/
│   │   ├── server/         # Controllers, DB handler, storage service
│   │   └── Tokenizer/src/  # ANTLR4 lexers, K-gram engine, plagiarism checker
│   ├── grammars/           # ANTLR4 .g4 grammar files
│   ├── testFiles/          # Test fixture ZIPs
│   └── docs/               # Backend documentation
└── schema.txt              # Database schema reference
```

## Prerequisites

- **Node.js** 18+
- **JDK** 21
- **Maven** 3.9+
- A **Supabase** project with PostgreSQL, Auth, and a Storage bucket named `Submissions`

## Getting Started

### Backend

1. Copy the environment template and fill in your credentials:
   ```bash
   cd backend
   cp src/main/resources/application.properties.example src/main/resources/application.properties
   ```

2. Set the required values in `application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://<host>:5432/postgres
   spring.datasource.username=<supabase_db_user>
   spring.datasource.password=<supabase_db_password>
   api.key=<supabase_service_role_key>
   jwt.secret=<jwt_secret>
   ```

3. Build and run:
   ```bash
   mvn clean compile
   mvn spring-boot:run
   ```
   The API will be available at `http://localhost:8080`.

### Frontend

1. Install dependencies and configure environment:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   ```

2. Fill the Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173`. API requests are proxied to the backend at `localhost:8080`.

### Database

Apply the schema from `schema.txt` to your Supabase PostgreSQL instance. Ensure the following Supabase settings:

- **Auth:** Email provider enabled, email confirmation disabled
- **Storage:** Bucket named `Submissions` created

## Running Tests

```bash
cd backend
mvn test
```

Tests cover the tokenizer layer (Java, C, C++ tokenization and comment filtering) using fixture ZIPs in `testFiles/`.

## API Reference

See [`backend/docs/API.md`](backend/docs/API.md) for endpoint documentation, request parameters, and example `curl` commands.

## Documentation

| Document | Description |
|----------|------------|
| [`frontend/docs/ARCHITECTURE.md`](frontend/docs/ARCHITECTURE.md) | Component hierarchy, auth flow, Supabase integration |
| [`frontend/docs/PAGES.md`](frontend/docs/PAGES.md) | Page-by-page specifications and route map |
| [`frontend/docs/DEVELOPMENT.md`](frontend/docs/DEVELOPMENT.md) | Frontend build commands and conventions |
| [`backend/docs/ARCHITECTURE.md`](backend/docs/ARCHITECTURE.md) | System design, data flow, database schema |
| [`backend/docs/API.md`](backend/docs/API.md) | REST API reference |
| [`backend/docs/DEVELOPMENT.md`](backend/docs/DEVELOPMENT.md) | Backend build commands, adding languages, testing |
