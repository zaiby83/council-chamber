import { useEffect, useRef, useState, useCallback } from 'react';

export type WsMessage = {
  type: string;
  payload: any;
  ts: string;
};

export function useWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyed = useRef(false);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  const send = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    destroyed.current = false;

    function connect() {
      if (destroyed.current) return;

      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        if (destroyed.current) { socket.close(); return; }
        setConnected(true);
      };

      socket.onclose = () => {
        if (destroyed.current) return;
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      socket.onmessage = (e) => {
        try { setLastMessage(JSON.parse(e.data)); } catch {}
      };
    }

    connect();

    return () => {
      destroyed.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [url]);

  return { connected, lastMessage, send };
}
