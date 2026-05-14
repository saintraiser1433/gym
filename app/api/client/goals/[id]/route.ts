import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth";

/**
 * Self-removal of goals is disabled.
 * Goals are managed exclusively by the coach or admin.
 */
export async function DELETE() {
  await requireClient();
  return NextResponse.json(
    {
      error:
        "Clients can no longer remove their own goals. Please contact your coach or the gym admin.",
    },
    { status: 403 },
  );
}
