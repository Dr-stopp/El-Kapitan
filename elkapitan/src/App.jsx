import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import React, { useState, useEffect } from 'react';
import Login from './Login';
import './App.css'

function App() {
  // 1. State for Authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 2. State for Theme (Default to light)
  const [theme, setTheme] = useState('light');

  // 3. Effect to apply the theme to the <html> tag
  // This allows the CSS variables in index.css to work globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  // --- VIEW LOGIC ---

  // If not logged in, show the Login page with a theme toggle
  if (!isLoggedIn) {
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

  // If logged in, show the Dashboard content
  return (
    <div className="dashboard-container">
      <nav className="top-nav">
        <span>Project Dashboard</span>
        <div className="nav-controls">
          <button onClick={toggleTheme} className="theme-btn">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <main className="main-content">
        <h1>Welcome Back!</h1>
        <p>You are successfully logged in using <strong>Source Sans 3</strong>.</p>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Status</h3>
            <p>Authentication: Mock Active</p>
          </div>
          <div className="stat-card">
            <h3>Theme</h3>
            <p>Current: {theme.toUpperCase()}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App
