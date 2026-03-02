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

function App() {

  // ── Auth state ─────────────────────────────────────────────────────────────
  // `user` is null when no one is logged in.
  // Shape when populated: { id, email, role, firstName, lastName }
  // Set by handleLogin (called from Login.jsx via the onLogin prop).
  // Cleared by handleLogout.
  //
  // *** BUG FIXED (white page cause #1) ***
  // Was: const [isLoggedIn, setIsLoggedIn] = useState(false)
  // Every reference to `user` and `setUser` below threw ReferenceError on
  // the very first render. React caught the crash and rendered nothing → white page.
  const [user, setUser] = useState(null);

  // ── Theme state ────────────────────────────────────────────────────────────
  // 'light' | 'dark'. Toggled by the 🌙/☀️ button anywhere in the app.
  const [theme, setTheme] = useState('light');

  // ── Side-effect: apply theme to <html> ────────────────────────────────────
  // Stamps data-theme="light|dark" on the root <html> element so the CSS
  // variables defined under [data-theme='dark'] in index.css activate globally.
  // Runs once on mount, then again whenever `theme` changes.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  /**
   * handleLogout
   * Called by: the Logout button in Nav below,
   *            AND passed as `onLogout` to StudentDashboard.
   * Clears `user` → re-render → Login screen is shown.
   */
  const handleLogout = () => setUser(null);

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