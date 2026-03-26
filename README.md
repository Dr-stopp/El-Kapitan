# El Kapitan Frontend

Web interface for the El Kapitan plagiarism detection platform. Provides instructor authentication, student submission workflows, and a management dashboard — all connected to Supabase for auth, database, and file storage.

## Tech Stack

- **Language**: JavaScript (ES Modules)
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Auth & Database**: Supabase (Auth + PostgreSQL + Storage)

## Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project with:
  - Auth enabled (email/password provider, email confirmation **disabled**)
  - The database schema applied (see [Architecture](docs/ARCHITECTURE.md#supabase-integration))
  - A storage bucket named `Submissions`

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:

   | Variable | Description |
   |----------|-------------|
   | `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xxx.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

   Both values are found in your Supabase dashboard under **Settings → API**.

> **Warning**: Never commit `.env` with real credentials. The `.env.example` file is safe to commit.

## Build and Run

```bash
# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

The development server proxies `/api` requests to `localhost:8080` (the backend). See [Development Guide](docs/DEVELOPMENT.md#dev-server-proxy) for details.

## Project Structure

```
├── .env.example                          # Environment variable template
├── vite.config.js                        # Vite + Tailwind + proxy configuration
├── package.json                          # Dependencies and scripts
├── src/
│   ├── main.jsx                          # Application entry point (Router + AuthProvider)
│   ├── App.jsx                           # Route definitions
│   ├── index.css                         # Tailwind imports + custom theme
│   ├── lib/
│   │   └── supabase.js                   # Supabase client initialization
│   ├── context/
│   │   └── AuthContext.jsx               # Authentication state provider
│   ├── components/
│   │   ├── Layout.jsx                    # Shared page layout (Navbar + Footer)
│   │   ├── Navbar.jsx                    # Top navigation bar (auth-aware)
│   │   ├── Footer.jsx                    # Site footer
│   │   └── ProtectedRoute.jsx           # Auth guard for instructor pages
│   └── pages/
│       ├── Landing.jsx                   # Home page (/)
│       ├── Login.jsx                     # Instructor login (/login)
│       ├── Signup.jsx                    # Instructor registration (/signup)
│       ├── Submit.jsx                    # Student submission (/submit)
│       ├── Dashboard.jsx                 # Instructor dashboard (/dashboard) [placeholder]
│       ├── Courses.jsx                   # Course management (/courses) [placeholder]
│       └── Compare.jsx                   # Comparison results (/compare) [placeholder]
└── docs/
    ├── ARCHITECTURE.md                   # System design, component hierarchy, auth flow
    ├── PAGES.md                          # Page-by-page documentation
    └── DEVELOPMENT.md                    # Build commands, conventions, how to extend
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, component hierarchy, auth flow, Supabase integration
- [Pages Reference](docs/PAGES.md) — page-by-page documentation with routes, behavior, and status
- [Development Guide](docs/DEVELOPMENT.md) — build commands, conventions, how to add pages, design system
