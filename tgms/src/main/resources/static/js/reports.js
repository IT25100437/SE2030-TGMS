let currentReportType = 'ORDERS';

const reportNames = {ORDERS:'Orders / Sales', INVENTORY:'Inventory', PRODUCTION:'Production', EMPLOYEES:'Employees', SUPPLIERS:'Suppliers'};

(async function init(){
    const user = await requireLogin();
    if (!user) return;
    if (user.role !== 'ADMIN') {
        document.getElementById('pageAlert').textContent = 'You do not have permission to access Reports & Analytics.';
        document.getElementById('pageAlert').className = 'alert error';
        return;
    }
    await Promise.all([loadKpis(), loadSchedules(), loadPins()]);
    await generateReport();
})();

function showPageMessage(message,type='success'){ showAlert('pageAlert',message,type); }

async function loadKpis(){
    try{
        const k = await api.get('/api/reports/kpis');
        const labels={totalOrders:'Total Orders',confirmedOrders:'Confirmed Orders',shippedOrders:'Shipped Orders',deliveredOrders:'Delivered Orders',totalSales:'Total Sales',totalInventoryItems:'Inventory Items',lowStockItems:'Low Stock Items',activeSuppliers:'Active Suppliers',activeEmployees:'Active Employees',activeWorkOrders:'Active Work Orders',completedWorkOrders:'Completed Work Orders'};
        document.getElementById('kpiGrid').innerHTML=Object.entries(labels).map(([key,label])=>`<div class="kpi"><div class="value">${k[key] ?? 0}</div><div class="label">${label}</div></div>`).join('');
    }catch(e){showPageMessage(e.message,'error');}
}

async function generateReport(){
    currentReportType=document.getElementById('reportType').value;
    try{
        const rows=await api.get('/api/reports/'+currentReportType.toLowerCase());
        const table=document.getElementById('reportTable');
        const head=table.querySelector('thead'), body=table.querySelector('tbody');
        head.innerHTML=''; body.innerHTML='';
        if(!rows.length){body.innerHTML='<tr><td>No records found.</td></tr>';document.getElementById('reportActions').classList.remove('hidden');return;}
        const headers=Object.keys(rows[0]);
        head.innerHTML='<tr>'+headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')+'</tr>';
        body.innerHTML=rows.map(r=>'<tr>'+headers.map(h=>`<td>${escapeHtml(r[h])}</td>`).join('')+'</tr>').join('');
        document.getElementById('reportActions').classList.remove('hidden');
    }catch(e){showPageMessage(e.message,'error');}
}

async function loadSchedules(){
    const rows=await api.get('/api/reports/schedules');
    const body=document.querySelector('#scheduleTable tbody');
    body.innerHTML=rows.length?rows.map(s=>`<tr><td>${escapeHtml(reportNames[s.reportType]||s.reportType)}</td><td>${escapeHtml(s.frequency)}</td><td>${formatDate(s.scheduledTime)}</td><td>${s.enabled?'Enabled':'Disabled'}</td><td><button class="link-btn" onclick="editSchedule(${s.id})">Edit</button> <button class="link-btn" onclick="deleteSchedule(${s.id})">Permanent Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No scheduled reports.</td></tr>';
    window.schedules=rows;
}

function editSchedule(id){const s=window.schedules.find(x=>x.id===id);if(!s)return;document.getElementById('scheduleId').value=s.id;document.getElementById('scheduleType').value=s.reportType;document.getElementById('frequency').value=s.frequency;document.getElementById('scheduledTime').value=s.scheduledTime.slice(0,16);document.getElementById('enabled').value=String(s.enabled);document.getElementById('scheduleForm').classList.remove('hidden');}

async function deleteSchedule(id){if(!confirm('Are you sure you want to permanently delete this scheduled report? The schedule will be removed from the database. This action cannot be undone.'))return;try{await api.del('/api/reports/schedules/'+id);if(document.getElementById('scheduleId').value===String(id)){document.getElementById('scheduleForm').reset();document.getElementById('scheduleId').value='';document.getElementById('scheduleForm').classList.add('hidden');}showPageMessage('Scheduled report permanently deleted.');await loadSchedules();}catch(e){showPageMessage('Could not permanently delete scheduled report: '+e.message,'error');await loadSchedules();}}

async function loadPins(){const rows=await api.get('/api/reports/pins');document.getElementById('pins').innerHTML=rows.length?rows.map(p=>`<div class="pin"><span>${escapeHtml(p.reportName)}</span><button class="link-btn" onclick="unpin(${p.id})">Unpin</button></div>`).join(''):'<span class="small-text">No pinned reports yet.</span>';}
async function unpin(id){if(!confirm('Unpin this report?'))return;try{await api.del('/api/reports/pins/'+id);showPageMessage('Report unpinned.');await loadPins();}catch(e){showPageMessage(e.message,'error');}}

async function pinCurrent(){try{await api.post('/api/reports/pins',{reportType:currentReportType,reportName:reportNames[currentReportType]});showPageMessage('Report pinned.');await loadPins();}catch(e){showPageMessage(e.message,'error');}}

document.getElementById('reportType').addEventListener('change',generateReport);
document.getElementById('generateBtn').addEventListener('click',generateReport);
document.getElementById('pinBtn').addEventListener('click',pinCurrent);
document.getElementById('excelBtn').addEventListener('click',()=>window.location.href='/api/reports/'+currentReportType.toLowerCase()+'/excel');
document.getElementById('pdfBtn').addEventListener('click',()=>window.location.href='/api/reports/'+currentReportType.toLowerCase()+'/pdf');
document.getElementById('newScheduleBtn').addEventListener('click',()=>{document.getElementById('scheduleId').value='';document.getElementById('scheduleForm').reset();document.getElementById('scheduleForm').classList.remove('hidden');});
document.getElementById('cancelSchedule').addEventListener('click',()=>document.getElementById('scheduleForm').classList.add('hidden'));
document.getElementById('scheduleForm').addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('scheduleId').value;const payload={reportType:document.getElementById('scheduleType').value,frequency:document.getElementById('frequency').value,scheduledTime:document.getElementById('scheduledTime').value,enabled:document.getElementById('enabled').value==='true'};try{if(id)await api.put('/api/reports/schedules/'+id,payload);else await api.post('/api/reports/schedules',payload);document.getElementById('scheduleForm').classList.add('hidden');showPageMessage(id?'Schedule updated.':'Schedule created.');await loadSchedules();}catch(e){showPageMessage(e.message,'error');}});

function formatDate(v){return v?new Date(v).toLocaleString():'-';}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
