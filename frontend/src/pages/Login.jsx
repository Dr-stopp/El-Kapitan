import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { BrandMark, DocumentLogo } from "../components/Icons.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const from =
    location.state?.from ||
    (role === "student" ? "/student/submit" : role === "instructor" ? "/instructor" : "/admin");
  const submit = (e) => {
  e.preventDefault();

  login({ role, username });

  const next =
    role === "student"
      ? "/student/submit"
      : role === "instructor"
      ? "/instructor"
      : "/admin";

  nav(next, { replace: true });
};

  

  return (
    <div className="fullscreen">
      <div className="topbar">
        <div className="brandMark" title="EL Kapitan">
          <BrandMark />
        </div>
      </div>

      <div className="loginGrid">
        <div className="loginLeft">
          <div className="bigLogo" aria-hidden="true">
            <DocumentLogo />
          </div>
          <div className="titleBig">EL Kapitan</div>
        </div>

        <div className="loginRight">
          <div className="hrLine" />
          <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 14, opacity: 0.9 }}>Log In As</div>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="field" style={{ paddingLeft: 0 }}>
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="field" style={{ paddingLeft: 0 }}>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <button className="smallButton" type="submit">Log In</button>
          </form>
          <div className="hrLine" style={{ marginTop: 22 }} />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            in progress
          </div>
        </div>
      </div>
    </div>
  );
}
