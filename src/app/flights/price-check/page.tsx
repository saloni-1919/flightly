"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PriceCheckPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const sig = sp.get("sig") || "";
  const currency = (sp.get("currency") || "USD").toUpperCase();

  // ✅ lint-safe: no setState in useEffect
  const [flight] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("flightly:selectedFlight");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const summary = useMemo(() => {
    const f = flight || {};
    const s = f.summary || {};
    return {
      airline: s.airlineName || "Airline",
      from: s.from || "",
      to: s.to || "",
      depart: s.depart || "",
      arrive: s.arrive || "",
      duration: s.duration || "",
      stops: typeof s.stops === "number" ? s.stops : null,
      price: f?.price?.total ?? "",
      priceCurrency: f?.price?.currency || currency,
    };
  }, [flight, currency]);

  function goBack() {
    router.back();
  }

  // TEMP providers (until SerpApi provider links are wired)
  const providers = useMemo(() => {
    const base = Number(String(summary.price).replace(/[^\d.]/g, "")) || 300;
    return [
      { name: "Kiwi.com", price: base - 3, url: "https://www.kiwi.com/" },
      { name: "Oojo", price: base, url: "https://www.oojo.com/" },
      { name: "Trip.com", price: base + 14, url: "https://www.trip.com/" },
      { name: "Expedia", price: base + 44, url: "https://www.expedia.com/" },
      { name: "Booking.com", price: base + 45, url: "https://www.booking.com/" },
    ];
  }, [summary.price]);

  return (
    <div className="page">
      <header className="topbar">
        <button className="backBtn" onClick={goBack} type="button">
          ← Back to results
        </button>

        <div className="titleWrap">
          <div className="title">Book your ticket</div>
          <div className="subtitle">
            {summary.to || "Destination"} • {currency}
            {sig ? ` • ${sig.slice(0, 16)}…` : ""}
          </div>
        </div>
      </header>

      <main className="wrap">
        {!flight ? (
          <section className="card warn">
            <div className="warnTitle">No cached details</div>
            <div className="warnMsg">
              Open this page by clicking <b>Check prices</b> from results so we can pass the selected flight.
            </div>
          </section>
        ) : (
          <div className="grid">
            <section className="card">
              <div className="kicker">Only show options that include</div>
              <div className="pillRow">
                <span className="pill">Carry-on bag</span>
                <span className="pill">Checked bag</span>
              </div>

              <div className="list">
                {providers.map((p, idx) => (
                  <div key={p.name} className="provider">
                    <div className="provLeft">
                      <div className="provTitle">
                        Option {idx + 1}: {p.name}
                      </div>
                      <div className="provMeta">24/7 support • External provider</div>
                    </div>

                    <div className="provRight">
                      <div className="provPrice">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency,
                          maximumFractionDigits: 0,
                        }).format(p.price)}
                      </div>

                      <a className="provBtn" href={p.url} target="_blank" rel="noreferrer">
                        View deal →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="rightTitle">Flight details</div>

              <div className="detailRow">
                <div className="detailLabel">Airline</div>
                <div className="detailVal">{summary.airline}</div>
              </div>

              <div className="detailRow">
                <div className="detailLabel">Route</div>
                <div className="detailVal">
                  {summary.from} → {summary.to}
                </div>
              </div>

              <div className="detailRow">
                <div className="detailLabel">Times</div>
                <div className="detailVal">
                  {summary.depart} → {summary.arrive}
                </div>
              </div>

              <div className="detailRow">
                <div className="detailLabel">Duration</div>
                <div className="detailVal">{String(summary.duration || "—")}</div>
              </div>
            </section>
          </div>
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
          grid-template-columns: auto 1fr;
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
        .title {
          font-weight: 950;
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
        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 18px 40px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 12px;
          align-items: start;
        }
        .card {
          border-radius: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
        }
        .warn {
          border-color: rgba(255, 80, 80, 0.22);
          background: rgba(255, 80, 80, 0.08);
        }
        .warnTitle {
          font-weight: 950;
          margin-bottom: 6px;
        }
        .warnMsg {
          opacity: 0.85;
          font-size: 13px;
        }
        .kicker {
          font-size: 12px;
          opacity: 0.85;
          font-weight: 950;
          margin-bottom: 10px;
        }
        .pillRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .pill {
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          font-size: 12px;
        }
        .list {
          display: grid;
          gap: 10px;
        }
        .provider {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .provTitle {
          font-weight: 950;
        }
        .provMeta {
          font-size: 12px;
          opacity: 0.75;
          margin-top: 4px;
        }
        .provPrice {
          font-weight: 950;
          font-size: 18px;
          text-align: right;
        }
        .provBtn {
          display: inline-block;
          margin-top: 6px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(34, 197, 94, 0.45);
          background: linear-gradient(180deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.12));
          color: #fff;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }
        .rightTitle {
          font-weight: 950;
          margin-bottom: 12px;
        }
        .detailRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .detailLabel {
          font-size: 12px;
          opacity: 0.7;
          font-weight: 900;
        }
        .detailVal {
          font-size: 13px;
          font-weight: 900;
          opacity: 0.9;
          text-align: right;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}