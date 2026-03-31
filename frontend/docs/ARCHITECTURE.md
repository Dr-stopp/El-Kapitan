# Architecture

## Overview

The El Kapitan frontend is a single-page React application that serves two distinct user types:

- **Instructors** — authenticated users who manage courses, assignments, and review plagiarism results. Instructors sign up and log in via Supabase Auth.
- **Students** — unauthenticated users who submit code through a public submission page. Students do not have accounts; they identify themselves by name and use an assignment key provided by their instructor.

The frontend communicates with two services:

1. **Supabase** (direct) — for authentication, database queries, and file storage uploads
2. **Backend API** (via Vite dev proxy) — for plagiarism analysis processing (Spring Boot, port 8080)

## Application Flow

```
Browser
  │
  ├── main.jsx
  │     └── BrowserRouter → AuthProvider → App
  │
  ├── App.jsx (Route definitions)
  │     └── Layout (shared Navbar + Footer wrapper)
  │           ├── /              → Landing
  │           ├── /login         → Login
  │           ├── /signup        → Signup
  │           ├── /submit        → Submit
  │           ├── /dashboard     → ProtectedRoute → Dashboard
  │           ├── /courses       → ProtectedRoute → Courses
  │           └── /compare       → ProtectedRoute → Compare
  │
  └── ProtectedRoute
        ├── Loading? → spinner
        ├── No user? → redirect to /login
        └── User?    → render children
```

## Component Hierarchy

```
BrowserRouter
└── AuthProvider
    └── Routes
        └── Layout
            ├── Navbar          (auth-aware navigation)
            ├── <Outlet />      (current page)
            └── Footer
```

### Entry Point (`main.jsx`)

Mounts the React app into the DOM. Wraps the entire application in three providers:

1. `StrictMode` — React development checks
2. `BrowserRouter` — client-side routing via React Router
3. `AuthProvider` — Supabase session state available to all components

### Route Definitions (`App.jsx`)

All routes are nested under a parent `<Route element={<Layout />}>`, which renders the shared `Navbar` and `Footer` around a React Router `<Outlet />`. Three routes (`/dashboard`, `/courses`, `/compare`) are wrapped in `ProtectedRoute` to enforce instructor authentication.

### Layout Components

**Layout** (`src/components/Layout.jsx`) — Flexbox container (`min-h-screen flex flex-col`) with `Navbar` at the top, `<Outlet />` as the flexible main area, and `Footer` pinned to the bottom via `mt-auto`.

**Navbar** (`src/components/Navbar.jsx`) — Displays the site name ("El Kapitan") and navigation links. Adapts based on authentication state:
- **Logged out**: shows "Submit Work" and "Instructor Login"
- **Logged in**: shows "Submit Work", "Dashboard", "Courses", "Results", and a "Sign Out" button

Includes a mobile hamburger menu that toggles a dropdown on screens below `md:` (768px).

**Footer** (`src/components/Footer.jsx`) — Three-column grid with branding, quick links, and resource links. Collapses to a single column on mobile. Resource links are currently placeholders.

**ProtectedRoute** (`src/components/ProtectedRoute.jsx`) — Auth guard component. Reads `user` and `loading` from `AuthContext`:
- While `loading` is true, renders a centered spinner
- If `user` is null, redirects to `/login` via `<Navigate replace />`
- Otherwise, renders the child page component

## Authentication Flow

Authentication is handled entirely through Supabase Auth. The `AuthContext` provider (`src/context/AuthContext.jsx`) manages the lifecycle:

```
App starts
  │
  ├── AuthProvider mounts
  │     ├── supabase.auth.getSession()
  │     │     └── Restores user from existing session (or sets null)
  │     │     └── Sets loading = false
  │     │
  │     └── supabase.auth.onAuthStateChange()
  │           └── Subscribes to auth events (login, logout, token refresh)
  │           └── Updates user state on every change
  │           └── Unsubscribes on unmount
  │
  ├── signUp(email, password, firstName, lastName)
  │     └── supabase.auth.signUp()
  │     └── Stores first_name and last_name in user_metadata
  │
  ├── signIn(email, password)
  │     └── supabase.auth.signInWithPassword()
  │
  └── signOut()
        └── supabase.auth.signOut()
```

Session tokens are managed automatically by the Supabase client library (stored in `localStorage`). The `useAuth()` hook provides `{ user, loading, signUp, signIn, signOut }` to any component that needs auth state.

### Supabase Auth Configuration

The following settings must be configured in the Supabase dashboard (**Authentication → Settings**):

| Setting | Value | Reason |
|---------|-------|--------|
| Email provider | Enabled | Instructors authenticate with email/password |
| Confirm email | **Disabled** | Allows immediate login after signup without email verification |

## Supabase Integration

### Client Initialization (`src/lib/supabase.js`)

Creates a single Supabase client instance using two environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Anonymous/public API key (safe for client-side use) |

The client is exported as a named singleton (`supabase`) and imported where needed for auth, database queries, and storage operations. If either variable is missing, a console error is logged at startup.

### Database Queries

The frontend makes direct Supabase database queries for several features:

