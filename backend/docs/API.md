# API Reference

## Base URL

```
http://localhost:8080
```

## Endpoints

### POST /submit

Upload a student code submission for plagiarism analysis. The server stores the file, compares it against all existing submissions for the same assignment, and returns when processing is complete.

**Content-Type**: `multipart/form-data`

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | ZIP archive containing source code files (.java, .c, or .cpp) |
| `student` | long | Yes | Student user ID |
| `assignment` | long | Yes | Assignment run ID |
| `course` | string | Yes | Course identifier (used as the storage path prefix) |

#### Responses

| Status | Body | Condition |
|--------|------|-----------|
| 200 | `Upload complete (Supabase: {objectPath})` | Submission processed successfully |
| 400 | `No file uploaded` | File parameter is missing or empty |
| 500 | `Database error: {detail}` | PostgreSQL or database access failure |
| 502 | `Upload failed: {detail}` | Supabase Storage error or processing failure |

#### Example

```bash
curl -X POST http://localhost:8080/submit \
  -F "file=@submission.zip" \
  -F "student=12345" \
  -F "assignment=1" \
  -F "course=CS101"
```

#### Behavior Notes

- **Synchronous processing**: The response is not returned until all comparisons are complete. For assignments with many existing submissions, this can take significant time.
- **Language auto-detection**: The system detects the programming language from the first file's extension inside the ZIP. All files with the same extension are concatenated for analysis.
- **Duplicate handling**: If a submission already exists for the same student/assignment, the previous results are cleared and regenerated. The file in Supabase Storage is overwritten (upsert).
- **Top-K results**: Only the K most similar submission pairs are stored, where K is configured in the `assignment_runs.top_k` column.
- **Supported languages**: Java (`.java`), C (`.c`), C++ (`.cpp`). Submitting other file types will cause an error.

#### Testing Locally

HTML test forms are available in the `HTMLTEST/` directory:
- `localTest.html` — submits to `localhost:8080`
- `railwayTest.html` — submits to a Railway deployment URL
