// ===== SOVEREIGN LEDGER v4.0 — Core Logic =====

const DEFAULT_DB = {
    roles: {
        treasury: { label: "Treasury Minister", password: "treasury" },
        beac: { label: "BEAC Bank Validator", password: "beac" },
        ministry: { label: "Ministry Officer", password: "ministry" },
        public: { label: "Public Citizen", password: "" }
    },
    ministries: [
        "Ministry of Public Works (MINTP)",
        "Ministry of Finance (MINFI)",
        "Ministry of Public Health (MINSANTÉ)",
        "Ministry of Secondary Education (MINESEC)",
        "Ministry of Defense (MINDEF)",
        "Ministry of Agriculture & Rural Development (MINADER)",
        "Ministry of Transport (MINT)",
        "Ministry of Water & Energy (MINEE)",
        "Ministry of Territorial Administration (MINAT)",
        "Ministry of Economy, Planning & Regional Development (MINEPAT)",
        "Ministry of Housing & Urban Development (MINHDU)",
        "Ministry of Livestock, Fisheries & Animal Industries (MINEPIA)",
        "Ministry of Posts & Telecommunications (MINPOSTEL)",
        "Ministry of Arts & Culture (MINAC)",
        "Ministry of Youth & Civic Education (MINJEC)",
        "Ministry of Women's Empowerment & Family (MINPROFF)"
    ],
    beacBranches: [
        "BEAC — Siège Yaoundé",
        "BEAC — Agence de Douala",
        "BEAC — Agence de Garoua",
        "BEAC — Agence de Bafoussam"
    ],
    clearingBanks: [
        "Afriland First Bank",
        "Société Générale Cameroun",
        "BICEC",
        "Ecobank Cameroun",
        "SCB Cameroun",
        "UBA Cameroun",
        "CCA Bank",
        "Banque Atlantique Cameroun",
        "CBC — Commercial Bank of Cameroon"
    ],
    allocations: [
        {
            id: "A-0001",
            ministry: "Ministry of Public Works (MINTP)",
            title: "Yaoundé — Douala Highway Rest Station Procurement",
            amount: 500000000,
            clearingBank: "Ecobank Cameroun",
            status: "validated",
            createdBy: "treasury",
            createdAt: "2025-05-15T10:30:00.000Z",
            validatedBy: "BEAC — Siège Yaoundé",
            validatedAt: "2025-05-16T08:15:00.000Z",
            flowNodes: [
                { type: "info", step: "01 — Ministry Request", title: "Request Submitted", actor: "Ministry of Public Works (MINTP)", detail: "Ministry identified need for highway rest station project.", hash: "0xREQ_001" },
                { type: "success", step: "02 — Treasury Allocation", title: "Funds Allocated", actor: "Treasury (MINFI)", detail: "Treasury allocated 500,000,000 FCFA via Ecobank Cameroun clearing.", hash: "0xALLOC_A0001" },
                { type: "success", step: "03 — BEAC Validation", title: "Funds Validated & Locked", actor: "BEAC — Siège Yaoundé", detail: "BEAC confirmed physical reserves. 500M FCFA locked in escrow, digital tokens minted.", hash: "0xVAL_001" }
            ]
        }
    ],
    requests: []
};

let DB = loadDB();
let currentUser = null;
let currentTreasuryTab = 'dashboard';
let currentBeacTab = 'pending';
let currentMinistryTab = 'myfunds';
let currentPublicTab = 'overview';

// ===== DB PERSISTENCE =====
function loadDB() {
    try {
        const stored = localStorage.getItem('swl_db');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_DB));
}

function saveDB() {
    try {
        localStorage.setItem('swl_db', JSON.stringify(DB));
    } catch (e) {
        showToast('Warning: Could not persist data to localStorage.');
    }
}

function resetDB() {
    DB = JSON.parse(JSON.stringify(DEFAULT_DB));
    saveDB();
}

function generateId(prefix) {
    const count = DB.allocations.length + DB.requests.length + 1;
    return prefix + '-' + String(count).padStart(4, '0');
}

