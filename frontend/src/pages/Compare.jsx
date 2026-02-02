import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { BrandMark } from "../components/Icons.jsx";

function demoCodeA() {
  return [
    "int main() {",
    "  int n = 10;",
    "  int sum = 0;",
    "  for (int i=0; i<n; i++) {",
    "    sum += i;",
    "  }",
    "  printf(\"%d\", sum);",
    "  return 0;",
    "}"
  ];
}

function demoCodeB() {
  return [
    "int main(){",
    "  int N = 10;",
    "  int total = 0;",
    "  for (int k=0; k<N; k++){",
    "    total = total + k;",
    "  }",
    "  printf(\"%d\", total);",
    "}"
  ];
}

export default function Compare() {
  const { user, logout } = useAuth();
  const { a, b } = useParams();

  const left = useMemo(() => demoCodeA(), []);
  const right = useMemo(() => demoCodeB(), []);

  const highlightLeft = new Set([3,4,5]);
  const highlightRight = new Set([3,4,5]);

  const lineStyle = (isHi) => ({
    padding: "2px 8px",
    background: isHi ? "rgba(255,200,60,0.18)" : "transparent",
    borderLeft: isHi ? "3px solid rgba(255,200,60,0.8)" : "3px solid transparent",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    whiteSpace: "pre"
  });

  return (
    <div className="fullscreen">
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brandMark"><BrandMark /></div>
          <div style={{ fontWeight: 800 }}>Instructor • Compare</div>
        </div>
        <div className="row" style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 13 }}>Logged in as: <b>{user?.username}</b> (Instructor)</div>
          <button className="pill" type="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="container" style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 900 }}>Comparing</div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            <div><b>A:</b> {a}</div>
            <div><b>B:</b> {b}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/instructor" style={{ color: "#ffd86b" }}>← Back to dashboard</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Sample A</div>
            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              {left.map((ln, idx) => (
                <div key={idx} style={lineStyle(highlightLeft.has(idx))}>
                  <span style={{ opacity: 0.5, display: "inline-block", width: 22 }}>{idx+1}</span>{ln}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Sample B</div>
            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              {right.map((ln, idx) => (
                <div key={idx} style={lineStyle(highlightRight.has(idx))}>
                  <span style={{ opacity: 0.5, display: "inline-block", width: 22 }}>{idx+1}</span>{ln}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ opacity: 0.8 }}>
          no engine.
        </div>
      </div>
    </div>
  );
}
