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
let CURRENT_PROJECT = null;

function register(name, fn) { ROUTES[name] = fn; }

function setCurrentProject(project) {
  CURRENT_PROJECT = project;
  const label = document.getElementById("current-project-label");
  if (label) {
    label.textContent = project ? `Current Project: ${project.name} — ${project.client}` : "";
  }
}

function projectFiltered(records) {
  if (!CURRENT_PROJECT) return records;
  return records.filter(r => {
    const projectName = String(CURRENT_PROJECT.name || "").toLowerCase();
    return [r.project, r.projectName, r.project_name, r.project_id, r.projectId]
      .some(value => String(value || "").toLowerCase() === projectName);
  });
}

function openProjectWorkspace(id) {
  return DB.get("projects", id).then(project => {
    if (!project) { showToast("Project not found", "error"); return; }
    setCurrentProject(project);
    navigate("project-workspace");
  });
}

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
    "project-workspace":"Project Workspace",
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
  const p = document.getElementById("login-pass").value.trim();
  const btn = document.getElementById("login-btn");
  const err = document.getElementById("login-err");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span> Signing in...`;
  err.style.display = "none";
  try {
    if (!u || !p) throw "Enter username and password";
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

const PROJECT_STATUS_ORDER = { Active: 0, "In Progress": 1, New: 2 };
const statusTag = s => s === "Active" ? "tag-green" : s === "In Progress" ? "tag-amber" : s === "New" ? "tag-red" : "tag-gray";

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    const statusDiff = (PROJECT_STATUS_ORDER[a.status] ?? 9) - (PROJECT_STATUS_ORDER[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    if ((b.progress || 0) !== (a.progress || 0)) return (b.progress || 0) - (a.progress || 0);
    return a.name.localeCompare(b.name);
  });
}

function renderProjects(projects) {
  const el = document.getElementById("projects-grid");
  if (!el) return;
  el.innerHTML = projects.map(p => `
    <div class="card card-hover project-card">
      <div class="pc-head">
        <div class="pc-icon" style="background:${p.color};color:${p.iconColor}"><i class="ti ${p.icon}"></i></div>
        <div><div class="pc-name">${p.name}</div><div class="pc-client">${p.client}</div></div>
      </div>
      <div class="pc-stats">
        <div class="pc-stat"><span>${p.scripts || 0}</span> scripts</div>
        <div class="pc-stat"><span>${p.fields || 0}</span> fields</div>
        <div class="pc-stat"><span>${p.reports || 0}</span> reports</div>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${p.progress || 0}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--muted)">
        <span>${p.progress || 0}% complete</span>
        <span class="tag ${statusTag(p.status)}" style="font-size:10.5px">${p.status || 'New'}</span>
      </div>
      <div class="project-actions" style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-outline btn-sm" onclick="openProjectWorkspace('${p.id}')"><i class="ti ti-arrow-right-circle"></i></button>
        <button class="btn btn-outline btn-sm" onclick="openEditProject('${p.id}')"><i class="ti ti-edit"></i></button>
        <button class="btn btn-outline btn-sm" onclick="deleteProject('${p.id}')"><i class="ti ti-trash" style="color:#DC2626"></i></button>
      </div>
    </div>`).join("") +
    `<div class="card project-card" style="border:2px dashed var(--border);background:transparent;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;min-height:160px;cursor:pointer" onclick="openModal('modal-add-project')">
      <i class="ti ti-plus" style="font-size:28px;color:var(--muted)"></i>
      <span style="font-size:14px;color:var(--muted)">Add New Project</span>
    </div>`;
}

register("projects", async () => {
  const projects = sortProjects(await DB.getAll("projects"));
  renderProjects(projects);
});

register("project-workspace", async () => {
  const el = document.getElementById("project-workspace-content");
  if (!el) return;
  if (!CURRENT_PROJECT) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-info-circle"></i><h6>Select a project to open its isolated workspace</h6><p>Open a project from the Projects page to view only its customizations, scripts, workflows, reports and API documentation.</p></div>`;
    return;
  }
  const [fields, scripts, reports, workflows, apiDocs] = await Promise.all([
    DB.getAll("custom_fields"), DB.getAll("client_scripts"), DB.getAll("reports"), DB.getAll("workflows"), DB.getAll("api_docs")
  ]);
  const projectFields = projectFiltered(fields);
  const projectScripts = projectFiltered(scripts);
  const projectReports = projectFiltered(reports);
  const projectWorkflows = projectFiltered(workflows);
  const projectApis = projectFiltered(apiDocs);
  el.innerHTML = `
    <div class="dashboard-grid">
      <div class="card stat-card"><div class="stat-icon" style="background:#EFF6FF;color:#2563EB"><i class="ti ti-folder"></i></div><div class="stat-label">Project</div><div class="stat-value">${CURRENT_PROJECT.name}</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:#ECFDF5;color:#059669"><i class="ti ti-forms"></i></div><div class="stat-label">Custom Fields</div><div class="stat-value">${projectFields.length}</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:#F5F3FF;color:#7C3AED"><i class="ti ti-code"></i></div><div class="stat-label">Client Scripts</div><div class="stat-value">${projectScripts.length}</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:#FFFBEB;color:#D97706"><i class="ti ti-chart-bar"></i></div><div class="stat-label">Reports</div><div class="stat-value">${projectReports.length}</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:#EFF6FF;color:#0284C7"><i class="ti ti-git-branch"></i></div><div class="stat-label">Workflows</div><div class="stat-value">${projectWorkflows.length}</div></div>
      <div class="card stat-card"><div class="stat-icon" style="background:#F0FDF4;color:#16A34A"><i class="ti ti-api"></i></div><div class="stat-label">APIs</div><div class="stat-value">${projectApis.length}</div></div>
    </div>
    <div class="project-overview-grid">
      <div class="card"><h6>Project Health</h6><p>${CURRENT_PROJECT.progress || 0}% complete · ${CURRENT_PROJECT.status || 'New'}</p></div>
      <div class="card"><h6>Client</h6><p>${CURRENT_PROJECT.client}</p></div>
      <div class="card"><h6>ERPNext Features</h6><ul style="padding-left:18px;margin-top:8px">${(CURRENT_PROJECT.features||[]).map(f => `<li>${f}</li>`).join('') || '<li style="color:var(--muted)">No features documented yet.</li>'}</ul></div>
    </div>
    <div class="project-actions-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn btn-primary" onclick="navigate('client-scripts')"><i class="ti ti-code"></i> Client Scripts</button>
      <button class="btn btn-primary" onclick="navigate('custom-fields')"><i class="ti ti-forms"></i> Custom Fields</button>
      <button class="btn btn-primary" onclick="navigate('reports')"><i class="ti ti-chart-bar"></i> Reports</button>
      <button class="btn btn-primary" onclick="navigate('workflows')"><i class="ti ti-git-branch"></i> Workflows</button>
      <button class="btn btn-primary" onclick="navigate('api-docs')"><i class="ti ti-api"></i> APIs</button>
    </div>`;
});

