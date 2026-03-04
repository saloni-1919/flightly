export type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
export type TripType = "ONE_WAY" | "ROUND_TRIP";

export type FlightSearchInput = {
  origin: string;        // e.g. JFK
  destination: string;   // e.g. LHR
  departDate: string;    // YYYY-MM-DD
  returnDate?: string;   // YYYY-MM-DD for round-trip
  tripType: TripType;
  cabin: Cabin;
  adults: number;
};

export type ProviderQuote = {
  provider: string;         // "Amadeus", "Kiwi", "Duffel", etc.
  price: number;
  currency: string;
  deepLink?: string;        // if provider supports it
  notes?: string;
};

export type FlightOffer = {
  id: string;
  airline: string;
  flightNumber?: string;
  durationMinutes: number;
  stops: number;
  departTimeISO: string;
  arriveTimeISO: string;
  origin: string;
  destination: string;
  quotes: ProviderQuote[];   // multiple providers (comparison)
};