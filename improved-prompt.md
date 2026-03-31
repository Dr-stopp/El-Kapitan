# Task: Build a New Export/Download Feature for Assignments

## Before you start building, investigate the following:

1. **Find the existing export feature.** Search the frontend codebase for any existing export, download, or zip functionality (look for keywords like `export`, `download`, `zip`, `blob`, `saveAs`, `JSZip`). Tell me where it lives and what it currently does. **Do not modify or remove it** — we're building a separate, new feature.

2. **Check the database schema and backend for "previous offerings" or "base submissions."** Look in the Supabase schema, database types, and backend routes for any concept of past semester submissions, previous offerings, or pre-uploaded/baseline submissions tied to a course or assignment. Tell me what you find — whether it exists or not.

3. **Identify where assignments are listed in the instructor-facing pages** (dashboard, courses page, etc.). Tell me which component renders the assignment list so we know where to add the new button.

Report your findings before writing any code. Wait for my confirmation to proceed.

---

## What to build (after investigation):

Add a **download/export button next to each assignment** in the instructor's assignment list. When clicked, it should generate and download a **single zip file** containing:

- **All student submissions** for that assignment (the uploaded files)
- **Each student's plagiarism/similarity result**
- **If previous offerings or base submissions exist:** include those in the zip as well, organized separately

### Zip file structure should be clean and easy for an instructor to navigate. Suggested approach (adjust if you find something better):

```
Assignment_Name.zip
├── submissions/
│   ├── LastName_FirstName/
│   │   ├── submitted_file.pdf
│   │   └── plagiarism_result.txt (or .json — include similarity score and any relevant details)
│   ├── LastName_FirstName/
│   │   ├── ...
│   └── ...
├── previous_offerings/  (only if this data exists in the system)
│   ├── ...
└── summary.csv  (one row per student: name, file name, similarity score, timestamp)
```

### Requirements:
- Do NOT touch the existing export functionality — this is a new, separate feature
- The button should be visually clear and placed next to each assignment (use the project's existing color scheme and component style)
- Show a loading indicator while the zip is being generated
- Handle edge cases: no submissions yet, missing plagiarism results, large files
- Use whatever zip library is already in the project, or add JSZip if none exists
