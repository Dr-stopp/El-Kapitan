export const mockAuth = {
  // Simulate Sign In
    signIn: async (email, password) => {
        console.log("Mocking Sign In for:", email);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // You can simulate a "wrong password" by changing this condition
                if (email && password) {
                resolve({ data: { user: { email, id: '123' } }, error: null });
                } else {
                resolve({ data: null, error: { message: "Invalid credentials" } });
                }
            }, 1000); // 1 second delay
        });
    },

    // Simulate Sign Up
    signUp: async (email, password, metadata) => {
        console.log("Mocking Sign Up for:", email, metadata);
        
        return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ data: { user: { email, ...metadata } }, error: null });
        }, 1000);
        });
    }
};