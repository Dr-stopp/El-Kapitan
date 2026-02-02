import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import StudentSubmit from "./pages/StudentSubmit.jsx";
import InstructorDashboard from "./pages/InstructorDashboard.jsx";
import Report from "./pages/Report.jsx";
import Compare from "./pages/Compare.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/student/submit"
        element={
          <ProtectedRoute allowRoles={["student"]}>
            <StudentSubmit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/instructor"
        element={
          <ProtectedRoute allowRoles={["instructor"]}>
            <InstructorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/report/:submissionId"
        element={
          <ProtectedRoute allowRoles={["instructor"]}>
            <Report />
          </ProtectedRoute>
        }
      />

      <Route
        path="/compare/:a/:b"
        element={
          <ProtectedRoute allowRoles={["instructor"]}>
            <Compare />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
