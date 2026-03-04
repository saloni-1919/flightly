import type { Provider } from "./types";
import type { FlightOffer, FlightSearchInput } from "@/lib/types";

function minutes(n: number) { return n; }

export const MockProvider: Provider = {
  name: "MockTravel",
  async search(input: FlightSearchInput): Promise<FlightOffer[]> {
    // Fake results so UI works perfectly while you plug real APIs later
    const base = [
      { airline: "British Airways", stops: 0, dur: 420, price: 610 },
      { airline: "Delta", stops: 1, dur: 520, price: 540 },
      { airline: "United", stops: 0, dur: 435, price: 680 },
      { airline: "Virgin Atlantic", stops: 0, dur: 425, price: 655 },
    ];

    const now = new Date(`${input.departDate}T08:00:00Z`).getTime();
    return base.map((b, idx) => {
      const depart = new Date(now + idx * 60 * 60 * 1000).toISOString();
      const arrive = new Date(now + (idx * 60 + b.dur) * 60 * 1000).toISOString();
      const id = `mock_${input.origin}_${input.destination}_${idx}`;

      const offer: FlightOffer = {
        id,
        airline: b.airline,
        durationMinutes: minutes(b.dur),
        stops: b.stops,
        departTimeISO: depart,
        arriveTimeISO: arrive,
        origin: input.origin,
        destination: input.destination,
        quotes: [
          {
            provider: "MockTravel",
            price: b.price,
            currency: "USD",
            deepLink: `https://example.com/search?from=${input.origin}&to=${input.destination}&date=${input.departDate}`,
            notes: "Demo link (replace with real provider deep link)",
          },
          {
            provider: "SkyDeals",
            price: b.price + 15,
            currency: "USD",
            deepLink: `https://example.com/skydeals?q=${id}`,
          },
        ],
      };
      return offer;
    });
  },
};