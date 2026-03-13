import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

function Login({ onLogin, theme, onToggleTheme }) {
    
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student'); // Dropdown state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [departmentCode, setDepartmentCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (isSignUp) {

            // ── SIGN UP ────────────────────────────────────────────────────
            // Guard: passwords must match before we even hit Supabase
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                setLoading(false);
                return;
            }

            // supabase.auth.signUp creates a new user in Supabase Auth.
            // The `options.data` object is stored as `user_metadata` on the
            // auth user — this is how we attach role/name to the account.
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role,
                        firstName,
                        lastName,
                        // Only instructors have a department code, students get null
                        departmentCode: role === 'instructor' ? departmentCode : null,
                    },
                },
            });

            if (error) {
                // Supabase returns a human-readable message, e.g. "Email already registered"
                alert(error.message);
            } else {
                // data.user.user_metadata mirrors exactly what we passed into options.data
                alert(`${data.user.user_metadata.firstName}, your ${role} account was created! Please check your email to confirm, then log in.`);
                setIsSignUp(false);
            }

        } else {

            // ── SIGN IN ────────────────────────────────────────────────────
            // signInWithPassword checks email + password against Supabase Auth.
            // On success, Supabase also sets a session cookie automatically —
            // that's what lets us restore the session on page refresh (Step 3).
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                // Common errors: "Invalid login credentials", "Email not confirmed"
                alert(error.message);
            } else {
                // data.user is the full Supabase user object.
                // user_metadata holds everything we saved during signUp.
                const { id, email: userEmail, user_metadata } = data.user;

                // Pass a clean, flat user object up to App.jsx via the onLogin prop.
                // App.jsx stores this in its `user` state and routes to the dashboard.
                onLogin({
                    id,
                    email:     userEmail,
                    role:      user_metadata.role,
                    firstName: user_metadata.firstName,
                    lastName:  user_metadata.lastName,
                });
            }
        }

        setLoading(false);
    };

    return (
        <div className="login-page-wrapper">
            <div className="welcome-section">
                <div className="logo-container">
                    <img src="/perseverance.svg" alt="Logo" className="app-logo" />
                    <span className="brand-name">EL Kapitan</span>
                </div>

                <button className="btn-theme" onClick={onToggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>

                <h1 className="welcome-text">Welcome</h1>
            </div>

            <div className="login-container">
                <form onSubmit={handleSubmit} className="login-card-minimal">
                    <div className="role-selector">
                        <span>{isSignUp ? 'Sign Up As:' : 'Log In As:'}</span>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                        </select>
                    </div>

                    {isSignUp && (
                        <>
                            <div className="input-group">
                                <span className="icon">👤</span>
                                <input 
                                    type="text" 
                                    placeholder="First Name" 
                                    value={firstName} 
                                    onChange={(e) => setFirstName(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="input-group">
                                <span className="icon">👤</span>
                                <input 
                                    type="text" 
                                    placeholder="Last Name" 
                                    value={lastName} 
                                    onChange={(e) => setLastName(e.target.value)} 
                                    required 
                                />
                            </div>
                        </>
                    )}

                    {isSignUp && role === 'instructor' && (
                        <div className="input-group">
                            <span className="icon">🔢</span>
                            <input 
                                type="text" 
                                placeholder="Department Code" 
                                value={departmentCode} 
                                onChange={(e) => setDepartmentCode(e.target.value)} 
                                required 
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <span className="icon">📧</span>
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <span className="icon">🔑</span>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>

                    {/* New Confirm Password field only for Sign Up */}
                    {isSignUp && (
                        <div className="input-group">
                            <span className="icon">🛡️</span>
                            <input 
                                type="password" 
                                placeholder="Confirm Password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                            />
                        </div>
                    )}
                    
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? '...' : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>

                    <p className="login-toggle-text" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? 'Back to Login' : 'Need an account?'}
                    </p>
                </form>
            </div>
        </div>
    );
}
export default Login;