"use client";

import { FormEvent, useEffect, useState } from "react";
import Toast from "@/components/toast";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

type Policy = {
  loanDays: number;
  maxRenewals: number;
  finePerDayCents: number;
  holdDays: number;
};

type AdminMetrics = {
  users: number;
  catalogItems: number;
  activeLoans: number;
  overdueLoans: number;
  reservations: number;
  availableCopies: number;
  totalCopies: number;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type AuditRow = {
  id: number;
  action: string;
  entity: string;
  details: string;
  createdAt: string;
};

export default function AdminPage() {
  const [blocked, setBlocked] = useState(false);
  const [policy, setPolicy] = useState<Policy>({ loanDays: 14, maxRenewals: 2, finePerDayCents: 50, holdDays: 7 });
  const [metrics, setMetrics] = useState<AdminMetrics>({
    users: 0,
    catalogItems: 0,
    activeLoans: 0,
    overdueLoans: 0,
    reservations: 0,
    availableCopies: 0,
    totalCopies: 0
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [toast, setToast] = useState("");

  const utilizationPct = metrics.totalCopies
    ? Math.min(100, Math.round(((metrics.totalCopies - metrics.availableCopies) / metrics.totalCopies) * 100))
    : 0;
  const overduePct = metrics.activeLoans ? Math.min(100, Math.round((metrics.overdueLoans / metrics.activeLoans) * 100)) : 0;

  const load = async () => {
    const [policyData, metricsData, usersData, auditData] = await Promise.all([
      api<Policy>("/admin/policy"),
      api<AdminMetrics>("/admin/metrics"),
      api<UserRow[]>("/admin/users"),
      api<AuditRow[]>("/admin/audit")
    ]);
    setPolicy(policyData);
    setMetrics(metricsData);
    setUsers(usersData);
    setAudit(auditData);
  };

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "ADMIN") {
      setBlocked(true);
      return;
    }
    load().catch((err) => setToast(err.message));
  }, []);

  const onSavePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api("/admin/policy", {
        method: "PUT",
        body: JSON.stringify(policy)
      });
      setToast("Policy updated");
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Policy update failed");
    }
  };

  if (blocked) {
    return <div className="error-box">Access denied. Admin role required.</div>;
  }

  return (
    <section>
      <h1 className="section-title">System Administration</h1>

      <div className="stat-grid">
        <article>
          <h3>Users</h3>
          <strong>{metrics.users}</strong>
        </article>
        <article>
          <h3>Catalog Items</h3>
          <strong>{metrics.catalogItems}</strong>
        </article>
        <article>
          <h3>Active Loans</h3>
          <strong>{metrics.activeLoans}</strong>
        </article>
        <article>
          <h3>Overdue Loans</h3>
          <strong>{metrics.overdueLoans}</strong>
        </article>
        <article>
          <h3>Reservations</h3>
          <strong>{metrics.reservations}</strong>
        </article>
        <article>
          <h3>Available Copies</h3>
          <strong>{metrics.availableCopies}</strong>
        </article>
        <article>
          <h3>Total Copies</h3>
          <strong>{metrics.totalCopies}</strong>
        </article>
        <article>
          <h3>Stock In Use</h3>
          <strong>{metrics.totalCopies - metrics.availableCopies}</strong>
        </article>
      </div>

      <div className="card metrics-insights">
        <div className="metrics-head">
          <h2>Operational Health</h2>
          <button type="button" onClick={() => load().catch((err) => setToast(err.message))}>
            Refresh
          </button>
        </div>
        <div className="metrics-row">
          <span>Collection Utilization</span>
          <strong>{utilizationPct}%</strong>
        </div>
        <div className="meter" role="presentation">
          <div className="meter-fill" style={{ width: `${utilizationPct}%` }} />
        </div>
        <div className="metrics-row">
          <span>Overdue Share</span>
          <strong>{overduePct}%</strong>
        </div>
        <div className="meter meter-risk" role="presentation">
          <div className="meter-fill" style={{ width: `${overduePct}%` }} />
        </div>
      </div>

      <form className="card form-grid" onSubmit={onSavePolicy}>
        <h2>Loan Policy</h2>
        <label>
          Loan Days
          <input
            type="number"
            value={policy.loanDays}
            onChange={(e) => setPolicy({ ...policy, loanDays: Number(e.target.value) })}
          />
        </label>
        <label>
          Max Renewals
          <input
            type="number"
            value={policy.maxRenewals}
            onChange={(e) => setPolicy({ ...policy, maxRenewals: Number(e.target.value) })}
          />
        </label>
        <label>
          Fine / Day (cents)
          <input
            type="number"
            value={policy.finePerDayCents}
            onChange={(e) => setPolicy({ ...policy, finePerDayCents: Number(e.target.value) })}
          />
        </label>
        <label>
          Hold Days
          <input
            type="number"
            value={policy.holdDays}
            onChange={(e) => setPolicy({ ...policy, holdDays: Number(e.target.value) })}
          />
        </label>
        <button type="submit">Save Policy</button>
      </form>

      <div className="card">
        <h2>Users</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Audit Log</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>{row.action}</td>
                <td>{row.entity}</td>
                <td>{row.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </section>
  );
}
