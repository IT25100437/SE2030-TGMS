/**
 * layout.js — shared topbar + sidebar for all pages
 * (dashboard, suppliers, inventory, orders, production, employees, reports).
 *
 * USAGE: include after api.js / ui.js, before the module script, then call
 * initLayout(). The page must set window.ACTIVE_MODULE (e.g. 'suppliers').
 *
 * Sidebar:  MAIN -> Dashboard | OPERATIONS -> module pages | ANALYTICS -> Reports
 * Topbar:   menu button (mobile), page search (Ctrl+K), today's date, notifications,
 *           logged-in user and Log Out.
 *
 * Role-based access is unchanged: the `roles` arrays below decide which modules a
 * user sees, exactly as before. This file only controls the look of the shell.
 */

window.ACTIVE_MODULE = window.ACTIVE_MODULE || '';

const MODULE_NAV = [
    { key: 'suppliers',  section: 'OPERATIONS', href: '/suppliers.html',  icon: 'fas fa-truck',        label: 'Supplier Management',   keywords: 'supplier contract procurement material', roles: ['PROCUREMENT_OFFICER','ADMIN'] },
    { key: 'inventory',  section: 'OPERATIONS', href: '/inventory.html',  icon: 'fas fa-boxes',        label: 'Inventory Management',  keywords: 'inventory stock item sku warehouse low',  roles: ['INVENTORY_MANAGER','ADMIN'] },
    { key: 'orders',     section: 'OPERATIONS', href: '/orders.html',     icon: 'fas fa-file-invoice', label: 'Order Management',      keywords: 'order customer invoice sales delivery',   roles: ['SALES_OFFICER','ADMIN'] },
    { key: 'production', section: 'OPERATIONS', href: '/production.html', icon: 'fas fa-industry',     label: 'Production Management', keywords: 'production work order stage line output', roles: ['PRODUCTION_MANAGER','ADMIN'] },
    { key: 'employees',  section: 'OPERATIONS', href: '/employees.html',  icon: 'fas fa-users',        label: 'Employee Management',   keywords: 'employee attendance hr staff workforce',  roles: ['HR_MANAGER','ADMIN'] },
    { key: 'reports',    section: 'ANALYTICS',  href: '/reports.html',    icon: 'fas fa-chart-bar',    label: 'Reports & Analytics',   keywords: 'report analytics kpi export pdf excel',   roles: ['ADMIN'] },
];

// Dashboard is available to every logged-in user.
const DASHBOARD_NAV = { key: 'dashboard', section: 'MAIN', href: '/dashboard.html', icon: 'fas fa-th-large', label: 'Dashboard', keywords: 'dashboard home overview' };

const NAV_SECTIONS = ['MAIN', 'OPERATIONS', 'ANALYTICS'];

let searchableNav = [DASHBOARD_NAV];

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

/* =========================================================
   TOPBAR  (built here so every page gets the same header)
   ========================================================= */
function buildTopbar() {
    const bar = document.querySelector('.topbar');
    if (!bar || bar.dataset.built === '1') return;
    bar.dataset.built = '1';

    const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    bar.innerHTML = `
        <div class="topbar-brand">
            <button class="hamburger" id="sidebarToggle" aria-label="Toggle sidebar" aria-controls="sidebar">
                <span></span><span></span><span></span>
            </button>
            <div class="topbar-logo" aria-hidden="true">TG</div>
        </div>

        <div class="topbar-search" role="search">
            <i class="fas fa-search ts-icon" aria-hidden="true"></i>
            <input type="search" id="globalSearch" placeholder="Search modules and pages…" autocomplete="off"
                   aria-label="Search modules and pages" aria-controls="searchResults" aria-expanded="false">
            <kbd class="ts-kbd" aria-hidden="true">Ctrl K</kbd>
            <div class="search-results hidden" id="searchResults" role="listbox"></div>
        </div>

        <div class="user-info">
            <div class="date-chip" title="Today">
                <i class="far fa-calendar-alt" aria-hidden="true"></i>
                <span>${navEscape(today)}</span>
            </div>

            <div class="notif-wrap">
                <button type="button" class="icon-btn" id="notifBell" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
                    <i class="far fa-bell" aria-hidden="true"></i>
                </button>
                <div class="notif-pop hidden" id="notifPop" role="status">
                    <div class="notif-title">Notifications</div>
                    <div class="notif-empty"><i class="far fa-check-circle" aria-hidden="true"></i> You're all caught up.</div>
                </div>
            </div>

            <div class="user-chip">
                <div class="user-avatar" id="userAvatar" aria-hidden="true">U</div>
                <div class="user-details">
                    <span class="user-name" id="userLabel">Loading...</span>
                    <span class="user-role" id="userRoleLabel"></span>
                </div>
            </div>

            <button type="button" class="logout-btn" onclick="logout()" aria-label="Log out">
                <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                <span class="logout-text">Log Out</span>
            </button>
        </div>
    `;

    wireSearch();
    wireNotifications();
}

