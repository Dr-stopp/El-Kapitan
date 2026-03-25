# Improved Claude Code Prompt

## Project Overview

Build the frontend for a plagiarism detection web application (similar to Turnitin). The system has two user types:

- **Instructors** — authenticated users who manage courses, assignments, and review submissions.
- **Students** — unauthenticated users who submit work via a public submission page (no student accounts exist).

The frontend should connect to the existing backend located at backend folder. 

---

## Tech Stack

- **Frontend framework:** React
- **Styling:** Tailwind CSS
- **Database/Auth:** Supabase (already set up)
  - Auth: Supabase Auth with email/password for instructors
  - Database: See /schema.txt. Note that the results sections tables are irrelevent because the backend will be changed. 
  - File storage: Supabase's built-in file storage system.
- **Project location:** make /frontend directory in the existing repo

---

## Design System

Use the following color palette consistently across all pages:

| Role              | Hex Code  | Usage Example                        |
|-------------------|-----------|--------------------------------------|
| Background/Light  | `#F0F0DB` | Page backgrounds, card backgrounds   |
| Warm Neutral      | `#E1D9BC` | Secondary backgrounds, borders       |
| Cool Accent       | `#E0FBFC` | Highlights, hover states, badges     |
| Primary Blue      | `#2B68A1` | Buttons, links, headings, nav bar    |

Typography, spacing, and overall look should feel clean and professional — similar to an academic/institutional tool.

---

## Pages to Build (Fully Functional)

### 1. Landing/Welcome Page (`/`)
- Professional hero section explaining the platform (plagiarism detection + assignment submission)
- Clear navigation to the submission page and instructor login
- Brief feature overview (3–4 bullet points or cards)
- Footer with placeholder links

### 2. Instructor Signup & Login (`/login`, `/signup`)
- Use Supabase Auth (email + password)
- Signup form: first name, last name, email, password
- Login form: email, password
- Redirect to instructor dashboard on success
- Show validation errors inline

### 3. Student Submission Page (`/submit`)
- This page is publicly accessible (no auth required)
- Form fields:
  - **Assignment Key** (text input) — a unique code the instructor generates and shares with students
  - **First Name** (text input)
  - **Last Name** (text input)
  - **File Upload** — drag-and-drop zone OR file picker. Accepted types: .zip, .c, .cpp, .java files
- On submit:
  - Validate that the assignment key exists 
  - Upload the file to Supabase Storage bucket 
  - Show a success/error message after submission
- If the assignment key is invalid, display an error before uploading

---

## Pages to Scaffold (Placeholder Only)

For each of these, create the route with a placeholder page component that includes:
- The page title
- A brief description of what the page will do
- A "Coming Soon" or "Under Construction" notice
- Consistent navigation/layout matching the rest of the site

### 4. Instructor Dashboard (`/dashboard`)
> Will show: recent submissions, course overview, quick stats

### 5. Courses & Assignments Page (`/courses`)
> Will show: list of courses, ability to create courses and assignments, generate assignment keys

### 6. Comparison/Results Page (`/compare`)
> Will show: plagiarism comparison results between submissions, similarity scores

---

## Additional Requirements

- All pages should share a consistent layout (navbar, footer, color scheme)
- Navbar should show different links based on auth state (logged in vs. not)
- Use responsive design — should look acceptable on mobile
- Keep components modular and reusable where possible
- [OPTIONAL: Include a protected route wrapper so `/dashboard`, `/courses`, and `/compare` redirect to `/login` if not authenticated]
