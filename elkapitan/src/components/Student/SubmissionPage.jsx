/**
 * SubmissionPage Component
 *
 * Responsibilities:
 *   - Lets the student pick multiple files
 *   - Zips them into a single .zip file in the browser using JSZip
 *   - Uploads the zip to Supabase Storage
 *   - Calls onSubmissionSuccess callback so StudentDashboard can update the assignment card
 *
 * Props received:
 *   user               — logged-in student object (we use user.id)
 *   selectedAssignment — assignment object (deployment_id, name, due_date, number, submitted)
 *   selectedCourse     — course object (course_id, course_name)
 *   onSubmissionSuccess — callback function from StudentDashboard, called after successful upload
 *                         IN: deployment_id  OUT: nothing, just triggers parent state update
 */

import React, { useState } from 'react';
import JSZip from 'jszip'; // npm install jszip — like Java's ZipOutputStream but for the browser
import { supabase } from '../../supabaseClient.js';
import { formatDueDate } from '../../utils.js';
import './StudentDashboard.css';

// Maps DB language value → allowed extensions + hint text shown to the student.

const LANGUAGE_CONFIG = {
    java:   { label: 'Java',   extensions: ['.java'] },
    cpp:    { label: 'C++',    extensions: ['.cpp', '.h', '.hpp', '.cc', '.cxx'] },
    python: { label: 'Python', extensions: ['.py'] },
};

// Returns config for the given language, or a safe fallback that allows any extension.
const getLanguageConfig = (language) =>
    LANGUAGE_CONFIG[language] ?? { label: language ?? 'any', extensions: [] };

// Returns true if the filename has one of the allowed extensions. Case-insensitive.
const hasAllowedExtension = (filename, extensions) => {
    if (extensions.length === 0) return true;
    const lower = filename.toLowerCase();
    return extensions.some(ext => lower.endsWith(ext));
};


