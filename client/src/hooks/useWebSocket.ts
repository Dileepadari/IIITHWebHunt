import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * Which queries each server event invalidates.
 *
 * The previous version listened for "conquest"/"team_update"/"game_update",
 * none of which the server has ever sent - every message fell through to the
 * default branch and invalidated the entire cache, refetching everything on
 * every event.
 */
const INVALIDATIONS: Record<string, string[]> = {
  CONQUEST_RESULT: [
    "/api/teams",
    "/api/teams/my-team",
    "/api/conquests/recent",
    "/api/conquests/my-team",
    "/api/websites",
    "/api/admin/stats",
  ],
  TEAM_CREATED: ["/api/teams", "/api/teams/my-team", "/api/admin/stats"],
  WEBSITES_ADDED: ["/api/websites", "/api/websites/available", "/api/admin/stats"],
  GAME_STARTED: ["/api/game/current", "/api/admin/stats"],
  GAME_PAUSED: ["/api/game/current"],
  GAME_RESUMED: ["/api/game/current"],
  GAME_ENDED: ["/api/game/current", "/api/teams"],
};

const MAX_RECONNECT_ATTEMPTS = 8;

/**
 * Keeps a single live connection for the page.
 *
 * Several components call this hook, so the socket is module-scoped and
 * reference-counted; the old per-component sockets meant every mounted panel
 * opened its own connection and received its own copy of every broadcast.
 */
let sharedSocket: WebSocket | null = null;
let subscribers = 0;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;
let intentionallyClosed = false;

function handleMessage(event: MessageEvent) {
  let data: { type?: string };
  try {
    data = JSON.parse(event.data);
  } catch {
    return;
  }

  if (!data.type || data.type === "CONNECTED") return;

  const keys = INVALIDATIONS[data.type];
  if (!keys) return;

  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

function openSocket() {
  if (sharedSocket && (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  sharedSocket = socket;

  socket.onopen = () => {
    reconnectAttempts = 0;
    // A dropped connection means we missed events; resync rather than trusting
    // whatever the cache held while we were offline.
    queryClient.invalidateQueries();
  };

  socket.onmessage = handleMessage;

  socket.onclose = () => {
    sharedSocket = null;
    if (intentionallyClosed || subscribers === 0) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

    const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
    reconnectAttempts++;
    reconnectTimer = window.setTimeout(openSocket, delay);
  };

  socket.onerror = () => {
    // Reconnection is driven entirely from onclose, which always follows.
  };
}

export function useWebSocket(): void {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;
    subscribers++;
    intentionallyClosed = false;
    openSocket();

    return () => {
      subscribed.current = false;
      subscribers--;
      if (subscribers > 0) return;

      intentionallyClosed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      sharedSocket?.close(1000, "No subscribers");
      sharedSocket = null;
    };
  }, []);
}
