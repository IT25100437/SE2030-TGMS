/**
 * Small fetch() wrapper shared by every page.
 * `credentials: 'include'` is the important part - it makes the browser send the
 * JSESSIONID session cookie set by Spring Security on every request, which is what
 * keeps the user logged in across page loads.
 */

async function apiRequest(method, url, body) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

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
        const message = (data && data.message) ? data.message : `Request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
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
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/index.html';
}

function showAlert(containerId, message, type) {
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
