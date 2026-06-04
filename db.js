// ============================================================
//  db.js  —  ERPNext Admin Files | Brilliant Technologies
//  Dual Database: Firebase Firestore  OR  LocalStorage
//  Switch via FIREBASE_ENABLED flag below
// ============================================================

// ─── FIREBASE CONFIG ─────────────────────────────────────────
// Replace these values with your Firebase project credentials
// Firebase Console → Project Settings → Your Apps → Config
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB8Z9VU8rQFUR3Z5Ecz7IZdV_7pQouX6UE",
  authDomain:        "bcrm-ab252.firebaseapp.com",
  projectId:         "bcrm-ab252",
  storageBucket:     "bcrm-ab252.appspot.com",
  messagingSenderId: "917883997779",
  appId:             "1:917883997779:web:5751c02f671c9c0799c0a6",
  measurementId:     "G-78K05ZBVZT"
};

// Set true  = Firebase Firestore (cloud, multi-user)
// Set false = LocalStorage      (offline, single device)
const FIREBASE_ENABLED = false;

// ─── FIREBASE INIT ───────────────────────────────────────────
let _db = null;
let _auth = null;

async function initFirebase() {
  if (!FIREBASE_ENABLED) return;
  try {
    const { initializeApp }     = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAnalytics }      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js");
    const { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, onSnapshot }
                                  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    window._fb = { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, onSnapshot };
    const app = initializeApp(FIREBASE_CONFIG);
    try {
      const analytics = getAnalytics(app);
      window._fb.analytics = analytics;
      console.log("[DB] Firebase Analytics initialized");
    } catch (err) {
      console.warn("[DB] Firebase analytics not available", err);
    }
    _db = getFirestore(app);
    console.log("[DB] Firebase Firestore connected");
  } catch(e) {
    console.warn("[DB] Firebase failed, falling back to LocalStorage", e);
  }
}

// ─── LOCALSTORAGE HELPERS ────────────────────────────────────
const LS = {
  get(col) {
    return JSON.parse(localStorage.getItem("eaf_" + col) || "{}");
  },
  save(col, data) {
    localStorage.setItem("eaf_" + col, JSON.stringify(data));
  },
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};

