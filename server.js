const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage configuration for document uploads (with Vercel serverless /tmp fallback)
const uploadDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Database helper (with Vercel serverless /tmp fallback)
const defaultDbPath = path.join(__dirname, 'data', 'database.json');
let activeDbPath = defaultDbPath;

if (process.env.VERCEL) {
  const tmpPath = path.join('/tmp', 'database.json');
  if (!fs.existsSync(tmpPath)) {
    try {
      fs.copyFileSync(defaultDbPath, tmpPath);
    } catch (e) {
      console.warn('Could not seed /tmp db:', e);
    }
  }
  activeDbPath = tmpPath;
}

function readDb() {
  try {
    const rawData = fs.readFileSync(activeDbPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    // Fallback to default bundled db
    try {
      const rawData = fs.readFileSync(defaultDbPath, 'utf8');
      return JSON.parse(rawData);
    } catch (e) {
      console.error('Error reading database:', error);
      return { office: {}, advocates: [], practiceAreas: [], consultations: [], messages: [] };
    }
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Cloud synchronization for resilient multi-instance Vercel serverless deployment
const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a19aee8a8606a2';

async function syncFromCloud() {
  try {
    const res = await fetch(CLOUD_SYNC_URL, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.consultations)) {
      const db = readDb();
      db.consultations = json.data.consultations;
      if (Array.isArray(json.data.messages)) {
        db.messages = json.data.messages;
      }
      writeDb(db);
      return db;
    }
  } catch (err) {
    // Graceful fallback to local file
  }
  return null;
}

async function syncToCloud(db) {
  try {
    const payload = {
      name: 'swlegalhub_production_db',
      data: {
        consultations: db.consultations || [],
        messages: db.messages || []
      }
    };
    await fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
  } catch (err) {
    console.warn('Cloud sync error:', err.message);
  }
}

// Initial cloud sync attempt on boot
syncFromCloud().catch(() => {});

// Generate unique Ref ID (e.g. SWL-2026-7842)
function generateRefId() {
  const currentYear = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `SWL-${currentYear}-${randomDigits}`;
}

// ----------------- API ROUTES -----------------

// 1. Firm Details
app.get('/api/info', (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.office
  });
});

// 2. Advocates Directory
app.get('/api/advocates', (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.advocates
  });
});

// 3. Practice Areas
app.get('/api/practices', (req, res) => {
  const db = readDb();
  res.json({
    success: true,
    data: db.practiceAreas
  });
});

// 4. Live Case / Consultation Tracking
app.get('/api/track/:identifier', async (req, res) => {
  let db = readDb();
  const query = req.params.identifier.trim().toLowerCase();

  let found = db.consultations.find(c => 
    c.refId.toLowerCase() === query || 
    c.phone.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, '')
  );

  // If not found in local cache, try live cloud sync
  if (!found) {
    const synced = await syncFromCloud();
    if (synced) {
      db = synced;
      found = db.consultations.find(c => 
        c.refId.toLowerCase() === query || 
        c.phone.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, '')
      );
    }
  }

  if (!found) {
    return res.status(404).json({
      success: false,
      message: 'No consultation or case record found with this Reference ID or Mobile Number. Please verify or reach out to our office at 88015 93599.'
    });
  }

  res.json({
    success: true,
    data: found
  });
});

