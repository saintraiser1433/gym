"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationBellProps = {
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {count}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border bg-popover p-2 text-xs shadow-lg">
          <p className="text-muted-foreground">Notifications panel (hook up to API).</p>
        </div>
      )}
    </div>
  );
}

