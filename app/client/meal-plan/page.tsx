"use client";

import * as React from "react";
import { RequireMembership } from "@/components/require-membership";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function ClientMealPlanPage() {
  const [loading, setLoading] = React.useState(true);
  const [title, setTitle] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/client/meal-plan", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        const p = json.data as { id?: string; title?: string; content?: string; updatedAt?: string } | null;
        if (p && typeof p.id === "string") {
          setTitle(typeof p.title === "string" ? p.title : "Meal plan");
          setContent(typeof p.content === "string" ? p.content : "");
          setUpdatedAt(typeof p.updatedAt === "string" ? p.updatedAt : null);
        } else {
          setTitle(null);
          setContent(null);
          setUpdatedAt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RequireMembership>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Meal plan</h1>
          <p className="text-sm text-muted-foreground">
            Your coach can publish a meal plan here. It&apos;s view-only for you.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : title == null && content == null ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Your coach hasn&apos;t published a meal plan yet.
          </Card>
        ) : (
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{title ?? "Meal plan"}</h2>
              {updatedAt && (
                <span className="text-[11px] text-muted-foreground">
                  Updated {format(new Date(updatedAt), "PPp")}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {content ?? ""}
            </pre>
          </Card>
        )}
      </div>
    </RequireMembership>
  );
}
