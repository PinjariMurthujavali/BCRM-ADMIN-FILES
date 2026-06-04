// ============================================================
//  auth.js  —  Login / Session / Role Management
// ============================================================

const Auth = {
  SESSION_KEY: "eaf_session",

  // Returns current logged-in user or null
  currentUser() {
    const s = sessionStorage.getItem(this.SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },

  // Login — returns user object or throws error string
  async login(username, password) {
    const users = await DB.getAll("users");
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw "Invalid username or password";
    if (user.password !== password) throw "Invalid username or password";

    // Update last login
    await DB.update("users", user.id, { lastLogin: Date.now() });
    await DB.logActivity("login", `User Login — ${user.username} (${user.role})`, user.username);

    const session = { id: user.id, username: user.username, role: user.role, avatar: user.avatar, color: user.color };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Logout
  async logout() {
    const user = this.currentUser();
    if (user) {
      await DB.logActivity("logout", `User Logout — ${user.username}`, user.username);
    }
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  // Guard: redirect to login if not authenticated
  require() {
    if (!this.currentUser()) {
      window.location.href = "index.html";
    }
  },

  isSuperAdmin() {
    const u = this.currentUser();
    return u && u.role === "Super Administrator";
  }
};
