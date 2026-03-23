import { useRef, useState, useCallback, useEffect } from 'react';
import { WS_BASE_URL } from '../constants/theme';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketReturn {
    status: WsStatus;
    send: (data: object) => void;
    lastMessage: any | null;
    connect: (sessionId: string) => void;
    disconnect: () => void;
}

/**
 * Managed WebSocket hook with automatic JSON parsing.
 * Tracks status, provides typed send function, and exposes last received message.
 */
export function useWebSocket(onMessage?: (data: any) => void): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<WsStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<any>(null);
    const onMessageRef = useRef(onMessage);

    // Keep the onMessage callback ref up to date without re-connecting
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

    const connect = useCallback((sessionId: string) => {
        // Close any existing connection
        if (wsRef.current) wsRef.current.close();

        setStatus('connecting');
        const ws = new WebSocket(`${WS_BASE_URL}/ws/stream/${sessionId}`);
        wsRef.current = ws;

        ws.onopen = () => setStatus('connected');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
                onMessageRef.current?.(data);
            } catch {
                console.warn('WS: Failed to parse message:', event.data);
            }
        };

        ws.onerror = () => setStatus('error');
        ws.onclose = () => setStatus('disconnected');
    }, []);

    const send = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn('WS: Cannot send — socket not open. Status:', wsRef.current?.readyState);
        }
    }, []);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        setStatus('disconnected');
    }, []);

    // Cleanup on unmount
    useEffect(() => () => { wsRef.current?.close(); }, []);

    return { status, send, lastMessage, connect, disconnect };
}
