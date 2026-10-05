/**
 * Internal system login logic
 */

// ==========================================
// CHECK EXISTING SESSION
// ==========================================
(async function checkExistingSession() {
    try {
        const user = await api.get('/api/auth/me');
        if (user && user.role) {
            // Already logged in - go straight to the internal dashboard
            window.location.href = '/dashboard.html';
        }
    } catch (e) {
        // Not logged in. Stay on the login page.
    }
})();

// ==========================================
// LOGIN FORM SUBMISSION
// ==========================================
const loginForm = document.getElementById('internalLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        hideAlert('loginAlert');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i> AUTHENTICATING...';
            btn.disabled = true;

            // Login using the existing backend authentication system
            const user = await api.post(
                '/api/auth/login',
                { username, password }
            );

            if (user && user.role) {
                // Login successful, enter the internal dashboard
                window.location.href = '/dashboard.html';
            } else {
                throw new Error("Invalid user authentication footprint.");
            }

        } catch (err) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            showAlert(
                'loginAlert',
                err.message || 'Authentication failed. Please check your credentials.',
                'error'
            );
        }
    });
}