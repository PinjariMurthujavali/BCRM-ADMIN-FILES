// ============================================================
//  app.js  —  ERPNext Admin Files | Main Application Logic
// ============================================================

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const icon = type === "success" ? "ti-check" : type === "error" ? "ti-x" : "ti-info-circle";
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="ti ${icon}"></i> ${msg}`;
  document.getElementById("toast-container").appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── MODAL HELPERS ───────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// ─── ROUTER ──────────────────────────────────────────────────
const ROUTES = {};
let currentRoute = null;

function register(name, fn) { ROUTES[name] = fn; }

function navigate(name, push = true) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const page = document.getElementById("page-" + name);
  if (!page) return;
  page.style.display = "block";
  currentRoute = name;
  const navEl = document.querySelector(`[data-page="${name}"]`);
  if (navEl) navEl.classList.add("active");
  const titles = {
    dashboard:"Dashboard", projects:"Projects",
    "custom-fields":"Custom Fields", doctypes:"Custom Doctypes",
    "client-scripts":"Client Scripts", "server-scripts":"Server Scripts",
    reports:"Reports", workflows:"Workflows", "print-formats":"Print Formats",
    "ai-analyzer":"AI Screenshot Analyzer", "knowledge-base":"Knowledge Base",
    "api-docs":"API Documentation", users:"Users & Roles", activity:"Activity Log"
  };
  document.getElementById("topbar-title").textContent = titles[name] || name;
  if (ROUTES[name]) ROUTES[name]();
  if (push) history.pushState({ page: name }, "", "#" + name);
}

// ─── AUTH UI ──────────────────────────────────────────────────
async function doLogin() {
  const u = document.getElementById("login-user").value.trim();
  const p = document.getElementById("login-pass").value;
  const btn = document.getElementById("login-btn");
  const err = document.getElementById("login-err");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Signing in...`;
  err.style.display = "none";
  try {
    const user = await Auth.login(u, p);
    applyUser(user);
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    navigate("dashboard");
  } catch (e) {
    err.textContent = e;
    err.style.display = "block";
    document.getElementById("login-pass").style.borderColor = "#ef4444";
    setTimeout(() => { document.getElementById("login-pass").style.borderColor = ""; }, 1500);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Sign In &rarr;";
  }
}

function applyUser(user) {
  document.getElementById("sb-av").textContent    = user.avatar;
  document.getElementById("sb-av").style.background = user.color;
  document.getElementById("sb-name").textContent   = user.username;
  document.getElementById("sb-role").textContent   = user.role;
  document.getElementById("top-av").textContent    = user.avatar;
  document.getElementById("top-av").style.background = user.color;
  document.getElementById("top-name").textContent  = user.username;
}

async function doLogout() {
  await Auth.logout();
  document.getElementById("app").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
}

// ─── DARK MODE ────────────────────────────────────────────────
function toggleDark() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("dark-icon").className = isDark ? "ti ti-moon" : "ti ti-sun";
  localStorage.setItem("eaf_dark", isDark ? "0" : "1");
}

