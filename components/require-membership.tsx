"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RequireMembership({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch("/api/client/me/membership", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setAllowed(!!data.hasActiveMembership))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Membership required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an active membership to access this section. Apply for a membership first, then come back here.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link href="/client/memberships">Get a membership</Link>
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
