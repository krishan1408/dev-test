// Core SSE components
export { SSEService } from "./services/sse-service";
export { SSEManager } from "./services/sse-manager";

// Storage adapters
export { RedisStorageAdapter } from "./services/storage/redis-adapter";
export { JsonFileStorageAdapter } from "./services/storage/json-file-adapter";
export { MemoryStorageAdapter } from "./services/storage/memory-adapter";
export { StorageFactory } from "./services/storage/storage-factory";

// Configuration
export { getSSEConfig, getStorageType, isRedisEnabled, isJsonFileEnabled, isMemoryOnlyEnabled } from "./config";

// React components and hooks
export { useSSE } from "./hooks/useSSE";
export { SSENotifications } from "./components/SSENotifications";
export { SSEDemo } from "./components/SSEDemo";

// Utilities
export * from "./utils/sse-utils";

// Types
export type * from "./types";

// Import for singleton pattern
import { SSEService } from "./services/sse-service";
import { getSSEConfig } from "./config";

// Singleton pattern for SSE service
let sseServiceInstance: SSEService | null = null;

export function getSSEService(): SSEService {
  if (!sseServiceInstance) {
    const config = getSSEConfig();
    sseServiceInstance = new SSEService(config);
  }
  return sseServiceInstance;
}

export function cleanupSSEService(): void {
  if (sseServiceInstance) {
    sseServiceInstance.destroy();
    sseServiceInstance = null;
  }
} 