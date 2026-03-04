import type { FlightSearchInput, FlightOffer } from "@/lib/types";

export type Provider = {
  name: string;
  search(input: FlightSearchInput): Promise<FlightOffer[]>;
};