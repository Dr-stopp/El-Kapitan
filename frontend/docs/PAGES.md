# Pages Reference

## Route Overview

| Route | Page | Auth Required | Status |
|-------|------|---------------|--------|
| `/` | Landing | No | Complete |
| `/login` | Login | No | Complete |
| `/signup` | Signup | No | Complete |
| `/submit` | Submit | No | Complete |
| `/dashboard` | Instructor Dashboard | Yes | Complete |
| `/courses` | *(redirects to `/dashboard`)* | Yes | Redirect |
| `/compare` | *(redirects to `/dashboard`)* | Yes | Redirect |
| `/report/:submissionId` | Submission Report | Yes | Complete |
| `/compare/:submissionId` | Submission Compare | Yes | Complete |

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

## Instructor Dashboard (`/dashboard`)

**File**: `src/instructor/InstructorDashboard.jsx`
**Styles**: `src/instructor/instructor.css`
**Data layer**: `src/instructor/api.js`

The main instructor workspace. Requires authentication. Contains three tabs: Assignments, Review Queue, and Analytics.

### Assignments Tab

Displays all assignments for the selected course. Each assignment is rendered as a card with:

- Assignment name, due date, language, and detection settings (top K, threshold)
- Action buttons: **Edit**, **Upload Repo**, **Export**, **Delete**

**Course management**:
- Create/delete courses from the sidebar course list
- Select a course to view its assignments
- Create new assignments with language, due date, top K, and threshold settings

**Export button**: Generates and downloads a zip file containing all student submissions, plagiarism results, and a summary CSV for the assignment. See [ARCHITECTURE.md](ARCHITECTURE.md#assignment-export-feature) for full details on the zip structure and implementation.

| Button | Action | Loading State |
|--------|--------|---------------|
| Edit | Opens inline edit form for the assignment | — |
| Upload Repo | Opens upload form for repository submission | `uploadLoading` |
| Export | Downloads zip of all submissions + results | `exportingAssignmentId` (per-assignment) |
| Delete | Deletes the assignment run after confirmation | — |

### Review Queue Tab

**Component**: `src/instructor/ReviewQueuePanel.jsx`

Displays all submissions across the selected course with similarity scores, review status, and filtering. Includes a **JSON export** of the filtered queue data (separate from the assignment zip export).

### Analytics Tab

**Component**: `src/instructor/AnalyticsPanel.jsx`

Displays course-level analytics: submission counts, average similarity scores, and score distribution.

---

### Submission Report (`/report/:submissionId`)

**File**: `src/instructor/SubmissionReportPage.jsx`

Displays detailed plagiarism report for a single submission, including similarity scores against all compared submissions.

---

### Submission Compare (`/compare/:submissionId`)

**File**: `src/instructor/SubmissionComparePage.jsx`

Side-by-side code comparison view between two submissions, with highlighted matching line ranges from the plagiarism detection results.

---

## Redirected Routes

The following routes exist for backwards compatibility but redirect to the instructor dashboard:

- `/courses` → `/dashboard`
- `/compare` → `/dashboard`