// 5. Book Consultation / File Case Request
app.post('/api/consultations', upload.array('documents', 5), async (req, res) => {
  try {
    // Sync latest from cloud first to avoid overwriting concurrent submissions
    await syncFromCloud();
    const db = readDb();
    const {
      clientName,
      phone,
      email,
      category,
      assignedAdvocate,
      consultationType,
      requestedDate,
      requestedTime,
      urgency,
      summary
    } = req.body;

    if (!clientName || !phone || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and practice area category are required.'
      });
    }

    const uploadedFiles = req.files ? req.files.map(f => f.filename) : [];
    const refId = generateRefId();

    const newConsultation = {
      refId: refId,
      clientName: clientName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      category: category,
      assignedAdvocate: assignedAdvocate || 'Senior Counsel In-Charge',
      consultationType: consultationType || 'In-Office',
      requestedDate: requestedDate || new Date().toISOString().split('T')[0],
      requestedTime: requestedTime || '11:00 AM',
      status: 'Pending Review',
      stage: 'Case Dossier Received & Assigned',
      urgency: urgency || 'Normal',
      summary: summary ? summary.trim() : 'Legal consultation requested.',
      nextHearing: requestedDate || 'To be scheduled',
      court: 'SW Legal Hub Chamber, Madinaguda',
      caseNotes: 'Consultation dossier registered. Senior legal associate scheduled to verify papers.',
      documents: uploadedFiles,
      createdAt: new Date().toISOString()
    };

    db.consultations.unshift(newConsultation);
    writeDb(db);

    // Sync to Cloud DB so it immediately reflects across all serverless instances
    await syncToCloud(db);

    // Pre-composed WhatsApp confirmation link
    const waText = encodeURIComponent(
      `Hello SW Legal Hub,\n\nI have submitted a legal consultation request.\n*Ref ID:* ${refId}\n*Name:* ${clientName}\n*Practice Area:* ${category}\n*Urgency:* ${urgency || 'Normal'}\n\nPlease confirm my appointment slot.`
    );
    const whatsappLink = `https://wa.me/916305232587?text=${waText}`;

    res.status(201).json({
      success: true,
      message: 'Consultation successfully scheduled! Our legal team has logged your case dossier.',
      data: newConsultation,
      whatsappLink: whatsappLink
    });
  } catch (error) {
    console.error('Error booking consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing your legal request.'
    });
  }
});

// 6. Contact Form Messages
app.post('/api/contact', async (req, res) => {
  try {
    await syncFromCloud();
    const db = readDb();
    const { name, phone, email, subject, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and message are required.'
      });
    }

    const newMessage = {
      id: 'MSG-' + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      subject: subject ? subject.trim() : 'General Legal Inquiry',
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    if (!db.messages) db.messages = [];
    db.messages.unshift(newMessage);
    writeDb(db);

    // Sync to Cloud DB
    await syncToCloud(db);

    res.json({
      success: true,
      message: 'Thank you for reaching out to SW Legal Hub. An advocate will review your note and call you back shortly.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record message.' });
  }
});

