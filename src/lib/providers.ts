export type ProviderLink = {
  name: string;
  description: string;
  buildUrl: (q: {
    from: string;
    to: string;
    depart: string; // YYYY-MM-DD
    ret?: string; // YYYY-MM-DD
    tripType: "oneway" | "roundtrip";
    cabin: string; // Economy | Business etc.
    passengers: number;
  }) => string;
};

export const PROVIDERS: ProviderLink[] = [
  {
    name: "Google Flights",
    description: "Fast, clean, usually best for comparing",
    buildUrl: ({ from, to, depart, ret, tripType }) => {
      const text =
        tripType === "roundtrip" && ret
          ? `Flights to ${to} from ${from} on ${depart} returning ${ret}`
          : `Flights to ${to} from ${from} on ${depart}`;
      return `https://www.google.com/travel/flights?q=${encodeURIComponent(text)}`;
    },
  },
  {
    name: "Kayak",
    description: "Good filters + price alerts",
    buildUrl: ({ from, to, depart, ret, tripType, passengers }) => {
      const base =
        tripType === "roundtrip" && ret
          ? `https://www.kayak.com/flights/${from}-${to}/${depart}/${ret}`
          : `https://www.kayak.com/flights/${from}-${to}/${depart}`;
      const p = Math.max(1, passengers);
      return `${base}?sort=bestflight_a&fs=adults=${p}`;
    },
  },
  {
    name: "Skyscanner",
    description: "Great coverage (redirect safe)",
    buildUrl: ({ from, to, depart, ret, tripType, passengers }) => {
      const p = Math.max(1, passengers);
      // keep stable search URL
      return `https://www.skyscanner.com/transport/flights/${from}/${to}/${depart}/${
        tripType === "roundtrip" && ret ? `${ret}/` : ""
      }?adults=${p}`;
    },
  },
  {
    name: "Expedia",
    description: "Bundle deals + hotel add-ons",
    buildUrl: ({ from, to, depart, ret, tripType, passengers }) => {
      const p = Math.max(1, passengers);
      const text =
        tripType === "roundtrip" && ret
          ? `${from} to ${to} flights ${depart} ${ret} ${p} passengers`
          : `${from} to ${to} flights ${depart} ${p} passengers`;
      return `https://www.expedia.com/Flights-Search?flight-type=${
        tripType === "roundtrip" ? "roundtrip" : "oneway"
      }&mode=search&trip=${encodeURIComponent(text)}`;
    },
  },
  {
    name: "Trip.com",
    description: "Often good international pricing",
    buildUrl: ({ from, to, depart, ret, tripType, passengers }) => {
      const p = Math.max(1, passengers);
      const text =
        tripType === "roundtrip" && ret ? `${from}-${to} ${depart} ${ret} ${p}` : `${from}-${to} ${depart} ${p}`;
      return `https://www.trip.com/flights/?search=${encodeURIComponent(text)}`;
    },
  },
];