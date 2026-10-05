let currentAttendanceEmployeeId = null;

// ===============================
// INITIALIZE
// ===============================
(async function init() {
    const user = await requireLogin();
    if (!user) return;

    const today = new Date();

    document.getElementById('summary_year').value =
        today.getFullYear();

    document.getElementById('summary_month').value =
        today.getMonth() + 1;

    await loadEmployees();
})();


// ===============================
// PBI-21 / PBI-23
// REGISTER / UPDATE EMPLOYEE
// ===============================
document.getElementById('employeeForm').addEventListener('submit', async (e) => {

    e.preventDefault();
    hideAlert('pageAlert');

    const id = document.getElementById('e_id').value;

    const payload = {
        name: document.getElementById('e_name').value.trim(),
        dob: document.getElementById('e_dob').value,
        department: document.getElementById('e_department').value.trim(),
        role: document.getElementById('e_role').value.trim()
    };

    try {

        if (id) {

            // UPDATE EXISTING EMPLOYEE
            await api.put(`/api/employees/${id}`, payload);

            showAlert(
                'pageAlert',
                'Employee updated successfully.',
                'success'
            );

        } else {

            // REGISTER NEW EMPLOYEE
            await api.post('/api/employees', payload);

            showAlert(
                'pageAlert',
                'Employee registered successfully.',
                'success'
            );
        }

        resetEmployeeForm();

        await loadEmployees();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
});


// ===============================
// EDIT EMPLOYEE
// ===============================
async function editEmployee(id) {

    hideAlert('pageAlert');

    try {

        // Get the employee from backend
        const employee = await api.get(`/api/employees/${id}`);

        // Put employee data into the form
        document.getElementById('e_id').value =
            employee.id;

        document.getElementById('e_name').value =
            employee.name || '';

        document.getElementById('e_dob').value =
            employee.dob || '';

        document.getElementById('e_department').value =
            employee.department || '';

        document.getElementById('e_role').value =
            employee.role || '';

        // Change form title
        document.getElementById('employeeFormTitle').textContent =
            'Update Employee #' + employee.id;

        // Change button text
        document.getElementById('employeeSubmitBtn').textContent =
            'Update Employee';

        // Show Cancel button
        document.getElementById('employeeCancelEditBtn')
            .classList.remove('hidden');

        // Scroll to the form
        document.getElementById('employeeForm')
            .scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// ===============================
// RESET EMPLOYEE FORM
// ===============================
function resetEmployeeForm() {

    document.getElementById('employeeForm').reset();

    document.getElementById('e_id').value = '';

    document.getElementById('employeeFormTitle').textContent =
        'Register New Employee';

    document.getElementById('employeeSubmitBtn').textContent =
        'Register Employee';

    document.getElementById('employeeCancelEditBtn')
        .classList.add('hidden');
}


// ===============================
// LOAD EMPLOYEES
// ===============================
async function loadEmployees() {

    try {

        const employees =
            await api.get('/api/employees');

        renderEmployees(employees);

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// ===============================
// RENDER EMPLOYEE TABLE
// ===============================
function renderEmployees(employees) {

    const tbody =
        document.getElementById('employeeTableBody');

    if (!employees.length) {

        tbody.innerHTML =
            '<tr><td colspan="6" class="small-text">No employees found.</td></tr>';

        return;
    }

    tbody.innerHTML = employees.map(emp => {

        const name =
            escapeHtml(emp.name);

        const department =
            escapeHtml(emp.department);

        const role =
            escapeHtml(emp.role);

        return `
            <tr>

                <td>${emp.id}</td>

                <td>${name}</td>

                <td>${department}</td>

                <td>${role}</td>

                <td>
                    <span class="badge ${emp.status === 'ACTIVE' ? 'ok' : 'low'}">
                        ${emp.status}
                    </span>
                </td>

                <td>

                    <button
                        class="secondary"
                        onclick="editEmployee(${emp.id})">
                        Edit
                    </button>

                    <button
                        class="secondary"
                        onclick="openAttendancePanel(
                            ${emp.id},
                            '${escapeJsString(emp.name)}'
                        )">
                        Attendance
                    </button>

                    ${
            emp.status === 'ACTIVE'
                ?
                `<button
                            class="danger"
                            onclick="deactivateEmployee(${emp.id})">
                            Deactivate
                        </button>`
                :
                ''
        }

                    <button
                        class="danger"
                        onclick="permanentlyDeleteEmployee(${emp.id})">
                        Permanent Delete
                    </button>

                </td>

            </tr>
        `;

    }).join('');
}


// ===============================
// PBI-24
// DEACTIVATE EMPLOYEE
// ===============================
async function deactivateEmployee(id) {

    if (!confirm(
        'Deactivate this employee? Their records will be kept, but they will be hidden from the active employee list.'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.patch(
            `/api/employees/${id}/deactivate`
        );

        showAlert(
            'pageAlert',
            'Employee deactivated.',
            'success'
        );

        await loadEmployees();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// ===============================
// PERMANENT DELETE EMPLOYEE
// (separate from PBI-24 deactivate - the row is really removed)
// ===============================
async function permanentlyDeleteEmployee(id) {

    if (!confirm(
        'Are you sure you want to permanently delete this employee? ' +
        'The employee and all of their attendance records will be removed ' +
        'from the database. This action cannot be undone.\n\n' +
        '(To keep the record, use Deactivate instead.)'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.del(
            `/api/employees/${id}/permanent`
        );

        // Close any panel/form that was showing the deleted employee.
        if (currentAttendanceEmployeeId === id) {
            closeAttendancePanel();
        }

        if (document.getElementById('e_id').value === String(id)) {
            resetEmployeeForm();
        }

        showAlert(
            'pageAlert',
            'Employee permanently deleted.',
            'success'
        );

        await loadEmployees();

    } catch (err) {

        showAlert(
            'pageAlert',
            'Could not permanently delete employee: ' + err.message,
            'error'
        );

        await loadEmployees();
    }
}


// ===============================
// PBI-22
// OPEN ATTENDANCE PANEL
// ===============================
function openAttendancePanel(employeeId, employeeName) {

    currentAttendanceEmployeeId =
        employeeId;

    document.getElementById(
        'attendanceEmployeeName'
    ).textContent = employeeName;

    document.getElementById(
        'attendancePanel'
    ).classList.remove('hidden');

    document.getElementById(
        'a_date'
    ).valueAsDate = new Date();

    document.getElementById(
        'attendanceSummaryBody'
    ).innerHTML =
        '<p class="small-text">Pick a year/month and click "View Summary".</p>';

    document.getElementById(
        'attendancePanel'
    ).scrollIntoView({
        behavior: 'smooth'
    });
}


// ===============================
// CLOSE ATTENDANCE PANEL
// ===============================
function closeAttendancePanel() {

    currentAttendanceEmployeeId = null;

    document.getElementById(
        'attendancePanel'
    ).classList.add('hidden');
}


// ===============================
// MARK ATTENDANCE
// ===============================
document.getElementById('attendanceForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        hideAlert('pageAlert');

        const payload = {

            date:
            document.getElementById('a_date').value,

            status:
            document.getElementById('a_status').value
        };

        try {

            await api.post(
                `/api/employees/${currentAttendanceEmployeeId}/attendance`,
                payload
            );

            showAlert(
                'pageAlert',
                'Attendance recorded.',
                'success'
            );

        } catch (err) {

            showAlert(
                'pageAlert',
                err.message,
                'error'
            );
        }
    });


// ===============================
// PBI-25
// MONTHLY ATTENDANCE SUMMARY
// ===============================
async function loadAttendanceSummary() {

    const year =
        document.getElementById('summary_year').value;

    const month =
        document.getElementById('summary_month').value;

    if (!currentAttendanceEmployeeId) {

        showAlert(
            'pageAlert',
            'Please select an employee first.',
            'error'
        );

        return;
    }

    try {

        const summary =
            await api.get(
                `/api/employees/${currentAttendanceEmployeeId}/attendance/summary?year=${year}&month=${month}`
            );

        const body =
            document.getElementById(
                'attendanceSummaryBody'
            );

        body.innerHTML = `

            <table>

                <thead>
                    <tr>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                    </tr>
                </thead>

                <tbody>

                    <tr>
                        <td>${summary.PRESENT || 0}</td>
                        <td>${summary.ABSENT || 0}</td>
                        <td>${summary.LATE || 0}</td>
                    </tr>

                </tbody>

            </table>
        `;

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// ===============================
// HTML ESCAPE
// ===============================
function escapeHtml(str) {

    const div =
        document.createElement('div');

    div.textContent =
        str ?? '';

    return div.innerHTML;
}


// ===============================
// JAVASCRIPT STRING ESCAPE
// ===============================
function escapeJsString(str) {

    return String(str ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}