// 7. Cheque Bounce Calculator (Sec 138 NI Act)
app.post('/api/calculator/cheque-bounce', (req, res) => {
  const { returnMemoDate } = req.body;
  if (!returnMemoDate) {
    return res.status(400).json({ success: false, message: 'Return Memo date is required.' });
  }

  const memoDate = new Date(returnMemoDate);
  if (isNaN(memoDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format.' });
  }

  // Statutory 30-day notice window from bank memo receipt
  const noticeDeadline = new Date(memoDate);
  noticeDeadline.setDate(memoDate.getDate() + 30);

  // Debtor has 15 days to pay after notice receipt
  const paymentGraceDeadline = new Date(noticeDeadline);
  paymentGraceDeadline.setDate(noticeDeadline.getDate() + 15);

  // Creditor has 30 days to file complaint in court after 15 days expire
  const courtFilingDeadline = new Date(paymentGraceDeadline);
  courtFilingDeadline.setDate(paymentGraceDeadline.getDate() + 30);

  const now = new Date();
  const daysLeftForNotice = Math.ceil((noticeDeadline - now) / (1000 * 60 * 60 * 24));

  res.json({
    success: true,
    data: {
      returnMemoDate: memoDate.toISOString().split('T')[0],
      noticeDispatchDeadline: noticeDeadline.toISOString().split('T')[0],
      statutoryGracePeriodDays: 15,
      courtFilingDeadline: courtFilingDeadline.toISOString().split('T')[0],
      daysLeftForNotice: daysLeftForNotice,
      isExpired: daysLeftForNotice < 0,
      statuteSection: 'Section 138 & 142 of the Negotiable Instruments Act, 1881',
      legalRecommendation: daysLeftForNotice < 0 
        ? 'Notice deadline under Sec 138 passed. Urgent consultation required to evaluate Section 420 IPC / BNS Cheating or Civil Recovery Suit remedies.'
        : daysLeftForNotice <= 7
        ? 'CRITICAL: Less than 7 days left to serve statutory demand notice. Dispatch immediately through Registered Post / Speed Post with ACK!'
        : 'Timely: You are well within the 30-day statutory window to issue the legal demand notice.'
    }
  });
});

// 8. Telangana Stamp Duty & Registration Estimator
app.post('/api/calculator/stamp-duty', (req, res) => {
  const { propertyValue, propertyType, transactionType } = req.body;
  const val = parseFloat(propertyValue) || 0;

  if (val <= 0) {
    return res.status(400).json({ success: false, message: 'Valid property valuation amount is required.' });
  }

  // Telangana rates approximation:
  // Sale Deed: Stamp Duty 5.5% + Transfer Duty 1.5% + Registration 0.5% = Total ~7.5%
  // Gift deed to family: ~2.5% - 3%
  let stampDutyPct = 5.5;
  let transferDutyPct = 1.5;
  let registrationFeePct = 0.5;

  if (transactionType === 'gift_family') {
    stampDutyPct = 2.0;
    transferDutyPct = 0.5;
    registrationFeePct = 0.5;
  } else if (transactionType === 'partition') {
    stampDutyPct = 1.0;
    transferDutyPct = 0.0;
    registrationFeePct = 0.5;
  } else if (transactionType === 'mortgage') {
    stampDutyPct = 0.5;
    transferDutyPct = 0.0;
    registrationFeePct = 0.5;
  }

  const stampDutyAmount = (val * stampDutyPct) / 100;
  const transferDutyAmount = (val * transferDutyPct) / 100;
  const registrationFeeAmount = (val * registrationFeePct) / 100;
  const totalGovtCharges = stampDutyAmount + transferDutyAmount + registrationFeeAmount;

  res.json({
    success: true,
    data: {
      propertyValue: val,
      transactionType: transactionType || 'sale_deed',
      breakdown: {
        stampDuty: { percentage: stampDutyPct, amount: Math.round(stampDutyAmount) },
        transferDuty: { percentage: transferDutyPct, amount: Math.round(transferDutyAmount) },
        registrationFee: { percentage: registrationFeePct, amount: Math.round(registrationFeeAmount) }
      },
      totalEstimatedGovtFee: Math.round(totalGovtCharges),
      state: 'Telangana (SRO Madinaguda / Hyderabad Jurisdiction)',
      note: 'Estimates are based on published Telangana Registration Department guidelines. Final challans depend on Sub-Registrar Office (SRO) market guideline rates vs agreement value.'
    }
  });
});

// 9. Intelligent Legal Q&A Assistant ("NyayaBot")
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, reply: 'Please state your legal query.' });
  }

  const query = message.toLowerCase();

  // Knowledge base responses tailored for SW Legal Hub & Indian Law
  let reply = '';
  let relatedAdvocate = null;
  let actionSuggestion = null;

  if (query.includes('freeze') || query.includes('cyber') || query.includes('1930') || query.includes('defreeze') || query.includes('de-freeze') || query.includes('hacked') || query.includes('upi fraud')) {
    reply = `Has your bank account been placed on debit freeze due to a cyber fraud complaint? Cyber police cells across India trigger account freezes under Section 102 CrPC / BNSS. We assist in obtaining the exact National Cybercrime Reporting Portal (NCRP) complaint details, proving bona fide commercial transactions, liaising with the investigating officer, and submitting a formal petition / NOC requisition to unfreeze your bank account. Adv. Shaik Azaruddin specializes in cyber law & account defreeze.`;
    relatedAdvocate = 'Adv. Shaik Azaruddin (BA.LLB)';
    actionSuggestion = 'Submit Bank Freeze Notice for Expedited Scrutiny';
  } else if (query.includes('cheque') || query.includes('bounce') || query.includes('dishonor') || query.includes('138') || query.includes('return memo')) {
    reply = `For cheque bounce cases under Section 138 of the Negotiable Instruments Act, you MUST issue a Statutory 15-Day Demand Notice within 30 days of receiving the 'Cheque Return Memo' from the bank. If the drawer fails to pay within 15 days, you have 30 days to file a criminal complaint before the Judicial Magistrate. You may also claim up to 20% interim compensation under Section 143A. Our specialist Adv. Shaik Murtuza handles high-recovery cheque bounce cases.`;
    relatedAdvocate = 'Adv. Shaik Murtuza (B.Com, LLB)';
    actionSuggestion = 'Use our Cheque Timeline Calculator or Book Consultation';
  } else if (query.includes('bail') || query.includes('arrest') || query.includes('remand') || query.includes('quash') || query.includes('police') || query.includes('fir') || query.includes('criminal')) {
    reply = `In criminal matters and sudden police actions, time is critical. Under the Bharatiya Nagarik Suraksha Sanhita (BNSS) / CrPC, you can apply for Anticipatory Bail (before arrest) or Regular Bail (post arrest) before the Judicial Magistrate or Sessions Court. For immediate police station representation and emergency bail petitions in Madinaguda, Miyapur, Kukatpally, or Cyberabad jurisdiction, contact our Criminal Defense Counsel Adv. Shaik Ghouseddin and Adv. Md. Moizuddin immediately on our 24/7 hotline.`;
    relatedAdvocate = 'Adv. Shaik Ghouseddin & Adv. Md. Moizuddin';
    actionSuggestion = 'Call 24/7 Bail Hotline: 88015 93599';
  } else if (query.includes('divorce') || query.includes('marriage') || query.includes('custody') || query.includes('maintenance') || query.includes('family') || query.includes('alimony') || query.includes('498a')) {
    reply = `In family and matrimonial disputes, we offer both structured amicable mediation and aggressive courtroom representation. Mutual Consent Divorce (under Hindu Marriage Act Sec 13B, Special Marriage Act, or Muslim Personal Law) can be expedited with statutory cooling-off waiver petitions. We also litigate child custody, interim maintenance (Sec 125), and Domestic Violence protection orders. Adv. Shaik Salma and Adv. Shaik Fathima lead our Family Law division.`;
    relatedAdvocate = 'Adv. Shaik Salma (B.Com, MBA, LLB)';
    actionSuggestion = 'Schedule Confidential Family Law Consultation';
  } else if (query.includes('property') || query.includes('land') || query.includes('title') || query.includes('civil') || query.includes('partition') || query.includes('injunction') || query.includes('rera') || query.includes('encumbrance')) {
    reply = `Civil and real estate matters require thorough due diligence. Before purchasing any property in Hyderabad / Madinaguda / Telangana, our team executes a 30-year Encumbrance Certificate (EC) check, Dharani/Pahani scrutiny, municipal layout sanctions, and link document validation. We also handle civil suits for permanent injunction, partition of ancestral property, and specific performance. Adv. Shaik Ghouseddin and Adv. Md. Moizuddin lead our Civil practice.`;
    relatedAdvocate = 'Adv. Shaik Ghouseddin & Adv. Md. Moizuddin';
    actionSuggestion = 'Book Comprehensive Title Verification';
  } else if (query.includes('fee') || query.includes('cost') || query.includes('charge') || query.includes('price')) {
    reply = `At SW Legal Hub, we maintain strict fee transparency. Legal fee structures depend on the nature of the matter (e.g., preliminary legal advice, document vetting, statutory notice drafting, or court trial appearances). Initial chamber consultations start at nominal transparent rates. You can book an appointment online or request an immediate quote over WhatsApp at 6305232587.`;
    actionSuggestion = 'Request Quote via WhatsApp (6305232587)';
  } else if (query.includes('address') || query.includes('location') || query.includes('where') || query.includes('madinaguda') || query.includes('office') || query.includes('timings')) {
    reply = `SW Legal Hub is located at: SK. SIRAJ MANZIL, H.NO 1-58/3/2/A, PLOT NO. 74 B, BESIDE INDIAN OIL PETROLBUNK, MADINAGUDA, 500049 (Hyderabad, Telangana). Our chamber is open Monday through Saturday from 9:00 AM to 9:00 PM. Sunday consultations are available by prior appointment. For urgent matters, our emergency legal line operates 24/7.`;
    actionSuggestion = 'View Map & Directions or Call 88015 93599';
  } else {
    reply = `Thank you for consulting SW Legal Hub. We specialize in Family Law, Civil Disputes & Property Scrutiny, Criminal Defense & Bail, Cybercrime & Bank Freezes, and Section 138 Cheque Bounce Cases. Our 7 experienced advocates are available at our Madinaguda chamber or via virtual consultation. You can schedule an appointment online, track your existing case status, or reach us directly at 88015 93599 / WhatsApp 6305232587.`;
    actionSuggestion = 'Book an Appointment or Track Case';
  }

  res.json({
    success: true,
    reply: reply,
    assignedAdvocate: relatedAdvocate,
    actionSuggestion: actionSuggestion
  });
});

