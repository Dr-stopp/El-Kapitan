import React, { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import Dropzone from "../components/Dropzone.jsx";
import { BrandMark, IconChevronDown, IconCode, IconCourse, IconId, IconUser } from "../components/Icons.jsx";

const COURSE_CODES = ["COsc 3p011", "Cosc 3p02", "Cosc 3p03", "ITSC110", "ITSA210", "Other"];
const LANGS = ["C", "C++", "Java"];
const LS_SUBMISSIONS = "elk_submissions_v1";

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(LS_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSubmissions(list) {
  localStorage.setItem(LS_SUBMISSIONS, JSON.stringify(list));
}

function makeId() {
  return "SUB-" + Math.floor(1000 + Math.random() * 9000);
}

export default function StudentSubmit() {
  const { user, logout } = useAuth();
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [lang, setLang] = useState("");
  const [files, setFiles] = useState([]);
  const [cert, setCert] = useState(false);
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => {
    return fullName.trim() && studentId.trim() && course && lang && files.length > 0 && cert;
  }, [fullName, studentId, course, lang, files, cert]);

  const onSubmit = (e) => {
    e.preventDefault();

    const submission = {
      id: makeId(),
      fullName,
      studentId,
      course,
      lang,
      files: files.map((f) => ({ name: f.name, size: f.size })),
      createdAt: new Date().toISOString(),
      topSimilarity: Math.floor(30 + Math.random() * 65)
    };

    const list = loadSubmissions();
    list.unshift(submission);
    saveSubmissions(list);

    setStatus(`Submission received (demo). Submission ID: ${submission.id}`);
  };

  return (
    <div className="fullscreen">
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brandMark"><BrandMark /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: 0.9 }}>
          <div style={{ fontSize: 13 }}>Logged in as: <b>{user?.username}</b> (Student)</div>
          <button className="pill" type="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="container">
        <form onSubmit={onSubmit}>
          <div className="fieldRow">
            <div className="field">
              <div className="iconLeft"><IconUser /></div>
              <label>Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="field">
              <div className="iconLeft"><IconId /></div>
              <label>Student ID</label>
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>

            <div className="field">
              <div className="iconLeft"><IconCourse /></div>
              <label>Course Code</label>
              <select value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="" disabled>Select…</option>
                {COURSE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="chev"><IconChevronDown /></div>
            </div>

            <div className="field">
              <div className="iconLeft"><IconCode /></div>
              <label>Programming Language</label>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="" disabled>Select…</option>
                {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <div className="chev"><IconChevronDown /></div>
            </div>
          </div>

          <div className="sectionTitle">Upload Source Code</div>
          <Dropzone onFiles={setFiles} />

          {files.length > 0 && (
            <div className="filesList">
              {files.map((f) => (
                <div key={f.name}>
                  • {f.name} <span style={{ opacity: 0.7 }}>({Math.round(f.size / 1024)} KB)</span>
                </div>
              ))}
            </div>
          )}

          <div className="actions">
            <label className="certRow">
              <input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} />
              <span>
                I certify that this assignment is my own work and has been developed in accordance with the{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>University Academic Integrity Regulations</a>.
              </span>
            </label>

            <button className="bigButton" disabled={!canSubmit} type="submit">
              SUBMIT
            </button>

            {status && (
              <div className="card" style={{ maxWidth: 760, width: "100%" }}>
                {status}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
