"use client";

type TripType = "oneway" | "roundtrip";

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
};

function readRecent(): RecentSearch[] {
  try {
    const raw = localStorage.getItem("flightly:recentSearches");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function RecentSearches({
  onPick,
}: {
  onPick: (r: RecentSearch) => void;
}) {
  const recent = readRecent();

  if (!recent.length) return <div className="recentEmpty">No recent searches yet.</div>;

  return (
    <div className="recentList">
      {recent.map((r, idx) => (
        <button key={idx} type="button" className="recentItem" onClick={() => onPick(r)}>
          <div className="recentMain">
            <div className="recentRoute">
              {r.origin} → {r.destination}
            </div>
            <div className="recentMeta">
              {r.date}
              {r.tripType === "roundtrip" && r.returnDate ? ` • Return ${r.returnDate}` : ""} •{" "}
              {r.adults} adult{r.adults > 1 ? "s" : ""} • {r.cabinClass}
            </div>
          </div>
          <div className="recentChips">
            <span className="pillSmall">{r.currency}</span>
            <span className="pillSmall">gl={r.gl}</span>
            <span className="pillSmall">hl={r.hl}</span>
          </div>
        </button>
      ))}
    </div>
  );
}