/**
 * SW LEGAL HUB - CLIENT PORTAL APPLICATION
 * Complete interactive logic for Advocates Office
 */

document.addEventListener('DOMContentLoaded', () => {
  // Lucide icons initialization if available
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initBciDisclaimer();
  loadAdvocates();
  initTracking();
  initBookingWizard();
  initCalculators();
  initNyayaBot();
  initContactForm();
  initMobileMenu();
});

/* --------------------------------------------------------------------------
   1. BAR COUNCIL OF INDIA (BCI) RULE 36 DISCLAIMER
   -------------------------------------------------------------------------- */
function initBciDisclaimer() {
  const modal = document.getElementById('bci-modal');
  const acceptBtn = document.getElementById('bci-accept-btn');
  const hasAccepted = sessionStorage.getItem('sw_bci_accepted');

  if (!hasAccepted && modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      sessionStorage.setItem('sw_bci_accepted', 'true');
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });
  }
}

/* --------------------------------------------------------------------------
   2. MOBILE MENU TOGGLE
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (toggleBtn && mobileNav) {
    toggleBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });

    // Close when clicking nav links
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.add('hidden');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   3. ADVOCATES DIRECTORY LOADER
   -------------------------------------------------------------------------- */
async function loadAdvocates() {
  const grid = document.getElementById('advocates-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/advocates');
    const json = await res.json();
    if (!json.success) throw new Error('Failed to load advocates');

    const advocates = json.data;
    renderAdvocates(advocates, grid);
    populateAdvocateSelect(advocates);
  } catch (err) {
    console.error('Error loading advocates:', err);
    grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-6">Unable to load advocate profiles at the moment. Please call 88015 93599.</div>`;
  }
}

function renderAdvocates(advocates, container) {
  container.innerHTML = advocates.map(adv => `
    <div class="legal-card p-6 flex flex-col justify-between group">
      <div>
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="advocate-badge-icon">
            <i data-lucide="scale" class="w-6 h-6"></i>
          </div>
          <span class="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
            ${adv.experienceYears}+ Yrs Exp
          </span>
        </div>

        <h3 class="text-xl font-bold font-serif text-white group-hover:text-amber-300 transition-colors">
          ${adv.name}
        </h3>
        
        <div class="text-xs font-mono text-amber-400/90 font-semibold my-1.5 leading-relaxed bg-amber-950/20 p-1.5 rounded border border-amber-900/40">
          🎓 ${adv.qualifications}
        </div>

        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          ${adv.role}
        </p>

        <p class="text-sm text-slate-300 mb-4 line-clamp-3">
          ${adv.bio}
        </p>

        <div class="mb-4">
          <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Practice Focus</div>
          <div class="flex flex-wrap gap-1.5">
            ${adv.specializations.map(s => `
              <span class="text-xs bg-slate-800/80 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                ${s}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
          <i data-lucide="languages" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Languages: ${adv.languages.join(', ')}</span>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex gap-2">
        <button onclick="bookWithAdvocate('${adv.name}', '${adv.specializations[0]}')" 
                class="flex-1 btn-gold text-xs py-2">
          <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
          Consult With Advocate
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function populateAdvocateSelect(advocates) {
  const select = document.getElementById('consult-advocate');
  if (!select) return;

  select.innerHTML = `
    <option value="Senior Counsel In-Charge">Next Available Senior Counsel</option>
    ${advocates.map(a => `<option value="${a.name}">${a.name} (${a.qualifications})</option>`).join('')}
  `;
}

window.bookWithAdvocate = function(name, defaultCategory) {
  const select = document.getElementById('consult-advocate');
  const catSelect = document.getElementById('consult-category');
  if (select) select.value = name;
  if (catSelect && defaultCategory) {
    // Attempt matching category
    Array.from(catSelect.options).forEach(opt => {
      if (opt.text.toLowerCase().includes(defaultCategory.toLowerCase())) {
        catSelect.value = opt.value;
      }
    });
  }
  
  // Scroll to consultation section
  const section = document.getElementById('booking-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
};

/* --------------------------------------------------------------------------
   4. CASE & CONSULTATION STATUS TRACKER ("NyayaTrack")
   -------------------------------------------------------------------------- */
function initTracking() {
  const form = document.getElementById('tracking-form');
  const input = document.getElementById('track-input');
  const resultContainer = document.getElementById('track-result');
  const quickTestBtns = document.querySelectorAll('.quick-track-badge');

  quickTestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (input) {
        input.value = id;
        performTrack(id);
      }
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      performTrack(val);
    });
  }
}

