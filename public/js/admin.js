/**
 * SW LEGAL HUB - CHAMBERS ADMIN DASHBOARD CONTROLLER
 */

let allCases = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  loadStats();
  loadConsultations();

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadStats();
    loadConsultations();
  });

  // Search & Filters
  document.getElementById('admin-search-input')?.addEventListener('input', applyFilters);
  document.getElementById('status-filter')?.addEventListener('change', applyFilters);
  document.getElementById('advocate-filter')?.addEventListener('change', applyFilters);

  // Edit Form
  document.getElementById('edit-docket-form')?.addEventListener('submit', handleDocketUpdate);

  // Messages
  document.getElementById('view-messages-btn')?.addEventListener('click', loadMessages);
});

async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
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

async function loadConsultations() {
  const tbody = document.getElementById('cases-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/consultations');
    const json = await res.json();
    if (!json.success) throw new Error('Failed to load dockets');

    allCases = json.data;
    renderConsultationsTable(allCases);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-red-400">Failed to load docket records.</td></tr>`;
  }
}

function applyFilters() {
  const q = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const status = document.getElementById('status-filter').value;
  const advocate = document.getElementById('advocate-filter').value;

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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">No matching dockets found.</td></tr>`;
    return;
  }

  const statusColors = {
    'Pending': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    'Pending Review': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    'In Progress': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    'In Court': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
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
          <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${badge}">
            ${c.status}
          </span>
          <div class="text-slate-400 text-[11px] mt-1">${c.stage || 'Dossier Logged'}</div>
        </td>

        <td class="py-3 px-4">
          <div class="text-amber-300 font-mono">${c.nextHearing || 'Not fixed'}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-[150px]" title="${c.court || ''}">
            ${c.court || 'Chamber'}
          </div>
        </td>

        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="openEditModal('${c.refId}')" class="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700" title="Update Docket">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
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
  if (!refId) return;

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
      headers: { 'Content-Type': 'application/json' },
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
  const modal = document.getElementById('messages-modal');
  const container = document.getElementById('messages-list');
  if (!modal || !container) return;

  modal.classList.remove('hidden');
  container.innerHTML = '<div class="text-center py-6 text-slate-400">Loading inquiries...</div>';

  try {
    const res = await fetch('/api/admin/messages');
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
