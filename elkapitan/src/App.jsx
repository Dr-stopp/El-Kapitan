/** 
 * Root component. Owns two pieces of global state:
 *   1. `user`  — null when logged out, user object when logged in
 *   2. `theme` — 'light' | 'dark'
 *
 * Decides which view to render based on user.role.
 *
 * Called by: router.jsx (rendered inside <RouterProvider>)
 * Renders:   Login            (when user is null)
 *            StudentDashboard (when user.role === 'student')
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import StudentDashboard from './components/Student/StudentDashboard';
import InstructorDashboard from './components/Instructor/InstructorDashboard';
import './App.css';
import { supabase } from './supabaseClient';

function App() {

  const [user, setUser]   = useState(null);
  const [theme, setTheme] = useState('light');

  // ── Side-effect: apply theme to <html> ────────────────────────────────────
  // Stamps data-theme="light|dark" on the root <html> element so the CSS
  // variables defined under [data-theme='dark'] in index.css activate globally.
  // Runs once on mount, then again whenever `theme` changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // When the app first mounts, ask Supabase "is there already a logged-in
  // session stored in this browser?" (it keeps one in localStorage).
  // If yes, pull the user out and set state — the dashboard appears
  // immediately without needing to log in again.
  useEffect(() => {

      // getSession() is async — it checks localStorage for a saved token
      // and validates it against Supabase.
      supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
              // session.user has the same shape as signIn's data.user
              const { id, email, user_metadata } = session.user;
              setUser({
                  id,
                  email,
                  role:      user_metadata.role,
                  firstName: user_metadata.firstName,
                  lastName:  user_metadata.lastName,
              });
          }
          // If session is null, user stays null → Login screen shows
      });

      // onAuthStateChange fires whenever Supabase detects a login or logout —
      // including when the session token expires or is revoked remotely.
      // This keeps your app in sync automatically.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
              if (session) {
                  const { id, email, user_metadata } = session.user;
                  setUser({ id, email,
                      role:      user_metadata.role,
                      firstName: user_metadata.firstName,
                      lastName:  user_metadata.lastName,
                  });
              } else {
                  // session is null = user logged out or token expired
                  setUser(null);
              }
          }
      );

      // Cleanup: unsubscribe when App unmounts (prevents memory leaks)
      return () => subscription.unsubscribe();

  }, []); // [] = run once on mount only



   // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * toggleTheme
   * Flips 'light' ↔ 'dark'.
   * Called by: the theme button in the Nav below,
   *            AND passed as `onToggleTheme` to StudentDashboard so its
   *            own header button works.
   */
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  /**
   * handleLogin
   * Called by: Login.jsx via the `onLogin` prop after mockAuth.signIn succeeds.
   * Receives: { id, email, role, firstName, lastName }
   * Setting `user` triggers a re-render → App routes to the correct dashboard.
   */
  const handleLogin = (userData) => setUser(userData);

  //clears Supabase session first, then clears React state
  const handleLogout = async () => {
      await supabase.auth.signOut(); // deletes the token from localStorage
      setUser(null);                  // clears the user from React state
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  // Instead of separate return statements for each case, we render ONE structure
  // with a global header that appears for everyone, then conditionally show
  // the appropriate content below based on login state and role.
  
  return (
    <div className="app-wrapper">
      
      {/* ── GLOBAL HEADER ──────────────────────────────────────────────────── */}
      {/* This header only appears when the user is logged in */}
      {/* Shows: logo, brand, user name, theme toggle, and logout */}
      {user && (
        <header className="top-nav">
          
          {/* Left side - logo and brand */}
          <div className="header-left">
            <img src="/perseverance.svg" alt="Logo" className="header-logo" />
            <span className="header-brand">EL Kapitan</span>
          </div>
          
          {/* Right side - user controls */}
          <div className="header-right">
            
            {/* User's full name */}
            <span className="landing-greeting">
              {user.firstName} {user.lastName}
            </span>
            
            {/* Theme toggle */}
            <button className="btn-theme" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            
            {/* Logout button */}
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
            
          </div>
        </header>
      )}

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      {/* Conditionally render different views based on user state */}
      
      {/* Not logged in → show Login */}
      {!user && <Login onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />}
      
      {/* Logged in as student → show StudentDashboard */}
      {user?.role === 'student' && (
        <StudentDashboard user={user} onLogout={handleLogout} />
      )}
      
      {/* Logged in as instructor → show InstructorDashboard */}
      {user?.role === 'instructor' && (
        <InstructorDashboard user={user} onLogout={handleLogout} />
      )}
      
      {/* Logged in but unrecognized role → show fallback */}
      {user && user.role !== 'student' && user.role !== 'instructor' && (
        <main className="main-content">
          <h1>Dashboard coming soon</h1>
        </main>
      )}
      
    </div>
  );
}

export default App;