async function performTrack(identifier) {
  const container = document.getElementById('track-result');
  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-8">
      <div class="inline-block animate-spin text-amber-400 mb-2">
        <i data-lucide="loader-2" class="w-8 h-8"></i>
      </div>
      <p class="text-slate-400 text-sm">Searching court docket and consultation records...</p>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  try {
    const res = await fetch(`/api/track/${encodeURIComponent(identifier)}`);
    const json = await res.json();

    if (!json.success) {
      container.innerHTML = `
        <div class="p-6 rounded-xl bg-red-950/30 border border-red-800 text-center">
          <i data-lucide="alert-circle" class="w-10 h-10 text-red-400 mx-auto mb-2"></i>
          <h4 class="text-lg font-bold text-white mb-1">Record Not Found</h4>
          <p class="text-slate-300 text-sm max-w-md mx-auto mb-4">${json.message}</p>
          <a href="https://wa.me/919346818069?text=Hello%20SW%20Legal%20Hub,%20I%20am%20inquiring%20about%20my%20case%20record%20${encodeURIComponent(identifier)}" 
             target="_blank" class="btn-outline-gold text-xs py-2 px-4 inline-flex items-center gap-2">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            Inquire via Chambers WhatsApp
          </a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const c = json.data;
    renderTrackingResult(c, container);
  } catch (err) {
    container.innerHTML = `
      <div class="p-6 rounded-xl bg-red-950/30 border border-red-800 text-center text-red-200">
        Connection error while retrieving docket status. Please try again.
      </div>
    `;
  }
}

function renderTrackingResult(c, container) {
  const statusColors = {
    'Pending': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Pending Review': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'In Progress': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'In Court': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'Completed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Closed': 'bg-slate-500/20 text-slate-300 border-slate-500/40'
  };

  const statusBadge = statusColors[c.status] || 'bg-slate-700 text-slate-200 border-slate-600';

  // Determine active step index
  const stages = [
    'Case Dossier Received',
    'Document Scrutiny',
    'Statutory Notice / Petition Drafted',
    'Court Appearance / Hearing',
    'Resolution / Final Order'
  ];

  let currentStep = 1;
  const stageLower = (c.stage || '').toLowerCase();
  if (stageLower.includes('scrutiny') || stageLower.includes('verification')) currentStep = 2;
  else if (stageLower.includes('notice') || stageLower.includes('drafting') || stageLower.includes('noc application')) currentStep = 3;
  else if (stageLower.includes('court') || stageLower.includes('hearing') || stageLower.includes('police')) currentStep = 4;
  else if (stageLower.includes('completed') || stageLower.includes('closed') || stageLower.includes('decree')) currentStep = 5;

  container.innerHTML = `
    <div class="legal-card p-6 md:p-8 animate-fade-in border-amber-500/40">
      <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs uppercase font-bold tracking-widest text-amber-400">DOCKET REFERENCE</span>
            <span class="text-xs px-2 py-0.5 rounded ${statusBadge} border font-semibold">
              ${c.status}
            </span>
          </div>
          <h3 class="text-2xl font-bold font-serif text-white tracking-wide">
            ${c.refId}
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">Client: <strong class="text-slate-200">${c.clientName}</strong> (${c.phone})</p>
        </div>

        <div class="text-right">
          <div class="text-xs uppercase text-slate-400 font-semibold">Practice Area</div>
          <div class="text-base font-bold text-amber-300">${c.category}</div>
          <div class="text-xs text-slate-400">Mode: ${c.consultationType || 'Chamber'}</div>
        </div>
      </div>

      <!-- Step Tracker Progress Bar -->
      <div class="py-8">
        <div class="text-xs uppercase tracking-wider text-slate-400 font-bold mb-4 flex items-center justify-between">
          <span>Procedural Milestone Progress</span>
          <span class="text-amber-400 font-mono">Stage: ${c.stage}</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          ${stages.map((st, idx) => {
            const stepNum = idx + 1;
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            let nodeClass = 'border-slate-800 bg-slate-900/60 text-slate-500';
            let titleClass = 'text-slate-500';

            if (isDone) {
              nodeClass = 'border-emerald-500 bg-emerald-950/60 text-emerald-400 font-bold';
              titleClass = 'text-emerald-400';
            } else if (isCurrent) {
              nodeClass = 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold shadow-lg shadow-amber-500/20';
              titleClass = 'text-amber-300 font-semibold';
            }

            return `
              <div class="p-3 rounded-lg border ${nodeClass} flex flex-col justify-between">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-mono">0${stepNum}</span>
                  ${isDone ? '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>' : (isCurrent ? '<i data-lucide="activity" class="w-4 h-4 text-amber-400 animate-pulse"></i>' : '<i data-lucide="clock" class="w-4 h-4 text-slate-600"></i>')}
                </div>
                <div class="text-xs ${titleClass} leading-tight">${st}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Docket Case Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Designated Advocate</div>
          <div class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="user-check" class="w-4 h-4 text-amber-400"></i>
            ${c.assignedAdvocate}
          </div>

          <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-4 mb-1">Jurisdiction / Forum</div>
          <div class="text-sm text-slate-200 flex items-center gap-2">
            <i data-lucide="building" class="w-4 h-4 text-slate-400"></i>
            ${c.court || 'Chamber of SW Legal Hub, Madinaguda'}
          </div>
        </div>

        <div>
          <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Next Action / Hearing Date</div>
          <div class="text-sm font-bold text-amber-300 flex items-center gap-2">
            <i data-lucide="calendar" class="w-4 h-4 text-amber-400"></i>
            ${c.nextHearing || 'Under Review by Counsel'}
          </div>

          <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-4 mb-1">Advocate Docket Note</div>
          <div class="text-xs text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 leading-relaxed">
            "${c.caseNotes || 'No notes currently logged.'}"
          </div>
        </div>
      </div>

      ${c.documents && c.documents.length > 0 ? `
        <div class="mb-6">
          <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Attached Case Exhibits (${c.documents.length})</div>
          <div class="flex flex-wrap gap-2">
            ${c.documents.map(d => `
              <a href="/uploads/${d}" target="_blank" class="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-200 hover:text-amber-300 border border-slate-700 flex items-center gap-1.5 transition-colors">
                <i data-lucide="file-text" class="w-3.5 h-3.5 text-amber-400"></i>
                ${d.split('-').slice(2).join('-') || d}
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Action Bar -->
      <div class="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
        <a href="https://wa.me/919346818069?text=Hello%20Advocate,%20following%20up%20on%20my%20case%20docket%20*${encodeURIComponent(c.refId)}*%20(${encodeURIComponent(c.clientName)})." 
           target="_blank" class="btn-gold text-xs py-2.5 px-4 flex-1 justify-center">
          <i data-lucide="message-circle" class="w-4 h-4"></i>
          Direct WhatsApp to Assigned Advocate
        </a>
        <button onclick="window.print()" class="btn-dark text-xs py-2.5 px-4">
          <i data-lucide="printer" class="w-4 h-4"></i>
          Print Official Docket Slip
        </button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/* --------------------------------------------------------------------------
   5. CONSULTATION & APPOINTMENT BOOKING WIZARD
   -------------------------------------------------------------------------- */
function initBookingWizard() {
  const form = document.getElementById('consultation-form');
  const fileInput = document.getElementById('case-files');
  const fileListContainer = document.getElementById('selected-files-list');

  // Today as minimum date
  const dateInput = document.getElementById('consult-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  // Display selected files
  if (fileInput && fileListContainer) {
    fileInput.addEventListener('change', () => {
      fileListContainer.innerHTML = '';
      if (!fileInput.files.length) return;

      Array.from(fileInput.files).forEach((f, idx) => {
        const item = document.createElement('div');
        item.className = 'text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded flex items-center justify-between border border-slate-700';
        item.innerHTML = `
          <span class="truncate max-w-[200px]"><i data-lucide="file" class="w-3 h-3 inline mr-1 text-amber-400"></i>${f.name}</span>
          <span class="text-slate-400">(${(f.size / 1024).toFixed(0)} KB)</span>
        `;
        fileListContainer.appendChild(item);
      });
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Submitting Dossier...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const formData = new FormData(form);
        const res = await fetch('/api/consultations', {
          method: 'POST',
          body: formData
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Submission error');

        showBookingSuccessModal(json.data, json.whatsappLink);
        form.reset();
        if (fileListContainer) fileListContainer.innerHTML = '';
      } catch (err) {
        alert(err.message || 'Error scheduling consultation. Please contact chambers at 88015 93599.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}

function showBookingSuccessModal(dossier, whatsappLink) {
  const modal = document.getElementById('booking-success-modal');
  if (!modal) {
    alert(`Consultation booked successfully!\nReference ID: ${dossier.refId}`);
    return;
  }

  document.getElementById('modal-ref-id').textContent = dossier.refId;
  document.getElementById('modal-client-name').textContent = dossier.clientName;
  document.getElementById('modal-category').textContent = dossier.category;
  document.getElementById('modal-advocate').textContent = dossier.assignedAdvocate;
  document.getElementById('modal-datetime').textContent = `${dossier.requestedDate} at ${dossier.requestedTime}`;
  
  const waBtn = document.getElementById('modal-wa-btn');
  if (waBtn && whatsappLink) {
    waBtn.href = whatsappLink;
  }

  modal.classList.remove('hidden');
}

window.closeBookingModal = function() {
  const modal = document.getElementById('booking-success-modal');
  if (modal) modal.classList.add('hidden');
};

/* --------------------------------------------------------------------------
   6. INTERACTIVE LEGAL CALCULATORS & UTILITIES
   -------------------------------------------------------------------------- */
function initCalculators() {
  // Tab Switcher
  const tabs = document.querySelectorAll('.tool-tab-btn');
  const panels = document.querySelectorAll('.tool-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove('hidden');
    });
  });

  // Cheque 138 Calculator
  const chequeForm = document.getElementById('cheque-calc-form');
  const chequeMemoInput = document.getElementById('cheque-memo-date');
  const chequeResult = document.getElementById('cheque-calc-result');

  // Set default to 5 days ago for immediate demonstration
  if (chequeMemoInput) {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    chequeMemoInput.value = d.toISOString().split('T')[0];
    calculateChequeTimeline(chequeMemoInput.value, chequeResult);
  }

  if (chequeForm) {
    chequeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateChequeTimeline(chequeMemoInput.value, chequeResult);
    });
  }

  // Stamp Duty Estimator
  const stampForm = document.getElementById('stamp-calc-form');
  const stampValueInput = document.getElementById('property-value-input');
  const stampTypeSelect = document.getElementById('property-trans-type');
  const stampResult = document.getElementById('stamp-calc-result');

  if (stampValueInput && stampResult) {
    // Initial calculate for default 50 Lakhs
    calculateStampDuty(stampValueInput.value, stampTypeSelect.value, stampResult);
  }

  if (stampForm) {
    stampForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateStampDuty(stampValueInput.value, stampTypeSelect.value, stampResult);
    });
  }
}

async function calculateChequeTimeline(memoDate, container) {
  if (!container || !memoDate) return;

  try {
    const res = await fetch('/api/calculator/cheque-bounce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnMemoDate: memoDate })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const d = json.data;
    const daysBadgeClass = d.isExpired 
      ? 'bg-red-500/20 text-red-300 border-red-500' 
      : d.daysLeftForNotice <= 7 
      ? 'bg-amber-500/20 text-amber-300 border-amber-500' 
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500';

    container.innerHTML = `
      <div class="legal-card p-5 border-amber-500/30">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <span class="text-xs text-slate-400 uppercase font-semibold">Statutory Section</span>
            <div class="text-sm font-bold text-white">${d.statuteSection}</div>
          </div>
          <span class="text-xs px-2.5 py-1 rounded border ${daysBadgeClass} font-bold">
            ${d.isExpired ? 'NOTICE PERIOD EXPIRED' : `${d.daysLeftForNotice} Days Remaining for Notice`}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span class="text-xs text-slate-400 block mb-1">Return Memo Date</span>
            <span class="text-sm font-bold text-slate-200 font-mono">${d.returnMemoDate}</span>
          </div>

          <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span class="text-xs text-amber-400 block mb-1">Last Date to Issue Notice (30d)</span>
            <span class="text-sm font-bold text-amber-300 font-mono">${d.noticeDispatchDeadline}</span>
          </div>

          <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span class="text-xs text-slate-400 block mb-1">Court Complaint Deadline</span>
            <span class="text-sm font-bold text-slate-200 font-mono">${d.courtFilingDeadline}</span>
          </div>
        </div>

        <div class="p-3 rounded bg-amber-950/20 border border-amber-800/40 text-xs text-slate-200 leading-relaxed mb-4">
          <strong class="text-amber-400">Legal Directive:</strong> ${d.legalRecommendation}
        </div>

        <button onclick="bookWithAdvocate('Adv. Shaik Imranuddin', 'Cheque Bounce Cases')" 
                class="btn-gold text-xs py-2 w-full justify-center">
          <i data-lucide="send" class="w-3.5 h-3.5"></i>
          Retain Adv. Shaik Imranuddin to Draft & Issue Statutory Notice
        </button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="text-xs text-red-400">${err.message}</div>`;
  }
}

async function calculateStampDuty(val, type, container) {
  if (!container || !val) return;

  try {
    const res = await fetch('/api/calculator/stamp-duty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyValue: val, transactionType: type })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const d = json.data;
    const formatInr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    container.innerHTML = `
      <div class="legal-card p-5 border-amber-500/30">
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <span class="text-xs text-slate-400 uppercase font-semibold">Jurisdiction</span>
            <div class="text-sm font-bold text-white">${d.state}</div>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 uppercase font-semibold">Total Estimated Govt Fee</span>
            <div class="text-lg font-bold text-amber-400 font-mono">${formatInr(d.totalEstimatedGovtFee)}</div>
          </div>
        </div>

        <div class="space-y-2 mb-4 text-xs">
          <div class="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
            <span>Stamp Duty (${d.breakdown.stampDuty.percentage}%)</span>
            <span class="font-mono font-semibold">${formatInr(d.breakdown.stampDuty.amount)}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
            <span>Transfer Duty (${d.breakdown.transferDuty.percentage}%)</span>
            <span class="font-mono font-semibold">${formatInr(d.breakdown.transferDuty.amount)}</span>
          </div>
          <div class="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
            <span>Registration Fee (${d.breakdown.registrationFee.percentage}%)</span>
            <span class="font-mono font-semibold">${formatInr(d.breakdown.registrationFee.amount)}</span>
          </div>
        </div>

        <p class="text-[11px] text-slate-400 italic mb-4">
          * ${d.note}
        </p>

        <button onclick="bookWithAdvocate('Adv. Shaik Ghouseddin', 'Civil Law')" 
                class="btn-gold text-xs py-2 w-full justify-center">
          <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
          Commission 30-Year Property Scrutiny by Senior Civil Advocates
        </button>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="text-xs text-red-400">${err.message}</div>`;
  }
}

/* --------------------------------------------------------------------------
   7. VIRTUAL LEGAL ASSISTANT ("NyayaBot")
   -------------------------------------------------------------------------- */
window.toggleNyayaBot = function() {
  const windowEl = document.getElementById('chat-window');
  if (windowEl) {
    windowEl.classList.toggle('hidden');
    if (!windowEl.classList.contains('hidden')) {
      const input = document.getElementById('chat-input');
      if (input) input.focus();
    }
  }
};

window.closeNyayaBot = function() {
  const windowEl = document.getElementById('chat-window');
  if (windowEl) {
    windowEl.classList.add('hidden');
  }
};

function initNyayaBot() {
  const launcher = document.getElementById('bot-launcher');
  const windowEl = document.getElementById('chat-window');
  const closeBtn = document.getElementById('chat-close-btn');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messagesContainer = document.getElementById('chat-messages');

  if (launcher && windowEl) {
    launcher.addEventListener('click', window.toggleNyayaBot);
  }

  if (closeBtn && windowEl) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.closeNyayaBot();
    });
  }

  // Quick chips
  const chips = document.querySelectorAll('.chat-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-question');
      if (input) {
        input.value = q;
        sendChatMessage(q);
      }
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      sendChatMessage(val);
    });
  }
}

async function sendChatMessage(query) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  // Append user bubble
  appendChatBubble('user', query);

  // Typing indicator
  const typingId = 'typing-' + Date.now();
  const typingBubble = document.createElement('div');
  typingBubble.id = typingId;
  typingBubble.className = 'chat-bubble-bot p-3 rounded-xl max-w-[85%] text-xs text-slate-400 flex items-center gap-2';
  typingBubble.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin text-amber-400"></i> Reviewing Indian statutory jurisprudence...`;
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query })
    });
    const json = await res.json();

    const indicator = document.getElementById(typingId);
    if (indicator) indicator.remove();

    appendChatBubble('bot', json.reply, json.assignedAdvocate, json.actionSuggestion);
  } catch (err) {
    const indicator = document.getElementById(typingId);
    if (indicator) indicator.remove();
    appendChatBubble('bot', 'We are temporarily unable to process your chat request. For immediate legal advice, please call our advocate hotline directly at 88015 93599.');
  }
}

function appendChatBubble(sender, text, advocate, action) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  if (sender === 'user') {
    bubble.className = 'chat-bubble-user p-3 rounded-xl max-w-[85%] text-xs mb-3';
    bubble.textContent = text;
  } else {
    bubble.className = 'chat-bubble-bot p-3.5 rounded-xl max-w-[90%] text-xs mb-3 space-y-2';
    bubble.innerHTML = `
      <div class="leading-relaxed">${text}</div>
      ${advocate ? `
        <div class="pt-2 border-t border-amber-500/20 text-amber-300 font-semibold flex items-center gap-1.5">
          <i data-lucide="award" class="w-3.5 h-3.5"></i>
          Recommended Counsel: ${advocate}
        </div>
      ` : ''}
      ${action ? `
        <div class="pt-1 flex flex-wrap items-center justify-between gap-2">
          <a href="https://wa.me/919346818069?text=${encodeURIComponent('Hello SW Legal Hub, I need advice regarding: ' + text.slice(0, 100))}" 
             target="_blank" class="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline font-bold">
            <i data-lucide="message-square" class="w-3 h-3"></i>
            ${action} &rarr;
          </a>
          <button type="button" onclick="closeNyayaBot()" class="text-[10px] text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/60 px-2 py-0.5 rounded border border-red-800/60 cursor-pointer transition-colors" title="Close Chat Window">
            ✕ Exit Chat
          </button>
        </div>
      ` : ''}
    `;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

/* --------------------------------------------------------------------------
   8. CONTACT FORM SUBMISSION
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending message...`;
    if (window.lucide) window.lucide.createIcons();

    const payload = {
      name: document.getElementById('contact-name').value,
      phone: document.getElementById('contact-phone').value,
      email: document.getElementById('contact-email').value,
      subject: document.getElementById('contact-subject').value,
      message: document.getElementById('contact-message').value
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.message);
      alert(json.message);
      form.reset();
    } catch (err) {
      alert(err.message || 'Error delivering message.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
