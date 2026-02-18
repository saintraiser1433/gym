// Minimal event bus abstraction for real-time hooks.
// In production you can back this with a dedicated WebSocket server or Pusher/Supabase/etc.

type EventType =
  | "attendance:checkin"
  | "attendance:checkout"
  | "payment:received"
  | "workout:assigned"
  | "schedule:updated"
  | "notification:new";

type Listener = (payload: any) => void;

const listeners = new Map<EventType, Set<Listener>>();

export function subscribe(event: EventType, listener: Listener) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(listener);
  return () => {
    listeners.get(event)?.delete(listener);
  };
}

export function emit(event: EventType, payload: any) {
  const ls = listeners.get(event);
  if (!ls) return;
  for (const l of ls) {
    try {
      l(payload);
    } catch {
      // ignore
    }
  }
}