// ─── NOTIFICATIONS ────────────────────────────────────────────
function toggleNotif() {
  document.getElementById("notif-panel").classList.toggle("open");
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────
register("dashboard", async () => {
  const projects = await DB.getAll("projects");
  const scripts  = await DB.getAll("client_scripts");
  const fields   = await DB.getAll("custom_fields");
  const svr      = await DB.getAll("server_scripts");
  const rpts     = await DB.getAll("reports");
  const wfs      = await DB.getAll("workflows");
  const pfs      = await DB.getAll("print_formats");
  const users    = await DB.getAll("users");

  document.getElementById("stat-projects").textContent = projects.length;
  document.getElementById("stat-fields").textContent   = fields.length;
  document.getElementById("stat-cscripts").textContent = scripts.length;
  document.getElementById("stat-sscripts").textContent = svr.length;
  document.getElementById("stat-reports").textContent  = rpts.length;
  document.getElementById("stat-wf").textContent       = wfs.length;
  document.getElementById("stat-pf").textContent       = pfs.length;
  document.getElementById("stat-users").textContent    = users.length;

  drawModuleChart(projects);
  loadRecentActivity();
});

function drawModuleChart(projects) {
  const el = document.getElementById("mod-chart");
  if (!el) return;
  const colors = ["#2563EB","#10B981","#F59E0B","#7C3AED","#EF4444","#0284C7","#16A34A","#BE185D"];
  el.innerHTML = projects.slice(0,8).map((p,i) => `
    <div class="bar-col">
      <div class="bar-fill" style="height:${p.progress}%;background:${colors[i%colors.length]};opacity:.85"></div>
      <div class="bar-lbl">${p.name.slice(0,4)}</div>
    </div>`).join("");

  const el2 = document.getElementById("act-chart");
  if (!el2) return;
  const months=["Jan","Feb","Mar","Apr","May","Jun"];
  const vals=[18,24,31,27,42,38];
  el2.innerHTML = months.map((m,i) => `
    <div class="bar-col">
      <div class="bar-fill" style="height:${Math.round(vals[i]/42*100)}%;background:#2563EB;opacity:${0.45+0.55*(i/5)}"></div>
      <div class="bar-lbl">${m}</div>
    </div>`).join("");
}

async function loadRecentActivity() {
  const el = document.getElementById("recent-activity");
  if (!el) return;
  const all = await DB.getAll("activity");
  const sorted = all.sort((a,b) => b.timestamp - a.timestamp).slice(0,5);
  if (!sorted.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-activity"></i><h6>No activity yet</h6></div>`; return; }
  const icons = { login:"ti-login", logout:"ti-logout", add:"ti-plus", edit:"ti-edit", delete:"ti-trash", upload:"ti-upload", export:"ti-download" };
  const colors = { login:"#EFF6FF,#2563EB", logout:"#FEF2F2,#DC2626", add:"#ECFDF5,#059669", edit:"#EFF6FF,#2563EB", delete:"#FEF2F2,#DC2626", upload:"#FFFBEB,#D97706", export:"#F5F3FF,#7C3AED" };
  el.innerHTML = sorted.map(a => {
    const [bg,fg] = (colors[a.action] || "#EFF6FF,#2563EB").split(",");
    return `<div class="act-item">
      <div class="act-dot" style="background:${bg};color:${fg}"><i class="ti ${icons[a.action]||'ti-info-circle'}"></i></div>
      <div><div class="act-title">${a.detail}</div><div class="act-meta">${a.user} &middot; ${a.timeStr}</div></div>
    </div>`;
  }).join("");
}

// ─── PROJECTS PAGE ────────────────────────────────────────────
register("projects", async () => {
  const projects = await DB.getAll("projects");
  const el = document.getElementById("projects-grid");
  const statusTag = s => s === "Active" ? "tag-green" : s === "In Progress" ? "tag-amber" : s === "New" ? "tag-red" : "tag-gray";
  el.innerHTML = projects.map(p => `
    <div class="card card-hover project-card">
      <div class="pc-head">
        <div class="pc-icon" style="background:${p.color};color:${p.iconColor}"><i class="ti ${p.icon}"></i></div>
        <div><div class="pc-name">${p.name}</div><div class="pc-client">${p.client}</div></div>
      </div>
      <div class="pc-stats">
        <div class="pc-stat"><span>${p.scripts}</span> scripts</div>
        <div class="pc-stat"><span>${p.fields}</span> fields</div>
        <div class="pc-stat"><span>${p.reports}</span> reports</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${p.progress}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--muted)">
        <span>${p.progress}% complete</span>
        <span class="tag ${statusTag(p.status)}" style="font-size:10.5px">${p.status}</span>
      </div>
    </div>`).join("") +
    `<div class="card project-card" style="border:2px dashed var(--border);background:transparent;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;min-height:160px;cursor:pointer" onclick="openModal('modal-add-project')">
      <i class="ti ti-plus" style="font-size:28px;color:var(--muted)"></i>
      <span style="font-size:14px;color:var(--muted)">Add New Project</span>
    </div>`;
});

// ─── CLIENT SCRIPTS PAGE ─────────────────────────────────────
register("client-scripts", async () => {
  const all = await DB.getAll("client_scripts");
  renderScriptsTable(all);
});

function renderScriptsTable(scripts) {
  const tbody = document.getElementById("scripts-tbody");
  if (!tbody) return;
  if (!scripts.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-code"></i><h6>No scripts yet</h6><p>Add your first client script</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = scripts.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="tag tag-blue">${s.doctype}</span></td>
      <td><code>${s.trigger}</code></td>
      <td>${s.project}</td>
      <td>${s.createdBy}</td>
      <td>${s.date}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewScript('${s.id}')"><i class="ti ti-eye"></i></button>
        <button class="btn btn-outline btn-sm" onclick="deleteRecord('client_scripts','${s.id}','scripts-page')"><i class="ti ti-trash" style="color:#DC2626"></i></button>
      </td>
    </tr>`).join("");
}

async function viewScript(id) {
  const s = await DB.get("client_scripts", id);
  if (!s) return;
  document.getElementById("view-script-title").textContent = s.name;
  document.getElementById("view-script-meta").textContent  = `${s.doctype} · ${s.trigger} · ${s.project} · ${s.createdBy}`;
  document.getElementById("view-script-code").innerHTML    = syntaxHL(s.code);
  document.getElementById("view-script-copy-btn").onclick  = () => { navigator.clipboard.writeText(s.code); showToast("Code copied!"); };
  openModal("modal-view-script");
}

function syntaxHL(code) {
  return code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/(\/\/[^\n]*)/g,`<span class="cm">$1</span>`)
    .replace(/\b(function|if|return|var|let|const|else|for|while)\b/g,`<span class="kw">$1</span>`)
    .replace(/frappe\.\w+/g, m=>`<span class="fn">${m}</span>`)
    .replace(/('[^']*')/g,`<span class="str">$1</span>`);
}

// ─── CUSTOM FIELDS PAGE ───────────────────────────────────────
register("custom-fields", async () => {
  const all = await DB.getAll("custom_fields");
  const tbody = document.getElementById("fields-tbody");
  if (!tbody) return;
  if (!all.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-forms"></i><h6>No custom fields yet</h6></div></td></tr>`; return; }
  const typeTag = t => ({ Select:"tag-blue", Data:"tag-green", Link:"tag-amber", Phone:"tag-red", Int:"tag-purple" }[t] || "tag-gray");
  tbody.innerHTML = all.map(f => `
    <tr>
      <td>${f.doctype}</td>
      <td><strong>${f.label}</strong></td>
      <td><code>${f.fieldname}</code></td>
      <td><span class="tag ${typeTag(f.type)}">${f.type}</span></td>
      <td>${f.insertAfter}</td>
      <td>${f.project}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="deleteRecord('custom_fields','${f.id}','custom-fields')"><i class="ti ti-trash" style="color:#DC2626"></i></button>
      </td>
    </tr>`).join("");
});

// ─── REPORTS PAGE ────────────────────────────────────────────
register("reports", async () => {
  const all = await DB.getAll("reports");
  const tbody = document.getElementById("reports-tbody");
  if (!tbody) return;
  tbody.innerHTML = all.length ? all.map(r => `
    <tr>
      <td><strong>${r.name}</strong></td>
      <td><span class="tag tag-blue">${r.type}</span></td>
      <td>${r.module}</td>
      <td>${r.project}</td>
      <td>${r.createdBy}</td>
      <td><span class="tag ${r.status==='Active'?'tag-green':'tag-amber'}">${r.status}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="deleteRecord('reports','${r.id}','reports')"><i class="ti ti-trash" style="color:#DC2626"></i></button></td>
    </tr>`).join("") :
    `<tr><td colspan="7"><div class="empty-state"><i class="ti ti-chart-bar"></i><h6>No reports yet</h6></div></td></tr>`;
});

// ─── WORKFLOWS PAGE ───────────────────────────────────────────
register("workflows", async () => {
  const all = await DB.getAll("workflows");
  const tbody = document.getElementById("wf-tbody");
  if (!tbody) return;
  tbody.innerHTML = all.length ? all.map(w => `
    <tr>
      <td><strong>${w.name}</strong></td>
      <td>${w.doctype}</td>
      <td style="font-size:12px;color:var(--muted)">${w.states}</td>
      <td>${w.project}</td>
      <td>${w.createdBy}</td>
      <td><button class="btn btn-outline btn-sm" onclick="deleteRecord('workflows','${w.id}','workflows')"><i class="ti ti-trash" style="color:#DC2626"></i></button></td>
    </tr>`).join("") :
    `<tr><td colspan="6"><div class="empty-state"><i class="ti ti-git-branch"></i><h6>No workflows yet</h6></div></td></tr>`;
});

// ─── PRINT FORMATS PAGE ───────────────────────────────────────
register("print-formats", async () => {
  const all = await DB.getAll("print_formats");
  const tbody = document.getElementById("pf-tbody");
  if (!tbody) return;
  tbody.innerHTML = all.length ? all.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.doctype}</td>
      <td><span class="tag tag-blue">${p.tech}</span></td>
      <td>${p.project}</td>
      <td><button class="btn btn-outline btn-sm"><i class="ti ti-eye"></i> Preview</button></td>
    </tr>`).join("") :
    `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-printer"></i><h6>No print formats yet</h6></div></td></tr>`;
});

