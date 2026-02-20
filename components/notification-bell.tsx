"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const PAYMENT_NOTIFICATION_TYPES = [
  "PAYMENT_REJECTED",
  "MEMBERSHIP_APPROVED",
  "RENEWAL_APPROVED",
  "MEMBERSHIP_APPLICATION",
  "RENEWAL_APPLICATION",
  "MEMBERSHIP_EXPIRED",
];

type NotificationBellProps = {
  /** e.g. /client/payments or /admin/payments – notifications become clickable and go here */
  paymentsHref?: string;
};

const POLL_INTERVAL_MS = 30_000; // 30 seconds

function fetchNotifications(): Promise<Notification[]> {
  return fetch("/api/notifications", { cache: "no-store" })
    .then((res) => res.json())
    .then((json) => (Array.isArray(json.data) ? json.data : []));
}

export function NotificationBell({ paymentsHref }: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // Load count on mount and poll so badge updates in realtime
  React.useEffect(() => {
    let cancelled = false;
    function load() {
      fetchNotifications().then((data) => {
        if (!cancelled) setNotifications(data);
      });
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // When panel opens, refetch in background so list stays fresh (no loading flash)
  React.useEffect(() => {
    if (!open) return;
    fetchNotifications().then((data) => setNotifications(data));
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 max-h-[min(24rem,70vh)] overflow-hidden rounded-md border bg-popover shadow-lg flex flex-col">
            <div className="border-b px-3 py-2 text-sm font-medium bg-muted/50">
              Notifications
            </div>
            <div className="overflow-y-auto p-1">
              {notifications.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {notifications.map((n) => {
                    const isPaymentRelated =
                      paymentsHref &&
                      PAYMENT_NOTIFICATION_TYPES.includes(n.type);
                    const content = (
                      <>
                        <p className="font-medium text-foreground">{n.title}</p>
                        <p className="mt-0.5 text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </>
                    );
                    const handleClick = () => {
                      if (!n.read) markAsRead(n.id);
                      setOpen(false);
                    };
                    return (
                      <li key={n.id}>
                        {isPaymentRelated ? (
                          <Link
                            href={paymentsHref}
                            onClick={handleClick}
                            className={`block rounded-md px-2 py-2 text-xs transition-colors hover:bg-accent ${
                              !n.read ? "bg-primary/5" : ""
                            }`}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={handleClick}
                            className={`w-full rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-accent ${
                              !n.read ? "bg-primary/5" : ""
                            }`}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

