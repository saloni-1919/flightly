import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_KEY = process.env.AIRLABS_API_KEY ?? "";

/* ---------- Types ---------- */

type AirlabsFlight = {
  hex?: string;

  flight_iata?: string;
  flight_icao?: string;
  callsign?: string;

  lat?: number;
  lng?: number;
  alt?: number;
  speed?: number;
  dir?: number;

  // route / schedule / status (often available)
  dep_iata?: string;
  arr_iata?: string;
  dep_icao?: string;
  arr_icao?: string;

  dep_time?: string;
  arr_time?: string;
  status?: string;
};

type AirlabsSingleResponse = {
  request?: unknown;
  response?: AirlabsFlight;
  error?: string;
};

type AirlabsRadarResponse = {
  request?: unknown;
  response?: AirlabsFlight[];
  error?: string;
};

type AirlabsAirport = {
  iata_code?: string;
  name?: string;
  city?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
};

type AirlabsAirportResponse = {
  request?: unknown;
  response?: AirlabsAirport;
  error?: string;
};

export type TrackPoint = { lat: number; lon: number; ts: string };

export type Flight = {
  id: string;
  callsign: string;

  lat: number;
  lon: number;

  altitudeFt: number;
  speedKt: number;
  heading: number;

  updatedAt: string;

  // route / schedule / status
  from?: string;
  to?: string;
  depTime?: string;
  arrTime?: string;
  status?: string;

  // optional airport coordinates (for route polyline)
  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;

  // track history (for covered path)
  track?: TrackPoint[];
};

/* ---------- Helpers ---------- */

function norm(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function hasCoord(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon);
}

/* ---------- In-memory airport cache ---------- */
/**
 * Works perfectly on localhost.
 * Note: on serverless (Vercel), memory may reset between invocations.
 */
const airportCache = new Map<string, { data: AirlabsAirport; cachedAt: number }>();
const AIRPORT_TTL_MS = 1000 * 60 * 60 * 24; // 24h

