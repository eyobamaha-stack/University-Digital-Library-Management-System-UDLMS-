"use client";

import { FormEvent, useEffect, useState } from "react";
import Toast from "@/components/toast";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

type ActiveLoan = {
  id: number;
  dueDate: string;
  user: { id: number; name: string; email: string };
  item: { id: number; title: string; author: string; isbn: string };
};

export default function LibrarianPage() {
  const [toast, setToast] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);

  const loadCirculation = async () => {
    const rows = await api<ActiveLoan[]>("/loans/circulation/active");
    setActiveLoans(rows);
  };

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== "LIBRARIAN" && user.role !== "ADMIN")) {
      setBlocked(true);
      return;
    }

    loadCirculation().catch((err) => setToast(err.message));
  }, []);

  const onAddItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await api("/catalog", {
        method: "POST",
        body: JSON.stringify({
          title: String(formData.get("title")),
          author: String(formData.get("author")),
          isbn: String(formData.get("isbn")),
          subject: String(formData.get("subject")),
          resourceType: String(formData.get("resourceType")),
          year: Number(formData.get("year")),
          totalCopies: Number(formData.get("totalCopies")),
          available: Number(formData.get("available"))
        })
      });

      setToast("Catalog item added successfully");
      event.currentTarget.reset();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const onCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await api("/loans/circulation/checkout", {
        method: "POST",
        body: JSON.stringify({
          userId: Number(formData.get("userId")),
          itemId: Number(formData.get("itemId"))
        })
      });
      setToast("Checkout completed");
      event.currentTarget.reset();
      await loadCirculation();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Checkout failed");
    }
  };

  const onCheckin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await api("/loans/circulation/checkin", {
        method: "POST",
        body: JSON.stringify({ loanId: Number(formData.get("loanId")) })
      });
      setToast("Checkin completed");
      event.currentTarget.reset();
      await loadCirculation();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Checkin failed");
    }
  };

  const onSendReminder = async (userId: number, title: string) => {
    try {
      await api("/system/notifications/mock", {
        method: "POST",
        body: JSON.stringify({
          userId,
          channel: "email",
          subject: "UDLMS circulation reminder",
          message: `Reminder for borrowed item: ${title}`
        })
      });
      setToast("Mock reminder queued");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Notification failed");
    }
  };

  if (blocked) {
    return <div className="error-box">Access denied. Librarian role required.</div>;
  }

  return (
    <section>
      <h1 className="section-title">Librarian Dashboard</h1>

      <div className="list-grid">
        <form onSubmit={onAddItem} className="card form-grid">
          <h2>Add Catalog Item</h2>
          <input name="title" placeholder="Title" required />
          <input name="author" placeholder="Author" required />
          <input name="isbn" placeholder="ISBN" required />
          <input name="subject" placeholder="Subject" required />
          <input name="resourceType" placeholder="Book" defaultValue="Book" required />
          <input name="year" type="number" placeholder="Year" required />
          <input name="totalCopies" type="number" placeholder="Total Copies" required />
          <input name="available" type="number" placeholder="Available" required />
          <button type="submit">Save Item</button>
        </form>

        <form onSubmit={onCheckout} className="card form-grid">
          <h2>Circulation Checkout</h2>
          <input name="userId" type="number" placeholder="User ID" required />
          <input name="itemId" type="number" placeholder="Catalog Item ID" required />
          <button type="submit">Check Out</button>
        </form>

        <form onSubmit={onCheckin} className="card form-grid">
          <h2>Circulation Checkin</h2>
          <input name="loanId" type="number" placeholder="Loan ID" required />
          <button type="submit">Check In</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Active Circulation</h2>
        <table>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Patron</th>
              <th>Item</th>
              <th>Due</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {activeLoans.map((loan) => (
              <tr key={loan.id}>
                <td>{loan.id}</td>
                <td>
                  {loan.user.name}
                  <br />
                  <small>{loan.user.email}</small>
                </td>
                <td>{loan.item.title}</td>
                <td>{new Date(loan.dueDate).toLocaleDateString()}</td>
                <td>
                  <button type="button" onClick={() => onSendReminder(loan.user.id, loan.item.title)}>
                    Send Reminder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </section>
  );
}
