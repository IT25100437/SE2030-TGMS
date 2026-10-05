/**
 * Small fetch() wrapper shared by every page.
 * `credentials: 'include'` is the important part - it makes the browser send the
 * JSESSIONID session cookie set by Spring Security on every request, which is what
 * keeps the user logged in across page loads.
 *
 * Errors thrown by apiRequest() always carry a user-friendly `message`:
 *   - the backend's own `message` field is used whenever it is meaningful,
 *   - network failures, 401/403 and technical 5xx responses are translated into
 *     plain language so users never see stack traces or raw exception text.
 * API URLs and request/response formats are unchanged.
 */

const AUTH_LOGIN_URL = '/api/auth/login';

function friendlyApiMessage(status, data, url) {
    const serverMessage = (data && data.message) ? String(data.message).trim() : '';

    if (status === 401) {
        // Wrong credentials on the login form keep the backend's own wording.
        if (url === AUTH_LOGIN_URL && serverMessage) return serverMessage;
        return 'Your session has expired. Please log in again.';
    }
    if (status === 403) {
        return 'You do not have permission to perform this action.';
    }
    if (status >= 500) {
        // The backend's catch-all handler prefixes technical text with "Unexpected error:".
        if (serverMessage && !/^unexpected error/i.test(serverMessage)) return serverMessage;
        return 'Something went wrong on the server. Please try again, and contact your administrator if the problem continues.';
    }
    return serverMessage || `Request failed (${status})`;
}

async function apiRequest(method, url, body) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(url, options);
    } catch (networkError) {
        const error = new Error('Unable to reach the server. Please check your connection and try again.');
        error.status = 0;
        error.network = true;
        throw error;
    }

    if (response.status === 204) {
        return null; // no content (e.g. DELETE)
    }

    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        // some responses (like logout) may not return JSON at all
    }

    if (!response.ok) {
        const error = new Error(friendlyApiMessage(response.status, data, url));
        error.status = response.status;

        // An expired session on a protected page: send the user back to the login screen.
        const onLoginPage = /^\/(index\.html)?$/.test(window.location.pathname);
        if (response.status === 401 && url !== AUTH_LOGIN_URL && url !== '/api/auth/me' && !onLoginPage) {
            setTimeout(() => { window.location.href = '/index.html'; }, 1800);
        }
        throw error;
    }

    return data;
}

const api = {
    get: (url) => apiRequest('GET', url),
    post: (url, body) => apiRequest('POST', url, body),
    put: (url, body) => apiRequest('PUT', url, body),
    patch: (url, body) => apiRequest('PATCH', url, body),
    del: (url) => apiRequest('DELETE', url)
};

/** Redirects to the login page if the user isn't authenticated; returns the user object otherwise. */
async function requireLogin() {
    try {
        return await api.get('/api/auth/me');
    } catch (e) {
        window.location.href = '/index.html';
        return null;
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        // even if the request fails, send the user to the login page
    }
    window.location.href = '/index.html';
}

function showAlert(containerId, message, type) {
    // Module pages now use the shared toast system. Keep the old inline
    // banner as a fallback for pages that do not load ui.js (e.g. login).
    if (window.UI) {
        const kind = type === 'error' ? 'error' : type === 'warning' || type === 'warn' ? 'warn' : 'success';
        UI.toast(message, kind);
        return;
    }
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = message;
    el.className = 'alert ' + type;
    el.classList.remove('hidden');
}

function hideAlert(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.classList.add('hidden');
}
