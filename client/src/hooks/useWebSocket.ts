import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);

            // Handle different types of real-time updates
            switch (data.type) {
              case 'CONQUEST_RESULT':
                // Invalidate relevant queries to refresh data
                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                queryClient.invalidateQueries({ queryKey: ["/api/conquests/recent"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                break;
              
              case 'TEAM_CREATED':
                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                break;
              
              case 'GAME_STARTED':
              case 'GAME_UPDATED':
                queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
                break;
              
              default:
                console.log("Unknown WebSocket message type:", data.type);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        wsRef.current.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          
          // Attempt to reconnect after a delay if not closed intentionally
          if (event.code !== 1000) {
            setTimeout(() => {
              console.log("Attempting to reconnect WebSocket...");
              connectWebSocket();
            }, 3000);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, []);

  return wsRef.current;
}
