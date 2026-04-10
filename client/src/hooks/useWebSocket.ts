import { useEffect, useRef, useState, useCallback } from 'react';

export type WsMessage = {
  type: string;
  payload: any;
  ts: string;
};

export function useWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  const send = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    function connect() {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => setConnected(true);
      ws.current.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.current.onmessage = (e) => {
        try {
          setLastMessage(JSON.parse(e.data));
        } catch {}
      };
    }

    connect();
    return () => {
      ws.current?.close();
    };
  }, [url]);

  return { connected, lastMessage, send };
}
