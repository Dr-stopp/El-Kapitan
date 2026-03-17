import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

function Login({ onLogin }) {  // removed theme/onToggleTheme — App.jsx owns the theme toggle now

    // ── UI State ────────────────────────────────────────────────────────────────
    const [isSignUp, setIsSignUp] = useState(false);  // toggles between login and signup view
    const [loading, setLoading] = useState(false);     // disables submit button while awaiting Supabase

    // ── Auth Fields ─────────────────────────────────────────────────────────────
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');  // only used during signup

    // ── Profile Fields (signup only) ────────────────────────────────────────────
    const [role, setRole] = useState('student');        // 'student' | 'instructor'
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [departmentCode, setDepartmentCode] = useState('');  // instructors only

    // ── Remember Me State ───────────────────────────────────────────────────────
    const [rememberMe, setRememberMe] = useState(false); // defaults to not remembered

    // ── Typing Animation State ───────────────────────────────────────────────────
    const [displayedText, setDisplayedText] = useState('');  // the text currently visible on screen
    const [isTyping, setIsTyping] = useState(true);           // true while animation is running

    // The full text to type out — \n becomes a line break in the JSX
    const welcomeText = `WELCOME`;
    // clean string — \n is the only line break, no accidental whitespace
    const descriptionText = `Streamline the grading process using automated analysis\nand advanced similarity detection.`;
    const fullText = welcomeText + '\n' + descriptionText; // still one string for the animation



    //-------- HANDLERS --------//

    // ── Typing Animation Effect ──────────────────────────────────────────────────
    // Runs once on mount. Steps through fullText one character at a time,
    // appending each character to displayedText with a delay between each step.
    // ── Typing Animation Effect ──────────────────────────────────────────────────
    useEffect(() => {
        let index = 0;

        const tick = () => {
            if (index < fullText.length) {
                setDisplayedText(fullText.slice(0, index + 1));
                index++;

                // check index on every tick to decide the next delay —
                // setTimeout re-evaluates the delay each character unlike setInterval
                // which locks in the delay at creation time
                setTimeout(tick, index <= welcomeText.length ? 120 : 40);
            } else {
                setIsTyping(false); // done typing — hide the cursor
            }
        };

        const timeout = setTimeout(tick, 120); // start the first tick

        // Cleanup: cancel the pending timeout if component unmounts mid-animation
        return () => clearTimeout(timeout);

    }, []); // [] = run once on mount only


    // ── Form Submit Handler ─────────────────────────────────────────────────────
    // This is the single entry point for the form's onSubmit event.
    // It simply routes to the correct handler based on which view is active.
    const handleSubmit = (e) => {
        e.preventDefault(); // prevent the browser from refreshing the page on form submit

        if (isSignUp) {
            handleSignUp();
        } else {
            handleSignIn();
        }
    };


    // ── Sign In Handler ─────────────────────────────────────────────────────────
    const handleSignIn = async () => {
        setLoading(true);

        // signInWithPassword checks email + password against Supabase Auth
        // Supabase also sets a session cookie automatically on success —
        // that's what lets App.jsx restore the session on page refresh
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // Common Supabase errors: "Invalid login credentials", "Email not confirmed"
            alert(error.message);
            setLoading(false);
            return;
        }

        const { id, email: userEmail, user_metadata } = data.user;

        // Guard: the role the user selected in the dropdown must match
        // the role stored in their Supabase user_metadata at signup time
        if (user_metadata.role !== role) {

            await supabase.auth.signOut(); // kill the session Supabase just created
            alert(`Incorrect role selected. Please log in as ${user_metadata.role}.`);
            setLoading(false);
            return;
        }

        // Pass a clean flat user object up to App.jsx via the onLogin prop
        // App.jsx stores this in its user state and routes to the correct dashboard
        onLogin({
            id,
            email:     userEmail,
            role:      user_metadata.role,
            firstName: user_metadata.firstName,
            lastName:  user_metadata.lastName,
        });

        setLoading(false);
    };


    // ── Sign Up Handler ─────────────────────────────────────────────────────────
    const handleSignUp = async () => {
        setLoading(true);

        // Guard: passwords must match before we even hit Supabase
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            setLoading(false);
            return;
        }

        // Guard: if signing up as instructor, validate the department code
        // against the instructor_codes table before creating an auth account
        if (role === 'instructor') {
            const { data: codeCheck, error: codeError } = await supabase
                .from('instructor_codes')
                .select('code')
                .eq('code', departmentCode)
                .single(); // we expect exactly one row or none

            // codeError fires when no matching row is found
            if (codeError || !codeCheck) {
                alert('Invalid department code. Instructor account not created.');
                setLoading(false);
                return;
            }
        }

        // supabase.auth.signUp creates a new user in Supabase Auth
        // options.data is stored as user_metadata on the auth user —
        // this is how we attach role and name to the account
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    firstName,
                    lastName,
                    // students get null here — department code was only needed for validation
                    departmentCode: role === 'instructor' ? departmentCode : null,
                },
            },
        });

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        // Prompt the user to confirm their email before logging in
        alert(`${data.user.user_metadata.firstName}, your ${role} account was created! Please check your email to confirm, then log in.`);
        setIsSignUp(false); // switch back to the login view
        setLoading(false);
    };



    return (

        <div className="login-page-wrapper">

            {/* ── Branding Section ───────────────────────────────────────────────
                No theme toggle here anymore — that lives in App.jsx          */}
            <div className="welcome-section">
                <div className="logo-container">
                    <img src="/perseverance.svg" alt="Logo" className="app-logo" />
                    <span className="brand-name">EL Kapitan</span>
                </div>

                {/* ── Typing Animation ─────────────────────────────────────────────────────
                    displayedText grows one character at a time via the useEffect above.
                    \n in the string is rendered as a real line break using white-space: pre-line
                    in the CSS. The cursor span blinks while typing and disappears when done. */}
                    
                <div className="typing-container">

                    {/* WELCOME line — cursor stays here until WELCOME is fully typed */}
                    <span className="typed-welcome">
                        {displayedText.slice(0, Math.min(displayedText.length, welcomeText.length))}
                        {isTyping && displayedText.length <= welcomeText.length && (
                            <span className="typing-cursor">|</span>
                        )}
                    </span>

                    {/* Description — only appears after WELCOME is fully typed */}
                    {displayedText.length > welcomeText.length && (
                        <span className="typed-description">
                            {displayedText.slice(welcomeText.length + 1)}{/* +1 skips the \n */}
                            {isTyping && <span className="typing-cursor">|</span>}
                        </span>
                    )}

                </div>

            </div>

            {/* ── Form Section ───────────────────────────────────────────────── */}
            <div className="login-container">
                <form onSubmit={handleSubmit} className="login-card-minimal">

                    {/* Role selector — visible on both login and signup */}
                    <div className="role-selector">
                        <span>{isSignUp ? 'Sign Up As:' : 'Log In As:'}</span>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                        </select>
                    </div>

                    {/* Name fields — signup only */}
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

                    {/* Department code — signup + instructor only */}
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

                    {/* Email — always visible */}
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

                    {/* Password — always visible */}
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

                    {/* Confirm password — signup only */}
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

                    {/* Remember Me — login view only, no point showing it on signup */}
                    {!isSignUp && (
                        <div className="remember-me">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="rememberMe">Remember Me</label>
                        </div>
                    )}

                    {/* Submit button — shows a simple ellipsis while loading */}
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? '...' : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>

                    {/* Toggle between login and signup views */}
                    <p className="login-toggle-text" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? 'Back to Login' : 'Need an account?'}
                    </p>

                </form>
            </div>
        </div>
    );

}
export default Login;