import type { FlightOffer, FlightSearchInput } from "@/lib/types";
import { MockProvider } from "./providers/mock";
import type { Provider } from "./providers/types";

const providers: Provider[] = [MockProvider];

export async function searchAllProviders(input: FlightSearchInput): Promise<FlightOffer[]> {
  const results = await Promise.allSettled(providers.map((p) => p.search(input)));

  const offers: FlightOffer[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") offers.push(...r.value);
  }

  // In real world you would de-duplicate by itinerary hash.
  return offers;
}

export function cheapestQuote(offer: FlightOffer) {
  return offer.quotes.reduce((min, q) => (q.price < min.price ? q : min), offer.quotes[0]);
}