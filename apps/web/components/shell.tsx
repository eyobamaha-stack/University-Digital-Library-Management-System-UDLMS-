"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getUser } from "@/lib/auth";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;

  const navItems = [
    { href: "/catalog", label: "Catalog", roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
    { href: "/loans", label: "My Loans", roles: ["STUDENT", "LIBRARIAN", "ADMIN"] },
    { href: "/librarian", label: "Librarian", roles: ["LIBRARIAN", "ADMIN"] },
    { href: "/admin", label: "Admin", roles: ["ADMIN"] }
  ];

  return (
    <div className="shell-root">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">UD</span>
          <div>
            <strong>University Digital Library</strong>
            <p>Management System</p>
          </div>
        </div>
        <nav className="nav-links">
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="userbox">
          <span>{user?.name || "Guest"}</span>
          <small>{user?.role || "-"}</small>
          <button
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="page-body">{children}</main>
    </div>
  );
}
