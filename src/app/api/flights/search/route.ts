import { NextRequest, NextResponse } from "next/server";

type SearchBody = {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;

  currency?: string; // USD, GBP, INR
  gl?: string;       // us, gb, in
  hl?: string;       // en, en-GB, hi
};

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const DEFAULT_GL = process.env.SERPAPI_GL || "us";
const DEFAULT_HL = process.env.SERPAPI_HL || "en";
const DEFAULT_CURRENCY = process.env.SERPAPI_CURRENCY || "USD";

function assertEnv() {
  if (!SERPAPI_KEY) throw new Error("Missing SERPAPI_KEY in .env.local");
}

function isDateYYYYMMDD(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function safeCurrency3(input: string, fallback: string) {
  const v = (input || "").trim();
  if (!/^[A-Za-z]{3}$/.test(v)) return fallback;
  return v.toUpperCase();
}

function safeLower2(input: string, fallback: string) {
  const v = (input || "").trim();
  if (!/^[A-Za-z]{2}$/.test(v)) return fallback;
  return v.toLowerCase();
}

async function fetchSerpApi(params: Record<string, string>) {
  const url = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`SerpApi returned non-JSON (HTTP ${res.status}). Body: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}: ${JSON.stringify(json).slice(0, 900)}`);
  }

  if (json?.error) {
    throw new Error(`SerpApi error: ${json.error}`);
  }

  return json;
}

function normalizeFlights(serp: any, currency: string) {
  const best = Array.isArray(serp?.best_flights) ? serp.best_flights : [];
  const other = Array.isArray(serp?.other_flights) ? serp.other_flights : [];

  const toCard = (f: any, idx: number, bucket: "best" | "other") => {
    const total =
      f?.price ??
      f?.price_amount ??
      f?.price_formatted ??
      f?.total_price ??
      null;

    const segments = Array.isArray(f?.flights) ? f.flights : [];

    const sigParts = segments.map((s: any) => {
      const airline = s?.airline || s?.airline_name || "";
      const depAirport = s?.departure_airport?.id || s?.departure_airport || "";
      const arrAirport = s?.arrival_airport?.id || s?.arrival_airport || "";
      const depTime = s?.departure_time || "";
      const arrTime = s?.arrival_time || "";
      const flightNo = s?.flight_number || "";
      return `${airline}-${flightNo}-${depAirport}-${arrAirport}-${depTime}-${arrTime}`;
    });

    const signature = `${bucket}|${String(total)}|${sigParts.join("~")}`;

    const first = segments[0];
    const last = segments[segments.length - 1];

    const airlineName =
      first?.airline || first?.airline_name || first?.airline_code || "Airline";

    const depart = first?.departure_time || null;
    const arrive = last?.arrival_time || null;

    const from = first?.departure_airport?.id || first?.departure_airport || null;
    const to = last?.arrival_airport?.id || last?.arrival_airport || null;

    const stops = Math.max(0, segments.length - 1);

    const duration =
      f?.total_duration ||
      f?.duration ||
      (segments.length === 1 ? segments[0]?.duration : null) ||
      null;

    return {
      id: `${bucket}-${idx + 1}`,
      signature,
      bucket,
      source: "serpapi-google-flights",
      price: { total, currency },
      summary: { airlineName, depart, arrive, from, to, stops, duration },
      itineraries: segments,
    };
  };

  const combined = [
    ...best.map((f: any, i: number) => toCard(f, i, "best")),
    ...other.map((f: any, i: number) => toCard(f, i, "other")),
  ];

  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const item of combined) {
    if (seen.has(item.signature)) continue;
    seen.add(item.signature);
    deduped.push(item);
  }

  return deduped;
}

export async function POST(req: NextRequest) {
  try {
    assertEnv();

    const body = (await req.json()) as Partial<SearchBody>;

    const origin = (body.origin || "").trim().toUpperCase();
    const destination = (body.destination || "").trim().toUpperCase();
    const date = (body.date || "").trim();
    const returnDate = (body.returnDate || "").trim();

    if (!origin || !destination || !date) {
      return NextResponse.json(
        { ok: false, error: "origin, destination, and date are required." },
        { status: 400 }
      );
    }

    if (!isDateYYYYMMDD(date) || (returnDate && !isDateYYYYMMDD(returnDate))) {
      return NextResponse.json(
        { ok: false, error: "date/returnDate must be YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const currency = safeCurrency3(body.currency || "", DEFAULT_CURRENCY);
    const gl = safeLower2(body.gl || "", DEFAULT_GL);
    const hl = (body.hl || DEFAULT_HL).trim();

    // ✅ Key fix: set type based on returnDate presence
    // SerpApi expects:
    // type=1 => round trip (requires return_date)
    // type=2 => one way
    const tripType = returnDate ? "1" : "2";

    const serpParams: Record<string, string> = {
      api_key: SERPAPI_KEY!,
      engine: "google_flights",
      departure_id: origin,
      arrival_id: destination,
      outbound_date: date,
      currency,
      gl,
      hl,
      type: tripType,
    };

    if (returnDate) {
      serpParams.return_date = returnDate;
    }

    const serp = await fetchSerpApi(serpParams);
    const data = normalizeFlights(serp, currency);

    return NextResponse.json({
      ok: true,
      data,
      meta: { source: "serpapi-google-flights", count: data.length, currency, gl, hl, type: tripType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "SerpApi flight search failed" },
      { status: 500 }
    );
  }
}