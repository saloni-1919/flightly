import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white/70">
          <div>Auth setup (NextAuth) goes here.</div>
          <Button className="rounded-xl w-full">Continue</Button>
        </CardContent>
      </Card>
    </div>
  );
}