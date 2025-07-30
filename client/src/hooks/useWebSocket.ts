import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket() {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const socketRef = useRef<WebSocket | null>(null);

  // Optional: expose readyState for UI
  // const [readyState, setReadyState] = useState<WebSocket['readyState']>(WebSocket.CLOSED);

  const connect = () => {
    // Always clear any previous reconnect timeouts before reconnecting
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up previous socket if exists
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onmessage = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close(1000, 'Reconnecting');
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);

      const socket = new window.WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        // setReadyState(WebSocket.OPEN);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          if (data.type === 'connection') {
            console.log('WebSocket connection confirmed:', data.message);
            return;
          }

          switch (data.type) {
            case 'conquest':
              queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
              queryClient.invalidateQueries({ queryKey: ['/api/conquests'] });
              queryClient.invalidateQueries({ queryKey: ['/api/teams/my-team'] });
              break;
            case 'team_update':
              queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
              queryClient.invalidateQueries({ queryKey: ['/api/teams/my-team'] });
              break;
            case 'game_update':
              queryClient.invalidateQueries({ queryKey: ['/api/game/current'] });
              queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
              break;
            default:
              console.log('Unknown WebSocket event type:', data.type);
              if (data.type !== 'connection') {
                queryClient.invalidateQueries();
              }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        // setReadyState(WebSocket.CLOSED);

        // Only attempt reconnection if it wasn't a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000); // Exponential backoff
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Failed to reconnect to WebSocket after maximum attempts');
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // It's generally best to let onclose handle reconnection logic
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close(1000, 'Component unmounting');
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Optionally export the readyState for UI if needed
