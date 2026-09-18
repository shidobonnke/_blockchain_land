"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { RequireAuth } from "../../../components/require-auth";
import { apiRequest } from "../../../lib/api";

const roles = [
  "SURVEYOR",
  "COMMUNITY_REPRESENTATIVE",
  "LAND_ADMINISTRATOR",
  "LEGAL_OFFICER",
  "REGISTRAR",
  "GOVERNOR",
  "JUDICIARY",
  "AUDITOR"
] as const;

type StaffRole = (typeof roles)[number];
type User = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "SURVEYOR" as StaffRole
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!session || session.user.role !== "SYSTEM_ADMIN") return;
    setUsers(await apiRequest<User[]>("/admin/users", {}, session.accessToken));
  }

  useEffect(() => {
    refresh().catch((reason) => setError(reason.message));
  }, [session]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/admin/users", { method: "POST", body: JSON.stringify(form) }, session.accessToken);
      setMessage(`${form.fullName} was created as ${form.role.replaceAll("_", " ")}.`);
      setForm({ email: "", fullName: "", password: "", role: "SURVEYOR" });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "User creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(id: string, role: StaffRole) {
    if (!session) return;
    setError("");
    try {
      await apiRequest(
        `/admin/users/${id}/role`,
        { method: "PATCH", body: JSON.stringify({ role }) },
        session.accessToken
      );
      setMessage("Role updated. The user must log in again to receive the new permissions.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Role update failed");
    }
  }

  return (
    <RequireAuth>
      {session?.user.role !== "SYSTEM_ADMIN" ? (
        <div className="error">Only the system administrator can manage staff accounts.</div>
      ) : (
        <>
          <div className="page-head">
            <div>
              <div className="eyebrow">System administration</div>
              <h1>User management</h1>
              <p className="lede">Create operational users and assign their workflow role.</p>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}
          <form className="card" onSubmit={createUser}>
            <h2>Create staff account</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" required minLength={2} value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="password">Temporary password</label>
                <input id="password" type="password" required minLength={12} value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="role">Role and permissions</label>
                <select id="role" value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as StaffRole })}>
                  {roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <button className="button" disabled={loading}>{loading ? "Creating…" : "Create user"}</button>
          </form>
          <div className="card" style={{ marginTop: 18 }}>
            <h2>Existing users</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.fullName}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        {user.role === "SYSTEM_ADMIN" || user.role === "CITIZEN" ? (
                          <span className="pill">{user.role.replaceAll("_", " ")}</span>
                        ) : (
                          <select value={user.role} onChange={(event) => changeRole(user.id, event.target.value as StaffRole)}>
                            {roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                          </select>
                        )}
                      </td>
                      <td><span className={`pill ${user.isActive ? "ok" : "warn"}`}>{user.isActive ? "ACTIVE" : "DISABLED"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </RequireAuth>
  );
}
