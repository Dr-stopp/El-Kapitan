# Development Guide

## Build Commands

```bash
# Install dependencies
npm install

# Start development server (localhost:5173, with hot reload)
npm run dev

# Build for production (output to dist/)
npm run build

# Preview production build locally
npm run preview

# Lint with ESLint
npm run lint
```

## Dev Server Proxy

The Vite dev server proxies `/api` requests to the backend:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

A frontend request to `/api/submit` is forwarded to `http://localhost:8080/submit`. The backend must be running on port 8080 for these proxied requests to succeed.

For production deployments, configure your reverse proxy (Nginx, Cloudflare, etc.) to route `/api` to the backend server.

## Project Conventions

- **File structure**: Pages in `src/pages/`, reusable components in `src/components/`, shared utilities and clients in `src/lib/`, React context providers in `src/context/`
- **Component style**: Functional components with hooks. One component per file, default export matching the filename
- **Styling**: Tailwind CSS utility classes only — no custom CSS files per component. Global theme tokens are defined in `src/index.css` using Tailwind v4's `@theme` directive
- **Routing**: React Router v7 with `<BrowserRouter>`. All routes are defined in `App.jsx` under a shared `Layout` route
- **Auth state**: Accessed via the `useAuth()` hook from `src/context/AuthContext.jsx`. Never import the Supabase client directly for auth operations — always go through the context
- **Supabase client**: Initialized once in `src/lib/supabase.js` and imported where needed for database queries and storage operations
- **Environment variables**: All client-side env vars must be prefixed with `VITE_` (Vite requirement). Defined in `.env`, template in `.env.example`

## Adding a New Page

1. **Create the page component** in `src/pages/`:

   ```jsx
   // src/pages/MyPage.jsx
   export default function MyPage() {
     return (
       <div className="max-w-4xl mx-auto px-4 py-12">
         <h1 className="text-3xl font-bold text-primary mb-4">My Page</h1>
         {/* Page content */}
       </div>
     )
   }
   ```

2. **Add the route** in `src/App.jsx`:

   ```jsx
   import MyPage from './pages/MyPage'

   // Inside <Route element={<Layout />}>:
   <Route path="/my-page" element={<MyPage />} />

   // Or if it requires authentication:
   <Route
     path="/my-page"
     element={
       <ProtectedRoute>
         <MyPage />
       </ProtectedRoute>
     }
   />
   ```

3. **Add navigation links** in `src/components/Navbar.jsx` if the page should appear in the nav bar. Add it to the appropriate section — inside the `user ? (...)` block for authenticated-only links, or outside for public links.

4. **Document the page** in `docs/PAGES.md` following the existing format.

## Adding a New Shared Component

1. Create the component in `src/components/`:

   ```jsx
   // src/components/MyComponent.jsx
   export default function MyComponent({ title, children }) {
     return (
       <div className="bg-white rounded-xl border border-warm p-6">
         <h2 className="text-lg font-semibold text-primary">{title}</h2>
         {children}
       </div>
     )
   }
   ```

2. Import and use it in any page or other component.

## Design System Reference

### Color Tokens

Use these Tailwind classes consistently across all components:

| Class Pattern | Token | Hex | When to Use |
|---------------|-------|-----|-------------|
| `bg-background` | background | `#F0F0DB` | Page backgrounds |
| `bg-warm`, `border-warm` | warm | `#E1D9BC` | Card borders, input borders, secondary backgrounds |
| `bg-accent`, `text-accent` | accent | `#E0FBFC` | Highlights, hover states, badges |
| `bg-primary`, `text-primary` | primary | `#2B68A1` | Buttons, links, headings, navbar, footer |
| `bg-primary-dark` | primary-dark | `#1E4F7D` | Button hover states (`hover:bg-primary-dark`) |
| `bg-primary-light` | primary-light | `#3A7BB5` | Alternative primary variant |
| `text-text` | text | `#2D2D2D` | Body text (set on `<body>`, rarely needed explicitly) |
| `text-text-muted` | text-muted | `#6B6B6B` | Descriptions, secondary text |
| `text-error` | error | `#DC2626` | Error messages |
| `text-success` | success | `#16A34A` | Success messages |

### Common UI Patterns

**Card container**:
```html
<div className="bg-white rounded-xl shadow-sm border border-warm p-6">
```

**Form input**:
```html
<input className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors" />
```

**Primary button**:
```html
<button className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
```

**Error alert**:
```html
<div className="bg-red-50 border border-red-200 text-error rounded-lg px-4 py-3 text-sm">
```

**Success alert**:
```html
<div className="bg-green-50 border border-green-200 text-success rounded-lg px-4 py-3 text-sm">
```

**Placeholder badge**:
```html
<span className="inline-block bg-accent text-primary text-xs font-semibold px-3 py-1 rounded-full">
  Coming Soon
</span>
```

### Responsive Breakpoints

The app uses Tailwind's default breakpoints with mobile-first design:

| Prefix | Min Width | Usage in This App |
|--------|-----------|-------------------|
| (none) | 0px | Mobile default — single-column layouts, stacked elements |
| `sm:` | 640px | Two-column grids (name fields, feature cards), horizontal button groups |
| `md:` | 768px | Desktop navbar visible (hamburger menu hidden) |
| `lg:` | 1024px | Four-column feature grid on landing page |

## Known Issues

<!--
  Add known bugs and technical debt items here as they are discovered.
  Format: short description, affected file(s), and any workaround.
-->

*No known issues documented yet. Add entries here as they are discovered.*