- **Assignment key validation** (`src/pages/Submit.jsx`): Queries the `assignment_runs` table to verify that a student-provided assignment key (the `assignment_run_id`) exists before allowing a file upload. Uses `.select().eq().single()`.
- **Instructor dashboard data** (`src/instructor/api.js`): Queries `courses`, `assignments`, `assignment_runs`, `repositories`, `submissions`, and `results` tables to populate the instructor dashboard — course lists, assignment lists, review queue, analytics, and submission reports.
- **Assignment export** (`src/instructor/api.js`): The `fetchExportData()` function chains queries across `repositories` → `submissions` → `results` to gather all data for a given assignment run, used by the zip export feature.

### Storage Operations

**Uploads** — Student submissions are uploaded directly to Supabase Storage from the browser:

- **Bucket**: `Submissions`
- **Path format**: `submissions/{assignmentKey}/{firstName}_{lastName}_{timestamp}_{filename}`
  - `timestamp` is `Date.now()` to ensure uniqueness
  - `filename` is sanitized (non-alphanumeric characters replaced with `_`)
- **Accepted file types**: `.zip`, `.c`, `.cpp`, `.java`

**Downloads** — The instructor dashboard downloads files from the `Submissions` bucket for two purposes:

- **Submission comparison view** (`readStorageText` in `api.js`): Downloads individual submission files as text for the side-by-side code comparison UI. Filters out binary content.
- **Assignment export** (`downloadStorageBlob` in `api.js`): Downloads submission files as raw blobs to include in the zip export. Files are downloaded in batches of 5 to avoid overwhelming the browser.

## Backend Integration

The Vite dev server proxies requests from `/api/*` to the backend at `http://localhost:8080`, stripping the `/api` prefix. This avoids CORS issues during development.

```
Frontend (localhost:5173)                 Backend (localhost:8080)
        │                                         │
        ├── /api/submit  ──proxy──►  POST /submit │
        │   rewrite: /api removed                 │
```

The proxy is configured in `vite.config.js`. For production deployments, configure your reverse proxy (Nginx, Cloudflare, etc.) to route `/api` to the backend server.

The backend handles the full plagiarism detection pipeline: file storage, tokenization, K-gram comparison, and result storage. See the [backend API docs](../../backend/docs/API.md) for endpoint details.

## Assignment Export Feature

The instructor dashboard includes an **Export** button on each assignment card that generates and downloads a zip file containing all student submissions, plagiarism results, and a summary CSV.

### How It Works

1. Instructor clicks "Export" on an assignment card in the dashboard
2. `buildAssignmentExportZip()` in `src/instructor/api.js` orchestrates the process:
   - Queries `repositories` by `assignment_run_id` to find all repos for the assignment
   - Queries `submissions` by `repository_id` to find all student submissions
   - Queries `results` by `submission_id` to find plagiarism comparison results
   - Downloads each submission file from Supabase Storage (batched, 5 at a time)
   - Builds a JSZip archive with the following structure:

```
Assignment_Name-export.zip
├── submissions/
│   ├── john_doe/
│   │   ├── uploaded_file.zip       (original submission from storage)
│   │   └── plagiarism_result.json  (similarity scores and matched pairs)
│   ├── jane_smith/
│   │   └── ...
├── previous_offerings/
│   └── README.txt                  (placeholder — feature not yet implemented)
└── summary.csv                     (one row per student with scores)
```

3. The zip blob is triggered as a browser download using the native `Blob` + `URL.createObjectURL` + `link.click()` pattern

### Dependencies

- **JSZip** (`jszip`) — Client-side zip generation. Added as a production dependency.

### Student Folder Naming

Student folders are named using the `firstName_lastName` pattern parsed from the submission `folder_path` (e.g., `john_doe/`). This uses the same `parseStudentNameFromFolderPath()` function used elsewhere in the dashboard. If the name cannot be parsed, falls back to `student_{student_id}`. Duplicate names are disambiguated by appending the `submission_id`.

### Edge Cases Handled

- **No submissions**: Zip contains an empty `submissions/` folder and a header-only `summary.csv`
- **No plagiarism results**: `plagiarism_result.json` has an empty `results` array; CSV score columns are blank
- **Storage download failure**: A `download_error.txt` file is placed in the student's folder instead
- **Duplicate student names**: Folder name gets `_${submission_id}` appended

## Design System

All colors are defined as custom Tailwind theme tokens in `src/index.css` using the Tailwind v4 `@theme` directive:

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#F0F0DB` | Page backgrounds, card backgrounds |
| `warm` | `#E1D9BC` | Secondary backgrounds, borders, input borders |
| `accent` | `#E0FBFC` | Highlights, hover states, badges |
| `primary` | `#2B68A1` | Buttons, links, headings, navbar, footer |
| `primary-dark` | `#1E4F7D` | Button hover states |
| `primary-light` | `#3A7BB5` | Alternative primary variant |
| `text` | `#2D2D2D` | Body text |
| `text-muted` | `#6B6B6B` | Secondary text, descriptions |
| `error` | `#DC2626` | Error messages, validation |
| `success` | `#16A34A` | Success messages, confirmed states |

These tokens are used via standard Tailwind utilities (e.g., `bg-primary`, `text-accent`, `border-warm`). See the [Development Guide](DEVELOPMENT.md#design-system-reference) for common patterns.
