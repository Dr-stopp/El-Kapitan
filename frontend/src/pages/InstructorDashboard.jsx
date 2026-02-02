import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  return {
    threshold: 70,
    repos: { current: true, previous: true, starter: false, custom: false }
  };
}

function saveSettings(s) {
  localStorage.setItem(LS_INSTRUCTOR_SETTINGS, JSON.stringify(s));
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function badge(sim, threshold) {
  if (sim >= threshold) return { cls: "red", text: "FLAG" };
  if (sim >= threshold - 10) return { cls: "yellow", text: "REVIEW" };
  return { cls: "green", text: "OK" };
}

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(loadSettings());
  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState("");

  const submissions = useMemo(() => {
    const all = loadSubmissions();
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      const matchesQuery =
        !q ||
        String(s.id).toLowerCase().includes(q) ||
        String(s.course).toLowerCase().includes(q) ||
        String(s.studentId).toLowerCase().includes(q);
      const matchesLang = !langFilter || s.lang === langFilter;
      return matchesQuery && matchesLang;
    });
  }, [query, langFilter]);

  const updateThreshold = (val) => {
    const next = { ...settings, threshold: val };
    setSettings(next);
    saveSettings(next);
  };

  const toggleRepo = (key) => {
    const next = { ...settings, repos: { ...settings.repos, [key]: !settings.repos[key] } };
    setSettings(next);
    saveSettings(next);
  };

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
            <div style={{ fontWeight: 800 }}>Verification Repositories</div>
            <div className="spacer" />
            <div style={{ opacity: 0.8, fontSize: 13 }}>(saved in browser)</div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <label><input type="checkbox" checked={settings.repos.current} onChange={() => toggleRepo("current")} /> Current offering submissions</label>
            <label><input type="checkbox" checked={settings.repos.previous} onChange={() => toggleRepo("previous")} /> Previous offerings</label>
            <label><input type="checkbox" checked={settings.repos.starter} onChange={() => toggleRepo("starter")} /> Provided repository: Starter code</label>
            <label><input type="checkbox" checked={settings.repos.custom} onChange={() => toggleRepo("custom")} /> Instructor-defined repository</label>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Flag Threshold: {settings.threshold}%</div>
            <input
              type="range"
              min="50"
              max="90"
              value={settings.threshold}
              onChange={(e) => updateThreshold(parseInt(e.target.value, 10))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.7 }}>
              <span>50%</span><span>90%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div style={{ fontWeight: 800 }}>Submissions</div>
            <div className="spacer" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID / course / student ID"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                width: 320,
                maxWidth: "100%"
              }}
            />
            <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10 }}>
              <option value="">All languages</option>
              <option value="C">C</option>
              <option value="C++">C++</option>
              <option value="Java">Java</option>
            </select>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Submission</th>
                <th>Course</th>
                <th>Language</th>
                <th>Submitted</th>
                <th>Top Similarity</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ opacity: 0.75 }}>
                    No submissions yet. Log in as Student and submit at least one.
                  </td>
                </tr>
              ) : (
                submissions.map((s) => {
                  const b = badge(s.topSimilarity ?? 0, settings.threshold);
                  return (
                    <tr key={s.id}>
                      <td><b>{s.id}</b><div style={{ opacity: 0.7 }}>{s.studentId}</div></td>
                      <td>{s.course}</td>
                      <td>{s.lang}</td>
                      <td style={{ opacity: 0.85 }}>{formatDate(s.createdAt)}</td>
                      <td><b>{s.topSimilarity}%</b></td>
                      <td><span className={"badge " + b.cls}>{b.text}</span></td>
                      <td><Link to={`/report/${encodeURIComponent(s.id)}`} style={{ color: "#ffd86b" }}>View report</Link></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
            demo only.
          </div>
        </div>
      </div>
    </div>
  );
}
