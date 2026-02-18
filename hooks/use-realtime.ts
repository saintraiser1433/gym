"use client";

import { useEffect } from "react";
import { subscribe } from "@/lib/websocket";

type EventType =
  | "attendance:checkin"
  | "attendance:checkout"
  | "payment:received"
  | "workout:assigned"
  | "schedule:updated"
  | "notification:new";

export function useRealtime(
  event: EventType,
  handler: (payload: any) => void,
) {
  useEffect(() => {
    const unsubscribe = subscribe(event, handler);
    return () => {
      unsubscribe();
    };
  }, [event, handler]);
}

