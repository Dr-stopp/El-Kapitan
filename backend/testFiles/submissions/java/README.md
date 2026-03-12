# Java Submission Fixtures

This folder contains 7 Java assignment submission samples for testing the plagiarism/tokenization pipeline.

## Purpose
- Provide realistic student-style submissions.
- Include one intentional plagiarism pair for similarity-engine validation.
- Keep the rest reasonably distinct to test ranking/threshold behavior later.

## Files
- `Submission01.java` - iterative Fibonacci calculator.
- `Submission02.java` - grade-average calculator.
- `Submission03.java` - grade-average calculator (intentional near-duplicate of Submission02).
- `Submission04.java` - palindrome checker with punctuation handling.
- `Submission05.java` - word-frequency counter.
- `Submission06.java` - matrix transpose.
- `Submission07.java` - prime generator (sieve-style).

## Intentional Plagiarism Pair
- `Submission02.java` and `Submission03.java`

These two files implement the same algorithm and control-flow structure, with mainly variable/method/class renaming and minor wording changes.

## Notes for Test Use
- If your engine compares per-file submissions, treat each file as one student submission.
- Expected high similarity pair: `Submission02` <-> `Submission03`.
- Expected lower similarity for other pairings.
