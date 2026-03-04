// src/app/page.tsx
import Link from "next/link";
import { Search, Radar, Clock3, Mail } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      {/* Headline */}
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
        Compare flight deals from 100s of sites
        <span className="text-orange-500">.</span>
      </h1>

      {/* Tiles row */}
      <div className="mt-10 flex flex-wrap gap-10">
        <Tile href="/flights" label="Flights" active icon={<Search className="h-6 w-6" />} />
        <Tile href="/status" label="Status" icon={<Clock3 className="h-6 w-6" />} />
        <Tile href="/tracker" label="Live Tracker" icon={<Radar className="h-6 w-6" />} />
        <Tile href="/contact" label="Contact" icon={<Mail className="h-6 w-6" />} />
      </div>
    </main>
  );
}

function Tile(props: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  const active = !!props.active;

  return (
    <Link href={props.href} className="no-underline">
      <div className="flex w-24 flex-col items-center gap-3">
        <div
          className={[
            "grid h-16 w-16 place-items-center rounded-2xl border shadow-sm transition",
            active
              ? "border-orange-500/40 bg-orange-500 text-white shadow-orange-500/20"
              : "border-white/10 bg-white text-zinc-900 hover:bg-zinc-200",
          ].join(" ")}
        >
          {props.icon}
        </div>
        <div className="text-sm font-medium text-white/90">{props.label}</div>
      </div>
    </Link>
  );
}