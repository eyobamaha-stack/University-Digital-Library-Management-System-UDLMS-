"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/shell";
import { getToken } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  return <Shell>{children}</Shell>;
}