// 10. Admin Authentication Endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password / PIN are required.' });
  }

  const db = readDb();
  const auth = db.adminAuth || {
    username: 'swlegalhub',
    email: 'swlegalhub9949@gmail.com',
    password: '9949084473',
    pin: '9949084473'
  };

  const u = username.trim().toLowerCase();
  const isValidUser = (u === auth.username.toLowerCase() || u === auth.email.toLowerCase() || u === 'admin');
  const isValidPass = (password === auth.password || password === auth.pin);

  if (isValidUser && isValidPass) {
    // Generate simple token for session
    const token = 'SWL-TOKEN-' + Buffer.from(auth.username + ':' + Date.now()).toString('base64');
    return res.json({
      success: true,
      message: 'Chambers authentication successful.',
      token: token,
      user: {
        name: 'Chambers Advocate Desk',
        username: auth.username,
        email: auth.email
      }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Access restricted to authorized SW Legal Hub advocates and staff.'
    });
  }
});

// Middleware to verify admin token
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer SWL-TOKEN-')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Advocate chambers login required.'
    });
  }
  next();
}

// 11. Admin API: Get Consultations & Messages (Protected)
app.get('/api/admin/consultations', requireAdminAuth, async (req, res) => {
  await syncFromCloud();
  const db = readDb();
  res.json({
    success: true,
    total: db.consultations.length,
    data: db.consultations
  });
});

