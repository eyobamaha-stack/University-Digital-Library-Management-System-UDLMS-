"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/auth";

type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: "STUDENT" | "LIBRARIAN" | "ADMIN";
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("student@udlms.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message || "Login failed");
      }

      const payload = (await res.json()) as LoginResponse;
      saveSession(payload.token, payload.user);
      router.replace("/catalog");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>UDLMS Login</h1>
        <p>Demo accounts are pre-seeded. Use student, librarian, or admin emails.</p>
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button type="submit">Sign In</button>
        </form>
        <div className="login-help">
          <strong>Demo users:</strong>
          <p>student@udlms.local / password123</p>
          <p>librarian@udlms.local / password123</p>
          <p>admin@udlms.local / password123</p>
        </div>
      </div>
    </div>
  );
}
