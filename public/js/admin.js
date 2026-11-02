/**
 * SW LEGAL HUB - CHAMBERS ADMIN DASHBOARD CONTROLLER
 * Protected Advocate & Staff Portal with Authentication
 */

let allCases = [];
let authToken = sessionStorage.getItem('sw_admin_token') || localStorage.getItem('sw_admin_token');

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  initAuth();

  // Refresh
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadStats();
    loadConsultations();
  });

  // New Docket Form
  document.getElementById('new-docket-form')?.addEventListener('submit', handleCreateDocket);

  // Search & Filters
  document.getElementById('admin-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('status-filter')?.addEventListener('change', applyFilters);
  document.getElementById('advocate-filter')?.addEventListener('change', applyFilters);

  // Edit Form
  document.getElementById('edit-docket-form')?.addEventListener('submit', handleDocketUpdate);

  // Messages
  document.getElementById('view-messages-btn')?.addEventListener('click', loadMessages);

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Live Auto-Refresh Polling: Checks for new consultations every 10 seconds automatically
  setInterval(() => {
    if (authToken) {
      loadStats();
      loadConsultations(true);
    }
  }, 10000);
});

/* --------------------------------------------------------------------------
   1. AUTHENTICATION & LOGIN CONTROLLER
   -------------------------------------------------------------------------- */
function initAuth() {
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('admin-login-form');

  if (authToken) {
    // Show dashboard
    loginView?.classList.add('hidden');
    dashboardView?.classList.remove('hidden');
    loadStats();
    loadConsultations();
  } else {
    // Show login screen
    loginView?.classList.remove('hidden');
    dashboardView?.classList.add('hidden');
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('login-username').value.trim();
      const passVal = document.getElementById('login-password').value.trim();
      const errorDiv = document.getElementById('login-error');
      const errorMsg = document.getElementById('login-error-msg');
      const submitBtn = document.getElementById('login-submit-btn');

      if (!userVal || !passVal) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Verifying Chambers Credentials...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userVal, password: passVal })
        });

        const json = await res.json();

        if (!json.success) {
          throw new Error(json.message || 'Authentication failed');
        }

        // Store token in session
        authToken = json.token;
        sessionStorage.setItem('sw_admin_token', authToken);
        localStorage.setItem('sw_admin_token', authToken);

        errorDiv?.classList.add('hidden');
        loginView?.classList.add('hidden');
        dashboardView?.classList.remove('hidden');

        loadStats();
        loadConsultations();
      } catch (err) {
        if (errorDiv && errorMsg) {
          errorMsg.textContent = err.message || 'Invalid Credentials. Please check username and password/PIN.';
          errorDiv.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-lucide="log-in" class="w-4 h-4"></i> Authenticate & Open Docket System`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}

function handleLogout() {
  authToken = null;
  sessionStorage.removeItem('sw_admin_token');
  localStorage.removeItem('sw_admin_token');

  document.getElementById('login-view')?.classList.remove('hidden');
  document.getElementById('dashboard-view')?.classList.add('hidden');
  document.getElementById('login-password').value = '';
}

// Helper for authenticated requests
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
}

/* --------------------------------------------------------------------------
   2. DASHBOARD DATA LOADERS
   -------------------------------------------------------------------------- */
async function loadStats() {
  if (!authToken) return;

  try {
    const res = await fetch('/api/admin/stats', {
      headers: authHeaders()
    });

    if (res.status === 401) {
      handleLogout();
      return;
    }

    const json = await res.json();
    if (!json.success) return;

    const s = json.data;
    document.getElementById('stat-total').textContent = s.totalCases;
    document.getElementById('stat-pending').textContent = s.pending;
    document.getElementById('stat-progress').textContent = s.inProgress;
    document.getElementById('stat-court').textContent = s.inCourt;
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function loadConsultations(isSilent = false) {
  if (!authToken) return;

  const tbody = document.getElementById('cases-tbody');
  if (!tbody) return;

  if (!isSilent && allCases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400"><i data-lucide="loader" class="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2"></i>Loading dockets...</td></tr>`;
    if (window.lucide) window.lucide.createIcons();
  }

  try {
    const res = await fetch('/api/admin/consultations', {
      headers: authHeaders()
    });

    if (res.status === 401) {
      handleLogout();
      return;
    }

    const json = await res.json();
    if (!json.success) throw new Error('Failed to load dockets');

    allCases = json.data || [];
    applyFilters();
  } catch (err) {
    if (!isSilent) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-red-400">Failed to load docket records.</td></tr>`;
    }
  }
}