// ─── SEED DEFAULT DATA ───────────────────────────────────────
async function seedDefaults() {
  const seeded = localStorage.getItem("eaf_seeded");
  const users = Object.values(LS.get("users") || {});
  if (seeded && users.length) return;

  await Promise.all([
    DB.set("users", "murthu",  { id:"murthu",  username:"Murthu",  password:"Murthu@44718",  role:"Super Administrator", avatar:"M", color:"#2563EB", createdAt: Date.now(), lastLogin: null, actionsCount: 89 }),
    DB.set("users", "rajesh",  { id:"rajesh",  username:"Rajesh",  password:"Rajesh@2001$",  role:"Administrator",       avatar:"R", color:"#059669", createdAt: Date.now(), lastLogin: null, actionsCount: 54 })
  ]);

  const projects = [
    { id:"crm",           name:"CRM",           client:"Acme Corp Ltd.",         icon:"ti-users",            color:"#EFF6FF", iconColor:"#2563EB", progress:72, status:"Active",      scripts:24, fields:38, reports:5,
      description: "ERPNext CRM with lead management, pipeline tracking, and customer engagement workflows.",
      features: ["Lead Management", "Opportunity Tracking", "Sales Pipeline", "Customer Portal","Follow-up Automation"]
    },
    { id:"hrms",          name:"HRMS",          client:"TechNova Pvt Ltd.",       icon:"ti-id",               color:"#ECFDF5", iconColor:"#059669", progress:88, status:"Active",      scripts:31, fields:52, reports:9,
      description: "HRMS automation for employee onboarding, leave management and payroll configuration.",
      features: ["Employee Onboarding", "Attendance Tracking", "Leave & Holidays", "Payroll Setup", "Appraisal Workflow"]
    },
    { id:"manufacturing", name:"Manufacturing", client:"Steelcraft Industries",  icon:"ti-building-factory", color:"#FFF7ED", iconColor:"#EA580C", progress:55, status:"In Progress", scripts:18, fields:29, reports:6,
      description: "Manufacturing module with BOM costing, work order automation and inventory planning.",
      features: ["BOM Costing", "Work Order Management", "Material Requests", "Shop Floor Control", "Stock Reconciliation"]
    },
    { id:"healthcare",    name:"Healthcare",    client:"MedPlus Network",         icon:"ti-heart-rate",       color:"#FDF2F8", iconColor:"#BE185D", progress:40, status:"In Progress", scripts:12, fields:44, reports:7,
      description: "Healthcare operations with patient records, appointment scheduling and clinical workflows.",
      features: ["Patient Registration", "Appointment Scheduling", "Clinical Notes", "Billing Integration", "Prescription Tracking"]
    },
    { id:"education",     name:"Education",     client:"Bright Minds Academy",    icon:"ti-school",           color:"#F5F3FF", iconColor:"#7C3AED", progress:65, status:"Active",      scripts:9,  fields:21, reports:4,
      description: "Education module for student records, attendance, assessments and fee management.",
      features: ["Student Profiles", "Attendance", "Assessment Records", "Fee Collection", "Parent Communication"]
    },
    { id:"accounts",      name:"Accounts",      client:"GlobalFinance Ltd.",      icon:"ti-coin",             color:"#EFF6FF", iconColor:"#0284C7", progress:91, status:"Active",      scripts:14, fields:33, reports:11,
      description: "Financial accounting with ledger posting, tax calculations and receivable/payable tracking.",
      features: ["General Ledger", "Tax Posting", "Payment Terms", "Aging Reports", "Bank Reconciliation"]
    },
    { id:"retail",        name:"Retail",        client:"Dmart Solutions",         icon:"ti-shopping-cart",    color:"#FFF1F2", iconColor:"#E11D48", progress:30, status:"New",         scripts:7,  fields:18, reports:3,
      description: "Retail operations for POS, pricing rules, and stock replenishment across outlets.",
      features: ["POS Integration", "Pricing Rules", "Stock Replenishment", "Customer Loyalty", "Sales Reporting"]
    },
    { id:"inventory",     name:"Inventory",     client:"LogiPro Warehousing",     icon:"ti-package",          color:"#F0FDF4", iconColor:"#16A34A", progress:78, status:"Active",      scripts:11, fields:27, reports:5,
      description: "Inventory management with stock movement, warehouse tracking and reorder automation.",
      features: ["Stock Ledger", "Warehouse Transfers", "Batch / Serial Tracking", "Reorder Levels", "Stock Valuation"]
    }
  ];
  await Promise.all(projects.map(p => DB.set("projects", p.id, p)));

  const scripts = [
    { id:"s1", name:"Lead Auto Follow-up",     doctype:"Lead",         trigger:"on_submit", project:"CRM",           createdBy:"Murthu", date:"12 Jun 2025", code:`frappe.ui.form.on('Lead', {\n  on_submit: function(frm) {\n    if (frm.doc.lead_owner) {\n      frappe.call({\n        method: 'crm.api.create_followup',\n        args: { lead_name: frm.doc.name, assigned_to: frm.doc.lead_owner },\n        callback: function(r) { frappe.msgprint('Follow-up created!'); }\n      });\n    }\n  }\n});` },
    { id:"s2", name:"Employee Grade Auto-Set", doctype:"Employee",     trigger:"on_load",   project:"HRMS",          createdBy:"Rajesh", date:"10 Jun 2025", code:`frappe.ui.form.on('Employee', {\n  on_load: function(frm) {\n    if (!frm.doc.custom_grade_level) {\n      frm.set_value('custom_grade_level', 'L1');\n    }\n  }\n});` },
    { id:"s3", name:"BOM Cost Calculation",   doctype:"BOM",          trigger:"on_change", project:"Manufacturing", createdBy:"Murthu", date:"8 Jun 2025",  code:`frappe.ui.form.on('BOM', {\n  qty: function(frm) {\n    let total = 0;\n    frm.doc.items.forEach(row => { total += row.amount; });\n    frm.set_value('total_cost', total);\n  }\n});` },
    { id:"s4", name:"Invoice Tax Validator",  doctype:"Sales Invoice", trigger:"validate",  project:"Accounts",      createdBy:"Rajesh", date:"5 Jun 2025",  code:`frappe.ui.form.on('Sales Invoice', {\n  validate: function(frm) {\n    if (!frm.doc.taxes || frm.doc.taxes.length === 0) {\n      frappe.throw('Please add tax rows before submitting.');\n    }\n  }\n});` }
  ];
  await Promise.all(scripts.map(s => DB.set("client_scripts", s.id, s)));

  const fields = [
    { id:"f1", doctype:"Lead",         label:"Customer Source",   fieldname:"custom_customer_source", type:"Select", insertAfter:"lead_name",   project:"CRM",           createdBy:"Murthu" },
    { id:"f2", doctype:"Employee",     label:"Grade Level",       fieldname:"custom_grade_level",     type:"Data",   insertAfter:"designation",  project:"HRMS",          createdBy:"Rajesh" },
    { id:"f3", doctype:"Sales Invoice",label:"GST Category",      fieldname:"custom_gst_category",    type:"Select", insertAfter:"tax_id",       project:"Accounts",      createdBy:"Murthu" },
    { id:"f4", doctype:"BOM",          label:"Approved By",       fieldname:"custom_approved_by",     type:"Link",   insertAfter:"bom_no",       project:"Manufacturing", createdBy:"Rajesh" },
    { id:"f5", doctype:"Patient",      label:"Emergency Contact", fieldname:"custom_emergency_contact",type:"Phone", insertAfter:"patient_name", project:"Healthcare",    createdBy:"Murthu" }
  ];
  await Promise.all(fields.map(f => DB.set("custom_fields", f.id, f)));

  await DB.set("settings", "app", { darkMode: false, currentUser: null });
  localStorage.setItem("eaf_seeded", "1");
  console.log("[DB] Seed data loaded");
}

