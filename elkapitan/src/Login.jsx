import React, { useState } from 'react';
import { mockAuth } from './mockAuth';
import './Login.css';

function Login({ onLogin }) {
    
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('student'); // Dropdown state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (isSignUp) {
            // Logic to check if passwords match
            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                setLoading(false);
                return;
            }

            await mockAuth.signUp(email, password, { 
                role: role, 
                firstName: firstName, 
                lastName: lastName 
            });
            alert(`${firstName}, your ${role} account was created! Please log in.`);
            setIsSignUp(false);
        } else {
            const { data, error } = await mockAuth.signIn(email, password);
            if (data) onLogin();
            else alert(error.message);
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