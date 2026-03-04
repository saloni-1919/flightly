import { Suspense } from "react";
import ResultsClient from "./resultclient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading results...</div>}>
      <ResultsClient />
    </Suspense>
  );
}