async function openProjectDetails(id) {
  const project = await DB.get("projects", id);
  if (!project) return;
  window._currentProjectId = id;
  document.getElementById("project-view-title").textContent = project.name;
  document.getElementById("project-view-subtitle").textContent = `${project.client} · ${project.status || 'New'}`;
  document.getElementById("project-view-progress").textContent = `${project.progress || 0}% complete`;
  document.getElementById("project-view-stats").innerHTML = `
    <div class="pc-stat"><strong>${project.scripts || 0}</strong> scripts</div>
    <div class="pc-stat"><strong>${project.fields || 0}</strong> fields</div>
    <div class="pc-stat"><strong>${project.reports || 0}</strong> reports</div>`;
  document.getElementById("project-view-description").textContent = project.description || "No additional description provided.";
  document.getElementById("project-view-status").textContent = project.status || "New";
  document.getElementById("project-view-status").className = `tag ${statusTag(project.status)}`;
  const features = project.features || [];
  document.getElementById("project-features-list").innerHTML = features.length ? features.map(f => `<li>${f}</li>`).join("") : `<li style="color:var(--muted);font-size:13px">No ERPNext feature list available.</li>`;
  openModal("modal-view-project");
}

async function openProjectWorkspace(id) {
  const project = await DB.get("projects", id);
  if (!project) return;
  window._currentProjectId = id;
  setCurrentProject(project);
  showToast(`Opened workspace for ${project.name}`);
  navigate("project-workspace");
}
async function openEditProject(id) {
  closeModal('modal-view-project');
  const project = await DB.get("projects", id);
  if (!project) return;
  window._currentProjectId = id;
  document.getElementById("ep-id").value = id;
  document.getElementById("ep-name").value = project.name || "";
  document.getElementById("ep-client").value = project.client || "";
  document.getElementById("ep-status").value = project.status || "New";
  document.getElementById("ep-progress").value = project.progress ?? 0;
  document.getElementById("ep-scripts").value = project.scripts ?? 0;
  document.getElementById("ep-fields").value = project.fields ?? 0;
  document.getElementById("ep-reports").value = project.reports ?? 0;
  document.getElementById("ep-description").value = project.description || "";
  document.getElementById("ep-features").value = (project.features || []).join("\n");
  openModal("modal-edit-project");
}

