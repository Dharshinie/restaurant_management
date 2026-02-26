import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_EVENTS } from "@shared/schema";
import { api } from "@shared/routes";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log("[WS] Connected");
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log("[WS] Disconnected, reconnecting...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case WS_EVENTS.ORDER_UPDATED:
              queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
              queryClient.invalidateQueries({ queryKey: [api.orderItems.listPending.path] });
              break;
            case WS_EVENTS.ITEM_STATUS_CHANGED:
              queryClient.invalidateQueries({ queryKey: [api.orderItems.listPending.path] });
              queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
              break;
            case WS_EVENTS.TABLE_STATUS_CHANGED:
              queryClient.invalidateQueries({ queryKey: [api.tables.list.path] });
              break;
          }
        } catch (err) {
          console.error("[WS] Parse error", err);
        }
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  return { isConnected };
}