export default function SubmissionPage({ user, selectedAssignment, selectedCourse, onSubmissionSuccess }) {

    // ── State ────────────────────────────────────────────────────────────────

    // Stores the array of File objects the student picked
    // IN:  set by the file picker onChange
    // OUT: passed into JSZip, displayed as a list below the drop zone
    // Like a List<File> in Java
    const [selectedFiles, setSelectedFiles] = useState([]);

    // Stores the names of files the student picked that had the wrong extension
    const [invalidFiles, setInvalidFiles] = useState([]);

    // Controls the submit button label and disabled state
    // 'idle'       = waiting for student to pick files
    // 'uploading'  = zip is being uploaded to Supabase Storage
    // 'saving'     = writing the row to submissions table
    // 'done'       = everything succeeded
    const [submitStatus, setSubmitStatus] = useState('idle');

    // Derived from the prop — not state, just computed fresh each render.
    const langConfig = getLanguageConfig(selectedAssignment.language);


    // ── Handlers ─────────────────────────────────────────────────────────────

    // Called when student picks files from the file picker
    // IN:  e.target.files — FileList object from the browser (like an array of File objects)
    // OUT: valid files stored in selectedFiles, invalid filenames stored in invalidFiles
    const handleFileChange = (e) => {

        // Array.from converts FileList (browser type) to a normal JS array
        // Like converting an Iterator to an ArrayList in Java
        const files = Array.from(e.target.files);

        // Split files into valid and invalid based on the assignment's required language
        // hasAllowedExtension checks the file extension against langConfig.extensions
        // e.g. for Java: ['.java'] — a file named 'Main.cpp' would fail this check
        const valid   = files.filter(f => hasAllowedExtension(f.name, langConfig.extensions));
        const invalid = files.filter(f => !hasAllowedExtension(f.name, langConfig.extensions));

        // Only valid files are stored — invalid files can never be submitted
        setSelectedFiles(valid);

        // Store just the filenames of invalid files so we can warn the student in the UI
        setInvalidFiles(invalid.map(f => f.name));
    };


    // Called when student clicks Submit
    // Zips files → uploads to Storage → upserts submissions row
    const handleSubmit = async () => {

        // Guard — do nothing if no files selected
        if (selectedFiles.length === 0) return;


        // ── Step 1: Zip all selected files in the browser ───────────────────
        // JSZip works like ZipOutputStream in Java
        // IN:  selectedFiles[] — array of File objects
        // OUT: zipBlob — a Blob (raw binary data, like byte[]) representing the zip
        setSubmitStatus('uploading');

        const zip = new JSZip();

        // Add each file into the zip
        // zip.file(name, content) = zipOutputStream.putNextEntry() in Java
        selectedFiles.forEach(file => {
            zip.file(file.name, file);
        });

        // generateAsync returns a Promise that resolves to a Blob
        // { type: 'blob' } means give it back as binary data, not base64
        const zipBlob = await zip.generateAsync({ type: 'blob' });


        // ── Step 2: Upload zip to Supabase Storage ───────────────────────────
        // Path: submissions/studentId/deploymentId/submission.zip
        // Using the same path every time = upsert: true will overwrite on resubmit
        const filePath = `${user.id}/${selectedAssignment.deployment_id}/submission.zip`;

        const { error: storageError } = await supabase.storage
            .from('submissions')
            .upload(filePath, zipBlob, {
                upsert: true,          // overwrite if student resubmits
                contentType: 'application/zip',
            });

        if (storageError) {
            alert('Upload failed: ' + storageError.message);
            setSubmitStatus('idle');
            return;
        }


        // ── Step 3: Upsert row in submissions table ──────────────────────────
        // upsert = INSERT if no row exists, UPDATE if row already exists
        // onConflict tells Supabase which columns define "already exists"
        // equivalent to: INSERT ... ON CONFLICT (student_id, deployment_id) DO UPDATE SET ...
        setSubmitStatus('saving');

        const { error: dbError } = await supabase
            .from('submissions')
            .upsert(
                {
                    student_id:      user.id,                          // real identity — stays in YOUR db
                    deployment_id:   selectedAssignment.deployment_id,
                    
                    file_path:       filePath,                         // path in Supabase Storage
                    submitted_at:    new Date().toISOString(),         // current timestamp
                    status:          'pending',                        // instructor hasn't reviewed yet
                    
                },
                { onConflict: 'student_id, deployment_id' } // update existing row on resubmit
            );

        if (dbError) {
            alert('Failed to save submission record: ' + dbError.message);
            setSubmitStatus('idle');
            return;
        }


        // ── Step 4: Notify parent and update UI ──────────────────────────────
        // Call the callback StudentDashboard passed down as a prop
        // This flips the assignment card from 'Not Submitted' to 'Submitted'
        // Like calling a listener.onComplete() in Java
        onSubmissionSuccess(selectedAssignment.deployment_id);

        setSelectedFiles([]);
        setInvalidFiles([]);   // clear the warnings on successful submit
        setSubmitStatus('done');
    };


    // ── Button label helper ──────────────────────────────────────────────────
    // Returns the right label based on current submitStatus
    // Like a switch statement mapping status → display string
    const buttonLabel = () => {
        if (submitStatus === 'uploading') return 'Uploading...';
        if (submitStatus === 'saving')    return 'Saving...';
        if (submitStatus === 'done')      return 'Submitted ✓';
        return 'Submit';
    };


    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <main className="student-body">

            {/* Assignment header — course, assignment name, due date */}
            <div className="submission-header">
                <p className="submission-assignment-number">Assignment {selectedAssignment.number}</p>

            </div>
 
            {/* Submission info block — course name, assignment name, due date */}
            <div className="submission-info">
                <div className="submission-info-row">
                    <span className="submission-info-label">Course</span>
                    <span className="submission-info-value">{selectedCourse.course_name}</span>
                </div>
                <div className="submission-info-row">
                    <span className="submission-info-label">Assignment</span>
                    <span className="submission-info-value">{selectedAssignment.name}</span>
                </div>
                <div className="submission-info-row">
                    <span className="submission-info-label">Due Date</span>
                    <span className="submission-info-value">{formatDueDate(selectedAssignment.due_date)}</span>
                </div>
                <div className="submission-info-row">
                    <span className="submission-info-label">Language</span>
                    <span className="submission-info-value">{langConfig.label}</span>
                </div>
            </div>


            {/* Drop zone — multiple={true} allows picking more than one file */}
            {/* The hidden file input covers the whole zone so anywhere you click opens the picker */}
            <div className="drop-zone">
                <input
                    type="file"
                    multiple={true}     // key difference from old version — allows multiple files
                    onChange={handleFileChange}
                />
                <div className="drop-zone-icon">📂</div>

                {/* Show list of selected files, or placeholder text if none picked yet */}
                {/* Valid files — green checkmark */}
                {selectedFiles.map((file, index) => (
                    <p key={index} className="drop-zone-text drop-zone-file-valid">✓ {file.name}</p>
                ))}

                {/* Invalid files — shown as red strikethrough so student knows what was rejected */}
                {invalidFiles.map((name, index) => (
                    <p key={`inv-${index}`} className="drop-zone-text drop-zone-file-invalid">✗ {name} — wrong file type</p>
                ))}

                {/* Placeholder — only shown when nothing has been picked at all */}
                {selectedFiles.length === 0 && invalidFiles.length === 0 && (
                    <p className="drop-zone-text">Drag & drop your files here, or click to browse</p>
                )}
            </div>

            {/* Only shown when every file the student picked was the wrong type */}
            {selectedFiles.length === 0 && invalidFiles.length > 0 && (
                <p className="language-error">
                    ⚠ No valid {langConfig.label} files selected. Please check your file extensions.
                </p>
            )}

            {/* Submit button */}
            {/* Disabled while uploading/saving OR if no files picked */}
            <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={selectedFiles.length === 0 || submitStatus === 'uploading' || submitStatus === 'saving'}
            >
                {buttonLabel()}
            </button>

            {/* Success banner — shown after successful submission */}
            {/* selectedAssignment.submitted covers the case where they already submitted before opening this page */}
            {(submitStatus === 'done' || selectedAssignment.submitted) && (
                <p className="status-submitted full">
                    ✓ Assignment submitted — waiting for instructor review
                </p>
            )}

        </main>
    );
}