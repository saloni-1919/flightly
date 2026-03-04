"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

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

function planeDivIcon(heading: number, selected: boolean) {
  const size = selected ? 34 : 26;
  const color = selected ? "#00E5FF" : "#37D67A"; // visible colors (cyan/green)

  return L.divIcon({
    className: "",
    html: `
      <div style="
        transform: rotate(${heading}deg);
        width: ${size}px; height: ${size}px;
        display:flex; align-items:center; justify-content:center;
        filter: drop-shadow(0 0 ${selected ? 10 : 6}px rgba(0,229,255,0.55));
      ">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z"
            fill="${color}" fill-opacity="0.95"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function AutoFocus({
  flight,
  enabled,
}: {
  flight: Flight | null;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!flight) return;
    map.setView([flight.lat, flight.lon], 6, { animate: true });
  }, [enabled, flight, map]);

  return null;
}

function fmtTime(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function LiveMap({
  flights,
  selectedId,
  onSelect,
}: {
  flights: Flight[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // you said: leave this warning; it works fine
  useEffect(() => setMounted(true), []);

  const selected = useMemo(() => {
    return (
      flights.find((f) => f.id === selectedId) ??
      (flights.length === 1 ? flights[0] : null)
    );
  }, [flights, selectedId]);

  const trackPositions = useMemo(() => {
    const pts = selected?.track ?? [];
    return pts
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => [p.lat, p.lon] as [number, number]);
  }, [selected]);

  const routePositions = useMemo(() => {
    if (!selected) return [];
    const pts: [number, number][] = [];

    if (
      typeof selected.originLat === "number" &&
      typeof selected.originLon === "number" &&
      Number.isFinite(selected.originLat) &&
      Number.isFinite(selected.originLon)
    ) {
      pts.push([selected.originLat, selected.originLon]);
    }

    pts.push([selected.lat, selected.lon]);

    if (
      typeof selected.destLat === "number" &&
      typeof selected.destLon === "number" &&
      Number.isFinite(selected.destLat) &&
      Number.isFinite(selected.destLon)
    ) {
      pts.push([selected.destLat, selected.destLon]);
    }

    // must be at least 2 points to draw
    return pts.length >= 2 ? pts : [];
  }, [selected]);

  if (!mounted) {
    return (
      <div className="w-full h-[360px] rounded-xl border border-white/10 bg-black/30 flex items-center justify-center text-white/50">
        Loading map…
      </div>
    );
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="w-full h-[360px] rounded-xl border border-white/10"
      whenReady={() => setMapReady(true)}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <AutoFocus flight={selected} enabled={mapReady && !!selected} />

      {/* ✅ Covered path (actual tracked points we stored) */}
      {trackPositions.length >= 2 && (
        <Polyline
          positions={trackPositions}
          pathOptions={{ weight: 4, opacity: 0.9 }}
        />
      )}

      {/* ✅ Route line (Origin → Current → Destination) */}
      {routePositions.length >= 2 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ weight: 3, opacity: 0.65, dashArray: "6 8" }}
        />
      )}

      {flights.map((f) => {
        const isSelected = selectedId === f.id;

        return (
          <Marker
            key={f.id}
            position={[f.lat, f.lon]}
            icon={planeDivIcon(f.heading, isSelected)}
            eventHandlers={{ click: () => onSelect(f.id) }}
          >
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {f.callsign || f.id}
                </div>

                {(f.from || f.to) && (
                  <div style={{ marginTop: 6, fontWeight: 700 }}>
                    {f.from ?? "—"} → {f.to ?? "—"}
                  </div>
                )}

                {(f.depTime || f.arrTime) && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                    {f.depTime && <div>Dep: {fmtTime(f.depTime)}</div>}
                    {f.arrTime && <div>Arr: {fmtTime(f.arrTime)}</div>}
                  </div>
                )}

                {f.status && (
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Status: <b>{f.status}</b>
                  </div>
                )}

                <hr style={{ margin: "10px 0", opacity: 0.2 }} />

                <div style={{ fontSize: 12 }}>
                  <div>Alt: {f.altitudeFt} ft</div>
                  <div>Speed: {f.speedKt} kt</div>
                  <div>Heading: {f.heading}°</div>
                </div>

                {f.track?.length ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Track points: {f.track.length}
                  </div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}