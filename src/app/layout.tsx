import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "@/components/providers";
import AppShell from "@/components/app-shell";

export const metadata = {
  title: "Flightly — Search, Compare & Track",
  description: "Search flights, compare prices, and track routes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}