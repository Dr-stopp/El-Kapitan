import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { BrandMark } from "../components/Icons.jsx";

const LS_SUBMISSIONS = "elk_submissions_v1";
const LS_INSTRUCTOR_SETTINGS = "elk_instructor_settings_v1";

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(LS_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_INSTRUCTOR_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { threshold: 70, repos: { current: true, previous: true, starter: false, custom: false } };
}

function formatSize(bytes) {
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return kb + " KB";
  return (kb / 1024).toFixed(1) + " MB";
}

function pickTopMatches(subId, baseSim) {
  const seed = String(subId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (n) => (seed * (n + 3) * 1103515245 + 12345) % 1000;

  const mk = (label, extra) => {
    const sim = Math.max(15, Math.min(99, baseSim - extra + (r(extra) % 8)));
    return { label, sim };
  };

  return [
    mk("Submission SUB-3412", 8),
    mk("Submission SUB-8871", 14),
    mk("Repository: Previous offering (Fall)", 18),
    mk("Repository: Starter code", 22),
  ].sort((a, b) => b.sim - a.sim).slice(0, 3);
}

export default function Report() {
  const { user, logout } = useAuth();
  const { submissionId } = useParams();

  const settings = useMemo(() => loadSettings(), []);
  const submission = useMemo(() => {
    const all = loadSubmissions();
    return all.find((s) => String(s.id) === String(submissionId));
  }, [submissionId]);

  if (!submission) {
    return (
      <div className="fullscreen">
        <div className="topbar" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brandMark"><BrandMark /></div>
            <div style={{ fontWeight: 800 }}>Instructor</div>
          </div>
          <button className="pill" type="button" onClick={logout}>Logout</button>
        </div>
        <div className="container">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Report not found</h2>
            <p style={{ opacity: 0.8 }}>No submission with ID: {submissionId}</p>
            <Link to="/instructor" style={{ color: "#ffd86b" }}>Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const topMatches = pickTopMatches(submission.id, submission.topSimilarity ?? 0);
  const isFlag = (submission.topSimilarity ?? 0) >= (settings.threshold ?? 70);

  return (
    <div className="fullscreen">
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brandMark"><BrandMark /></div>
          <div style={{ fontWeight: 800 }}>Instructor</div>
        </div>
        <div className="row" style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 13 }}>Logged in as: <b>{user?.username}</b> (Instructor)</div>
          <button className="pill" type="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="container" style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div className="row">
            <div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Submission</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{submission.id}</div>
            </div>
            <div className="spacer" />
            <span className={"badge " + (isFlag ? "red" : "green")}>
              {isFlag ? "FLAGGED" : "OK"}
            </span>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 6, opacity: 0.85 }}>
            <div><b>Course:</b> {submission.course}</div>
            <div><b>Language:</b> {submission.lang}</div>
            <div><b>Top similarity:</b> {submission.topSimilarity}% (threshold {settings.threshold}%)</div>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Demo only.
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Checked Against</div>
          <div style={{ display: "grid", gap: 8, opacity: 0.9 }}>
            {settings.repos?.current && <div>✓ Current offering submissions</div>}
            {settings.repos?.previous && <div>✓ Previous offerings</div>}
            {settings.repos?.starter && <div>✓ Provided repository: Starter code</div>}
            {settings.repos?.custom && <div>✓ Instructor-defined repository</div>}
            {!settings.repos?.current && !settings.repos?.previous && !settings.repos?.starter && !settings.repos?.custom && (
              <div style={{ opacity: 0.8 }}>No repositories selected.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Top Matches</div>
          <table className="table">
            <thead>
              <tr>
                <th>Match Source</th>
                <th>Similarity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topMatches.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td><b>{m.sim}%</b></td>
                  <td>
                    <Link to={`/compare/${encodeURIComponent(submission.id)}/${encodeURIComponent(m.label.replace(/\s+/g, "-"))}`} style={{ color: "#ffd86b" }}>
                      Compare
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10 }}>
            <Link to="/instructor" style={{ color: "#ffd86b" }}>← Back to dashboard</Link>
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Files</div>
          <div style={{ display: "grid", gap: 6, opacity: 0.9 }}>
            {(submission.files || []).map((f) => (
              <div key={f.name}>• {f.name} <span style={{ opacity: 0.7 }}>({formatSize(f.size)})</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
