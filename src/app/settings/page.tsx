import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
      <CardContent className="text-white/70">
        Currency, timezone, units, cabin default, notification settings.
      </CardContent>
    </Card>
  );
}