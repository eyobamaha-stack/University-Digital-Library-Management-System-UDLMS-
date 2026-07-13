"use client";

import { useEffect, useState } from "react";
import Toast from "@/components/toast";
import { api } from "@/lib/api";

type LoanRow = {
  id: number;
  dueDate: string;
  status: string;
  renewed: number;
  item: {
    title: string;
    author: string;
  };
};

type ReservationRow = {
  id: number;
  queueOrder: number;
  item: {
    title: string;
  };
};

type LoansResponse = {
  loans: LoanRow[];
  reservations: ReservationRow[];
};

export default function LoansPage() {
  const [data, setData] = useState<LoansResponse>({ loans: [], reservations: [] });
  const [toast, setToast] = useState("");

  const load = async () => {
    const payload = await api<LoansResponse>("/loans/me");
    setData(payload);
  };

  useEffect(() => {
    load().catch((err) => setToast(err.message));
  }, []);

  return (
    <section>
      <h1 className="section-title">My Loans</h1>
      <div className="list-grid">
        {data.loans.map((loan) => (
          <article key={loan.id} className="card">
            <h2>{loan.item.title}</h2>
            <p>{loan.item.author}</p>
            <small>
              Due: {new Date(loan.dueDate).toLocaleDateString()} | Status: {loan.status} | Renewed: {loan.renewed}
            </small>
            <div className="action-row">
              <button
                onClick={async () => {
                  try {
                    await api(`/loans/${loan.id}/renew`, { method: "POST" });
                    setToast("Loan renewed");
                    await load();
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Renew failed");
                  }
                }}
              >
                Renew
              </button>
              <button
                onClick={async () => {
                  try {
                    await api(`/loans/${loan.id}/return`, { method: "POST" });
                    setToast("Returned item");
                    await load();
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Return failed");
                  }
                }}
              >
                Return
              </button>
            </div>
          </article>
        ))}
      </div>

      <h2 className="section-title">Reservations</h2>
      <div className="list-grid">
        {data.reservations.map((reservation) => (
          <article key={reservation.id} className="card">
            <h2>{reservation.item.title}</h2>
            <small>Queue position: {reservation.queueOrder}</small>
          </article>
        ))}
      </div>

      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </section>
  );
}
