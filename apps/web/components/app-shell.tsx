"use client";

import {
  BarChart3,
  FileCheck2,
  FilePlus2,
  Gavel,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Menu,
  ShieldCheck,
  WalletCards,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: FileCheck2 },
  { href: "/applications/new", label: "New application", icon: FilePlus2 },
  { href: "/parcels", label: "Land parcels", icon: Map },
  { href: "/titles", label: "Digital titles", icon: WalletCards },
  { href: "/governance", label: "Governance", icon: Gavel },
  { href: "/reports", label: "Evaluation", icon: BarChart3 },
  { href: "/verify", label: "Verify title", icon: ShieldCheck }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) return <main className="auth-main">{children}</main>;

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            ANA<span>GU</span>
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="registry-mark">
          <span className="registry-icon">NG</span>
          <div>
            <strong>Land Registry</strong>
            <small>Integrated administration</small>
          </div>
        </div>
        <nav className="nav" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              onClick={() => setOpen(false)}
              className={pathname === href ? "active" : ""}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-account">
          {ready && session ? (
            <>
              <div className="avatar">{session.user.fullName.slice(0, 2).toUpperCase()}</div>
              <div className="account-copy">
                <strong>{session.user.fullName}</strong>
                <small>{session.user.role.replaceAll("_", " ")}</small>
              </div>
              <button
                className="icon-button dark"
                aria-label="Log out"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link href="/login" className="sidebar-login">
              <LogIn size={18} /> Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div>
            <span className="topbar-title">Secure land administration</span>
            <span className="network-status">
              <i /> Network operational
            </span>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
