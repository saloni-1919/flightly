import { Suspense } from "react";
import PriceCheckClient from "./pricecheckclient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading price check...</div>}>
      <PriceCheckClient />
    </Suspense>
  );
}