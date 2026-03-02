/**
 * Simulates Supabase Auth responses for local development.
 * Swap each function body for real supabase.auth calls when ready.
 *
 * Called by: Login.jsx (both signIn and signUp)
 *
 * IMPORTANT — response shape must mirror what Supabase actually returns.
 * Login.jsx destructures data.user like this on sign-in:
 *
 *   const { id, email: userEmail, user_metadata } = data.user;
 *   onLogin({
 *     id,
 *     email:     userEmail,
 *     role:      user_metadata.role,      // <-- needs user_metadata to exist
 *     firstName: user_metadata.firstName,
 *     lastName:  user_metadata.lastName,
 *   });
 *
 * And on sign-up, Login.jsx reads:
 *   data.user.user_metadata.firstName    // <-- also needs user_metadata
 */

export const mockAuth = {

    /**
     * signIn
     * Called by: Login.jsx → handleSubmit (when isSignUp === false)
     *
     * Simulates a successful login for any non-empty email + password.
     * Returns a user object shaped exactly like Supabase's signIn response.
     *
     * *** BUG FIXED (white page cause #3) ***
     * Was: resolve({ data: { user: { email, id: '123' } }, error: null })
     *   → No `user_metadata` field on the returned user object.
     *   → Login.jsx did `const { user_metadata } = data.user` → undefined
     *   → `user_metadata.role` threw TypeError → crash → white page.
     *
     * The hard-coded metadata below lets you log in as a demo student.
     * When you connect real Supabase, delete this whole function body and use:
     *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ data: { user }, error: null } | { data: null, error: { message } }>}
     */
    signIn: async (email, password) => {
    console.log('mockAuth.signIn called for:', email);

    return new Promise((resolve) => {
        setTimeout(() => {
        if (email && password) {
            resolve({
            data: {
                user: {
                id: '123',
                email,
                // user_metadata mirrors the shape Supabase stores after signUp.
                // These are the values Login.jsx reads to build the user object
                // it passes up to App.jsx via onLogin().
                user_metadata: {
                    role: 'student',
                    firstName: 'Alex',
                    lastName: 'Rivera',
                },
                },
            },
            error: null,
            });
        } else {
            resolve({ data: null, error: { message: 'Invalid credentials' } });
        }
        }, 1000); // simulate network latency
    });
    },

    /**
     * signUp
     * Called by: Login.jsx → handleSubmit (when isSignUp === true)
     *
     * Accepts the metadata object from the sign-up form and returns it nested
     * under `user_metadata` — the same shape Supabase uses.
     *
     * *** BUG FIXED (cause #4) ***
     * Was: resolve({ data: { user: { email, ...metadata } }, error: null })
     *   → metadata was spread directly onto user, not under user_metadata.
     *   → Login.jsx then did `data.user.user_metadata.firstName` → TypeError.
     *
     * When you connect real Supabase, replace with:
     *   const { data, error } = await supabase.auth.signUp({
     *     email, password, options: { data: metadata }
     *   });
     *
     * @param {string} email
     * @param {string} password
     * @param {{ role, firstName, lastName, departmentCode }} metadata
     * @returns {Promise<{ data: { user }, error: null }>}
     */
    signUp: async (email, password, metadata) => {
    console.log('mockAuth.signUp called for:', email, metadata);

    return new Promise((resolve) => {
        setTimeout(() => {
        resolve({
            data: {
            user: {
                id: Date.now().toString(), // unique mock id
                email,
                // Nest metadata under user_metadata to match Supabase's shape.
                // Login.jsx reads data.user.user_metadata.firstName in the alert.
                user_metadata: { ...metadata },
            },
            },
            error: null,
        });
        }, 1000);
    });
    },
};