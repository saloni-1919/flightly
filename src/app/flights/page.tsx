"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

type TripType = "oneway" | "roundtrip";

const CABIN_OPTIONS = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const GL_OPTIONS = [
  { value: "us", label: "United States (us)" },
  { value: "gb", label: "United Kingdom (gb)" },
  { value: "in", label: "India (in)" },
  { value: "ca", label: "Canada (ca)" },
  { value: "au", label: "Australia (au)" },
  { value: "ae", label: "UAE (ae)" },
];

const HL_OPTIONS = [
  { value: "en", label: "English (en)" },
  { value: "en-GB", label: "English UK (en-GB)" },
  { value: "hi", label: "Hindi (hi)" },
];

const CURRENCY_OPTIONS = ["USD", "GBP", "INR", "EUR", "CAD", "AUD", "AED"];

type RecentSearch = {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  tripType: TripType;
  adults: number;
  cabinClass: string;
  currency: string;
  gl: string;
  hl: string;
  ts: number;
};

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeIata(input: string) {
  return (input || "").trim().toUpperCase();
}

function loadRecent(): RecentSearch[] {
  try {
    const raw = localStorage.getItem("flightly:recentSearches");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatISOToShort(iso: string) {
  // iso: yyyy-mm-dd
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FlightsPage() {
  const router = useRouter();
  const RecentSearches = dynamic(() => import("./RecentSearches"), { ssr: false });

  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [origin, setOrigin] = useState("EWR");
  const [destination, setDestination] = useState("BOM");
  const [date, setDate] = useState(todayPlus(30));
  const [returnDate, setReturnDate] = useState(todayPlus(45));
  const [adults, setAdults] = useState(1);
  const [cabinClass, setCabinClass] = useState("economy");

  const [currency, setCurrency] = useState("USD");
  const [gl, setGl] = useState("us");
  const [hl, setHl] = useState("en");

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [recent, setRecent] = useState<RecentSearch[]>(() => {
    if (typeof window === "undefined") return [];
    return loadRecent();
  });

  const canSearch = useMemo(() => {
    const o = normalizeIata(origin);
    const d = normalizeIata(destination);
    if (!o || !d || !date) return false;
    if (tripType === "roundtrip" && !returnDate) return false;
    return true;
  }, [origin, destination, date, returnDate, tripType]);

  function swapAirports() {
    setOrigin((prevOrigin) => {
      const nextOrigin = destination;
      setDestination(prevOrigin);
      return nextOrigin;
    });
  }

  function goToResults(payload?: Partial<RecentSearch>) {
    const o = normalizeIata(payload?.origin ?? origin);
    const d = normalizeIata(payload?.destination ?? destination);
    const dt = payload?.date ?? date;
    const rt = payload?.returnDate ?? returnDate;
    const tt = (payload?.tripType ?? tripType) as TripType;

    const ad = payload?.adults ?? adults;
    const cb = payload?.cabinClass ?? cabinClass;
    const cur = (payload?.currency ?? currency).toUpperCase();
    const g = (payload?.gl ?? gl).toLowerCase();
    const h = payload?.hl ?? hl;

    if (!o || !d || !dt) return;

    const params = new URLSearchParams({
      origin: o,
      destination: d,
      date: dt,
      adults: String(ad),
      cabinClass: cb,
      currency: cur,
      gl: g,
      hl: h,
      tripType: tt,
    });

    if (tt === "roundtrip" && rt) params.set("returnDate", rt);

    router.push(`/flights/results?${params.toString()}`);
  }

  function clearRecent() {
    try {
      localStorage.removeItem("flightly:recentSearches");
    } catch {}
    setRecent([]);
  }

  const paxCabinLabel = `${adults} adult${adults > 1 ? "s" : ""}, ${
    CABIN_OPTIONS.find((c) => c.value === cabinClass)?.label ?? cabinClass
  }`;

  const dateLabel =
    tripType === "roundtrip"
      ? `${formatISOToShort(date)} — ${formatISOToShort(returnDate)}`
      : `${formatISOToShort(date)}`;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">✈</div>
          <div>
            <div className="brandName">Flightly</div>
            <div className="brandTag">Search • Compare • Track</div>
          </div>
        </div>

        <button className="ghostBtn" type="button" onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? "Hide" : "Advanced"}
        </button>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1>Search flights like Google — in Flightly style.</h1>
          <p>One-line pill search bar. No overlaps. Clean spacing. Fully responsive.</p>
        </section>

        {/* ✅ Google-flights style bar (Flightly theme) */}
        <section className="searchShell">
          <div className="barTop">
            <div className="pillGroup">
              <button
                className={`chip ${tripType === "oneway" ? "on" : ""}`}
                type="button"
                onClick={() => setTripType("oneway")}
              >
                One-way
              </button>
              <button
                className={`chip ${tripType === "roundtrip" ? "on" : ""}`}
                type="button"
                onClick={() => setTripType("roundtrip")}
              >
                Round-trip
              </button>
            </div>
          </div>

          <div className="bar">
            {/* From */}
            <div className="pill">
              <div className="pillLabel">From</div>
              <input
                className="pillInput"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="EWR"
                maxLength={4}
              />
            </div>

            {/* Swap */}
            <button className="swap" type="button" onClick={swapAirports} aria-label="Swap">
              ⇄
            </button>

            {/* To */}
            <div className="pill">
              <div className="pillLabel">To</div>
              <input
                className="pillInput"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="BOM"
                maxLength={4}
              />
            </div>

            {/* Dates (range style) */}
            <div className="pill datePill">
              <div className="pillLabel">Dates</div>
              <div className="dateRow">
                <input className="pillInput" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <span className="dash">—</span>
                <input
                  className="pillInput"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  disabled={tripType === "oneway"}
                />
              </div>
              <div className="tiny">{dateLabel}</div>
            </div>

            {/* Passengers + Cabin */}
            <div className="pill">
              <div className="pillLabel">Passengers & Cabin</div>
              <div className="paxRow">
                <button type="button" className="paxBtn" onClick={() => setAdults((a) => Math.max(1, a - 1))}>
                  −
                </button>
                <div className="paxVal">{adults}</div>
                <button type="button" className="paxBtn" onClick={() => setAdults((a) => Math.min(9, a + 1))}>
                  +
                </button>

                <select className="paxSelect" value={cabinClass} onChange={(e) => setCabinClass(e.target.value)}>
                  {CABIN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tiny">{paxCabinLabel}</div>
            </div>

            {/* Search */}
            <button className="searchBtn" type="button" onClick={() => goToResults()} disabled={!canSearch}>
              Search
            </button>
          </div>

          {/* Advanced row */}
          {showAdvanced && (
            <div className="advanced">
              <div className="advField">
                <div className="advLabel">Currency</div>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="advField">
                <div className="advLabel">Country (gl)</div>
                <select value={gl} onChange={(e) => setGl(e.target.value)}>
                  {GL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="advField">
                <div className="advLabel">Language (hl)</div>
                <select value={hl} onChange={(e) => setHl(e.target.value)}>
                  {HL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Recent Searches */}
        <section className="recentCard">
          <div className="recentHead">
            <div className="recentTitle">Your recent searches</div>
            <button type="button" className="miniGhost" onClick={clearRecent}>
              Clear
            </button>
          </div>
          <RecentSearches onPick={goToResults} />
        </section>
      </main>

      <style jsx>{`
        :global(html, body) {
          height: 100%;
        }
        .page {
          min-height: 100vh;
          color: #eaf0ff;
          background:
            radial-gradient(1200px 700px at 20% 10%, rgba(99, 102, 241, 0.18), transparent 55%),
            radial-gradient(900px 500px at 80% 20%, rgba(34, 197, 94, 0.12), transparent 55%),
            radial-gradient(700px 600px at 20% 90%, rgba(236, 72, 153, 0.10), transparent 55%),
            linear-gradient(180deg, #05070c 0%, #05070c 50%, #04060a 100%);
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 18px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
        }
        .brandName {
          font-weight: 900;
          letter-spacing: 0.2px;
          font-size: 16px;
        }
        .brandTag {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 1px;
        }
        .ghostBtn {
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #eaf0ff;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
        }
        .ghostBtn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 18px 40px;
        }
        .hero {
          padding: 18px 0 14px;
        }
        .hero h1 {
          font-size: clamp(26px, 3.4vw, 40px);
          line-height: 1.05;
          margin: 0;
          font-weight: 950;
          letter-spacing: -0.5px;
        }
        .hero p {
          margin: 10px 0 0;
          max-width: 740px;
          opacity: 0.8;
          font-size: 14px;
        }

        /* Shell */
        .searchShell {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }

        /* Chips row */
        .barTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .pillGroup {
          display: inline-flex;
          gap: 8px;
          padding: 6px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.10);
        }
        .chip {
          padding: 10px 12px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          background: transparent;
          color: rgba(234, 240, 255, 0.78);
          font-weight: 900;
          font-size: 12px;
        }
        .chip.on {
          background: rgba(255, 255, 255, 0.10);
          color: #fff;
        }

        /* Main bar like Google Flights */
        .bar {
          display: flex;
          align-items: stretch;
          gap: 10px;
          flex-wrap: wrap; /* ✅ prevents overflow */
        }

        .pill {
          flex: 1 1 220px; /* ✅ auto wraps */
          min-width: 220px;
          border-radius: 18px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.10);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pillLabel {
          font-size: 11px;
          opacity: 0.7;
          font-weight: 900;
          letter-spacing: 0.2px;
        }

        .pillInput {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #eaf0ff;
          font-size: 16px;
          font-weight: 800;
        }
        .pillInput::placeholder {
          color: rgba(234, 240, 255, 0.45);
        }

        .swap {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          font-weight: 900;
          flex: 0 0 auto;
        }
        .swap:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .datePill {
          flex: 1 1 320px;
          min-width: 320px;
        }
        .dateRow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
        }
        .dash {
          opacity: 0.5;
          font-weight: 900;
        }
        .tiny {
          font-size: 11px;
          opacity: 0.65;
          margin-top: -2px;
        }

        .paxRow {
          display: grid;
          grid-template-columns: 40px 44px 40px 1fr;
          gap: 10px;
          align-items: center;
        }
        .paxBtn {
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          font-weight: 900;
        }
        .paxBtn:hover {
          background: rgba(255, 255, 255, 0.10);
        }
        .paxVal {
          text-align: center;
          font-weight: 950;
          font-size: 16px;
        }
        .paxSelect {
          width: 100%;
          min-width: 0;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(0, 0, 0, 0.25);
          color: #eaf0ff;
          padding: 10px 10px;
          outline: none;
          font-weight: 800;
        }

        .searchBtn {
          height: 56px;
          padding: 0 18px;
          border-radius: 18px;
          border: 1px solid rgba(99, 102, 241, 0.45);
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.45), rgba(99, 102, 241, 0.18));
          color: #fff;
          font-weight: 950;
          cursor: pointer;
          flex: 0 0 auto;
          min-width: 120px;
        }
        .searchBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .searchBtn:not(:disabled):hover {
          filter: brightness(1.05);
        }

        .advanced {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .advField {
          border-radius: 18px;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.10);
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .advLabel {
          font-size: 11px;
          opacity: 0.7;
          font-weight: 900;
        }
        .advField select {
          width: 100%;
          padding: 12px 12px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #eaf0ff;
          outline: none;
          font-weight: 800;
        }

        /* Recent */
        .recentCard {
          margin-top: 14px;
          border-radius: 22px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }
        .recentHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .recentTitle {
          font-weight: 950;
          letter-spacing: -0.2px;
          font-size: 16px;
        }
        .miniGhost {
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #eaf0ff;
          cursor: pointer;
          font-weight: 900;
          font-size: 12px;
        }
        .miniGhost:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .pill {
            flex: 1 1 260px;
            min-width: 260px;
          }
          .datePill {
            flex: 1 1 520px;
            min-width: 520px;
          }
          .advanced {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .swap {
            width: 100%;
            height: 48px;
          }
          .pill {
            min-width: 100%;
          }
          .datePill {
            min-width: 100%;
          }
          .searchBtn {
            width: 100%;
          }
          .paxRow {
            grid-template-columns: 44px 1fr 44px;
          }
          .paxSelect {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}