// ─── SERVER SCRIPTS PAGE ─────────────────────────────────────
register("server-scripts", async () => {
  const all = await DB.getAll("server_scripts");
  const tbody = document.getElementById("ss-tbody");
  if (!tbody) return;
  tbody.innerHTML = all.length ? all.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="tag tag-blue">${s.type}</span></td>
      <td>${s.event}</td>
      <td>${s.project}</td>
      <td>${s.createdBy}</td>
      <td><button class="btn btn-outline btn-sm" onclick="deleteRecord('server_scripts','${s.id}','server-scripts')"><i class="ti ti-trash" style="color:#DC2626"></i></button></td>
    </tr>`).join("") :
    `<tr><td colspan="6"><div class="empty-state"><i class="ti ti-server"></i><h6>No server scripts yet</h6></div></td></tr>`;
});

// ─── API DOCS PAGE ───────────────────────────────────────────
register("api-docs", async () => {
  const all = await DB.getAll("api_docs");
  const tbody = document.getElementById("api-tbody");
  if (!tbody) return;
  const methodTag = m => ({ GET:"tag-green", POST:"tag-blue", PUT:"tag-amber", DELETE:"tag-red" }[m] || "tag-gray");
  tbody.innerHTML = all.length ? all.map(a => `
    <tr>
      <td><strong>${a.name}</strong></td>
      <td><code>${a.endpoint}</code></td>
      <td><span class="tag ${methodTag(a.method)}">${a.method}</span></td>
      <td>${a.auth}</td>
      <td>${a.project}</td>
    </tr>`).join("") :
    `<tr><td colspan="5"><div class="empty-state"><i class="ti ti-api"></i><h6>No APIs documented yet</h6></div></td></tr>`;
});

// ─── USERS PAGE ───────────────────────────────────────────────
register("users", async () => {
  const all = await DB.getAll("users");
  const tbody = document.getElementById("users-tbody");
  if (!tbody) return;
  tbody.innerHTML = all.map(u => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:6px;background:${u.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:#fff">${u.avatar}</div>
        ${u.username}
      </div></td>
      <td><span class="tag ${u.role==='Super Administrator'?'tag-purple':'tag-blue'}">${u.role}</span></td>
      <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) : "Never"}</td>
      <td><span class="tag tag-green">Active</span></td>
      <td>${u.actionsCount || 0}</td>
    </tr>`).join("");
});

