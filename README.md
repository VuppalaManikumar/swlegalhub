# SW LEGAL HUB - Full-Stack Advocate Chambers Web Portal

> **ADVOCATE. ADVISE. ACHIEVE.**  
> *Committed to Justice. Dedicated to Your Rights.*  
> **Office:** SK. SIRAJ MANZIL, H.NO 1-58/3/2/A, PLOT NO. 74 B, BESIDE INDIAN OIL PETROLBUNK, MADINAGUDA, 500049  
> **Call:** 88015 93599 | **WhatsApp:** 6305232587 | **Email:** swlegalhub9949@gmail.com

---

## 🏛️ Project Overview
**SW LEGAL HUB** is a high-performance, full-stack digital chambers portal created specifically for the advocate office featured in the identity card. It is styled in a luxury **Obsidian Black & Royal Gold** aesthetic with extreme interactive legal features for clients, litigators, and chamber administrators.

---

## 🌟 Extreme Features Included

### 1. 🔍 Live Case & Consultation Tracker ("NyayaTrack")
- Real-time lookup by **Docket Reference ID** (e.g. `SWL-2026-1042`, `SWL-2026-2189`) or registered 10-digit mobile number.
- Visual **5-Step Milestone Progress Bar**:
  1. Case Dossier Received & Logged
  2. Document Scrutiny & Pre-Litigation Review
  3. Statutory Notice / Petition Drafted
  4. Court Appearance / Trial Motion
  5. Resolution / Final Decree
- Displays assigned advocate, presiding court (e.g. *Metropolitan Magistrate Court Kukatpally, Family Court Miyapur, High Court*), next hearing date, and advocate docket remarks.
- 1-click **Print Official Docket Slip** and direct WhatsApp contact with the assigned advocate.

### 2. 📅 Multi-Step Chamber Consultation & Case Filing Wizard
- Select practice area, preferred advocate, and consultation mode (*In-Office at Madinaguda, Video Call, or Phone*).
- Auto-generates unique Reference IDs (`SWL-2026-XXXX`).
- Multi-file drag-and-drop document vault (PDF, DOCX, JPG, PNG up to 15MB each) stored securely in `uploads/`.
- Instant WhatsApp appointment confirmation link with pre-filled case details.

### 3. 👥 All 7 Advocates Directory (Exact from Card)
- **Adv. Shaik Ghouseddin** – `B.Com, MBA, M.Com, Mass Sociology, Mass Psychology, LLB` (Managing Counsel & Senior Consultant)
- **Adv. Shaik Murtuza** – `B.Com, LLB` (Senior Partner & Commercial Litigator)
- **Adv. Shaik Salma** – `B.Com, MBA, LLB` (Senior Associate & Family Law Specialist)
- **Adv. Shaik Fathima** – `BA.LLB` (Associate Advocate - Family & Civil Practice)
- **Adv. Md. Moizuddin** – `BA.LLB` (Criminal Defense & Trial Counsel)
- **Adv. Shaik Azaruddin** – `BA.LLB` (Cyber & Technology Law Specialist)
- **Adv. Shaik Imranuddin** – `BA.LLB` (Commercial & Negotiable Instruments Counsel)

### 4. ⚖️ 5 Core Practice Disciplines
- **Family Law**: Mutual & Contested Divorce, Child Custody, Maintenance (Sec 125), Domestic Violence (DV Act).
- **Civil Law**: 30-Year Property Title Search, Partition Suits, Permanent Injunctions, Specific Performance.
- **Criminal Law**: 24/7 Urgent Bail, FIR Quashing (Sec 482 / BNSS), Remand defense.
- **Cybercrime Law**: Interstate Bank Account Debit Freeze De-freezing NOC, 1930 Portal Escalations.
- **Cheque Bounce Cases**: Section 138 NI Act recovery, 15-day statutory notices, Sec 143A interim compensation.

### 5. 🧮 Interactive Legal Calculators & Triage Utilities
- **Section 138 NI Act Cheque Bounce Timeline Engine**: Computes exact 30-day notice deadline, 15-day grace period, and 30-day court filing window with urgency badges.
- **Telangana Property Registration & Stamp Duty Estimator**: Calculates Stamp Duty (5.5%), Transfer Duty (1.5%), and Registration Fees (0.5%) based on market value.
- **48-Hour Emergency Cybercrime Protocol**: Step-by-step action guide for frozen bank accounts and unauthorized online fraud.

### 6. 🤖 Smart Virtual Legal Assistant ("NyayaBot")
- Conversational widget trained in Indian Law (BNSS/CrPC, BNS/IPC, NI Act 138, IT Act, HMA) and chamber jurisdiction.
- Instant chips for common legal queries, recommending appropriate lead counsel.

### 7. 🛡️ Bar Council of India (BCI) Rule 36 Compliance Gate
- Enforces professional ethics and Bar Council rules with an introductory disclaimer modal.

### 8. 🔐 Complete Advocate & Chambers Admin Portal (`/admin.html`)
- Live dashboard displaying all active dockets, pending reviews, cases in court, and inquiries.
- Real-time docket updates: change procedural stage, edit court dates, add case notes, reassign advocates.
- 1-click WhatsApp and phone calls directly to clients from the docket table.

---

## 🚀 How to Run

### Requirements
- Node.js (v18+)

### Start the Server
```bash
cd "C:\Users\manik\.gemini\antigravity\scratch\sw-legal-hub"
npm start
```

Open your browser at:
- **Public Website:** [http://localhost:3000](http://localhost:3000)
- **Advocate Admin Portal:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 📁 Directory Structure
```
sw-legal-hub/
├── data/
│   └── database.json         # Local database (consultations, advocates, messages)
├── uploads/                  # Client case exhibits (scanned cheques, deeds, FIRs)
├── public/
│   ├── index.html            # Flagship public web portal
│   ├── admin.html            # Advocate & chambers administration console
│   ├── css/
│   │   └── styles.css        # Bespoke luxury obsidian & gold styling
│   ├── js/
│   │   ├── app.js            # Frontend logic (tracking, booking, calculators, bot)
│   │   └── admin.js          # Admin dashboard controller
│   └── assets/
│       ├── logo.svg          # Lady Justice & SW crest vector logo
│       └── advocate-badge.svg# Advocate neckband insignia
├── server.js                 # Express REST API backend
└── package.json
```

---

## 🆓 Free & Zero-Cost Stack
- **Backend:** Node.js + Express (100% Free & Open Source)
- **Database:** Local JSON File Storage (No paid cloud database required)
- **Frontend:** HTML5, Modern CSS, Tailwind CSS CDN, Lucide Icons (Zero subscription costs)
- **Hosting Ready:** Can be deployed freely on Render, Railway, Vercel, or any VPS/cPanel hosting.
