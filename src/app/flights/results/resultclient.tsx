"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Flight = {
  id: string;
  signature?: string;
  bucket?: "best" | "other";
  source?: string;
  price?: { total: any; currency: string };
  summary?: {
    airlineName?: string;
    depart?: string | null;
    arrive?: string | null;
    from?: string | null;
    to?: string | null;
    stops?: number | null;
    duration?: any; // sometimes "7 hr 40 min" or minutes
  };
  itineraries?: any[];
  raw?: any; // optional if backend provides
};

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

function upper(v: string) {
  return (v || "").trim().toUpperCase();
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

function durationToMinutes(d: any): number {
  if (typeof d === "number") return d;
  if (typeof d === "string") {
    const h = d.match(/(\d+)\s*hr/);
    const m = d.match(/(\d+)\s*min/);
    const mins = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
    return mins || Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function formatStops(stops?: number | null) {
  if (typeof stops !== "number") return "—";
  if (stops === 0) return "Non-stop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

function skeletonRows(n: number) {
  return Array.from({ length: n }).map((_, i) => i);
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
  return {
    time,
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
  };
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

/**
 * Try to extract segments from normalized itineraries.
 * Best-effort, because SerpApi shapes can vary.
 */
function extractSegments(f: Flight): Array<{
  airline?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
  departAt?: any;
  arriveAt?: any;
  duration?: any;
}> {
  const it = f.itineraries;

  // Case A: already normalized into [{ segments: [...] }]
  if (Array.isArray(it) && it.length && (it as any)[0]?.segments && Array.isArray((it as any)[0].segments)) {
    const segs: any[] = (it as any).flatMap((x: any) => x.segments || []);
    return segs.map((s) => ({
      airline: s?.airlineName || s?.airline || s?.carrierName,
      flightNumber: s?.flightNumber || s?.number,
      from: s?.departure?.iataCode || s?.from || s?.departure_airport,
      to: s?.arrival?.iataCode || s?.to || s?.arrival_airport,
      departAt: s?.departure?.time || s?.departAt || s?.departure_time,
      arriveAt: s?.arrival?.time || s?.arriveAt || s?.arrival_time,
      duration: s?.duration || s?.durationMinutes,
    }));
  }

  // Case B: try common SerpApi fields
  const tryCollect: any[] = [];

  if (Array.isArray(it)) {
    for (const item of it) {
      if (!item) continue;
      if (Array.isArray((item as any).flights)) tryCollect.push(...(item as any).flights);
      if (Array.isArray((item as any).segments)) tryCollect.push(...(item as any).segments);
      if (Array.isArray((item as any).legs)) tryCollect.push(...(item as any).legs);
    }
  }

  return tryCollect
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

export default function ResultsClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const query = useMemo(() => {
    const origin = upper(sp.get("origin") || "");
    const destination = upper(sp.get("destination") || "");
    const date = (sp.get("date") || "").trim();
    const returnDate = (sp.get("returnDate") || "").trim();
    const tripType = ((sp.get("tripType") || "oneway").trim() as "oneway" | "roundtrip") || "oneway";

    const adults = Number(sp.get("adults") || "1");
    const cabinClass = (sp.get("cabinClass") || "economy").trim();

    const currency = upper(sp.get("currency") || "USD");
    const gl = (sp.get("gl") || "us").trim().toLowerCase();
    const hl = (sp.get("hl") || "en").trim();

    return { origin, destination, date, returnDate, tripType, adults, cabinClass, currency, gl, hl };
  }, [sp]);

  // Modify search bar (local editable state)
  const [editDate, setEditDate] = useState(query.date);
  const [editReturnDate, setEditReturnDate] = useState(query.returnDate);
  const [editAdults, setEditAdults] = useState(query.adults);
  const [editCabin, setEditCabin] = useState(query.cabinClass);

  const [loading, setLoading] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debug: see what SerpApi actually returns
  useEffect(() => {
    if (flights?.length) console.log("FIRST FLIGHT RAW:", flights[0]);
  }, [flights]);

  // Sync edit controls when URL params change
  useEffect(() => {
    setEditDate(query.date);
    setEditReturnDate(query.returnDate);
    setEditAdults(query.adults);
    setEditCabin(query.cabinClass);
  }, [query.date, query.returnDate, query.adults, query.cabinClass]);

  // UI controls
  const [sort, setSort] = useState<"best" | "cheapest" | "fastest">("best");
  const [nonStopOnly, setNonStopOnly] = useState(false);

  // Expand card
  const [expandedSig, setExpandedSig] = useState<string | null>(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function runSearch(opts?: { append?: boolean; nextPage?: number }) {
    if (loading) return;

    const append = !!opts?.append;
    const nextPage = typeof opts?.nextPage === "number" ? opts.nextPage : 0;

    setLoading(true);
    setError(null);

    if (!append) {
      setFlights([]);
      setPage(0);
      setHasMore(true);
      setExpandedSig(null);
    }

    try {
      if (!query.origin || !query.destination || !query.date) {
        throw new Error("Missing origin/destination/date in URL. Go back and search again.");
      }

      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: query.origin,
          destination: query.destination,
          date: query.date,
          returnDate: query.tripType === "roundtrip" ? query.returnDate || undefined : undefined,
          adults: query.adults,
          cabinClass: query.cabinClass,
          currency: query.currency,
          gl: query.gl,
          hl: query.hl,
          page: nextPage,
          pageSize: PAGE_SIZE,
        }),
      });

      const json = await safeReadJson(res);
      if (!json?.ok) throw new Error(json?.error || `Search failed (HTTP ${res.status})`);

      const incoming: Flight[] = json.data || [];

      setFlights((prev) => {
        const combined = append ? [...prev, ...incoming] : incoming;
        const seen = new Set<string>();
        const out: Flight[] = [];
        for (const f of combined) {
          const k = f.signature || f.id;
          if (!k) continue;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(f);
        }
        return out;
      });

      setHasMore(incoming.length >= PAGE_SIZE);
      setPage(nextPage);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // auto-search on params change
  useEffect(() => {
    runSearch({ append: false, nextPage: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.origin,
    query.destination,
    query.date,
    query.returnDate,
    query.tripType,
    query.currency,
    query.gl,
    query.hl,
    query.adults,
    query.cabinClass,
  ]);

  const visibleFlights = useMemo(() => {
    let list = [...flights];

    if (nonStopOnly) list = list.filter((f) => (f.summary?.stops ?? 999) === 0);

    if (sort === "cheapest") {
      list.sort((a, b) => parsePrice(a.price?.total) - parsePrice(b.price?.total));
    } else if (sort === "fastest") {
      list.sort((a, b) => durationToMinutes(a.summary?.duration) - durationToMinutes(b.summary?.duration));
    } else {
      // best bucket first, then cheaper, then faster
      list.sort((a, b) => {
        const ab = a.bucket === "best" ? 0 : 1;
        const bb = b.bucket === "best" ? 0 : 1;
        if (ab !== bb) return ab - bb;

        const ap = parsePrice(a.price?.total);
        const bp = parsePrice(b.price?.total);
        if (ap !== bp) return ap - bp;

        const ad = durationToMinutes(a.summary?.duration);
        const bd = durationToMinutes(b.summary?.duration);
        return ad - bd;
      });
    }

    return list;
  }, [flights, nonStopOnly, sort]);

  function goBack() {
    router.push("/flights");
  }

  function applyModifySearch() {
    const params = new URLSearchParams(sp.toString());
    params.set("date", editDate);
    params.set("adults", String(editAdults));
    params.set("cabinClass", editCabin);

    if (query.tripType === "roundtrip") {
      if (editReturnDate) params.set("returnDate", editReturnDate);
    } else {
      params.delete("returnDate");
    }

    router.push(`/flights/results?${params.toString()}`);
  }

  function onCheckPrices(f: Flight) {
    const sig = f.signature || f.id;
    if (!sig) return;

    try {
      const raw = (f as any).raw || f;
      sessionStorage.setItem("flightly:selectedFlight", JSON.stringify(raw));
    } catch{}

    router.push(`/flights/price-check?sig=${encodeURIComponent(sig)}&currency=${query.currency}`);
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="backBtn" onClick={goBack} type="button">
          ← Back
        </button>

        <div className="titleWrap">
          <div className="title">Flights</div>
          <div className="subtitle">
            {query.origin} → {query.destination} • {query.date}
            {query.tripType === "roundtrip" && query.returnDate ? ` • Return ${query.returnDate}` : ""}
          </div>
        </div>

        <div className="chipRow">
          <div className="chip">{query.currency}</div>
          <div className="chip">gl={query.gl}</div>
          <div className="chip">hl={query.hl}</div>
        </div>
      </header>

      <main className="wrap">
        {/* Modify search bar */}
        <section className="controls modify">
          <div className="control">
            <label>Date</label>
            <input className="miniInput" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>

          <div className={`control ${query.tripType !== "roundtrip" ? "disabled" : ""}`}>
            <label>Return</label>
            <input
              className="miniInput"
              type="date"
              value={editReturnDate}
              onChange={(e) => setEditReturnDate(e.target.value)}
              disabled={query.tripType !== "roundtrip"}
            />
          </div>

          <div className="control">
            <label>Adults</label>
            <input
              className="miniInput"
              type="number"
              min={1}
              max={9}
              value={editAdults}
              onChange={(e) => setEditAdults(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="control">
            <label>Cabin</label>
            <select className="miniSelect" value={editCabin} onChange={(e) => setEditCabin(e.target.value)}>
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>

          <div className="control">
            <label>&nbsp;</label>
            <button className="refreshBtn" type="button" onClick={applyModifySearch} disabled={loading}>
              Apply
            </button>
          </div>
        </section>

        {/* Sort / Filters / Refresh */}
        <section className="controls">
          <div className="control">
            <label>Sort</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="best">Best</option>
              <option value="cheapest">Cheapest</option>
              <option value="fastest">Fastest</option>
            </select>
          </div>

          <div className="control toggle">
            <label>Filters</label>
            <button
              type="button"
              className={`toggleBtn ${nonStopOnly ? "on" : ""}`}
              onClick={() => setNonStopOnly((v) => !v)}
            >
              {nonStopOnly ? "✓ Non-stop only" : "Non-stop only"}
            </button>
          </div>

          <div className="control">
            <label>&nbsp;</label>
            <button className="refreshBtn" type="button" onClick={() => runSearch({ append: false, nextPage: 0 })} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <section className="error">
            <div className="errorTitle">Something went wrong</div>
            <div className="errorMsg">{error}</div>
          </section>
        )}

        {!error && loading && flights.length === 0 && (
          <section className="list">
            {skeletonRows(8).map((i) => (
              <div key={i} className="card skel">
                <div className="skLine w60" />
                <div className="skLine w40" />
                <div className="skLine w80" />
              </div>
            ))}
          </section>
        )}

        {!error && !loading && visibleFlights.length === 0 && (
          <section className="empty">
            <div className="emptyTitle">No flights found</div>
            <div className="emptyMsg">Try a different date, or check your airport codes (use IATA like EWR, BOM, JFK, LHR).</div>
          </section>
        )}

        {!error && visibleFlights.length > 0 && (
          <section className="list">
            {visibleFlights.map((f) => {
              const key = f.signature || f.id;
              const s = f.summary || {};
              const price = formatPrice(f.price?.total, f.price?.currency || query.currency);

              const badge =
                sort === "cheapest" ? "Cheapest" : sort === "fastest" ? "Fastest" : f.bucket === "best" ? "BEST" : "OTHER";

              const isExpanded = expandedSig === key;
              const segments = isExpanded ? extractSegments(f) : [];
              const canShowSegments = isExpanded && segments.length > 0;

              return (
                <div key={key} className="card">
                  <div className="row">
                    <div className="airline">
                      <div className="badge">{badge}</div>
                      <div className="airlineName">{s.airlineName || "Airline"}</div>
                      <div className="meta">
                        {formatStops(s.stops)} {s.duration ? <>• {String(s.duration)}</> : null}
                      </div>
                    </div>

                    <div className="price">
                      <div className="priceVal">{price}</div>
                      <div className="priceSub">per person</div>
                    </div>
                  </div>

                  <div className="route">
                    <div className="routeBlock">
                      <div className="time">{s.depart || "—"}</div>
                      <div className="code">{s.from || query.origin}</div>
                    </div>

                    <div className="line">
                      <div className="dot" />
                      <div className="bar" />
                      <div className="dot" />
                    </div>

                    <div className="routeBlock right">
                      <div className="time">{s.arrive || "—"}</div>
                      <div className="code">{s.to || query.destination}</div>
                    </div>
                  </div>

                  <div className="actionsRow">
                    <button className="ghostAction" type="button" onClick={() => setExpandedSig((prev) => (prev === key ? null : key))}>
                      {isExpanded ? "Hide details" : "View details"}
                    </button>

                    <button className="primaryAction" type="button" onClick={() => onCheckPrices(f)}>
                      Check prices
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="expand">
                      {canShowSegments ? (
                        <div className="timeline">
                          {segments.map((seg, idx) => {
                            const dep = safeIsoToDateTime(seg.departAt);
                            const arr = safeIsoToDateTime(seg.arriveAt);

                            let layover: string | null = null;
                            if (idx > 0) {
                              const prev = segments[idx - 1];
                              const mins = minsBetween(prev.arriveAt, seg.departAt);
                              layover = formatLayover(mins);
                            }

                            return (
                              <div key={idx} className="segWrap">
                                {layover && <div className="layover">{layover}</div>}

                                <div className="seg">
                                  <div className="segTop">
                                    <div className="segAir">
                                      <div className="segAirName">{seg.airline || s.airlineName || "Airline"}</div>
                                      <div className="segAirMeta">{seg.flightNumber ? `Flight ${seg.flightNumber}` : "Flight"}</div>
                                    </div>

                                    <div className="segDur">{seg.duration != null ? `Duration ${String(seg.duration)}` : ""}</div>
                                  </div>

                                  <div className="segMid">
                                    <div className="segPoint">
                                      <div className="segTime">{dep.time || "—"}</div>
                                      <div className="segCode">{seg.from || s.from || query.origin}</div>
                                      <div className="segDate">{dep.date || ""}</div>
                                    </div>

                                    <div className="segLine">
                                      <div className="segDot" />
                                      <div className="segBar" />
                                      <div className="segDot end" />
                                    </div>

                                    <div className="segPoint right">
                                      <div className="segTime">{arr.time || "—"}</div>
                                      <div className="segCode">{seg.to || s.to || query.destination}</div>
                                      <div className="segDate">{arr.date || ""}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="noSeg">Segment details aren’t available for this flight (depends on SerpApi payload).</div>
                      )}

                      <div className="tiny">
                        Source: {f.source || "serpapi"} • Segments: {Array.isArray(f.itineraries) ? f.itineraries.length : 0}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="showMoreWrap">
              <button className="showMoreBtn" type="button" onClick={() => runSearch({ append: true, nextPage: page + 1 })} disabled={loading || !hasMore}>
                {loading ? "Loading..." : hasMore ? "Show more" : "No more results"}
              </button>
              <div className="showMoreHint">Showing {visibleFlights.length} results</div>
            </div>
          </section>
        )}
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          color: #eaf0ff;
          background: radial-gradient(1100px 700px at 20% 10%, rgba(99, 102, 241, 0.18), transparent 55%),
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
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          color: #eaf0ff;
          cursor: pointer;
        }
        .backBtn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .titleWrap {
          min-width: 0;
        }
        .title {
          font-weight: 950;
          letter-spacing: -0.2px;
          font-size: 18px;
        }
        .subtitle {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .chip {
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
          opacity: 0.9;
        }
        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 18px 40px;
        }
        .controls {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
          position: sticky;
          top: 10px;
          z-index: 20;
        }
        .controls.modify {
          grid-template-columns: 1fr 1fr 1fr 1fr auto;
          margin-bottom: 12px;
          top: 10px;
          z-index: 25;
        }
        .controls.modify .control.disabled {
          opacity: 0.5;
        }
        .miniInput,
        .miniSelect {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #eaf0ff;
          outline: none;
        }
        .control label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .control select {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #eaf0ff;
          outline: none;
        }
        .toggleBtn {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #eaf0ff;
          cursor: pointer;
          font-weight: 800;
        }
        .toggleBtn.on {
          border-color: rgba(34, 197, 94, 0.55);
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        }
        .refreshBtn {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(99, 102, 241, 0.45);
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0.18));
          color: #fff;
          font-weight: 900;
          cursor: pointer;
          min-width: 120px;
        }
        .refreshBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .list {
          margin-top: 14px;
          display: grid;
          gap: 12px;
        }
        .card {
          border-radius: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }
        .airlineName {
          font-weight: 950;
          font-size: 16px;
          margin-top: 6px;
        }
        .meta {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 4px;
        }
        .badge {
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.3px;
          opacity: 0.95;
        }
        .priceVal {
          font-weight: 950;
          font-size: 18px;
          text-align: right;
        }
        .priceSub {
          font-size: 11px;
          opacity: 0.65;
          text-align: right;
          margin-top: 2px;
        }
        .route {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr 120px 1fr;
          gap: 10px;
          align-items: center;
        }
        .routeBlock .time {
          font-weight: 900;
          font-size: 13px;
        }
        .routeBlock .code {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 2px;
        }
        .routeBlock.right {
          text-align: right;
        }
        .line {
          position: relative;
          height: 22px;
          display: grid;
          place-items: center;
        }
        .bar {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
        }
        .dot {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.85);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
        }
        .dot:first-child {
          left: 0;
        }
        .dot:last-child {
          right: 0;
          background: rgba(34, 197, 94, 0.85);
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
        }
        .actionsRow {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ghostAction {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
          color: #eaf0ff;
          cursor: pointer;
          font-weight: 900;
        }
        .ghostAction:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .primaryAction {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(34, 197, 94, 0.45);
          background: linear-gradient(180deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.12));
          color: #fff;
          cursor: pointer;
          font-weight: 950;
        }
        .primaryAction:hover {
          filter: brightness(1.05);
        }
        .expand {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .noSeg {
          font-size: 12px;
          opacity: 0.75;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .timeline {
          display: grid;
          gap: 10px;
        }
        .layover {
          font-size: 11px;
          opacity: 0.75;
          padding: 8px 10px;
          border-radius: 999px;
          width: fit-content;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .seg {
          border-radius: 18px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .segTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }
        .segAirName {
          font-weight: 950;
          font-size: 13px;
        }
        .segAirMeta {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 2px;
        }
        .segDur {
          font-size: 11px;
          opacity: 0.75;
          text-align: right;
          white-space: nowrap;
        }
        .segMid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 110px 1fr;
          gap: 10px;
          align-items: center;
        }
        .segPoint .segTime {
          font-weight: 950;
          font-size: 12px;
        }
        .segPoint .segCode {
          font-size: 12px;
          opacity: 0.85;
          margin-top: 2px;
          font-weight: 900;
        }
        .segPoint .segDate {
          font-size: 11px;
          opacity: 0.65;
          margin-top: 2px;
        }
        .segPoint.right {
          text-align: right;
        }
        .segLine {
          position: relative;
          height: 20px;
          display: grid;
          place-items: center;
        }
        .segBar {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
        }
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
        .tiny {
          margin-top: 10px;
          font-size: 11px;
          opacity: 0.6;
        }
        .error,
        .empty {
          margin-top: 14px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 80, 80, 0.08);
          border: 1px solid rgba(255, 80, 80, 0.22);
        }
        .empty {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .errorTitle,
        .emptyTitle {
          font-weight: 950;
          margin-bottom: 6px;
        }
        .errorMsg,
        .emptyMsg {
          opacity: 0.82;
          font-size: 13px;
        }
        .skel {
          position: relative;
          overflow: hidden;
        }
        .skLine {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          margin-bottom: 10px;
        }
        .w60 {
          width: 60%;
        }
        .w40 {
          width: 40%;
        }
        .w80 {
          width: 80%;
        }
        .skel:after {
          content: "";
          position: absolute;
          top: 0;
          left: -30%;
          width: 30%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          animation: sh 1.1s infinite;
        }
        @keyframes sh {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(450%);
          }
        }
        .showMoreWrap {
          margin-top: 6px;
          display: grid;
          gap: 8px;
          justify-items: center;
        }
        .showMoreBtn {
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 950;
          cursor: pointer;
          min-width: 220px;
        }
        .showMoreBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .showMoreHint {
          font-size: 12px;
          opacity: 0.7;
        }
        @media (max-width: 900px) {
          .topbar {
            grid-template-columns: auto 1fr;
            grid-auto-rows: auto;
          }
          .chipRow {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }
          .controls {
            grid-template-columns: 1fr;
            position: static;
          }
          .controls.modify {
            grid-template-columns: 1fr;
            position: static;
          }
          .route {
            grid-template-columns: 1fr;
          }
          .line {
            display: none;
          }
          .row {
            flex-direction: column;
            align-items: flex-start;
          }
          .priceVal,
          .priceSub {
            text-align: left;
          }
          .segMid {
            grid-template-columns: 1fr;
          }
          .segLine {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}