function applyFilters() {
  const q = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
  const status = document.getElementById('status-filter')?.value || 'ALL';
  const advocate = document.getElementById('advocate-filter')?.value || 'ALL';

  const filtered = allCases.filter(c => {
    const matchesSearch = !q || 
      c.refId.toLowerCase().includes(q) || 
      c.clientName.toLowerCase().includes(q) || 
      c.phone.includes(q);

    const matchesStatus = status === 'ALL' || c.status === status;
    const matchesAdvocate = advocate === 'ALL' || c.assignedAdvocate.includes(advocate);

    return matchesSearch && matchesStatus && matchesAdvocate;
  });

  renderConsultationsTable(filtered);
}

function renderConsultationsTable(cases) {
  const tbody = document.getElementById('cases-tbody');
  if (!tbody) return;

  if (cases.length === 0) {
    if (allCases.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-12 text-slate-400">
            <div class="max-w-md mx-auto space-y-2">
              <div class="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 mb-2">
                <i data-lucide="scale" class="w-6 h-6"></i>
              </div>
              <p class="font-serif text-base font-bold text-white">No Active Case Dockets</p>
              <p class="text-xs text-slate-400">When clients submit legal consultations on the portal or via WhatsApp, new dockets will appear here automatically.</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">No dockets match your search filter criteria.</td></tr>`;
    }
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const statusColors = {
    'Pending': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    'Pending Review': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    'In Progress': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    'In Court': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Completed': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    'Closed': 'bg-slate-700 text-slate-300 border-slate-600'
  };

  tbody.innerHTML = cases.map(c => {
    const badge = statusColors[c.status] || 'bg-slate-800 text-slate-300';
    const waText = encodeURIComponent(`Hello ${c.clientName}, regarding your case docket *${c.refId}* at SW Legal Hub.`);

    return `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="py-3 px-4 font-mono font-bold text-amber-400">
          ${c.refId}
          ${c.urgency === 'Emergency' ? '<span class="block text-[10px] text-red-400 font-sans font-bold">EMERGENCY</span>' : ''}
        </td>

        <td class="py-3 px-4">
          <div class="font-bold text-white">${c.clientName}</div>
          <div class="text-slate-400 flex items-center gap-2 mt-0.5">
            <span>${c.phone}</span>
            <a href="https://wa.me/91${c.phone.replace(/[^0-9]/g, '')}?text=${waText}" target="_blank" class="text-emerald-400 hover:text-emerald-300" title="Direct WhatsApp">
              <i data-lucide="message-circle" class="w-3.5 h-3.5 inline"></i>
            </a>
          </div>
        </td>

        <td class="py-3 px-4 font-medium text-slate-300">
          ${c.category}
        </td>

        <td class="py-3 px-4 text-slate-200">
          <div class="font-semibold text-white">${c.assignedAdvocate}</div>
        </td>

        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5 mb-1">
            <select id="status-select-${c.refId}" class="px-2 py-1 bg-obsidian-900 border border-slate-700 rounded text-[11px] text-white focus:outline-none focus:border-amber-400 font-semibold cursor-pointer">
              <option value="Pending Review" ${c.status === 'Pending Review' || c.status === 'Pending' ? 'selected' : ''}>Pending Review</option>
              <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="In Court" ${c.status === 'In Court' ? 'selected' : ''}>In Court / Trial</option>
              <option value="Completed" ${c.status === 'Completed' ? 'selected' : ''}>Completed / Decreed</option>
              <option value="Closed" ${c.status === 'Closed' ? 'selected' : ''}>Closed / Settled</option>
            </select>
            <button onclick="saveStatus('${c.refId}')" id="save-status-btn-${c.refId}" class="btn-gold text-[10px] py-1 px-2.5 rounded font-bold cursor-pointer transition-all active:scale-95 shadow" title="Save Status">
              Save
            </button>
          </div>
          <div class="text-slate-400 text-[11px] truncate max-w-[180px]" title="${c.stage || ''}">Stage: ${c.stage || 'Dossier Logged'}</div>
        </td>

        <td class="py-3 px-4">
          <div class="text-amber-300 font-mono">${c.nextHearing || 'Not fixed'}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-[150px]" title="${c.court || ''}">
            ${c.court || 'Chamber'}
          </div>
        </td>

        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openEditModal('${c.refId}')" class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700" title="Edit Full Docket Details">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="deleteCase('${c.refId}')" class="p-1.5 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 border border-slate-700 cursor-pointer" title="Delete Case Record">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
            <a href="tel:${c.phone}" class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" title="Call Client">
              <i data-lucide="phone" class="w-3.5 h-3.5"></i>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

window.saveStatus = async function(refId) {
  const select = document.getElementById(`status-select-${refId}`);
  const btn = document.getElementById(`save-status-btn-${refId}`);
  if (!select || !btn || !authToken) return;

  const newStatus = select.value;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>`;
  if (window.lucide) window.lucide.createIcons();

  try {
    const res = await fetch(`/api/admin/consultations/${encodeURIComponent(refId)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    // Update in local array
    const item = allCases.find(c => c.refId === refId);
    if (item) item.status = newStatus;

    btn.className = "bg-emerald-600 text-white text-[10px] py-1 px-2.5 rounded font-bold transition-all shadow";
    btn.innerHTML = "Saved ✓";
    loadStats();

    setTimeout(() => {
      btn.className = "btn-gold text-[10px] py-1 px-2.5 rounded font-bold cursor-pointer transition-all active:scale-95 shadow";
      btn.innerHTML = "Save";
      btn.disabled = false;
    }, 1800);
  } catch (err) {
    alert(err.message || 'Failed to update status');
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

window.deleteCase = async function(refId) {
  if (!confirm(`Are you sure you want to permanently delete Docket ${refId}?`)) return;
  if (!authToken) return;

  try {
    const res = await fetch(`/api/admin/consultations/${encodeURIComponent(refId)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    alert(`Case ${refId} has been successfully deleted.`);
    allCases = allCases.filter(c => c.refId !== refId);
    renderConsultationsTable(allCases);
    loadStats();
  } catch (err) {
    alert(err.message || 'Failed to delete case.');
  }
};

window.openEditModal = function(refId) {
  const c = allCases.find(item => item.refId === refId);
  if (!c) return;

  document.getElementById('edit-ref-id').value = c.refId;
  document.getElementById('edit-modal-ref').textContent = `Docket: ${c.refId} (${c.clientName})`;
  document.getElementById('edit-status').value = c.status || 'In Progress';
  document.getElementById('edit-stage').value = c.stage || '';
  document.getElementById('edit-advocate').value = c.assignedAdvocate || 'Adv. Shaik Ghouseddin';
  document.getElementById('edit-next-hearing').value = c.nextHearing && c.nextHearing.includes('-') ? c.nextHearing : '';
  document.getElementById('edit-court').value = c.court || '';
  document.getElementById('edit-notes').value = c.caseNotes || '';

  document.getElementById('edit-docket-modal').classList.remove('hidden');
};

window.closeEditModal = function() {
  document.getElementById('edit-docket-modal').classList.add('hidden');
};

async function handleDocketUpdate(e) {
  e.preventDefault();
  const refId = document.getElementById('edit-ref-id').value;
  if (!refId || !authToken) return;

  const payload = {
    status: document.getElementById('edit-status').value,
    stage: document.getElementById('edit-stage').value,
    assignedAdvocate: document.getElementById('edit-advocate').value,
    nextHearing: document.getElementById('edit-next-hearing').value,
    court: document.getElementById('edit-court').value,
    caseNotes: document.getElementById('edit-notes').value
  };

  try {
    const res = await fetch(`/api/admin/consultations/${encodeURIComponent(refId)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    alert(`Case ${refId} updated successfully.`);
    closeEditModal();
    loadStats();
    loadConsultations();
  } catch (err) {
    alert(err.message || 'Error updating case docket.');
  }
}

async function loadMessages() {
  if (!authToken) return;

  const modal = document.getElementById('messages-modal');
  const container = document.getElementById('messages-list');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  container.innerHTML = '<div class="text-center py-6 text-slate-400">Loading inquiries...</div>';

  try {
    const res = await fetch('/api/admin/messages', {
      headers: authHeaders()
    });
    const json = await res.json();

    if (!json.success || !json.data.length) {
      container.innerHTML = '<div class="text-slate-400 text-center py-6">No general inquiries logged yet.</div>';
      return;
    }

    container.innerHTML = json.data.map(m => `
      <div class="p-3.5 rounded-xl bg-obsidian-900 border border-slate-800 space-y-1">
        <div class="flex items-center justify-between text-slate-300">
          <strong class="text-white text-sm">${m.name}</strong>
          <span class="text-[11px] text-slate-500 font-mono">${new Date(m.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="text-amber-400 font-semibold">${m.subject || 'General Inquiry'}</div>
        <p class="text-slate-300 leading-relaxed">${m.message}</p>
        <div class="pt-2 flex items-center gap-3 text-slate-400">
          <a href="tel:${m.phone}" class="hover:text-amber-300 flex items-center gap-1">
            <i data-lucide="phone" class="w-3 h-3"></i> ${m.phone}
          </a>
          ${m.email ? `
            <a href="mailto:${m.email}" class="hover:text-amber-300 flex items-center gap-1">
              <i data-lucide="mail" class="w-3 h-3"></i> ${m.email}
            </a>
          ` : ''}
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = '<div class="text-red-400 text-center py-6">Failed to load inquiries.</div>';
  }
}

/* --------------------------------------------------------------------------
   3. NEW DOCKET CREATION (CHAMBERS DESK)
   -------------------------------------------------------------------------- */
window.openNewDocketModal = function() {
  document.getElementById('new-docket-modal')?.classList.remove('hidden');
};

window.closeNewDocketModal = function() {
  document.getElementById('new-docket-modal')?.classList.add('hidden');
};

async function handleCreateDocket(e) {
  e.preventDefault();
  if (!authToken) return;

  const btn = document.getElementById('new-docket-submit-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Generating Docket...`;
  if (window.lucide) window.lucide.createIcons();

  const payload = {
    clientName: document.getElementById('new-client-name').value.trim(),
    phone: document.getElementById('new-phone').value.trim(),
    category: document.getElementById('new-category').value,
    assignedAdvocate: document.getElementById('new-advocate').value,
    status: document.getElementById('new-status').value,
    urgency: document.getElementById('new-urgency').value,
    stage: document.getElementById('new-stage').value.trim() || 'Chambers Dossier Created',
    court: document.getElementById('new-court').value.trim() || 'SW Legal Hub Chamber, Madinaguda',
    nextHearing: document.getElementById('new-next-hearing').value || 'To be scheduled',
    summary: document.getElementById('new-summary').value.trim() || 'Direct chambers consultation.'
  };

  try {
    const res = await fetch('/api/admin/consultations', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    alert(`Case Docket ${json.data.refId} successfully registered for ${json.data.clientName}.`);
    closeNewDocketModal();
    document.getElementById('new-docket-form').reset();
    loadStats();
    loadConsultations();
  } catch (err) {
    alert(err.message || 'Error creating docket.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    if (window.lucide) window.lucide.createIcons();
  }
}
