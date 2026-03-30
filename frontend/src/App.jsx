import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Submit from './pages/Submit'
import InstructorDashboard from './instructor/InstructorDashboard'
import SubmissionComparePage from './instructor/SubmissionComparePage'
import SubmissionReportPage from './instructor/SubmissionReportPage'
import './instructor/instructor.css'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/submit" element={<Submit />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:submissionId"
          element={
            <ProtectedRoute>
              <SubmissionReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare/:submissionId"
          element={
            <ProtectedRoute>
              <SubmissionComparePage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
