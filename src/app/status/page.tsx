"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type StatusResponse = {
  ok: boolean;
  error?: string;
  data?: {
    flightNumber: string;
    airline: string;
    date: string;
    status: "SCHEDULED" | "ACTIVE" | "LANDED" | "CANCELLED" | "DELAYED" | "UNKNOWN";
    departure?: {
      airport?: string;
      iata?: string;
      scheduled?: string;
      estimated?: string;
      gate?: string;
      terminal?: string;
    };
    arrival?: {
      airport?: string;
      iata?: string;
      scheduled?: string;
      estimated?: string;
      gate?: string;
      terminal?: string;
    };
    lastUpdated: string;
    note: string;
  };
};

export default function StatusPage() {
  const [flight, setFlight] = useState("AA100");
  const [date, setDate] = useState("2026-03-10");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<StatusResponse | null>(null);

  const canSearch = useMemo(() => flight.trim().length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(date), [
    flight,
    date,
  ]);

  async function run() {
    setLoading(true);
    setResp(null);
    try {
      const qs = new URLSearchParams();
      qs.set("flightNumber", flight.trim().toUpperCase());
      qs.set("date", date);
      const r = await fetch(`/api/status?${qs.toString()}`);
      const j = (await r.json()) as StatusResponse;
      setResp(j);
    } catch {
      setResp({ ok: false, error: "Failed to fetch status." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Flight Status</h1>
        <p className="text-white/60 mt-2">
          This page is wired for real APIs later. For now it returns a clean mock response so your UI
          is perfect.
        </p>
      </div>

      <div className="bg-[#11151a] border border-white/10 rounded-2xl p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-white/60">Flight Number</label>
            <input
              value={flight}
              onChange={(e) => setFlight(e.target.value)}
              className="w-full mt-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/30"
              placeholder="AA100"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-white/30"
            />
          </div>

          <div className="flex items-end">
            <Button className="w-full" disabled={!canSearch || loading} onClick={run}>
              {loading ? "Checking…" : "Get Status"}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {!resp ? (
            <div className="text-white/60 text-sm">
              Enter flight number + date, then click <b>Get Status</b>.
            </div>
          ) : !resp.ok ? (
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <div className="font-semibold">Error</div>
              <div className="text-white/60 text-sm mt-1">{resp.error || "Unknown error"}</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/50">Flight</div>
                <div className="text-xl font-semibold mt-1">{resp.data?.flightNumber}</div>
                <div className="text-white/60 text-sm">{resp.data?.airline}</div>

                <div className="mt-4">
                  <div className="text-xs text-white/50">Status</div>
                  <div className="text-lg font-semibold mt-1">{resp.data?.status}</div>
                </div>

                <div className="mt-4 text-xs text-white/50">
                  Last updated: {resp.data?.lastUpdated}
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-semibold">Departure</div>
                <div className="text-white/60 text-sm mt-1">
                  {resp.data?.departure?.airport} ({resp.data?.departure?.iata})
                </div>
                <div className="mt-3 text-xs text-white/50">Scheduled</div>
                <div className="text-sm">{resp.data?.departure?.scheduled || "—"}</div>
                <div className="mt-2 text-xs text-white/50">Estimated</div>
                <div className="text-sm">{resp.data?.departure?.estimated || "—"}</div>
                <div className="mt-2 text-xs text-white/50">Gate / Terminal</div>
                <div className="text-sm">
                  Gate {resp.data?.departure?.gate || "—"} • Terminal{" "}
                  {resp.data?.departure?.terminal || "—"}
                </div>

                <div className="mt-5 text-sm font-semibold">Arrival</div>
                <div className="text-white/60 text-sm mt-1">
                  {resp.data?.arrival?.airport} ({resp.data?.arrival?.iata})
                </div>
                <div className="mt-3 text-xs text-white/50">Scheduled</div>
                <div className="text-sm">{resp.data?.arrival?.scheduled || "—"}</div>
                <div className="mt-2 text-xs text-white/50">Estimated</div>
                <div className="text-sm">{resp.data?.arrival?.estimated || "—"}</div>
                <div className="mt-2 text-xs text-white/50">Gate / Terminal</div>
                <div className="text-sm">
                  Gate {resp.data?.arrival?.gate || "—"} • Terminal{" "}
                  {resp.data?.arrival?.terminal || "—"}
                </div>
              </div>

              <div className="md:col-span-2 bg-black/30 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/50">Note</div>
                <div className="text-white/70 text-sm mt-1">{resp.data?.note}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}