// ─── ACTIVITY LOG PAGE ────────────────────────────────────────
register("activity", async () => {
  const el = document.getElementById("activity-list");
  if (!el) return;
  const all = await DB.getAll("activity");
  const sorted = all.sort((a,b) => b.timestamp - a.timestamp);
  const icons = { login:"ti-login", logout:"ti-logout", add:"ti-plus", edit:"ti-edit", delete:"ti-trash", upload:"ti-upload", export:"ti-download" };
  const colorMap = { login:"#EFF6FF,#2563EB", add:"#ECFDF5,#059669", edit:"#EFF6FF,#0284C7", delete:"#FEF2F2,#DC2626", upload:"#FFFBEB,#D97706", logout:"#FEF2F2,#E11D48", export:"#F5F3FF,#7C3AED" };
  el.innerHTML = sorted.length ? sorted.map(a => {
    const [bg,fg] = (colorMap[a.action] || "#EFF6FF,#2563EB").split(",");
    return `<div class="act-item">
      <div class="act-dot" style="background:${bg};color:${fg}"><i class="ti ${icons[a.action]||'ti-info-circle'}"></i></div>
      <div><div class="act-title">${a.detail}</div><div class="act-meta">${a.user} &middot; ${a.timeStr}${a.project?' &middot; '+a.project:''}</div></div>
    </div>`;
  }).join("") : `<div class="empty-state"><i class="ti ti-activity"></i><h6>No activity yet</h6></div>`;
});

// ─── KNOWLEDGE BASE ───────────────────────────────────────────
register("knowledge-base", () => {}); // static content

// ─── AI ANALYZER ─────────────────────────────────────────────
register("ai-analyzer", () => {});

function triggerAI() {
  document.getElementById("ai-loading").style.display = "block";
  document.getElementById("ai-result-box").style.display = "none";
  setTimeout(() => {
    document.getElementById("ai-loading").style.display = "none";
    document.getElementById("ai-result-box").style.display = "block";
  }, 2200);
}

