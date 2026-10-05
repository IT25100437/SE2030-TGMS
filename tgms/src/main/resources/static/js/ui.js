/**
 * ui.js — shared UI helpers for every TGMS module page.
 *
 * Load order on a page:  api.js  ->  ui.js  ->  layout.js  ->  (module script)
 *
 * Provides (all frontend-only, no API calls):
 *   escapeHtml()                      safe text for innerHTML
 *   UI.success / UI.error / UI.warn   toast notifications (replace alert()/banners)
 *   UI.confirm({...})                 professional confirmation modal (returns a Promise)
 *   UI.setBusy / UI.guard             disable a button + show "Saving…" while working
 *   UI.validate(rules)                inline field validation with clear messages
 *   UI.loadingRow / emptyRow / errorRow     table states
 *   UI.loadingBlock / emptyBlock / errorBlock   non-table states
 *   UI.statusBadge / UI.stageTracker  consistent status visuals
 *   UI.formatDate / formatDateTime / formatMoney / todayString
 */

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

const UI = (function () {

    /* =========================================================
       FORMATTING HELPERS
       ========================================================= */

    function parseDate(value) {
        if (!value) return null;
        // "yyyy-mm-dd" (LocalDate) must be read as a LOCAL date, not UTC.
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const d = parseDate(value);
        return d ? d.toLocaleDateString() : '—';
    }

    function formatDateTime(value) {
        const d = parseDate(value);
        return d ? d.toLocaleString() : '—';
    }

    function formatMoney(value) {
        const n = Number(value);
        if (!isFinite(n)) return '—';
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    /** Today's date as yyyy-mm-dd in the browser's local time zone. */
    function todayString() {
        const d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    /** First 10 characters of an ISO date / date-time string (yyyy-mm-dd). */
    function datePart(value) {
        return value ? String(value).slice(0, 10) : '';
    }

    /* =========================================================
       TOAST NOTIFICATIONS
       ========================================================= */

    const TOAST_ICONS = {
        success: 'fa-check-circle',
        error:   'fa-exclamation-circle',
        warn:    'fa-exclamation-triangle',
        info:    'fa-info-circle'
    };
    const TOAST_DURATION = { success: 4000, info: 4500, warn: 6500, error: 8000 };

    function toastRegion() {
        let region = document.getElementById('toastRegion');
        if (!region) {
            region = document.createElement('div');
            region.id = 'toastRegion';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'false');
            document.body.appendChild(region);
        }
        return region;
    }

    function dismissToast(toast) {
        if (!toast || toast.classList.contains('leaving')) return;
        toast.classList.add('leaving');
        setTimeout(() => toast.remove(), 220);
    }

    function toast(message, type, duration) {
        type = TOAST_ICONS[type] ? type : 'info';
        const region = toastRegion();

        // Don't stack identical messages — just restart the existing one.
        const existing = Array.from(region.children).find(t => t.dataset.msg === message && t.dataset.type === type);
        if (existing) {
            clearTimeout(existing._timer);
            existing._timer = setTimeout(() => dismissToast(existing), duration || TOAST_DURATION[type]);
            return existing;
        }

        // Keep the stack short.
        while (region.children.length >= 4) region.firstElementChild.remove();

        const el = document.createElement('div');
        el.className = 'toast ' + type;
        el.dataset.msg = message;
        el.dataset.type = type;
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');
        el.innerHTML =
            '<i class="fas ' + TOAST_ICONS[type] + ' toast-icon" aria-hidden="true"></i>' +
            '<div class="toast-msg">' + escapeHtml(message) + '</div>' +
            '<button type="button" class="toast-close" aria-label="Dismiss notification">' +
            '<i class="fas fa-times" aria-hidden="true"></i></button>';
        el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
        region.appendChild(el);
        el._timer = setTimeout(() => dismissToast(el), duration || TOAST_DURATION[type]);
        return el;
    }

    /* =========================================================
       BUSY / LOADING BUTTONS
       ========================================================= */

    function setBusy(btn, busy, text) {
        if (!btn) return;
        if (busy) {
            if (btn.dataset.busy === '1') return;
            btn.dataset.busy = '1';
            btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + escapeHtml(text || 'Working…');
        } else {
            if (btn.dataset.busy !== '1') return;
            btn.innerHTML = btn.dataset.originalHtml;
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            delete btn.dataset.busy;
            delete btn.dataset.originalHtml;
        }
    }

    /**
     * Runs fn() while the button shows a spinner and is disabled.
     * A second click while busy is ignored, which prevents double submissions.
     */
    async function guard(btn, busyText, fn) {
        if (btn && btn.dataset.busy === '1') return undefined;
        setBusy(btn, true, busyText);
        try {
            return await fn();
        } finally {
            setBusy(btn, false);
        }
    }

    /* =========================================================
       CONFIRMATION MODAL
       ========================================================= */

    /**
     * UI.confirm({
     *   title, message,
     *   details:  string | [string | {text, main, muted}]   (what is about to be affected)
     *   warning:  string                                    (red "cannot be undone" banner)
     *   confirmText, cancelText, busyText,
     *   variant:  'primary' | 'warn' | 'danger',
     *   icon:     font-awesome class, e.g. 'fa-trash-alt',
     *   onConfirm: async () => {}   optional — runs while the modal shows "Deleting…"
     * })  ->  Promise<boolean>   (true = confirmed, false = cancelled)
     */
    function confirmDialog(options) {
        return new Promise(resolve => {
            const o = Object.assign({
                title: 'Are you sure?',
                message: '',
                details: null,
                warning: '',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                busyText: 'Working…',
                variant: 'primary',
                icon: null,
                onConfirm: null
            }, options || {});

            const previouslyFocused = document.activeElement;
            const icon = o.icon || (o.variant === 'danger' ? 'fa-trash-alt'
                : o.variant === 'warn' ? 'fa-exclamation-triangle' : 'fa-question-circle');
            const confirmClass = o.variant === 'danger' ? 'btn btn-danger-solid'
                : o.variant === 'warn' ? 'btn btn-warning' : 'btn btn-primary';

            let detailsHtml = '';
            if (o.details) {
                const lines = Array.isArray(o.details) ? o.details : [o.details];
                detailsHtml = '<div class="confirm-details">' + lines.map((line, idx) => {
                    const item = (typeof line === 'string') ? { text: line, main: idx === 0 } : line;
                    const cls = 'cd-line' + (item.main ? ' cd-main' : '') + (item.muted ? ' muted' : '');
                    return '<div class="' + cls + '">' + escapeHtml(item.text) + '</div>';
                }).join('') + '</div>';
            }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay confirm-overlay';
            overlay.innerHTML =
                '<div class="modal-box confirm-modal" role="dialog" aria-modal="true"' +
                ' aria-labelledby="confirmTitle" aria-describedby="confirmMessage">' +
                '  <div class="confirm-head">' +
                '    <div class="confirm-icon ' + escapeHtml(o.variant) + '" aria-hidden="true"><i class="fas ' + escapeHtml(icon) + '"></i></div>' +
                '    <div>' +
                '      <div class="confirm-title" id="confirmTitle">' + escapeHtml(o.title) + '</div>' +
                (o.message ? '      <div class="confirm-message" id="confirmMessage">' + escapeHtml(o.message) + '</div>' : '      <div id="confirmMessage"></div>') +
                '    </div>' +
                '  </div>' +
                detailsHtml +
                (o.warning ? '<div class="confirm-warning"><i class="fas fa-exclamation-circle" aria-hidden="true"></i><span>' + escapeHtml(o.warning) + '</span></div>' : '') +
                '  <div class="alert error confirm-error hidden" id="confirmError" role="alert"></div>' +
                '  <div class="modal-actions">' +
                '    <button type="button" class="btn btn-secondary" id="confirmCancelBtn">' + escapeHtml(o.cancelText) + '</button>' +
                '    <button type="button" class="' + confirmClass + '" id="confirmOkBtn">' + escapeHtml(o.confirmText) + '</button>' +
                '  </div>' +
                '</div>';

            document.body.appendChild(overlay);
            document.body.classList.add('modal-open');

            const okBtn = overlay.querySelector('#confirmOkBtn');
            const cancelBtn = overlay.querySelector('#confirmCancelBtn');
            const errorBox = overlay.querySelector('#confirmError');
            let working = false;
            let closed = false;

            function close(result) {
                if (closed) return;
                closed = true;
                document.removeEventListener('keydown', onKeyDown, true);
                overlay.remove();
                document.body.classList.remove('modal-open');
                if (previouslyFocused && document.contains(previouslyFocused) && previouslyFocused.focus) {
                    try { previouslyFocused.focus(); } catch (e) { /* ignore */ }
                }
                resolve(result);
            }

            async function confirmed() {
                if (working) return;
                if (!o.onConfirm) { close(true); return; }
                working = true;
                errorBox.classList.add('hidden');
                cancelBtn.disabled = true;
                setBusy(okBtn, true, o.busyText);
                try {
                    await o.onConfirm();
                    working = false;
                    close(true);
                } catch (err) {
                    working = false;
                    setBusy(okBtn, false);
                    cancelBtn.disabled = false;
                    errorBox.textContent = (err && err.message) ? err.message : 'Something went wrong. Please try again.';
                    errorBox.classList.remove('hidden');
                }
            }

            function onKeyDown(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (!working) close(false);
                    return;
                }
                if (e.key === 'Tab') {
                    // keep keyboard focus inside the dialog
                    const focusable = Array.from(overlay.querySelectorAll('button:not([disabled])'));
                    if (!focusable.length) { e.preventDefault(); return; }
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }

            okBtn.addEventListener('click', confirmed);
            cancelBtn.addEventListener('click', () => { if (!working) close(false); });
            overlay.addEventListener('mousedown', e => { if (e.target === overlay && !working) close(false); });
            document.addEventListener('keydown', onKeyDown, true);

            // Destructive dialogs start on "Cancel" so Enter never deletes by accident.
            (o.variant === 'primary' ? okBtn : cancelBtn).focus();
        });
    }

    /* =========================================================
       FORM VALIDATION
       ========================================================= */

    let errorCounter = 0;

    function resolveEl(ref) {
        return typeof ref === 'string' ? document.getElementById(ref) : ref;
    }

    function clearFieldError(el) {
        el = resolveEl(el);
        if (!el) return;
        el.classList.remove('invalid');
        el.removeAttribute('aria-invalid');
        const errId = el.getAttribute('data-err-id');
        if (errId) {
            const box = document.getElementById(errId);
            if (box) box.remove();
            el.removeAttribute('data-err-id');
            el.removeAttribute('aria-describedby');
        }
    }

    function fieldError(el, message) {
        el = resolveEl(el);
        if (!el) return;
        clearFieldError(el);
        const id = 'err_' + (el.id || 'f') + '_' + (++errorCounter);
        const box = document.createElement('div');
        box.className = 'field-error';
        box.id = id;
        box.setAttribute('role', 'alert');
        box.textContent = message;
        el.classList.add('invalid');
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', id);
        el.setAttribute('data-err-id', id);
        el.insertAdjacentElement('afterend', box);
    }

    function clearErrors(root) {
        root = resolveEl(root) || document;
        root.querySelectorAll('.invalid').forEach(clearFieldError);
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE_RE = /^\+?[0-9\s\-().]{7,22}$/;

    function isEmail(v) { return EMAIL_RE.test(v); }
    function isPhone(v) {
        if (!PHONE_RE.test(v)) return false;
        const digits = v.replace(/\D/g, '').length;
        return digits >= 7 && digits <= 15;
    }

    function isValidDateString(v) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
        const [y, m, d] = v.split('-').map(Number);
        if (y < 1900 || y > 2100) return false;
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }

    function checkRule(rule, value) {
        const label = rule.label || 'This field';

        if (value === '') {
            if (!rule.required) return null;
            if (rule.requiredMessage) return rule.requiredMessage;
            return rule.type === 'select' ? 'Please select ' + label.toLowerCase() + '.' : label + ' is required.';
        }

        switch (rule.type) {
            case 'contact':
                if (!isEmail(value) && !isPhone(value)) return rule.message || 'Please enter a valid phone number or email address.';
                break;
            case 'email':
                if (!isEmail(value)) return rule.message || 'Please enter a valid email address.';
                break;
            case 'phone':
                if (!isPhone(value)) return rule.message || 'Please enter a valid phone number.';
                break;
            case 'int':
            case 'number': {
                if (rule.type === 'int' && !/^-?\d+$/.test(value)) return label + ' must be a whole number.';
                const n = Number(value);
                if (!isFinite(n)) return label + ' must be a valid number.';
                if (rule.gt !== undefined && !(n > rule.gt)) {
                    return rule.gtMessage || (rule.gt === 0 ? label + ' must be greater than 0.' : label + ' must be greater than ' + rule.gt + '.');
                }
                if (rule.min !== undefined && n < rule.min) {
                    return rule.minMessage || (rule.min === 0 ? label + ' cannot be negative.' : label + ' must be at least ' + rule.min + '.');
                }
                if (rule.max !== undefined && n > rule.max) {
                    return rule.maxMessage || label + ' must be ' + rule.max + ' or less.';
                }
                break;
            }
            case 'date':
                if (!isValidDateString(value)) return rule.message || 'Please enter a valid date.';
                if (rule.notFuture && value > todayString()) return label + ' cannot be in the future.';
                if (rule.notBefore) {
                    const other = resolveEl(rule.notBefore);
                    const otherVal = other ? String(other.value || '').trim() : '';
                    if (otherVal && isValidDateString(otherVal) && value < otherVal) {
                        return rule.notBeforeMessage || label + ' cannot be before ' + (rule.notBeforeLabel || 'the start date') + '.';
                    }
                }
                break;
            case 'datetime':
                if (isNaN(new Date(value).getTime())) return rule.message || 'Please enter a valid date and time.';
                break;
            default:
                break;
        }

        if (rule.maxLength && value.length > rule.maxLength) {
            return label + ' must be ' + rule.maxLength + ' characters or fewer.';
        }
        if (typeof rule.custom === 'function') {
            const customMessage = rule.custom(value);
            if (customMessage) return customMessage;
        }
        return null;
    }

    /**
     * UI.validate([
     *   { el:'s_name', label:'Supplier name', required:true, maxLength:150 },
     *   { el:'s_contact', label:'Contact', required:true, type:'contact' },
     *   { el:'i_qty', label:'Quantity', required:true, type:'int', gt:0 }
     * ])  ->  { valid:boolean, values:{ s_name:'…', … } }
     */
    function validate(rules) {
        let firstInvalid = null;
        const values = {};
        rules.forEach(rule => {
            const el = resolveEl(rule.el);
            if (!el) return;
            clearFieldError(el);
            const value = String(el.value == null ? '' : el.value).trim();
            values[rule.key || el.id || rule.label] = value;
            const message = checkRule(rule, value);
            if (message) {
                fieldError(el, message);
                if (!firstInvalid) firstInvalid = el;
            }
        });
        if (firstInvalid) {
            firstInvalid.focus();
            if (firstInvalid.scrollIntoView) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return { valid: !firstInvalid, values };
    }

    /** Adds the red "*" to every label whose field is marked `required`. */
    function markRequiredLabels(root) {
        (root || document).querySelectorAll('label[for]').forEach(label => {
            const target = document.getElementById(label.getAttribute('for'));
            if (target && target.hasAttribute('required') && !target.readOnly) label.classList.add('required');
        });
    }

    /* =========================================================
       TABLE / BLOCK STATES (loading, empty, error)
       ========================================================= */

    function loadingBlock(text) {
        return '<div class="state-block loading-state" role="status" aria-live="polite">' +
            '<span class="spinner lg" aria-hidden="true"></span><span>' + escapeHtml(text || 'Loading…') + '</span></div>';
    }

    function emptyBlock(opts) {
        opts = opts || {};
        const action = opts.actionLabel
            ? '<div class="state-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="' + opts.actionOnclick + '">' +
              (opts.actionIcon ? '<i class="fas ' + opts.actionIcon + '" aria-hidden="true"></i> ' : '') +
              escapeHtml(opts.actionLabel) + '</button></div>'
            : '';
        return '<div class="state-block empty-state' + (opts.compact ? ' compact' : '') + '">' +
            '<div class="state-icon" aria-hidden="true"><i class="fas ' + (opts.icon || 'fa-folder-open') + '"></i></div>' +
            '<div class="state-title">' + escapeHtml(opts.title || 'Nothing to show yet') + '</div>' +
            (opts.text ? '<div class="state-text">' + escapeHtml(opts.text) + '</div>' : '') +
            action + '</div>';
    }

    function errorBlock(title, retry, retryLabel, detail) {
        const action = retry
            ? '<div class="state-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="' + retry + '">' +
              '<i class="fas fa-redo" aria-hidden="true"></i> ' + escapeHtml(retryLabel || 'Try Again') + '</button></div>'
            : '';
        return '<div class="state-block error-state" role="alert">' +
            '<div class="state-icon" aria-hidden="true"><i class="fas fa-exclamation-triangle"></i></div>' +
            '<div class="state-title">' + escapeHtml(title || 'Something went wrong.') + '</div>' +
            '<div class="state-text">' + escapeHtml(detail || 'Please check your connection and try again.') + '</div>' +
            action + '</div>';
    }

    function wrapRow(cols, inner) {
        return '<tr class="state-row"><td colspan="' + cols + '">' + inner + '</td></tr>';
    }
    function loadingRow(cols, text) { return wrapRow(cols, loadingBlock(text)); }
    function emptyRow(cols, opts)   { return wrapRow(cols, emptyBlock(opts)); }
    function errorRow(cols, title, retry, retryLabel, detail) { return wrapRow(cols, errorBlock(title, retry, retryLabel, detail)); }

    /* =========================================================
       STATUS BADGES / STAGE TRACKER
       ========================================================= */

    const STATUS_CLASS = {
        ACTIVE: 'is-success',   INACTIVE: 'is-neutral',
        OK: 'is-success',       LOW: 'is-danger',
        ENABLED: 'is-success',  DISABLED: 'is-neutral',
        DRAFT: 'is-info',       CONFIRMED: 'is-teal',  SHIPPED: 'is-warning',
        DELIVERED: 'is-success', CANCELLED: 'is-danger',
        PENDING: 'is-neutral',  CUTTING: 'is-warning', SEWING: 'is-purple',
        QC: 'is-info',          PACKING: 'is-teal',    COMPLETED: 'is-success',
        PRESENT: 'is-success',  ABSENT: 'is-danger',   LATE: 'is-warning',
        IN: 'is-success',       OUT: 'is-warning'
    };

    function statusBadge(status, label) {
        const key = String(status == null ? '' : status).toUpperCase();
        const cls = STATUS_CLASS[key] || 'is-neutral';
        return '<span class="status-badge ' + cls + '">' + escapeHtml(label != null ? label : status) + '</span>';
    }

    const STAGE_SEQUENCE = ['PENDING', 'CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];
    const STAGE_DISPLAY  = ['CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];

    function stageTracker(currentStatus) {
        if (currentStatus === 'CANCELLED') return statusBadge('CANCELLED');
        const curIdx = STAGE_SEQUENCE.indexOf(currentStatus);
        const chips = STAGE_DISPLAY.map(stage => {
            const idx = STAGE_SEQUENCE.indexOf(stage);
            let cls = '';
            let icon = '';
            if (currentStatus === 'COMPLETED' || idx < curIdx) { cls = ' done'; icon = '<i class="fas fa-check" aria-hidden="true"></i>'; }
            else if (idx === curIdx) { cls = ' current'; icon = '<i class="fas fa-circle" aria-hidden="true" style="font-size:6px"></i>'; }
            return '<span class="stage-chip' + cls + '">' + icon + escapeHtml(stage) + '</span>';
        }).join('<span class="stage-sep" aria-hidden="true">›</span>');
        const prefix = currentStatus === 'PENDING' ? statusBadge('PENDING') + ' ' : '';
        return '<div class="stage-track" aria-label="Current stage: ' + escapeHtml(currentStatus) + '">' + prefix + chips + '</div>';
    }

    /* =========================================================
       DEEP-LINK FROM DASHBOARD QUICK ACTIONS  (e.g. /suppliers.html#supplierForm)
       ========================================================= */

    function focusFromHash() {
        const id = decodeURIComponent((window.location.hash || '').replace('#', ''));
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        const card = target.closest('.card') || target;
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('flash-highlight');
        setTimeout(() => card.classList.remove('flash-highlight'), 1800);
        const field = target.matches('input,select,textarea')
            ? target
            : target.querySelector('input:not([type="hidden"]):not([readonly]),select,textarea');
        if (field && window.innerWidth > 768) {
            setTimeout(() => { try { field.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 400);
        }
    }

    /* =========================================================
       GLOBAL WIRING
       ========================================================= */

    document.addEventListener('input', e => {
        if (e.target && e.target.classList && e.target.classList.contains('invalid')) clearFieldError(e.target);
    });
    document.addEventListener('change', e => {
        if (e.target && e.target.classList && e.target.classList.contains('invalid')) clearFieldError(e.target);
    });

    // Generic client-side validation for all existing forms. Module-specific
    // validation can still run as before; this capture-phase check prevents
    // clearly invalid data from reaching an API and gives the user inline
    // feedback without changing any backend contract.
    document.addEventListener('submit', e => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement) || !form.hasAttribute('novalidate')) return;

        const fields = Array.from(form.querySelectorAll('input, select, textarea'))
            .filter(el => !el.disabled && el.type !== 'hidden' && !el.readOnly);
        let firstInvalid = null;

        fields.forEach(el => {
            clearFieldError(el);
            const value = String(el.value == null ? '' : el.value).trim();
            let message = null;
            const label = (form.querySelector('label[for="' + CSS.escape(el.id) + '"]') || {}).textContent || el.getAttribute('aria-label') || el.name || 'This field';
            const cleanLabel = label.replace(/\*/g, '').trim();

            if (el.required && !value) {
                message = cleanLabel + ' is required.';
            } else if (value && el.type === 'email' && !isEmail(value)) {
                message = 'Please enter a valid email address.';
            } else if (value && el.type === 'number') {
                const n = Number(value);
                if (!isFinite(n)) message = cleanLabel + ' must be a valid number.';
                else if (el.min !== '' && n < Number(el.min)) message = cleanLabel + ' must be at least ' + el.min + '.';
                else if (el.max !== '' && n > Number(el.max)) message = cleanLabel + ' must be ' + el.max + ' or less.';
            } else if (value && el.type === 'date' && !isValidDateString(value)) {
                message = 'Please enter a valid date.';
            } else if (value && /contact/i.test(el.id || '') && !isEmail(value) && !isPhone(value)) {
                message = 'Please enter a valid phone number or email address.';
            }

            if (message) {
                fieldError(el, message);
                if (!firstInvalid) firstInvalid = el;
            }
        });

        // Common date-range validation used by supplier contracts.
        const start = form.querySelector('input[type="date"][id*="start"], input[type="date"][id*="Start"]');
        const end = form.querySelector('input[type="date"][id*="end"], input[type="date"][id*="End"]');
        if (!firstInvalid && start && end && start.value && end.value && end.value < start.value) {
            fieldError(end, 'End date cannot be before the start date.');
            firstInvalid = end;
        }

        if (firstInvalid) {
            e.preventDefault();
            e.stopImmediatePropagation();
            firstInvalid.focus();
            if (firstInvalid.scrollIntoView) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, true);

    /* =========================================================
       TABLE PAGINATION  ("Showing 1 to 10 of 30 entries" + rows per page)
       Applied automatically to every `.table-wrap > table` (except tables marked
       .compact or data-no-paginate). Purely visual: it only hides/shows rows that
       the page scripts already rendered, so search/filter/CRUD behave as before.
       ========================================================= */

    const PAGE_SIZES = [5, 10, 25, 50];

    function initPager(wrap) {
        if (wrap.dataset.pager === '1') return;
        const table = wrap.querySelector(':scope > table');
        if (!table || table.classList.contains('compact') || table.hasAttribute('data-no-paginate')) return;
        const tbody = table.tBodies[0];
        if (!tbody) return;
        wrap.dataset.pager = '1';

        const state = { page: 1, size: 10 };
        const footer = document.createElement('div');
        footer.className = 'table-footer hidden';
        wrap.insertAdjacentElement('afterend', footer);

        function dataRows() {
            return Array.from(tbody.rows).filter(r => !r.classList.contains('state-row'));
        }

        function pageNumbers(pages, current) {
            if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
            const set = new Set([1, 2, pages - 1, pages, current - 1, current, current + 1]);
            const list = Array.from(set).filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
            const out = [];
            list.forEach((n, i) => {
                if (i && n - list[i - 1] > 1) out.push('…');
                out.push(n);
            });
            return out;
        }

        function render() {
            const rows = dataRows();
            const total = rows.length;
            if (!total) state.page = 1;

            const pages = Math.max(1, Math.ceil(total / state.size));
            if (state.page > pages) state.page = pages;
            const start = (state.page - 1) * state.size;
            const end = Math.min(start + state.size, total);

            rows.forEach((r, i) => r.classList.toggle('pg-hidden', i < start || i >= start + state.size));

            if (total <= PAGE_SIZES[0]) {
                rows.forEach(r => r.classList.remove('pg-hidden'));
                footer.classList.add('hidden');
                footer.innerHTML = '';
                return;
            }

            const buttons = pageNumbers(pages, state.page).map(n => n === '…'
                ? '<span class="pager-gap" aria-hidden="true">…</span>'
                : '<button type="button" class="pager-btn' + (n === state.page ? ' active' : '') + '" data-page="' + n + '"' +
                  ' aria-label="Page ' + n + '"' + (n === state.page ? ' aria-current="page"' : '') + '>' + n + '</button>').join('');

            footer.innerHTML =
                '<div class="table-count">Showing ' + (start + 1) + ' to ' + end + ' of ' + total + ' entries</div>' +
                '<nav class="pager" aria-label="Table pagination">' +
                  '<button type="button" class="pager-btn" data-page="' + (state.page - 1) + '" aria-label="Previous page"' + (state.page === 1 ? ' disabled' : '') + '><i class="fas fa-chevron-left" aria-hidden="true"></i></button>' +
                  buttons +
                  '<button type="button" class="pager-btn" data-page="' + (state.page + 1) + '" aria-label="Next page"' + (state.page === pages ? ' disabled' : '') + '><i class="fas fa-chevron-right" aria-hidden="true"></i></button>' +
                '</nav>' +
                '<label class="rows-select">Rows per page ' +
                  '<select aria-label="Rows per page">' +
                    PAGE_SIZES.map(n => '<option value="' + n + '"' + (n === state.size ? ' selected' : '') + '>' + n + '</option>').join('') +
                  '</select></label>';
            footer.classList.remove('hidden');
        }

        footer.addEventListener('click', e => {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            state.page = Number(btn.dataset.page);
            render();
            wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        footer.addEventListener('change', e => {
            if (e.target.matches('select')) {
                state.size = Number(e.target.value);
                state.page = 1;
                render();
            }
        });

        // Re-apply whenever the page script re-renders the table body.
        new MutationObserver(render).observe(tbody, { childList: true });
        render();
    }

    function initAllPagers() {
        document.querySelectorAll('.table-wrap').forEach(initPager);
    }

    document.addEventListener('DOMContentLoaded', () => {
        markRequiredLabels();
        initAllPagers();
        setTimeout(focusFromHash, 250);
    });

    return {
        // notifications
        toast,
        success: (m) => toast(m, 'success'),
        error:   (m) => toast(m, 'error'),
        warn:    (m) => toast(m, 'warn'),
        info:    (m) => toast(m, 'info'),
        // dialogs & buttons
        confirm: confirmDialog,
        setBusy, guard,
        // validation
        validate, fieldError, clearFieldError, clearErrors, markRequiredLabels,
        // states
        loadingBlock, emptyBlock, errorBlock, loadingRow, emptyRow, errorRow,
        // visuals
        statusBadge, stageTracker,
        // formatting
        formatDate, formatDateTime, formatMoney, todayString, datePart, parseDate,
        // tables
        initPager,
        // misc
        focusFromHash
    };
})();