function formatFCFA(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B FCFA';
    if (num >= 1e6) return (num / 1e6).toFixed(0) + 'M FCFA';
    return num.toLocaleString() + ' FCFA';
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ===== LOGIN =====
function handleRoleChange() {
    const role = document.getElementById('loginRole').value;
    const instSelect = document.getElementById('loginInstitution');
    const instLabel = document.getElementById('institutionLabel');
    instSelect.innerHTML = '<option value="">Select Institution...</option>';

    if (role === 'ministry') {
        instLabel.textContent = 'Your Ministry';
        DB.ministries.forEach(m => {
            instSelect.innerHTML += `<option value="${m}">${m}</option>`;
        });
    } else if (role === 'beac') {
        instLabel.textContent = 'BEAC Branch';
        DB.beacBranches.forEach(b => {
            instSelect.innerHTML += `<option value="${b}">${b}</option>`;
        });
    } else if (role === 'treasury') {
        instLabel.textContent = 'Institution';
        instSelect.innerHTML += `<option value="Ministry of Finance (MINFI)">Ministry of Finance (MINFI)</option>`;
    }
}

function handleLogin() {
    const role = document.getElementById('loginRole').value;
    const institution = document.getElementById('loginInstitution').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (!role || !institution || !password) {
        errorEl.textContent = 'Please select role, institution, and enter your password.';
        errorEl.classList.add('show');
        return;
    }

    const roleConfig = DB.roles[role];
    if (!roleConfig || password !== roleConfig.password) {
        errorEl.textContent = 'Invalid password for this role. Access denied.';
        errorEl.classList.add('show');
        return;
    }

    currentUser = { role, institution, label: roleConfig.label };

    document.getElementById('sessionLabel').textContent =
        `${roleConfig.label} — ${institution.split('(')[0].trim()}`;
    document.getElementById('loginOverlay').classList.add('hidden');
    errorEl.classList.remove('show');

    document.getElementById('loginPassword').value = '';

    showRoleView();
}

function handleLogout() {
    currentUser = null;
    currentPublicTab = 'overview';
    document.getElementById('sessionLabel').textContent = 'Guest';
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.querySelectorAll('.role-view').forEach(v => v.classList.remove('active'));
    document.getElementById('loginPassword').value = '';
}

function handlePublicAccess() {
    currentUser = { role: 'public', institution: 'Public', label: 'Public Citizen' };
    document.getElementById('sessionLabel').textContent = 'Public Citizen';
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('loginError').classList.remove('show');
    showRoleView();
}

// ===== ROLE VIEW SWITCHING =====
function showRoleView() {
    document.querySelectorAll('.role-view').forEach(v => v.classList.remove('active'));

    if (!currentUser) return;

    if (currentUser.role === 'treasury') {
        document.getElementById('treasuryView').classList.add('active');
        populateAllocateForm();
        renderTreasuryView();
    } else if (currentUser.role === 'beac') {
        document.getElementById('beacView').classList.add('active');
        document.getElementById('beacBranchLabel').textContent =
            currentUser.institution.split('—')[0]?.trim() || currentUser.institution;
        renderBeacView();
    } else if (currentUser.role === 'ministry') {
        document.getElementById('ministryView').classList.add('active');
        document.getElementById('ministrySidebarTitle').textContent =
            currentUser.institution.split('(')[0].trim() + ' Terminal';
        document.getElementById('ministrySidebarSub').textContent = currentUser.institution;
        renderMinistryView();
    } else if (currentUser.role === 'public') {
        document.getElementById('publicView').classList.add('active');
        renderPublicOverview();
    }
}

// ===== TREASURY =====
function switchTreasuryTab(tab) {
    currentTreasuryTab = tab;
    document.querySelectorAll('#treasuryView .sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#treasuryView .treasury-tab').forEach(t => t.style.display = 'none');
    const idx = { dashboard: 0, allocate: 1, history: 2 };
    document.querySelectorAll('#treasuryView .sidebar-btn')[idx[tab]].classList.add('active');
    document.getElementById('treasury' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    if (tab === 'allocate') populateAllocateForm();
    renderTreasuryView();
}

function populateAllocateForm() {
    const sel = document.getElementById('allocMinistry');
    sel.innerHTML = '<option value="">Select Ministry...</option>';
    DB.ministries.forEach(m => { sel.innerHTML += `<option value="${m}">${m}</option>`; });

    const bankSel = document.getElementById('allocClearingBank');
    bankSel.innerHTML = '<option value="">Select Clearing Bank...</option>';
    DB.clearingBanks.forEach(b => { bankSel.innerHTML += `<option value="${b}">${b}</option>`; });
}

function renderTreasuryView() {
    const allocations = DB.allocations;
    const requests = DB.requests || [];

    const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
    const pendingValidations = allocations.filter(a => a.status === 'pending_validation').length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;

    document.getElementById('treasuryKPI').innerHTML = `
        <div class="kpi-tile accent-blue">
            <div class="kpi-label">Total Allocated</div>
            <div class="kpi-value">${formatFCFA(totalAllocated)}</div>
            <div class="kpi-sub">${allocations.length} allocation${allocations.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="kpi-tile accent-amber">
            <div class="kpi-label">Awaiting BEAC Validation</div>
            <div class="kpi-value">${pendingValidations}</div>
            <div class="kpi-sub">Pending bank signature</div>
        </div>
        <div class="kpi-tile accent-emerald">
            <div class="kpi-label">Ministry Requests</div>
            <div class="kpi-value">${pendingRequests}</div>
            <div class="kpi-sub">Awaiting decision</div>
        </div>`;

    // Pending requests
    const reqList = document.getElementById('treasuryRequestsList');
    if (pendingRequests === 0) {
        reqList.innerHTML = '<div class="empty-state"><p>No pending ministry requests.</p></div>';
    } else {
        reqList.innerHTML = requests
            .filter(r => r.status === 'pending')
            .map(r => `
                <div class="request-card">
                    <div class="request-info">
                        <div class="request-meta">${r.ministry.split('(')[0].trim()} · ${formatDate(r.createdAt)}</div>
                        <div class="request-title">${r.title}</div>
                        <div style="font-size:0.72rem; color:var(--slate-600); margin-top:0.2rem;">
                            Estimated: ${formatFCFA(r.estimatedBudget || 0)} ${r.reason ? '· ' + r.reason : ''}
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="btn-sm btn-accept" onclick="acceptRequest('${r.id}')">Allocate</button>
                    </div>
                </div>`).join('');
    }

    // History
    document.getElementById('treasuryAllHistory').innerHTML = renderAllocationTable(allocations, 'treasury');
}

function handleAllocate(e) {
    e.preventDefault();
    const ministry = document.getElementById('allocMinistry').value;
    const title = document.getElementById('allocTitle').value.trim();
    const rawAmount = document.getElementById('allocAmount').value;
    const clearingBank = document.getElementById('allocClearingBank').value;

    if (!ministry || !title || !clearingBank) {
        showToast('Please fill in all fields.');
        return;
    }

    const amountNum = parseInt(rawAmount.replace(/,/g, ''));
    if (!amountNum || amountNum <= 0) {
        showToast('Please enter a valid budget amount.');
        return;
    }

    const allocId = generateId('A');
    const newAlloc = {
        id: allocId,
        ministry,
        title,
        amount: amountNum,
        clearingBank,
        status: 'pending_validation',
        createdBy: 'treasury',
        createdAt: new Date().toISOString(),
        validatedBy: null,
        validatedAt: null,
        flowNodes: [
            {
                type: "info",
                step: "01 — Treasury Allocation",
                title: "Funds Allocated by Treasury",
                actor: "Treasury (MINFI)",
                detail: `Treasury allocated ${formatFCFA(amountNum)} to ${ministry.split('(')[0].trim()} for project "${title}". Settlement will clear through ${clearingBank}.`,
                hash: "0xALLOC_" + allocId
            }
        ]
    };

    DB.allocations.push(newAlloc);
    saveDB();

    document.getElementById('allocTitle').value = '';
    document.getElementById('allocAmount').value = '';
    document.getElementById('allocMinistry').value = '';
    document.getElementById('allocClearingBank').value = '';

    switchTreasuryTab('dashboard');
    flashElement(document.getElementById('treasuryKPI'));
    showToast(`Allocation ${newAlloc.id} created — ${formatFCFA(amountNum)} sent to BEAC for validation.`);
}

function acceptRequest(reqId) {
    const req = (DB.requests || []).find(r => r.id === reqId);
    if (!req) return;

    req.status = 'accepted';

    document.getElementById('allocMinistry').value = req.ministry;
    document.getElementById('allocTitle').value = req.title;
    document.getElementById('allocAmount').value = (req.estimatedBudget || 0).toLocaleString();

    saveDB();
    switchTreasuryTab('allocate');
    showToast('Request accepted. Fill in the clearing bank and submit the allocation.');
}

function renderAllocationTable(allocations, viewType) {
    if (allocations.length === 0) {
        return '<div class="empty-state"><p>No allocations yet.</p></div>';
    }

    let rows = allocations.map(a => `
        <tr>
            <td class="mono">${a.id}</td>
            <td>${a.ministry.split('(')[0].trim()}</td>
            <td>${a.title}</td>
            <td class="mono">${formatFCFA(a.amount)}</td>
            <td>${a.clearingBank}</td>
            <td><span class="status-badge ${a.status === 'validated' ? 'validated' : 'pending'}">${a.status === 'validated' ? 'Validated' : 'Pending BEAC'}</span></td>
            <td>${formatDate(a.createdAt)}</td>
            ${viewType === 'treasury' ? `<td>${a.validatedBy || '—'}</td>` : ''}
        </tr>`).join('');

    const extraCol = viewType === 'treasury'
        ? '<th>Validated By</th>'
        : '';

    return `
        <table class="data-table">
            <thead><tr><th>ID</th><th>Ministry</th><th>Project</th><th>Amount</th><th>Clearing Bank</th><th>Status</th><th>Created</th>${extraCol}</tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// ===== BEAC =====
function switchBeacTab(tab) {
    currentBeacTab = tab;
    document.querySelectorAll('#beacView .sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#beacView .beac-tab').forEach(t => t.style.display = 'none');
    const idx = { pending: 0, validated: 1 };
    document.querySelectorAll('#beacView .sidebar-btn')[idx[tab]].classList.add('active');
    document.getElementById('beac' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    renderBeacView();
}

function renderBeacView() {
    if (!currentUser || currentUser.role !== 'beac') return;
    const pending = DB.allocations.filter(a => a.status === 'pending_validation');
    const validated = DB.allocations.filter(a => a.status === 'validated' && a.validatedBy === currentUser.institution);

    if (pending.length === 0) {
        document.getElementById('beacPendingList').innerHTML =
            '<div class="empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><p>No allocations awaiting validation.</p></div>';
    } else {
        document.getElementById('beacPendingList').innerHTML = pending.map(a => `
            <div class="request-card">
                <div class="request-info">
                    <div class="request-meta">${a.id} · ${a.ministry.split('(')[0].trim()} · ${formatDate(a.createdAt)}</div>
                    <div class="request-title">${a.title}</div>
                    <div style="font-size:0.72rem; color:var(--slate-600); margin-top:0.2rem;">
                        ${formatFCFA(a.amount)} · Clears via ${a.clearingBank}
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-sm btn-validate" onclick="validateAllocation('${a.id}')">Validate & Lock</button>
                </div>
            </div>`).join('');
    }

    document.getElementById('beacValidatedList').innerHTML = validated.length === 0
        ? '<div class="empty-state"><p>No validated allocations by your branch.</p></div>'
        : renderAllocationTable(validated, 'beac');
}

function validateAllocation(allocId) {
    const alloc = DB.allocations.find(a => a.id === allocId);
    if (!alloc || alloc.status !== 'pending_validation') return;

    alloc.status = 'validated';
    alloc.validatedBy = currentUser.institution;
    alloc.validatedAt = new Date().toISOString();

    alloc.flowNodes.push({
        type: "success",
        step: "02 — BEAC Validation",
        title: "Funds Validated & Locked in Escrow",
        actor: currentUser.institution,
        detail: `BEAC confirmed that ${formatFCFA(alloc.amount)} is available in sovereign reserves. Physical fiat locked, digital tokens minted into project escrow. Funds are now traceable by ${alloc.ministry.split('(')[0].trim()}.`,
        hash: "0xVAL_" + alloc.id
    });

    saveDB();
    renderBeacView();
    flashElement(document.getElementById('beacValidatedList'));
    showToast(`Allocation ${alloc.id} validated. ${formatFCFA(alloc.amount)} locked in escrow.`);
}

// ===== UI HELPERS =====
function flashElement(el) {
    if (!el) return;
    el.classList.remove('alloc-success-flash', 'validate-success-flash');
    void el.offsetWidth;
    el.classList.add('alloc-success-flash');
}

// ===== MINISTRY =====
function switchMinistryTab(tab) {
    currentMinistryTab = tab;
    document.querySelectorAll('#ministryView .sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#ministryView .ministry-tab').forEach(t => t.style.display = 'none');
    const idx = { myfunds: 0, request: 1, trace: 2 };
    document.querySelectorAll('#ministryView .sidebar-btn')[idx[tab]].classList.add('active');
    document.getElementById('ministry' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    renderMinistryView();
}

function renderMinistryView() {
    if (!currentUser || currentUser.role !== 'ministry') return;
    const myAlloc = DB.allocations.filter(a => a.ministry === currentUser.institution);
    const myRequests = (DB.requests || []).filter(r => r.ministry === currentUser.institution);

    // My Allocations
    if (myAlloc.length === 0) {
        document.getElementById('ministryAllocationsList').innerHTML =
            '<div class="empty-state"><p>No allocations to your ministry yet. Treasury has not allocated any funds.</p></div>';
    } else {
        document.getElementById('ministryAllocationsList').innerHTML = myAlloc.map(a => {
            const canTrace = a.status === 'validated';
            return `
            <div class="request-card">
                <div class="request-info">
                    <div class="request-meta">${a.id} · ${formatDate(a.createdAt)}</div>
                    <div class="request-title">${a.title}</div>
                    <div style="font-size:0.72rem; color:var(--slate-600); margin-top:0.2rem;">
                        ${formatFCFA(a.amount)} · <span class="status-badge ${a.status === 'validated' ? 'validated' : 'pending'}">${a.status === 'validated' ? 'Validated & Locked' : 'Awaiting BEAC'}</span>
                        ${a.clearingBank ? '· ' + a.clearingBank : ''}
                    </div>
                </div>
                <div class="request-actions">
                    ${canTrace
                        ? `<button class="btn-sm btn-trace" onclick="traceAllocation('${a.id}')">Trace Path</button>`
                        : `<span style="font-size:0.68rem; color:var(--slate-400);">Awaiting validation</span>`}
                </div>
            </div>`;
        }).join('');
    }

    // Trace select
    if (myAlloc.length > 0) {
        const validated = myAlloc.filter(a => a.status === 'validated');
        document.getElementById('ministryTraceSelect').innerHTML = `
            <div class="trace-select-row">
                <div class="form-group">
                    <label class="form-label">Select Allocation to Trace</label>
                    <select class="form-select" id="traceAllocSelect" onchange="traceAllocation(this.value)">
                        <option value="">Choose an allocation...</option>
                        ${validated.map(a => `<option value="${a.id}">${a.id} — ${a.title}</option>`).join('')}
                    </select>
                </div>
            </div>`;
    } else {
        document.getElementById('ministryTraceSelect').innerHTML = '';
    }
}

function handleMinistryRequest(e) {
    e.preventDefault();
    const title = document.getElementById('requestTitle').value.trim();
    const budgetRaw = document.getElementById('requestBudget').value;
    const reason = document.getElementById('requestReason').value.trim();

    if (!title || !budgetRaw) {
        showToast('Please enter a project title and estimated budget.');
        return;
    }

    const budget = parseInt(budgetRaw.replace(/,/g, ''));
    if (!budget || budget <= 0) {
        showToast('Please enter a valid budget amount.');
        return;
    }

    const newReq = {
        id: generateId('REQ'),
        ministry: currentUser.institution,
        title,
        estimatedBudget: budget,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    DB.requests.push(newReq);
    saveDB();

    document.getElementById('requestTitle').value = '';
    document.getElementById('requestBudget').value = '';
    document.getElementById('requestReason').value = '';

    renderMinistryView();
    showToast(`Request ${newReq.id} submitted to Treasury for review.`);
}

function traceAllocation(allocId) {
    if (!allocId) return;

    switchMinistryTab('trace');
    document.getElementById('traceAllocSelect').value = allocId;

    const alloc = DB.allocations.find(a => a.id === allocId);
    if (!alloc) return;

    document.getElementById('traceDesc').textContent =
        `Audit trail for ${alloc.id}: ${alloc.title} (${formatFCFA(alloc.amount)})`;

    const output = document.getElementById('ministryTraceOutput');
    if (!alloc.flowNodes || alloc.flowNodes.length === 0) {
        output.innerHTML = '<div class="empty-state"><p>No ledger entries yet for this allocation.</p></div>';
        return;
    }

    output.innerHTML = `
        <div class="timeline">
            ${alloc.flowNodes.map(n => `
                <div class="timeline-node ${n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : 'info'}">
                    <div class="timeline-dot">${n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : 'ℹ'}</div>
                    <div class="timeline-card">
                        <div class="timeline-card-header">
                            <span class="step-label" style="color:${n.type === 'success' ? 'var(--emerald-700)' : n.type === 'warning' ? 'var(--amber-700)' : 'var(--brand-blue-deep)'}">${n.step}</span>
                        </div>
                        <div class="timeline-card-title">${n.title}</div>
                        <div class="timeline-card-actor">Actor: ${n.actor}</div>
                        <div class="timeline-card-detail">${n.detail}</div>
                        <span class="hash-strip">${n.hash}</span>
                    </div>
                </div>`).join('')}
        </div>
    `;
}

// ===== PUBLIC VIEW =====
function switchPublicTab(tab) {
    currentPublicTab = tab;
    document.querySelectorAll('#publicView .sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#publicView .public-tab').forEach(t => t.style.display = 'none');
    const idx = { overview: 0, trace: 1 };
    document.querySelectorAll('#publicView .sidebar-btn')[idx[tab]].classList.add('active');
    document.getElementById('public' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    if (tab === 'overview') renderPublicOverview();
}

function renderPublicOverview() {
    const all = DB.allocations;
    const validated = all.filter(a => a.status === 'validated');
    const pendingV = all.filter(a => a.status === 'pending_validation');
    const totalAll = all.reduce((s, a) => s + a.amount, 0);

    document.getElementById('publicKPI').innerHTML = `
        <div class="kpi-tile accent-blue">
            <div class="kpi-label">Total Ledger Exposure</div>
            <div class="kpi-value">${formatFCFA(totalAll)}</div>
            <div class="kpi-sub">${all.length} allocation${all.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="kpi-tile accent-emerald">
            <div class="kpi-label">Validated & Locked</div>
            <div class="kpi-value">${validated.length}</div>
            <div class="kpi-sub">BEAC signed, escrow active</div>
        </div>
        <div class="kpi-tile accent-amber">
            <div class="kpi-label">Awaiting Validation</div>
            <div class="kpi-value">${pendingV.length}</div>
            <div class="kpi-sub">Pending bank signature</div>
        </div>`;

    document.getElementById('publicAllocList').innerHTML = all.length === 0
        ? '<div class="empty-state"><p>No allocations on the public ledger yet.</p></div>'
        : renderAllocationTable(all, 'public');
}

function traceAllocationPublic(allocId) {
    if (!allocId) return;
    switchPublicTab('trace');
    setTimeout(() => {
        const sel = document.getElementById('publicTraceAllocSelect');
        if (sel) sel.value = allocId;
    }, 0);

    const alloc = DB.allocations.find(a => a.id === allocId);
    if (!alloc) return;

    const validatedAll = DB.allocations.filter(a => a.status === 'validated');
    document.getElementById('publicTraceSelect').innerHTML = `
        <div class="trace-select-row">
            <div class="form-group">
                <label class="form-label">Select Allocation to Trace</label>
                <select class="form-select" id="publicTraceAllocSelect" onchange="traceAllocationPublic(this.value)">
                    <option value="">Choose an allocation...</option>
                    ${validatedAll.map(a => `<option value="${a.id}" ${a.id === allocId ? 'selected' : ''}>${a.id} — ${a.title}</option>`).join('')}
                </select>
            </div>
        </div>`;

    const output = document.getElementById('publicTraceOutput');
    if (!alloc.flowNodes || alloc.flowNodes.length === 0) {
        output.innerHTML = '<div class="empty-state"><p>No ledger entries yet for this allocation.</p></div>';
        return;
    }

    output.innerHTML = `
        <div style="font-weight:600; font-size:0.95rem; margin-bottom:1.5rem; color:var(--slate-900);">
            ${alloc.id}: ${alloc.title} — ${formatFCFA(alloc.amount)} · ${alloc.ministry.split('(')[0].trim()}
        </div>
        <div class="timeline">
            ${alloc.flowNodes.map(n => `
                <div class="timeline-node ${n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : 'info'}">
                    <div class="timeline-dot">${n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : 'ℹ'}</div>
                    <div class="timeline-card">
                        <div class="timeline-card-header">
                            <span class="step-label" style="color:${n.type === 'success' ? 'var(--emerald-700)' : n.type === 'warning' ? 'var(--amber-700)' : 'var(--brand-blue-deep)'}">${n.step}</span>
                        </div>
                        <div class="timeline-card-title">${n.title}</div>
                        <div class="timeline-card-actor">Actor: ${n.actor}</div>
                        <div class="timeline-card-detail">${n.detail}</div>
                        <span class="hash-strip">${n.hash}</span>
                    </div>
                </div>`).join('')}
        </div>
    `;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginOverlay').classList.remove('hidden');
});