function normalizeFeatureText(value) {
  return value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
}

async function saveProjectUpdate() {
  const id = document.getElementById("ep-id").value;
  const name = document.getElementById("ep-name").value.trim();
  const client = document.getElementById("ep-client").value.trim();
  const status = document.getElementById("ep-status").value;
  const progress = Number(document.getElementById("ep-progress").value) || 0;
  const scripts = Number(document.getElementById("ep-scripts").value) || 0;
  const fields = Number(document.getElementById("ep-fields").value) || 0;
  const reports = Number(document.getElementById("ep-reports").value) || 0;
  const description = document.getElementById("ep-description").value.trim();
  const features = normalizeFeatureText(document.getElementById("ep-features").value);
  if (!id || !name || !client) { showToast("Project name and client are required", "error"); return; }
  const user = Auth.currentUser();
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
  await DB.update("projects", id, {
    name, client, status, progress, scripts, fields, reports,
    description, features
  });
  await DB.logActivity("edit", `Project updated — ${name}`, user.username, name);
  closeModal("modal-edit-project");
  showToast("Project updated successfully!");
  navigate("projects");
}

async function deleteProject(id) {
  if (!confirm("Delete this project? This cannot be undone.")) return;
  const user = Auth.currentUser();
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
  const project = await DB.get("projects", id);
  await DB.delete("projects", id);
  await DB.logActivity("delete", `Project deleted — ${project?.name || id}`, user.username, project?.name || id);
  showToast("Project deleted successfully", "success");
  navigate("projects");
}

// ─── CLIENT SCRIPTS PAGE ─────────────────────────────────────
register("client-scripts", async () => {
  const all = projectFiltered(await DB.getAll("client_scripts"));
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
        <button class="btn btn-outline btn-sm" onclick="deleteRecord('client_scripts','${s.id}','client-scripts')"><i class="ti ti-trash" style="color:#DC2626"></i></button>
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
  const all = projectFiltered(await DB.getAll("custom_fields"));
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
  const all = projectFiltered(await DB.getAll("reports"));
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
  const all = projectFiltered(await DB.getAll("workflows"));
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
  const all = projectFiltered(await DB.getAll("print_formats"));
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
  const all = projectFiltered(await DB.getAll("server_scripts"));
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
  const all = projectFiltered(await DB.getAll("api_docs"));
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
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
  await DB.add("client_scripts", {
    name, doctype, trigger, project, code,
    createdBy: user.username,
    date: new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
  });
  await DB.logActivity("add", `Client Script added — ${name}`, user.username, project);
  closeModal("modal-add-script");
  ["ns-name","ns-doctype","ns-project","ns-code"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
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
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
  await DB.add("custom_fields", { label, doctype, fieldname, type, insertAfter: after, project, createdBy: user.username });
  await DB.logActivity("add", `Custom Field added — ${label} in ${doctype}`, user.username, project);
  closeModal("modal-add-field");
  ["nf-label","nf-doctype","nf-fieldname","nf-after","nf-project"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  showToast("Custom field saved!");
  navigate("custom-fields");
}

async function saveNewProject() {
  const name   = document.getElementById("np-name").value.trim();
  const client = document.getElementById("np-client").value.trim();
  const status = document.getElementById("np-status").value;
  const progress = Number(document.getElementById("np-progress").value) || 0;
  if (!name || !client) { showToast("Please fill required fields", "error"); return; }
  const user = Auth.currentUser();
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
  const id = name.toLowerCase().replace(/\s+/g, "-");
  await DB.set("projects", id, {
    id, name, client,
    icon: "ti-folder", color: "#EFF6FF", iconColor: "#2563EB",
    progress, status, scripts: 0, fields: 0, reports: 0,
    description: "",
    features: []
  });
  await DB.logActivity("add", `Project created — ${name}`, user.username);
  closeModal("modal-add-project");
  ["np-name","np-client","np-progress"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("np-status").value = "New";
  showToast("Project created!");
  navigate("projects");
}

// ─── DELETE ───────────────────────────────────────────────────
async function deleteRecord(collection, id, page) {
  if (!confirm("Delete this record? This cannot be undone.")) return;
  const user = Auth.currentUser();
  if (!user) { showToast("Session expired. Please log in again.", "error"); return; }
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
