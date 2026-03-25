# Pages Reference

## Route Overview

| Route | Page | Auth Required | Status |
|-------|------|---------------|--------|
| `/` | Landing | No | Complete |
| `/login` | Login | No | Complete |
| `/signup` | Signup | No | Complete |
| `/submit` | Submit | No | Complete |
| `/dashboard` | Dashboard | Yes | Placeholder |
| `/courses` | Courses | Yes | Placeholder |
| `/compare` | Compare | Yes | Placeholder |

Protected routes redirect to `/login` if the user is not authenticated.

---

## Complete Pages

### Landing (`/`)

**File**: `src/pages/Landing.jsx`

The public home page for the platform. Contains three sections:

1. **Hero section** — Full-width `bg-primary` banner with the platform tagline ("Code Plagiarism Detection Made Simple") and two call-to-action buttons:
   - "Submit Work" → links to `/submit`
   - "Instructor Login" → links to `/login`

2. **Feature cards** — Four-column responsive grid (collapses to 2 columns on `sm:`, 1 on mobile) with white card containers. Each card has an SVG icon, title, and description. Features listed:
   - Smart Plagiarism Detection
   - Easy Student Submissions
   - Multi-Language Support
   - Instructor Dashboard

3. **CTA section** — `bg-warm` banner encouraging instructors to create an account. Links to `/signup`.

---

### Login (`/login`)

**File**: `src/pages/Login.jsx`

Instructor login form using Supabase Auth. Centered card layout with `max-w-md` width.

**Form fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | `email` | Yes | HTML5 email validation |
| Password | `password` | Yes | Required |

**Behavior**:
- Calls `signIn(email, password)` from `useAuth()` on submit
- On success: redirects to `/dashboard` via `useNavigate()`
- On error: displays the Supabase error message in a red inline alert
- Loading state: button text changes to "Signing in..." and is disabled during the request
- Footer link: "Don't have an account? Sign up" → links to `/signup`

---

### Signup (`/signup`)

**File**: `src/pages/Signup.jsx`

Instructor registration form using Supabase Auth. Centered card layout matching the login page.

**Form fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | `text` | Yes | Required |
| Last Name | `text` | Yes | Required |
| Email | `email` | Yes | HTML5 email validation |
| Password | `password` | Yes | Minimum 6 characters (client-side check) |

**Behavior**:
- Calls `signUp(email, password, firstName, lastName)` from `useAuth()` on submit
- First and last name are stored in Supabase Auth `user_metadata` as `first_name` and `last_name`
- Client-side validation: checks password length ≥ 6 before calling the API
- On success: redirects to `/dashboard`
- On error: displays the Supabase error message inline
- Footer link: "Already have an account? Sign in" → links to `/login`

---

### Submit (`/submit`)

**File**: `src/pages/Submit.jsx`

Public student submission page. No authentication required. Uses the Supabase client directly for assignment key validation and file upload.

**Form fields**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Assignment Key | `text` | Yes | Must match an existing `assignment_run_id` in the database |
| First Name | `text` | Yes | Required |
| Last Name | `text` | Yes | Required |
| File Upload | `file` | Yes | Accepted extensions: `.zip`, `.c`, `.cpp`, `.java` |

**File upload zone**:
- Supports drag-and-drop and click-to-browse via a hidden `<input type="file">`
- Visual states:
  - Default: dashed `border-warm` border, upload icon, "Drag & drop your file here"
  - Drag active: `border-primary` with `bg-accent/30` background
  - File selected: `border-success` with green background, checkmark icon, filename displayed
- File type validation runs both on file selection and on form submit
- Accepted MIME types set via `accept=".zip,.c,.cpp,.java"` on the input

**Submission flow**:

1. All fields validated client-side (HTML5 required + file type check)
2. Assignment key validated: `supabase.from('assignment_runs').select(...).eq('assignment_run_id', key).single()`
   - If no matching row or error → "Invalid assignment key" error shown, upload skipped
3. Storage path built: `submissions/{assignmentKey}/{firstName}_{lastName}_{timestamp}_{sanitizedFilename}`
4. File uploaded: `supabase.storage.from('Submissions').upload(path, file)`
   - On upload error → "File upload failed" error shown
5. On success: green success message shown, all form fields reset
6. On any unhandled exception: generic error message shown

---

## Placeholder Pages

All placeholder pages follow the same template: a "Coming Soon" badge (`bg-accent` rounded pill), the page title, a description of planned functionality, and three preview cards showing planned features. All three require instructor authentication — unauthenticated visitors are redirected to `/login` by `ProtectedRoute`.

### Dashboard (`/dashboard`)

**File**: `src/pages/Dashboard.jsx`

Will display: recent submissions, course overview, quick stats.

**Preview cards**: Recent Submissions, Course Overview, Quick Stats

---

### Courses (`/courses`)

**File**: `src/pages/Courses.jsx`

Will display: list of courses, ability to create courses and assignments, generate assignment keys.

**Preview cards**: Manage Courses, Create Assignments, Generate Keys

---

### Compare (`/compare`)

**File**: `src/pages/Compare.jsx`

Will display: plagiarism comparison results between submissions, similarity scores, side-by-side code view.

**Preview cards**: Similarity Scores, Side-by-Side View, Detailed Reports
