import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  flightNumber: z.string().min(3).max(8),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type StatusPayload = {
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const flightNumber = (url.searchParams.get("flightNumber") || "").trim().toUpperCase();
    const date = (url.searchParams.get("date") || "").trim();

    const parsed = Schema.safeParse({ flightNumber, date });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // ✅ Mock response (so UI works perfectly now)
    const mock: StatusPayload = {
      flightNumber,
      airline: "Demo Airlines (Mock)",
      date,
      status: "SCHEDULED",
      departure: {
        airport: "John F. Kennedy International Airport",
        iata: "JFK",
        scheduled: `${date} 09:10`,
        estimated: `${date} 09:10`,
        gate: "B12",
        terminal: "4",
      },
      arrival: {
        airport: "Los Angeles International Airport",
        iata: "LAX",
        scheduled: `${date} 12:35`,
        estimated: `${date} 12:40`,
        gate: "C3",
        terminal: "6",
      },
      lastUpdated: new Date().toISOString(),
      note:
        "Mock data for now. Next step: plug a real Flight Status API and map its response into this same shape.",
    };

    return NextResponse.json({ ok: true, data: mock });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}