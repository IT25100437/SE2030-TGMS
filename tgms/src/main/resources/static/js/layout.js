/**
 * layout.js — shared topbar + sidebar initialisation for all pages
 * (dashboard, suppliers, inventory, orders, production, employees, reports).
 *
 * USAGE: include this after api.js, before the module-specific script, then call
 * initLayout(). The calling page must set: window.ACTIVE_MODULE (string key,
 * e.g. 'suppliers', or 'dashboard' for the dashboard page).
 *
 * Sidebar structure:
 *   MAIN        -> Dashboard
 *   OPERATIONS  -> Supplier / Inventory / Order / Production / Employee Management
 *   ANALYTICS   -> Reports & Analytics
 *   (footer)    -> logged-in user's name and role
 *
 * This preserves FULL existing role-based access control (the `roles` arrays below
 * are unchanged) — it only adds UI chrome.
 */

window.ACTIVE_MODULE = window.ACTIVE_MODULE || '';

const MODULE_NAV = [
    { key: 'suppliers',  section: 'OPERATIONS', href: '/suppliers.html',  icon: 'fas fa-truck',        label: 'Supplier Management',  roles: ['PROCUREMENT_OFFICER','ADMIN'] },
    { key: 'inventory',  section: 'OPERATIONS', href: '/inventory.html',  icon: 'fas fa-boxes',        label: 'Inventory Management', roles: ['INVENTORY_MANAGER','ADMIN'] },
    { key: 'orders',     section: 'OPERATIONS', href: '/orders.html',     icon: 'fas fa-file-invoice', label: 'Order Management',     roles: ['SALES_OFFICER','ADMIN'] },
    { key: 'production', section: 'OPERATIONS', href: '/production.html', icon: 'fas fa-industry',     label: 'Production Management',roles: ['PRODUCTION_MANAGER','ADMIN'] },
    { key: 'employees',  section: 'OPERATIONS', href: '/employees.html',  icon: 'fas fa-users',        label: 'Employee Management',  roles: ['HR_MANAGER','ADMIN'] },
    { key: 'reports',    section: 'ANALYTICS',  href: '/reports.html',    icon: 'fas fa-chart-bar',    label: 'Reports & Analytics',  roles: ['ADMIN'] },
];

// Dashboard is available to every logged-in user.
const DASHBOARD_NAV = { key: 'dashboard', section: 'MAIN', href: '/dashboard.html', icon: 'fas fa-th-large', label: 'Dashboard' };

const NAV_SECTIONS = ['MAIN', 'OPERATIONS', 'ANALYTICS'];

function formatRole(role) {
    const map = {
        ADMIN:               'Administrator',
        PROCUREMENT_OFFICER: 'Procurement Officer',
        INVENTORY_MANAGER:   'Inventory Manager',
        SALES_OFFICER:       'Sales Officer',
        PRODUCTION_MANAGER:  'Production Manager',
        HR_MANAGER:          'HR Manager',
    };
    return map[role] || role;
}

function navEscape(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function renderNavLink(item) {
    const isActive = window.ACTIVE_MODULE === item.key;
    return `
        <a href="${item.href}" ${isActive ? 'class="active" aria-current="page"' : ''}>
            <i class="${item.icon}" aria-hidden="true"></i>
            <span>${item.label}</span>
        </a>
    `;
}

async function initLayout() {
    const user = await requireLogin();
    if (!user) return null;

    const displayName = user.fullName || user.username || 'User';
    const roleText    = formatRole(user.role);
    const firstLetter = displayName[0].toUpperCase();

    // ---- TOPBAR ----
    const avatarEl     = document.getElementById('userAvatar');
    const labelEl      = document.getElementById('userLabel');
    const roleEl       = document.getElementById('userRoleLabel');

    const userInfoEl   = document.querySelector('.topbar .user-info');
    if (userInfoEl && !document.getElementById('notifBell')) {
        const notifHtml = `<div id="notifBell" class="notif-btn" title="Notifications" aria-label="Notifications" style="position:relative; cursor:pointer; width:34px; height:34px; border-radius:50%; background:var(--primary-bg); color:var(--primary); display:flex; align-items:center; justify-content:center; margin-right:2px;">
            <i class="fas fa-bell" style="font-size:14px;"></i>
            <span style="position:absolute; top:7px; right:8px; width:6px; height:6px; background:var(--primary); border-radius:50%;"></span>
        </div>`;
        userInfoEl.insertAdjacentHTML('afterbegin', notifHtml);
    }

    if (avatarEl) avatarEl.textContent = firstLetter;
    if (labelEl)  labelEl.textContent  = displayName;
    if (roleEl)   roleEl.textContent   = roleText;

    // ---- SIDEBAR ----
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // Only modules the user's role is allowed to see (same rules as before)
        const allowed = [DASHBOARD_NAV, ...MODULE_NAV.filter(mod => mod.roles.includes(user.role))];

        let html = `
            <div class="sidebar-brand">
                <div class="sidebar-brand-logo" aria-hidden="true">TG</div>
                <div class="sidebar-brand-name">TGMS</div>
            </div>
            <div class="sidebar-nav">
        `;

        NAV_SECTIONS.forEach(section => {
            const items = allowed.filter(item => item.section === section);
            if (!items.length) return; // don't show an empty section heading
            html += `<div class="sidebar-section-label">${section}</div>`;
            html += items.map(renderNavLink).join('');
        });

        html += `
            </div>
            <div class="sidebar-user">
                <div class="sidebar-user-heading">User</div>
                <div class="sidebar-user-card">
                    <div class="sidebar-user-avatar" aria-hidden="true">${navEscape(firstLetter)}</div>
                    <div class="sidebar-user-text">
                        <span class="sidebar-user-name">${navEscape(displayName)}</span>
                        <span class="sidebar-user-role">${navEscape(roleText)}</span>
                    </div>
                </div>
            </div>
        `;

        sidebar.innerHTML = html;
    }

    return user;
}

// Sidebar mobile toggle (works once DOM is ready)
document.addEventListener('DOMContentLoaded', function() {
    const toggle  = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar()  { if (sidebar) sidebar.classList.add('open');    if (overlay) overlay.style.display='block'; }
    function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (overlay) overlay.style.display='none'; }

    if (toggle)  toggle.addEventListener('click',  () => sidebar && sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    if (overlay) overlay.addEventListener('click', closeSidebar);
});
