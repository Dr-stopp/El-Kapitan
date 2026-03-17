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

  // saving in localStorage so it doesn't reset on reload
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'light'
  );

  // Prevents the app from rendering anything until getSession() has finished.
  // Without this, there is a brief flash of the dashboard before the role
  // check in handleSignIn has a chance to reject and sign the user out.
  const [sessionChecked, setSessionChecked] = useState(false);

  // ── Side-effect: apply theme to <html> ────────────────────────────────────
  // Stamps data-theme="light|dark" on the root <html> element so the CSS
  // variables defined under [data-theme='dark'] in index.css activate globally.
  // Runs once on mount, then again whenever `theme` changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // ── Session Restore on Page Refresh ─────────────────────────────────────────
  // When the app first mounts, check if Supabase has a saved session in
  // localStorage (only exists if the user logged in with Remember Me checked).
  // If yes, restore the user state so they don't have to log in again.
  // If no session exists, user stays null and the Login screen shows.
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {

          if (session) {
              const { id, email, user_metadata } = session.user;
              setUser({
                  id,
                  email,
                  role:      user_metadata.role,
                  firstName: user_metadata.firstName,
                  lastName:  user_metadata.lastName,
              });
          }

          // Mark session check as done whether a session was found or not.
        // Nothing renders until this flips to true.
        setSessionChecked(true);

      });

  }, []); // [] = run once on mount only



  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * toggleTheme
   * Flips 'light' ↔ 'dark'.
   * Called by: the theme button in the Nav below,
   */
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
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

  // Don't render anything until we know if there is a saved session or not.
  // This prevents the dashboard from flashing before the role check can fire.
  if (!sessionChecked) return null;

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
      
      {/* Theme toggle — always visible regardless of login state             
          When logged out it floats on the login page, when logged in         
          it moves into the header above                                      */}
      {!user && (
          <button className="btn-theme btn-theme-floating" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
          </button>
      )}

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      {/* Conditionally render different views based on user state */}
      
      {!user && <Login onLogin={handleLogin} />}

      {user?.role === 'student' && (
          <StudentDashboard user={user} onLogout={handleLogout} />
      )}

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