function wireNotifications() {
    const bell = document.getElementById('notifBell');
    const pop = document.getElementById('notifPop');
    if (!bell || !pop) return;

    function setOpen(open) {
        pop.classList.toggle('hidden', !open);
        bell.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    bell.addEventListener('click', e => { e.stopPropagation(); setOpen(pop.classList.contains('hidden')); });
    document.addEventListener('click', e => { if (!pop.contains(e.target) && e.target !== bell) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
}

function wireSearch() {
    const input = document.getElementById('globalSearch');
    const box = document.getElementById('searchResults');
    if (!input || !box) return;

    let results = [];
    let active = -1;

    function close() {
        box.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
        active = -1;
    }

    function highlight() {
        Array.from(box.querySelectorAll('a')).forEach((a, i) => a.classList.toggle('is-active', i === active));
    }

    function render() {
        const q = input.value.trim().toLowerCase();
        if (!q) { close(); return; }

        results = searchableNav.filter(item =>
            (item.label + ' ' + (item.keywords || '')).toLowerCase().includes(q));

        box.innerHTML = results.length
            ? results.map(item => `
                <a href="${item.href}" role="option">
                    <i class="${item.icon}" aria-hidden="true"></i>
                    <span>${item.label}</span>
                </a>`).join('')
            : '<div class="search-empty">No matching pages.</div>';

        box.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
        active = results.length ? 0 : -1;
        highlight();
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); active = (active + 1) % results.length; highlight(); }
        else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); active = (active - 1 + results.length) % results.length; highlight(); }
        else if (e.key === 'Enter' && active >= 0 && results[active]) { e.preventDefault(); window.location.href = results[active].href; }
        else if (e.key === 'Escape') { close(); input.blur(); }
    });

    document.addEventListener('click', e => { if (!e.target.closest('.topbar-search')) close(); });

    // Ctrl+K / Cmd+K focuses the search box.
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            input.focus();
            input.select();
        }
    });
}

/* =========================================================
   INIT
   ========================================================= */
async function initLayout() {
    buildTopbar();

    const user = await requireLogin();
    if (!user) return null;

    const displayName = user.fullName || user.username || 'User';
    const roleText    = formatRole(user.role);
    const firstLetter = displayName[0].toUpperCase();

    // ---- TOPBAR user ----
    const avatarEl = document.getElementById('userAvatar');
    const labelEl  = document.getElementById('userLabel');
    const roleEl   = document.getElementById('userRoleLabel');

    if (avatarEl) avatarEl.textContent = firstLetter;
    if (labelEl)  labelEl.textContent  = displayName;
    if (roleEl)   roleEl.textContent   = roleText;

    // ---- SIDEBAR ----
    // Only modules the user's role is allowed to see (same rules as before)
    const allowed = [DASHBOARD_NAV, ...MODULE_NAV.filter(mod => mod.roles.includes(user.role))];
    searchableNav = allowed;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        let html = `
            <div class="sidebar-brand">
                <div class="sidebar-brand-logo" aria-hidden="true">TG</div>
                <div class="sidebar-brand-text">
                    <div class="sidebar-brand-name">TGMS</div>
                    <div class="sidebar-brand-tag">Textile &amp; Garment Management</div>
                </div>
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

// Sidebar mobile toggle — uses event delegation because the topbar is built by JS.
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    function open()  { sidebar.classList.add('open');    if (overlay) overlay.style.display = 'block'; }
    function close() { sidebar.classList.remove('open'); if (overlay) overlay.style.display = 'none'; }

    if (e.target.closest('#sidebarToggle')) {
        sidebar.classList.contains('open') ? close() : open();
    } else if (e.target.closest('#sidebarOverlay')) {
        close();
    } else if (sidebar.classList.contains('open') && e.target.closest('#sidebar a')) {
        close();
    }
});
