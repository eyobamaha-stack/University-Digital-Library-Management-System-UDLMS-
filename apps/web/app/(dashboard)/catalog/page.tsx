"use client";

import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/toast";
import { api } from "@/lib/api";

type Item = {
  id: number;
  title: string;
  author: string;
  isbn: string;
  subject: string;
  resourceType: string;
  year: number;
  totalCopies: number;
  available: number;
};

type CatalogStats = {
  itemCount: number;
  availableCopies: number;
  totalCopies: number;
};

export default function CatalogPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<CatalogStats>({ itemCount: 0, availableCopies: 0, totalCopies: 0 });
  const [toast, setToast] = useState("");

  const load = async () => {
    const [data, summary] = await Promise.all([
      api<Item[]>(`/catalog?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`),
      api<CatalogStats>("/catalog/stats/summary")
    ]);
    setItems(data);
    setStats(summary);
  };

  useEffect(() => {
    load().catch((err) => setToast(err.message));
  }, []);

  const summary = useMemo(() => {
    const total = items.length;
    const available = items.filter((item) => item.available > 0).length;
    return { total, available };
  }, [items]);

  return (
    <section>
      <div className="hero-panel">
        <h1>Discover Library Resources</h1>
        <p>Search books, journals, and digital items across the university collection.</p>
        <div className="toolbar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN, or subject"
          />
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            <option value="book">Book</option>
            <option value="journal">Journal</option>
            <option value="thesis">Thesis</option>
            <option value="digital">Digital</option>
          </select>
          <button onClick={() => load().catch((err) => setToast(err.message))}>Search</button>
        </div>
      </div>

      <div className="stat-grid">
        <article>
          <h3>Matched Items</h3>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <h3>Available Results</h3>
          <strong>{summary.available}</strong>
        </article>
        <article>
          <h3>Total Catalog Items</h3>
          <strong>{stats.itemCount}</strong>
        </article>
        <article>
          <h3>Library Copies</h3>
          <strong>
            {stats.availableCopies} / {stats.totalCopies}
          </strong>
        </article>
      </div>

      <div className="list-grid">
        {items.map((item) => (
          <article key={item.id} className="card">
            <h2>{item.title}</h2>
            <p>{item.author}</p>
            <div className="pill-row">
              <span>{item.subject}</span>
              <span>{item.resourceType}</span>
              <span>{item.year}</span>
            </div>
            <div className="action-row">
              <small>
                {item.available} / {item.totalCopies} available
              </small>
              {item.available > 0 ? (
                <button
                  onClick={async () => {
                    try {
                      await api("/loans/borrow", {
                        method: "POST",
                        body: JSON.stringify({ itemId: item.id })
                      });
                      setToast(`Borrowed: ${item.title}`);
                      await load();
                    } catch (err) {
                      setToast(err instanceof Error ? err.message : "Borrow failed");
                    }
                  }}
                >
                  Borrow
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await api("/loans/reserve", {
                        method: "POST",
                        body: JSON.stringify({ itemId: item.id })
                      });
                      setToast(`Reserved: ${item.title}`);
                    } catch (err) {
                      setToast(err instanceof Error ? err.message : "Reserve failed");
                    }
                  }}
                >
                  Reserve
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {toast ? <Toast message={toast} onClose={() => setToast("")} /> : null}
    </section>
  );
}
