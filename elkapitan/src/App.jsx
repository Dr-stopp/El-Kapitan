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

  // ── Shared nav bar ─────────────────────────────────────────────────────────
  // Used only for the fallback "coming soon" view (roles with no dashboard yet).
  // StudentDashboard renders its own full header, so Nav is NOT used there.
  const Nav = () => (
    <nav className="top-nav">
      <span>
        {user?.firstName} {user?.lastName}
      </span>
      <div className="nav-controls">
        <button onClick={toggleTheme} className="theme-btn">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );

  // ── Not logged in → show Login ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="app-wrapper">
        <nav className="top-nav">
          <button onClick={toggleTheme} className="theme-btn">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </nav>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // ── Student → StudentDashboard ─────────────────────────────────────────────
  if (user.role === 'student') {
    return (
      <div className="app-wrapper">
        {/*
          *** BUG FIXED (white page cause #2) ***
          Was: <StudentDashboard user={user} />
          StudentDashboard.jsx needs all four props to render its header.
          Without onLogout/onToggleTheme/theme the buttons threw errors.

          onLogout      → wires dashboard Logout button to handleLogout
          onToggleTheme → wires dashboard theme button to toggleTheme
          theme         → tells dashboard which icon (🌙 or ☀️) to show
        */}
        <StudentDashboard
          user={user}
          onLogout={handleLogout}
          onToggleTheme={toggleTheme}
          theme={theme}
        />
      </div>
    );
  }

  // ── Instructor (not built yet — uncomment when ready) ──────────────────────
  // if (user.role === 'instructor') {
  //   return (
  //     <div className="app-wrapper">
  //       <InstructorDashboard user={user} onLogout={handleLogout} />
  //     </div>
  //   );
  // }

  // ── Fallback for any unrecognised role ─────────────────────────────────────
  return (
    <div className="app-wrapper">
      <Nav />
      <main className="main-content">
        <h1>Dashboard coming soon</h1>
      </main>
    </div>
  );
}

export default App;