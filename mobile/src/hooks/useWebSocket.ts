/**
 * TrueReact - WebSocket Hook
 * 
 * Custom hook for managing WebSocket connection to the backend
 * for real-time bidirectional communication during coaching sessions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type UseWebSocketReturn = {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebSocketMessage | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
};

// Configuration
const WS_URL = __DEV__ 
  ? 'ws://localhost:8080/ws/session' 
  : 'wss://truereact-backend-636712945693.us-central1.run.app/ws/session';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(generateClientId());
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    return new Promise((resolve, reject) => {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.log('⏱️ WebSocket connection timeout');
        setIsConnecting(false);
        setError('Connection timeout - please ensure the backend server is running');
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        resolve();
      }, 5000);

      try {
        const url = `${WS_URL}/${clientIdRef.current}`;
        wsRef.current = new WebSocket(url);

        wsRef.current.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('🔌 WebSocket connected');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          reconnectAttempts.current = 0;
          startHeartbeat();
          resolve();
        };

        wsRef.current.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('📴 WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setIsConnecting(false);
          stopHeartbeat();

          // Only attempt reconnection for unexpected closures (not manual disconnect)
          // Don't reconnect if connection was refused (backend not running)
          const isConnectionRefused = event.reason?.includes('refused') || event.code === 1006;
          if (!isConnectionRefused && shouldReconnect.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.current++;
            console.log(`🔄 Reconnecting (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(() => connect(), RECONNECT_DELAY);
          } else if (isConnectionRefused) {
            setError('Backend server is not running. Start the backend to enable real-time features.');
          }
        };

        wsRef.current.onerror = (event) => {
          clearTimeout(connectionTimeout);
          console.log('⚠️ WebSocket error');
          setIsConnecting(false);
          setError('Connection failed - please check your network and try again');
          resolve();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            setLastMessage(message);
            handleMessage(message);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
      } catch (e) {
        setIsConnecting(false);
        setError('Failed to create WebSocket connection');
        reject(e);
      }
    });
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, []);

  const handleMessage = (message: WebSocketMessage) => {
    // Handle specific message types
    switch (message.type) {
      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;
      case 'error':
        setError(message.message || 'Unknown error');
        break;
      default:
        // Other messages are handled by the component via lastMessage
        break;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatInterval.current = setInterval(() => {
      sendMessage({ type: 'heartbeat', timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
  };
}

// Utility function to generate a unique client ID
function generateClientId(): string {
  return 'client_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export default useWebSocket;