// ─── ADD RECORDS ─────────────────────────────────────────────
async function saveNewScript() {
  const name    = document.getElementById("ns-name").value.trim();
  const doctype = document.getElementById("ns-doctype").value.trim();
  const trigger = document.getElementById("ns-trigger").value;
  const project = document.getElementById("ns-project").value.trim();
  const code    = document.getElementById("ns-code").value.trim();
  if (!name || !doctype || !code) { showToast("Please fill required fields", "error"); return; }
  const user = Auth.currentUser();
  await DB.add("client_scripts", {
    name, doctype, trigger, project, code,
    createdBy: user.username,
    date: new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
  });
  await DB.logActivity("add", `Client Script added — ${name}`, user.username, project);
  closeModal("modal-add-script");
  ["ns-name","ns-doctype","ns-project","ns-code"].forEach(id => document.getElementById(id).value = "");
  showToast("Script saved successfully!");
  navigate("client-scripts");
}

async function saveNewField() {
  const label    = document.getElementById("nf-label").value.trim();
  const doctype  = document.getElementById("nf-doctype").value.trim();
  const fieldname = document.getElementById("nf-fieldname").value.trim();
  const type     = document.getElementById("nf-type").value;
  const after    = document.getElementById("nf-after").value.trim();
  const project  = document.getElementById("nf-project").value.trim();
  if (!label || !doctype || !fieldname) { showToast("Please fill required fields", "error"); return; }
  const user = Auth.currentUser();
  await DB.add("custom_fields", { label, doctype, fieldname, type, insertAfter: after, project, createdBy: user.username });
  await DB.logActivity("add", `Custom Field added — ${label} in ${doctype}`, user.username, project);
  closeModal("modal-add-field");
  showToast("Custom field saved!");
  navigate("custom-fields");
}

async function saveNewProject() {
  const name   = document.getElementById("np-name").value.trim();
  const client = document.getElementById("np-client").value.trim();
  if (!name || !client) { showToast("Please fill required fields", "error"); return; }
  const user = Auth.currentUser();
  const id = name.toLowerCase().replace(/\s+/g, "-");
  await DB.set("projects", id, {
    id, name, client,
    icon: "ti-folder", color: "#EFF6FF", iconColor: "#2563EB",
    progress: 0, status: "New", scripts: 0, fields: 0, reports: 0
  });
  await DB.logActivity("add", `Project created — ${name}`, user.username);
  closeModal("modal-add-project");
  showToast("Project created!");
  navigate("projects");
}

// ─── DELETE ───────────────────────────────────────────────────
async function deleteRecord(collection, id, page) {
  if (!confirm("Delete this record? This cannot be undone.")) return;
  const user = Auth.currentUser();
  await DB.delete(collection, id);
  await DB.logActivity("delete", `Record deleted from ${collection}`, user.username);
  showToast("Deleted successfully", "success");
  navigate(page);
}

// ─── SEARCH ───────────────────────────────────────────────────
async function globalSearch(q) {
  if (!q || q.length < 2) return;
  const [scripts, fields, projects] = await Promise.all([
    DB.getAll("client_scripts"), DB.getAll("custom_fields"), DB.getAll("projects")
  ]);
  const results = [
    ...scripts.filter(s => s.name.toLowerCase().includes(q.toLowerCase())).map(s => ({ label: s.name, type: "Script", page: "client-scripts" })),
    ...fields.filter(f => f.label.toLowerCase().includes(q.toLowerCase())).map(f => ({ label: f.label, type: "Field", page: "custom-fields" })),
    ...projects.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).map(p => ({ label: p.name, type: "Project", page: "projects" }))
  ];
  // Simple: navigate to best match page
  if (results.length) { navigate(results[0].page); showToast(`Found ${results.length} result(s) for "${q}"`); }
  else showToast(`No results for "${q}"`, "error");
}

// ─── INIT ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Dark mode restore
  if (localStorage.getItem("eaf_dark") === "1") {
    document.documentElement.setAttribute("data-theme", "dark");
    const ic = document.getElementById("dark-icon");
    if (ic) ic.className = "ti ti-sun";
  }

  // Close notif on outside click
  document.addEventListener("click", e => {
    const panel = document.getElementById("notif-panel");
    if (panel && panel.classList.contains("open") && !panel.contains(e.target) && !e.target.closest("#notif-btn")) {
      panel.classList.remove("open");
    }
  });

  // Enter key on login
  document.getElementById("login-pass")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  document.getElementById("login-user")?.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

  // Search
  document.getElementById("global-search")?.addEventListener("keydown", e => {
    if (e.key === "Enter") globalSearch(e.target.value);
  });

  // Check if session exists
  const user = Auth.currentUser();
  if (user) {
    applyUser(user);
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "flex";
    const hash = location.hash.replace("#", "") || "dashboard";
    navigate(hash, false);
  }
});