// ─── UNIFIED DB API ──────────────────────────────────────────
const DB = {
  // Get one record
  async get(collection, id) {
    if (FIREBASE_ENABLED && _db) {
      const snap = await _fb.getDoc(_fb.doc(_db, collection, id));
      return snap.exists() ? snap.data() : null;
    }
    const store = LS.get(collection);
    return store[id] || null;
  },

  // Get all records in a collection
  async getAll(collection) {
    if (FIREBASE_ENABLED && _db) {
      const snap = await _fb.getDocs(_fb.collection(_db, collection));
      return snap.docs.map(d => d.data());
    }
    return Object.values(LS.get(collection));
  },

  // Set/create a record
  async set(collection, id, data) {
    const record = { ...data, _id: id, _updatedAt: Date.now() };
    if (FIREBASE_ENABLED && _db) {
      await _fb.setDoc(_fb.doc(_db, collection, id), record);
      return record;
    }
    const store = LS.get(collection);
    store[id] = record;
    LS.save(collection, store);
    return record;
  },

  // Add new record (auto ID)
  async add(collection, data) {
    const id = LS.genId();
    return this.set(collection, id, { ...data, id });
  },

  // Update partial fields
  async update(collection, id, patch) {
    const existing = await this.get(collection, id) || {};
    return this.set(collection, id, { ...existing, ...patch });
  },

  // Delete a record
  async delete(collection, id) {
    if (FIREBASE_ENABLED && _db) {
      await _fb.deleteDoc(_fb.doc(_db, collection, id));
      return;
    }
    const store = LS.get(collection);
    delete store[id];
    LS.save(collection, store);
  },

  // Log activity
  async logActivity(action, detail, user, project = "") {
    const id = LS.genId();
    return this.set("activity", id, {
      id, action, detail, user, project,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" })
    });
  }
};

// Init on load
(async () => {
  await initFirebase();
  await seedDefaults();
})();
