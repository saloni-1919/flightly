"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new Error(`Empty response (HTTP ${res.status}). Check API logs.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (HTTP ${res.status}). Preview: ${text.slice(0, 240)}`);
  }
}

function parsePrice(p: any): number {
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const m = p.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function formatPrice(total: any, currency: string) {
  const val = parsePrice(total);
  if (!isFinite(val)) return `${String(total ?? "—")} ${currency}`;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${currency} ${val}`;
  }
}

function safeIsoToTime(s?: any): string | null {
  if (!s || typeof s !== "string") return null;
  const d = new Date(s);
  if (!isFinite(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function safeIsoToDateTime(s?: any): { time?: string; date?: string } {
  const time = safeIsoToTime(s);
  if (!time) return {};
  const d = new Date(s);
  return { time, date: d.toLocaleDateString([], { month: "short", day: "numeric" }) };
}

function minsBetween(a?: any, b?: any): number | null {
  const da = new Date(a);
  const db = new Date(b);
  if (!isFinite(da.getTime()) || !isFinite(db.getTime())) return null;
  const diff = (db.getTime() - da.getTime()) / 60000;
  if (!isFinite(diff)) return null;
  return Math.max(0, Math.round(diff));
}

function formatLayover(mins?: number | null) {
  if (mins == null) return "Layover —";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `Layover ${m}m`;
  if (m <= 0) return `Layover ${h}h`;
  return `Layover ${h}h ${m}m`;
}

function extractSegments(raw: any): Array<{
  airline?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
  departAt?: any;
  arriveAt?: any;
  duration?: any;
}> {
  // best-effort extraction across common shapes
  const segs: any[] = [];

  const it = raw?.itineraries ?? raw?.itinerary ?? raw?.legs ?? raw?.segments ?? raw?.flights;

  // normalized shape from our backend (maybe)
  if (Array.isArray(it) && it.length && it[0]?.segments && Array.isArray(it[0].segments)) {
    const s = it.flatMap((x: any) => x.segments || []);
    return s.map((z) => ({
      airline: z?.airlineName || z?.airline || z?.carrierName,
      flightNumber: z?.flightNumber || z?.number,
      from: z?.departure?.iataCode || z?.from || z?.departure_airport,
      to: z?.arrival?.iataCode || z?.to || z?.arrival_airport,
      departAt: z?.departure?.time || z?.departAt || z?.departure_time,
      arriveAt: z?.arrival?.time || z?.arriveAt || z?.arrival_time,
      duration: z?.duration || z?.durationMinutes,
    }));
  }

  // search for arrays under likely keys
  const candidates: any[] = [];
  const scan = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const x of node) scan(x);
      return;
    }
    if (Array.isArray((node as any).flights)) candidates.push(...(node as any).flights);
    if (Array.isArray((node as any).segments)) candidates.push(...(node as any).segments);
    if (Array.isArray((node as any).legs)) candidates.push(...(node as any).legs);

    for (const v of Object.values(node)) scan(v);
  };
  scan(raw);

  if (candidates.length) segs.push(...candidates);

  return segs
    .filter(Boolean)
    .map((s) => ({
      airline: s?.airline || s?.airline_name || s?.carrier || s?.name,
      flightNumber: s?.flight_number || s?.flightNumber || s?.number,
      from: s?.departure_airport?.id || s?.departure_airport || s?.from,
      to: s?.arrival_airport?.id || s?.arrival_airport || s?.to,
      departAt: s?.departure_time || s?.departAt || s?.departure,
      arriveAt: s?.arrival_time || s?.arriveAt || s?.arrival,
      duration: s?.duration || s?.duration_minutes || s?.durationMinutes,
    }));
}

export default function FlightDetailsPage() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const id = params?.id || "";
  const currency = (sp.get("currency") || "USD").toUpperCase();

  const [loading, setLoading] = useState(false);
  const [flight, setFlight] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Try to load flight from sessionStorage (set by results page if you choose later)
  useEffect(() => {
    try {
      const mapRaw = sessionStorage.getItem("flightly:selectedFlights");
      const map = mapRaw ? JSON.parse(mapRaw) : {};
      if (map && id && map[id]) setFlight(map[id]);
    } catch {
      // ignore
    }
  }, [id]);

  // Optional: if not found in session, try fetching from backend (if you build /api/flights/by-id)
  async function tryFetchById() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/flights/by-id?id=${encodeURIComponent(id)}`, { method: "GET" });
      const json = await safeReadJson(res);
      if (!json?.ok) throw new Error(json?.error || "Failed to load flight");
      setFlight(json.data);
    } catch (e: any) {
      setError(e?.message || "Could not load flight details");
    } finally {
      setLoading(false);
    }
  }

  const segments = useMemo(() => (flight ? extractSegments(flight) : []), [flight]);

  function goCheckPrices() {
    if (!id) return;
    router.push(`/flights/price-check?sig=${encodeURIComponent(id)}&currency=${encodeURIComponent(currency)}`);
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="backBtn" type="button" onClick={() => router.back()}>
          ← Back
        </button>

        <div className="titleWrap">
          <div className="title">Flight details</div>
          <div className="subtitle">ID: {id ? `${id.slice(0, 14)}…` : "—"}</div>
        </div>

        <div className="chipRow">
          <div className="chip">{currency}</div>
        </div>
      </header>

      <main className="wrap">
        <section className="card">
          {!id ? (
            <div className="msg">Missing flight id.</div>
          ) : error ? (
            <div className="msg">
              <div className="errTitle">Couldn’t load flight</div>
              <div className="errText">{error}</div>
              <div style={{ marginTop: 12 }}>
                <button className="refreshBtn" type="button" onClick={tryFetchById} disabled={loading}>
                  {loading ? "Loading..." : "Try fetch"}
                </button>
              </div>
            </div>
          ) : !flight ? (
            <div className="msg">
              <div className="errTitle">No cached details</div>
              <div className="errText">
                This page expects the flight to be opened from results (so we can pass details via sessionStorage).
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="refreshBtn" type="button" onClick={tryFetchById} disabled={loading}>
                  {loading ? "Loading..." : "Try fetch"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="headRow">
                <div>
                  <div className="hTitle">{flight?.summary?.airlineName || "Airline"}</div>
                  <div className="hMeta">
                    {flight?.summary?.from || "—"} → {flight?.summary?.to || "—"} •{" "}
                    {flight?.summary?.duration ? String(flight.summary.duration) : "—"}
                  </div>
                </div>

                <div className="priceBox">
                  <div className="priceVal">
                    {formatPrice(flight?.price?.total, flight?.price?.currency || currency)}
                  </div>
                  <div className="priceSub">per person</div>
                </div>
              </div>

              <div className="actionsRow">
                <button className="primaryAction" type="button" onClick={goCheckPrices}>
                  Check prices
                </button>
              </div>

              <div className="divider" />

              {segments.length === 0 ? (
                <div className="msgSmall">Segment timeline not available for this flight.</div>
              ) : (
                <div className="timeline">
                  {segments.map((seg, idx) => {
                    const dep = safeIsoToDateTime(seg.departAt);
                    const arr = safeIsoToDateTime(seg.arriveAt);

                    let layover: string | null = null;
                    if (idx > 0) {
                      const prev = segments[idx - 1];
                      layover = formatLayover(minsBetween(prev.arriveAt, seg.departAt));
                    }

                    return (
                      <div key={idx} className="segWrap">
                        {layover && <div className="layover">{layover}</div>}

                        <div className="seg">
                          <div className="segTop">
                            <div className="segAir">
                              <div className="segAirName">{seg.airline || flight?.summary?.airlineName || "Airline"}</div>
                              <div className="segAirMeta">{seg.flightNumber ? `Flight ${seg.flightNumber}` : "Flight"}</div>
                            </div>
                            <div className="segDur">{seg.duration != null ? `Duration ${String(seg.duration)}` : ""}</div>
                          </div>

                          <div className="segMid">
                            <div className="segPoint">
                              <div className="segTime">{dep.time || "—"}</div>
                              <div className="segCode">{seg.from || flight?.summary?.from || "—"}</div>
                              <div className="segDate">{dep.date || ""}</div>
                            </div>

                            <div className="segLine">
                              <div className="segDot" />
                              <div className="segBar" />
                              <div className="segDot end" />
                            </div>

                            <div className="segPoint right">
                              <div className="segTime">{arr.time || "—"}</div>
                              <div className="segCode">{seg.to || flight?.summary?.to || "—"}</div>
                              <div className="segDate">{arr.date || ""}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #eaf0ff;
          background:
            radial-gradient(1100px 700px at 20% 10%, rgba(99, 102, 241, 0.18), transparent 55%),
            radial-gradient(900px 500px at 80% 20%, rgba(34, 197, 94, 0.12), transparent 55%),
            linear-gradient(180deg, #05070c 0%, #04060a 100%);
        }
        .topbar {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 18px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
        }
        .backBtn {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          color: #eaf0ff;
          cursor: pointer;
        }
        .backBtn:hover {
          background: rgba(255, 255, 255, 0.10);
        }
        .titleWrap { min-width: 0; }
        .title { font-weight: 950; font-size: 18px; }
        .subtitle { font-size: 12px; opacity: 0.75; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chipRow { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .chip { padding: 8px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); font-size: 12px; opacity: 0.9; }

        .wrap { max-width: 1100px; margin: 0 auto; padding: 10px 18px 40px; }

        .card {
          border-radius: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }

        .msg { font-size: 13px; opacity: 0.9; }
        .errTitle { font-weight: 950; margin-bottom: 6px; }
        .errText { opacity: 0.8; }
        .msgSmall { font-size: 12px; opacity: 0.75; }

        .headRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .hTitle { font-weight: 950; font-size: 16px; }
        .hMeta { font-size: 12px; opacity: 0.75; margin-top: 4px; }

        .priceBox { text-align: right; }
        .priceVal { font-weight: 950; font-size: 18px; }
        .priceSub { font-size: 11px; opacity: 0.65; margin-top: 2px; }

        .actionsRow { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
        .primaryAction {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(34, 197, 94, 0.45);
          background: linear-gradient(180deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.12));
          color: #fff;
          cursor: pointer;
          font-weight: 950;
        }
        .primaryAction:hover { filter: brightness(1.05); }

        .refreshBtn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(99, 102, 241, 0.45);
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0.18));
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          min-width: 140px;
        }
        .refreshBtn:disabled { opacity: 0.5; cursor: not-allowed; }

        .divider {
          margin: 14px 0;
          height: 1px;
          background: rgba(255,255,255,0.10);
        }

        .timeline { display: grid; gap: 10px; }
        .layover {
          font-size: 11px;
          opacity: 0.75;
          padding: 8px 10px;
          border-radius: 999px;
          width: fit-content;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
        }
        .seg {
          border-radius: 18px;
          padding: 12px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.10);
        }
        .segTop { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .segAirName { font-weight: 950; font-size: 13px; }
        .segAirMeta { font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .segDur { font-size: 11px; opacity: 0.75; text-align: right; white-space: nowrap; }

        .segMid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 110px 1fr;
          gap: 10px;
          align-items: center;
        }
        .segPoint .segTime { font-weight: 950; font-size: 12px; }
        .segPoint .segCode { font-size: 12px; opacity: 0.85; margin-top: 2px; font-weight: 900; }
        .segPoint .segDate { font-size: 11px; opacity: 0.65; margin-top: 2px; }
        .segPoint.right { text-align: right; }

        .segLine { position: relative; height: 20px; display: grid; place-items: center; }
        .segBar { width: 100%; height: 2px; background: rgba(255,255,255,0.20); border-radius: 999px; }
        .segDot {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.85);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
          left: 0;
        }
        .segDot.end {
          left: auto;
          right: 0;
          background: rgba(34, 197, 94, 0.85);
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
        }

        @media (max-width: 900px) {
          .topbar { grid-template-columns: auto 1fr; }
          .chipRow { grid-column: 1 / -1; justify-content: flex-start; }
          .priceBox { text-align: left; }
          .segMid { grid-template-columns: 1fr; }
          .segLine { display: none; }
        }
      `}</style>
    </div>
  );
}