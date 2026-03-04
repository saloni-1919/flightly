"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Plane, Search, Radar, Clock3, Mail } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {/* TOP BAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Hamburger */}
            <Button
              type="button"
              onClick={() => setOpen(true)}
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                <Plane className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Flight Search & Tracking</div>
                <div className="text-xs text-white/50">Flightly</div>
              </div>
            </Link>
          </div>

          {/* Sign in */}
          <Button
            asChild
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <>
          {/* overlay */}
          <button
            className="fixed inset-0 z-[60] bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />

          {/* panel */}
          <aside className="fixed left-0 top-0 z-[70] h-full w-[86%] max-w-sm border-r border-white/10 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                  <Plane className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Flightly</div>
                  <div className="text-xs text-white/50">Menu</div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setOpen(false)}
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="mt-5 grid gap-2">
              <DrawerLink href="/flights" label="Flights" icon={<Search className="h-4 w-4" />} />
              <DrawerLink href="/status" label="Status" icon={<Clock3 className="h-4 w-4" />} />
              <DrawerLink href="/tracker" label="Live Tracker" icon={<Radar className="h-4 w-4" />} />
              <DrawerLink href="/contact" label="Contact" icon={<Mail className="h-4 w-4" />} />

              <div className="mt-3 border-t border-white/10 pt-3">
                <Button asChild className="w-full bg-white text-zinc-950 hover:bg-white/90">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </div>
            </nav>

            <div className="mt-6 text-xs text-white/45">
              Press <span className="rounded bg-white/10 px-1">Esc</span> to close.
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function DrawerLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white no-underline hover:bg-white/10"
    >
      <span className="text-white/80">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}