async function getAirportByIata(iata: string): Promise<AirlabsAirport | null> {
  const key = norm(iata);
  if (!key) return null;

  const cached = airportCache.get(key);
  if (cached && Date.now() - cached.cachedAt < AIRPORT_TTL_MS) return cached.data;

  const url = `https://airlabs.co/api/v9/airport?iata_code=${encodeURIComponent(
    key
  )}&api_key=${API_KEY}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as AirlabsAirportResponse;

  if (json?.response) {
    airportCache.set(key, { data: json.response, cachedAt: Date.now() });
    return json.response;
  }
  return null;
}

/* ---------- In-memory track store (covered path) ---------- */

type TrackStoreEntry = { points: TrackPoint[]; lastUpdated: number };

const trackStore = new Map<string, TrackStoreEntry>();
const TRACK_TTL_MS = 1000 * 60 * 60 * 6; // keep 6 hours
const TRACK_MAX_POINTS = 800;

function cleanupTracks(): void {
  const now = Date.now();
  for (const [k, v] of trackStore.entries()) {
    if (now - v.lastUpdated > TRACK_TTL_MS) {
      trackStore.delete(k);
    }
  }
}

function pushTrackPoint(flightId: string, lat: number, lon: number): void {
  if (!flightId) return;
  if (!hasCoord(lat, lon)) return;

  cleanupTracks();

  const ts = new Date().toISOString();
  const entry = trackStore.get(flightId) ?? { points: [], lastUpdated: Date.now() };

  const last = entry.points[entry.points.length - 1];
  // de-dupe super-close points
  if (
    last &&
    Math.abs(last.lat - lat) < 0.0003 && // ~30m
    Math.abs(last.lon - lon) < 0.0003
  ) {
    entry.lastUpdated = Date.now();
    trackStore.set(flightId, entry);
    return;
  }

  entry.points.push({ lat, lon, ts });
  if (entry.points.length > TRACK_MAX_POINTS) {
    entry.points.splice(0, entry.points.length - TRACK_MAX_POINTS);
  }

  entry.lastUpdated = Date.now();
  trackStore.set(flightId, entry);
}

function getTrack(flightId: string): TrackPoint[] {
  cleanupTracks();
  return trackStore.get(flightId)?.points ?? [];
}

/* ---------- Build Flight ---------- */

async function buildFlight(f: AirlabsFlight, fallback: string): Promise<Flight | null> {
  const lat = asNum(f.lat);
  const lon = asNum(f.lng);
  if (!hasCoord(lat, lon)) return null;

  const id = norm(f.hex) || norm(f.flight_iata) || norm(f.flight_icao) || fallback;
  const callsign =
    norm(f.flight_icao) || norm(f.flight_iata) || norm(f.callsign) || fallback;

  // route bits
  const from = norm(f.dep_iata) || norm(f.dep_icao) || undefined;
  const to = norm(f.arr_iata) || norm(f.arr_icao) || undefined;

  const depTime = f.dep_time ? String(f.dep_time) : undefined;
  const arrTime = f.arr_time ? String(f.arr_time) : undefined;
  const status = f.status ? String(f.status) : undefined;

  // airport coords (if we can resolve by IATA)
  let originLat: number | undefined;
  let originLon: number | undefined;
  let destLat: number | undefined;
  let destLon: number | undefined;

  if (from && from.length === 3) {
    const ap = await getAirportByIata(from);
    const aLat = asNum(ap?.lat);
    const aLon = asNum(ap?.lng);
    if (hasCoord(aLat, aLon)) {
      originLat = aLat;
      originLon = aLon;
    }
  }

  if (to && to.length === 3) {
    const ap = await getAirportByIata(to);
    const aLat = asNum(ap?.lat);
    const aLon = asNum(ap?.lng);
    if (hasCoord(aLat, aLon)) {
      destLat = aLat;
      destLon = aLon;
    }
  }

  // update track store
  pushTrackPoint(id, lat, lon);

  return {
    id,
    callsign,
    lat,
    lon,
    altitudeFt: asNum(f.alt) || 0,
    speedKt: asNum(f.speed) || 0,
    heading: asNum(f.dir) || 0,
    updatedAt: new Date().toISOString(),

    from,
    to,
    depTime,
    arrTime,
    status,

    originLat,
    originLon,
    destLat,
    destLon,

    track: getTrack(id),
  };
}

/* ---------- Route ---------- */

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing AIRLABS_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = norm(searchParams.get("q"));

  try {
    /* =========================================================
       SINGLE FLIGHT SEARCH
    ========================================================= */
    if (q) {
      const tryUrls = [
        `https://airlabs.co/api/v9/flight?flight_iata=${encodeURIComponent(
          q
        )}&api_key=${API_KEY}`,
        `https://airlabs.co/api/v9/flight?flight_icao=${encodeURIComponent(
          q
        )}&api_key=${API_KEY}`,
        `https://airlabs.co/api/v9/flight?callsign=${encodeURIComponent(
          q
        )}&api_key=${API_KEY}`,
      ];

      let lastResponse: AirlabsSingleResponse | null = null;

      for (const url of tryUrls) {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as AirlabsSingleResponse;
        lastResponse = json;
        if (json?.response) break;
      }

      if (!lastResponse?.response) {
        return NextResponse.json({
          ok: true,
          data: {
            flights: [] as Flight[],
            note: lastResponse?.error
              ? `AirLabs error: ${lastResponse.error}`
              : `No live flight found for ${q}. Try ICAO format (IGO201 / AAL100 / ETD13) or IATA (EY13).`,
          },
        });
      }

      const flight = await buildFlight(lastResponse.response, q);

      if (!flight) {
        return NextResponse.json({
          ok: true,
          data: {
            flights: [] as Flight[],
            note: "Flight found but no coordinates returned (likely not airborne).",
          },
        });
      }

      return NextResponse.json({
        ok: true,
        data: {
          flights: [flight],
          note: `Tracking ${q} (AirLabs)`,
        },
      });
    }

    /* =========================================================
       RADAR MODE (returns many flights, no tracks to keep payload small)
    ========================================================= */

    const radarUrl = `https://airlabs.co/api/v9/flights?api_key=${API_KEY}&limit=200`;
    const radarRes = await fetch(radarUrl, { cache: "no-store" });
    const radarJson = (await radarRes.json()) as AirlabsRadarResponse;

    if (radarJson?.error) {
      return NextResponse.json({
        ok: true,
        data: {
          flights: [] as Flight[],
          note: `AirLabs error: ${radarJson.error}`,
        },
      });
    }

    const flights: Flight[] = [];
    for (const f of radarJson.response ?? []) {
      const lat = asNum(f.lat);
      const lon = asNum(f.lng);
      if (!hasCoord(lat, lon)) continue;

      const id = norm(f.hex) || norm(f.flight_iata) || norm(f.flight_icao) || "";
      const callsign = norm(f.flight_icao) || norm(f.flight_iata) || norm(f.callsign) || "";

      flights.push({
        id: id || `${lat},${lon}`,
        callsign: callsign || id || "UNKNOWN",
        lat,
        lon,
        altitudeFt: asNum(f.alt) || 0,
        speedKt: asNum(f.speed) || 0,
        heading: asNum(f.dir) || 0,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        flights: flights.slice(0, 300),
        note: "Live radar feed (AirLabs)",
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      data: {
        flights: [] as Flight[],
        note: "AirLabs request failed.",
      },
    });
  }
}