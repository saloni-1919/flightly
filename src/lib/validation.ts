import { z } from "zod";

export const FlightSearchSchema = z.object({
  origin: z.string().min(3).max(3),
  destination: z.string().min(3).max(3),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tripType: z.enum(["ONE_WAY", "ROUND_TRIP"]),
  cabin: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
  adults: z.coerce.number().int().min(1).max(9),
}).superRefine((val, ctx) => {
  if (val.tripType === "ROUND_TRIP" && !val.returnDate) {
    ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date is required for round-trip." });
  }
});