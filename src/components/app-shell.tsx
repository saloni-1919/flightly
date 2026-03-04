"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type AppShellProps = {
  children: React.ReactNode;
};

type MenuButtonProps = {
  href: string;
  label: string;
  active: boolean;
  onGo: (href: string) => void;
};

function MenuButton({ href, label, active, onGo }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onGo(href)}
      style={{
        padding: "12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: active
          ? "rgba(255,255,255,0.12)"
          : "rgba(255,255,255,0.05)",
        color: "white",
        fontWeight: 700,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || "/";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05070a", color: "white" }}>
      {/* HEADER */}
      <header
        style={{
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          position: "sticky",
          top: 0,
          background: "#05070a",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* TOGGLE HAMBURGER */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((prev) => !prev)}
            style={{
              width: 36,
              height: 36,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "transparent",
              color: "white",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ☰
          </button>

          <div style={{ fontWeight: 900 }}>
            Flight Search & Tracking
          </div>
        </div>

        <button
          onClick={() => router.push("/sign-in")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </header>

      {/* DRAWER */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              Flightly
            </div>

            <MenuButton href="/" label="Home" active={isActive("/")} onGo={go} />
            <MenuButton
              href="/flights"
              label="Search Flights"
              active={isActive("/flights")}
              onGo={go}
            />
            <MenuButton
              href="/tracker"
              label="Live Tracker"
              active={isActive("/tracker")}
              onGo={go}
            />
            <MenuButton
              href="/status"
              label="Flight Status"
              active={isActive("/status")}
              onGo={go}
            />
            <MenuButton
              href="/contact"
              label="Contact"
              active={isActive("/contact")}
              onGo={go}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* MAIN CONTENT */}
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}