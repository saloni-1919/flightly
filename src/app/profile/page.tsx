import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent className="text-white/70">
        Name, email, saved searches, alerts, preferences.
      </CardContent>
    </Card>
  );
}