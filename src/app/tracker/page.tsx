"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

const LiveMap = dynamic(() => import("@/components/tracker/LiveMap"), { ssr: false });

type TrackPoint = { lat: number; lon: number; ts: string };

type Flight = {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  speedKt: number;
  heading: number;
  updatedAt: string;

  from?: string;
  to?: string;
  depTime?: string;
  arrTime?: string;
  status?: string;

  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;

  track?: TrackPoint[];
};

type TrackerResp = {
  ok: boolean;
  data?: { flights: Flight[]; note: string };
  error?: string;
};

export default function TrackerPage() {
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<TrackerResp | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [query, setQuery] = useState("");       // what user types
  const [activeQ, setActiveQ] = useState("");   // active tracking query

  const flights = resp?.ok ? resp.data?.flights ?? [] : [];
  const canLoad = useMemo(() => true, []);

  async function load(q?: string) {
    setLoading(true);
    try {
      const url = q ? `/api/tracker?q=${encodeURIComponent(q)}` : `/api/tracker`;
      const r = await fetch(url, { cache: "no-store" });
      const j = (await r.json()) as TrackerResp;

      setResp(j);

      if (j.ok && j.data?.flights?.length) {
        setSelectedId((prev) => prev ?? j.data!.flights[0].id);
      }
    } catch {
      setResp({ ok: false, error: "Failed to load tracker." });
    } finally {
      setLoading(false);
    }
  }

  // Auto refresh: keeps adding points (covered path)
  useEffect(() => {
    // load immediately when activeQ changes
    load(activeQ || undefined);

    const t = setInterval(() => {
      load(activeQ || undefined);
    }, 7000);

    return () => clearInterval(t);
  }, [activeQ]);

  function onSearch() {
    setSelectedId(null);
    setActiveQ(query.trim().toUpperCase());
  }

  function onClear() {
    setQuery("");
    setActiveQ("");
    setSelectedId(null);
    setResp(null);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Live Flight Tracker</h1>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              placeholder="Search flight (EY13), ICAO (ETD13/IGO201), or IATA callsign (AAL100)"
              className="w-full rounded-xl border border-white/10 bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none focus:border-white/25"
            />
            <div className="text-xs text-white/50 mt-1">
              {activeQ ? `Tracking: ${activeQ}` : "Radar mode: showing live aircraft"}
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={!canLoad || loading} onClick={onSearch}>
              {loading ? "Searching…" : "Search"}
            </Button>
            <Button disabled={loading} variant="secondary" onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#11151a] border border-white/10 rounded-2xl p-6 min-h-[420px]">
          <div className="text-sm text-white/60 mb-3">Live Map</div>

          <LiveMap flights={flights} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />

          <div className="text-xs text-white/50 mt-3">{resp?.data?.note}</div>
        </div>

        <div className="bg-[#11151a] border border-white/10 rounded-2xl p-6">
          <div className="text-lg font-semibold">Aircraft</div>

          {!resp ? (
            <div className="text-white/60 text-sm mt-3">Search a flight to start tracking.</div>
          ) : !resp.ok ? (
            <div className="text-white/60 text-sm mt-3">{resp.error || "Error"}</div>
          ) : (
            <div className="mt-4 space-y-3">
              {flights.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`w-full text-left bg-black/30 border rounded-xl p-4 transition
                    ${selectedId === f.id ? "border-white/30" : "border-white/10 hover:border-white/20"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{f.callsign || f.id}</div>
                    <div className="text-xs text-white/50">
                      {new Date(f.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {(f.from || f.to) && (
                    <div className="text-xs text-white/70 mt-2">
                      {f.from ?? "—"} → {f.to ?? "—"}
                    </div>
                  )}

                  <div className="text-xs text-white/60 mt-2">
                    Lat {f.lat.toFixed(3)} • Lon {f.lon.toFixed(3)}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Alt {f.altitudeFt} ft • Speed {f.speedKt} kt • Heading {f.heading}°
                  </div>

                  {f.track?.length ? (
                    <div className="text-xs text-white/50 mt-2">
                      Track points: {f.track.length}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}