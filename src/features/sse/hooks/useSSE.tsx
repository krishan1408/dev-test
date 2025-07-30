"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SSEEvent, SSEConnectionOptions } from '../types';

interface UseSSEOptions extends SSEConnectionOptions {
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseSSEReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  lastEvent: SSEEvent | null;
}

/**
 * React hook for Server-Sent Events
 * 
 * Provides a clean interface for components to connect to SSE streams
 * with automatic reconnection and error handling.
 * 
 * @example
 * ```typescript
 * const { isConnected, lastEvent, error } = useSSE({
 *   userId: 'user123',
 *   events: ['notification', 'reel_upload_progress'],
 *   onMessage: (event) => {
 *     console.log('Received SSE event:', event);
 *   }
 * });
 * ```
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    userId,
    sessionId,
    events = [],
    retryTimeout = 30000,
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Build SSE URL with query parameters
  const buildSSEUrl = useCallback(() => {
    const url = new URL('/api/sse', window.location.origin);
    
    if (userId) {
      url.searchParams.set('userId', userId);
    }
    
    if (sessionId) {
      url.searchParams.set('sessionId', sessionId);
    }
    
    if (events.length > 0) {
      url.searchParams.set('events', events.join(','));
    }
    
    if (retryTimeout) {
      url.searchParams.set('retry', retryTimeout.toString());
    }
    
    return url.toString();
  }, [userId, sessionId, events, retryTimeout]);

  // Parse SSE event from EventSource message
  const parseSSEEvent = useCallback((event: MessageEvent): SSEEvent => {
    const lines = event.data.split('\n');
    const sseEvent: SSEEvent = {
      event: event.type,
      data: '',
    };

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        sseEvent.event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        sseEvent.data = line.slice(6);
      } else if (line.startsWith('id: ')) {
        sseEvent.id = line.slice(4);
      } else if (line.startsWith('retry: ')) {
        sseEvent.retry = parseInt(line.slice(7), 10);
      }
    }

    return sseEvent;
  }, []);

  // Handle SSE connection
  const connect = useCallback(() => {
    // Use refs to check current state instead of state variables
    if (eventSourceRef.current) return; // Already connected

    setIsConnecting(true);
    setError(null);

    try {
      const url = buildSSEUrl();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        console.log('event receiver', event);
        const sseEvent = parseSSEEvent(event);
        setLastEvent(sseEvent);
        onMessage?.(sseEvent);
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        setError('SSE connection error');
        onError?.(event);

        // Auto-reconnect logic
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      // Handle specific event types
      events.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          const sseEvent = parseSSEEvent(event);
          setLastEvent(sseEvent);
          onMessage?.(sseEvent);
        });
      });

    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to SSE');
    }
  }, [
    buildSSEUrl,
    parseSSEEvent,
    events,
    onMessage,
    onError,
    onOpen,
    autoReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = 0;
    onClose?.();
  }, [onClose]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array - only run on unmount

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    lastEvent,
  };
} 