app.get('/api/admin/messages', requireAdminAuth, async (req, res) => {
  await syncFromCloud();
  const db = readDb();
  res.json({
    success: true,
    total: (db.messages || []).length,
    data: db.messages || []
  });
});

// Create Case / Consultation from Admin Desk (Protected)
app.post('/api/admin/consultations', requireAdminAuth, async (req, res) => {
  try {
    await syncFromCloud();
    const db = readDb();
    const {
      clientName,
      phone,
      email,
      category,
      assignedAdvocate,
      consultationType,
      requestedDate,
      requestedTime,
      status,
      stage,
      urgency,
      summary,
      court,
      nextHearing,
      caseNotes
    } = req.body;

    if (!clientName || !phone) {
      return res.status(400).json({ success: false, message: 'Client name and phone number are required.' });
    }

    const refId = generateRefId();
    const newRecord = {
      refId: refId,
      clientName: clientName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      category: category || 'General Legal Counsel',
      assignedAdvocate: assignedAdvocate || 'Adv. Shaik Ghouseddin',
      consultationType: consultationType || 'In-Office',
      requestedDate: requestedDate || new Date().toISOString().split('T')[0],
      requestedTime: requestedTime || '11:00 AM',
      status: status || 'Pending Review',
      stage: stage || 'Chambers Dossier Created',
      urgency: urgency || 'Normal',
      summary: summary || 'Chambers walk-in / phone consultation logged.',
      nextHearing: nextHearing || 'To be scheduled',
      court: court || 'SW Legal Hub Chamber, Madinaguda',
      caseNotes: caseNotes || 'Logged by Chambers Admin.',
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.consultations.unshift(newRecord);
    writeDb(db);
    await syncToCloud(db);

    res.status(201).json({
      success: true,
      message: `Docket ${refId} created successfully.`,
      data: newRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create case docket.' });
  }
});

// Update Case / Consultation details from Admin (Protected)
app.put('/api/admin/consultations/:refId', requireAdminAuth, async (req, res) => {
  await syncFromCloud();
  const db = readDb();
  const refId = req.params.refId;
  const index = db.consultations.findIndex(c => c.refId.toLowerCase() === refId.toLowerCase());

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Consultation record not found.' });
  }

  const updated = {
    ...db.consultations[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  db.consultations[index] = updated;
  writeDb(db);
  await syncToCloud(db);

  res.json({
    success: true,
    message: `Record ${refId} successfully updated.`,
    data: updated
  });
});

// Delete Case / Consultation from Admin (Protected)
app.delete('/api/admin/consultations/:refId', requireAdminAuth, async (req, res) => {
  await syncFromCloud();
  const db = readDb();
  const refId = req.params.refId;
  const initialLength = db.consultations.length;
  db.consultations = db.consultations.filter(c => c.refId.toLowerCase() !== refId.toLowerCase());

  if (db.consultations.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Case record not found.' });
  }

  writeDb(db);
  await syncToCloud(db);

  res.json({
    success: true,
    message: `Docket ${refId} has been successfully deleted.`
  });
});

// Purge All Case Dockets from Admin (Protected)
app.delete('/api/admin/consultations', requireAdminAuth, async (req, res) => {
  const db = readDb();
  const clearedCount = db.consultations.length;
  db.consultations = [];
  writeDb(db);
  await syncToCloud(db);

  res.json({
    success: true,
    message: `All ${clearedCount} case dockets have been permanently cleared.`
  });
});

// Admin stats overview (Protected)
app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  await syncFromCloud();
  const db = readDb();
  const consultations = db.consultations || [];
  
  const stats = {
    totalCases: consultations.length,
    pending: consultations.filter(c => c.status === 'Pending' || c.status === 'Pending Review').length,
    inProgress: consultations.filter(c => c.status === 'In Progress').length,
    inCourt: consultations.filter(c => c.status === 'In Court').length,
    completed: consultations.filter(c => c.status === 'Completed' || c.status === 'Closed').length,
    byCategory: {},
    byAdvocate: {}
  };

  consultations.forEach(c => {
    stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
    stats.byAdvocate[c.assignedAdvocate] = (stats.byAdvocate[c.assignedAdvocate] || 0) + 1;
  });

  res.json({
    success: true,
    data: stats
  });
});

// Start Server if not imported by serverless platform
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚖️  SW LEGAL HUB - ADVOCATE OFFICE PORTAL`);
    console.log(`🌐 Server active on: http://localhost:${PORT}`);
    console.log(`📍 Madinaguda, Hyderabad - 500049`);
    console.log(`📞 Contact: 88015 93599 | WhatsApp: 6305232587`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
