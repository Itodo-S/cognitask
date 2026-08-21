"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { AiWsEvent } from "@/types";

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001") + "/ws";

type WsEventHandler = (event: string, payload: unknown) => void;

export function useWebSocket(onEvent?: WsEventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<WsEventHandler>>(new Set());
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (onEvent) handlersRef.current.add(onEvent);
    return () => {
      if (onEvent) handlersRef.current.delete(onEvent);
    };
  }, [onEvent]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: AiWsEvent = JSON.parse(event.data);
          handlersRef.current.forEach((handler) => handler(data.event, data.payload));
        } catch {  }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimerRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
