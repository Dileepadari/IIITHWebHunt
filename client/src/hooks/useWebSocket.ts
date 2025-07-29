import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket() {
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Invalidate relevant queries based on the event type
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
            // Refresh all queries for unknown events
            queryClient.invalidateQueries();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      socket.close();
    };
  }, []);
}