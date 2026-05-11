"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/trading", label: "Trading" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 md:px-6">
        <span className="font-bold tracking-tight">Stock Analyser</span>
        <div className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                pathname === l.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-xs text-gray-500 sm:block">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-600 hover:text-white transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
