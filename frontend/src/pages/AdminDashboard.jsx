import React from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { BrandMark } from "../components/Icons.jsx";

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="fullscreen">
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brandMark"><BrandMark /></div>
          <div style={{ fontWeight: 800 }}>Admin</div>
        </div>
        <div className="row" style={{ opacity: 0.9 }}>
          <div style={{ fontSize: 13 }}>Logged in as: <b>{user?.username}</b> (Admin)</div>
          <button className="pill" type="button" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Admin Dashboard (Demo)</h2>
          <p style={{ opacity: 0.8, maxWidth: 800 }}>
             admin page. specs need to be discussed .
          </p>
        </div>
      </div>
    </div>
  );
}
