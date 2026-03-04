"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { FlightOffer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDur(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
function cheapest(offer: FlightOffer) {
  return offer.quotes.reduce((min, q) => (q.price < min.price ? q : min), offer.quotes[0]);
}

export default function ResultsPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const query = Object.fromEntries(sp.entries());
  const qs = new URLSearchParams(query).toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["flight-search", qs],
    queryFn: async () => {
      const res = await fetch(`/api/flights/search?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return (await res.json()) as { ok: boolean; offers: FlightOffer[] };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="text-white/60">
            {query.origin} → {query.destination} • {query.departDate} • {query.tripType} • {query.cabin}
          </p>
        </div>
        <Button variant="secondary" className="rounded-xl" onClick={() => router.push("/flights")}>
          New search
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-white/10 bg-white/5">
              <CardHeader>
                <Skeleton className="h-5 w-60" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-10 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-white/70">
            Try again. If you hit rate limits, wait 1 minute.
          </CardContent>
        </Card>
      )}

      {data?.offers?.length ? (
        <div className="grid gap-4">
          {data.offers.map((offer) => {
            const best = cheapest(offer);
            return (
              <Card key={offer.id} className="border-white/10 bg-white/5 hover:bg-white/10 transition">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold">{offer.airline}</div>
                        <Badge className="rounded-xl bg-white/10 text-white border border-white/10">
                          {offer.stops === 0 ? "Non-stop" : `${offer.stops} stop`}
                        </Badge>
                      </div>

                      <div className="text-sm text-white/70">
                        {fmtTime(offer.departTimeISO)} → {fmtTime(offer.arriveTimeISO)} • {fmtDur(offer.durationMinutes)} • {offer.origin} → {offer.destination}
                      </div>

                      <div className="text-sm text-white/70">
                        Cheapest at <span className="text-white">{best.provider}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="text-2xl font-semibold">
                        {best.currency} {best.price}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="rounded-xl"
                          onClick={() => router.push(`/flights/${encodeURIComponent(offer.id)}?${qs}`)}
                        >
                          Details
                        </Button>

                        <Button
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => {
                            // In real world, redirect via backend /api/redirect for tracking + safety
                            const link = best.deepLink ?? `https://www.google.com/search?q=${offer.origin}+${offer.destination}+flight`;
                            window.open(link, "_blank", "noopener,noreferrer");
                          }}
                        >
                          View deal
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Provider comparison chips */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {offer.quotes
                      .slice()
                      .sort((a, b) => a.price - b.price)
                      .map((q) => (
                        <span
                          key={q.provider}
                          className={q.provider === best.provider
                            ? "rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs"
                            : "rounded-xl border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80"}
                        >
                          {q.provider}: {q.currency} {q.price}
                        </span>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>No flights found</CardTitle>
            </CardHeader>
            <CardContent className="text-white/70">
              Try different airports/dates. Free APIs can be limited.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}