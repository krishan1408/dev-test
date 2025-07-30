/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface SSEEventPayload {
  event: string;
  data: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
}

export interface SSEClient {
  id: string;
  userId?: string;
  sessionId?: string;
  controller: ReadableStreamDefaultController;
  isConnected: boolean;
  lastPing: number;
  events: string[];
  retryTimeout: number;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  maxClientsPerUser?: number;
  cleanupInterval?: number;
  eventRetentionTime?: number;
}

export interface SSEServiceType {
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;
  sendToClient(clientId: string, event: SSEEvent): boolean;
  sendToUser(userId: string, event: SSEEvent): void;
  sendToSession(sessionId: string, event: SSEEvent): void;
  broadcast(event: SSEEvent, excludeClientIds?: string[]): void;
  getClientCount(): number;
  getClientCountForUser(userId: string): number;
  pingClient(clientId: string): boolean;
  cleanup(): void;
  destroy(): void;
}

export interface SSEConnectionOptions {
  userId?: string;
  sessionId?: string;
  events?: string[];
  retryTimeout?: number;
}

export type SSEEventType = string;

// New configuration types for storage options
export type SSEStorageType = 'redis' | 'json-file' | 'memory-only';

export interface SSEServiceConfig {
  storage: {
    type: SSEStorageType;
    redis?: {
      enabled: boolean;
      channel?: string;
    };
    jsonFile?: {
      enabled: boolean;
      filePath?: string;
      maxEvents?: number;
    };
    memoryOnly?: {
      enabled: boolean;
      maxEvents?: number;
    };
  };
  manager?: SSEManagerConfig;
}

export interface SSEStorageAdapter {
  publish(channel: string, message: string): Promise<boolean>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  isAvailable(): boolean;
  getStats(): Promise<{
    available: boolean;
    error?: string;
    usage?: {
      requests: number;
      limit: number;
      percentage: number;
    };
  }>;
} 