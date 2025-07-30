import { StorageFactory } from './services/storage/storage-factory';
import type { SSEServiceConfig } from './types';

/**
 * SSE Configuration
 * 
 * Configure SSE storage type using environment variables:
 * - SSE_STORAGE_TYPE: 'redis' | 'json-file' | 'memory-only'
 * - SSE_JSON_FILE_PATH: Path for JSON file storage (optional)
 * - SSE_MAX_EVENTS: Maximum events to store (default: 1000)
 * 
 * @example
 * ```bash
 * # Use Redis (production)
 * SSE_STORAGE_TYPE=redis npm run dev
 * 
 * # Use JSON file (local testing)
 * SSE_STORAGE_TYPE=json-file SSE_JSON_FILE_PATH=./sse-events.json npm run dev
 * 
 * # Use memory-only (simple testing)
 * SSE_STORAGE_TYPE=memory-only npm run dev
 * ```
 */

export function getSSEConfig(): SSEServiceConfig {
  const storageType = process.env.SSE_STORAGE_TYPE ?? 'json-file'; // Changed default to json-file
  const maxEvents = parseInt(process.env.SSE_MAX_EVENTS ?? '1000', 10);

  switch (storageType) {
    case 'redis':
      console.info('SSE: Using Redis storage');
      return StorageFactory.getRedisConfig();

    case 'json-file':
      const filePath = process.env.SSE_JSON_FILE_PATH;
      console.info(`SSE: Using JSON file storage at ${filePath ?? 'default location'}`);
      return StorageFactory.getJsonFileConfig(filePath);

    case 'memory-only':
    default:
      console.info('SSE: Using memory-only storage');
      return {
        ...StorageFactory.getDefaultConfig(),
        storage: {
          ...StorageFactory.getDefaultConfig().storage,
          memoryOnly: {
            enabled: true,
            maxEvents,
          },
        },
      };
  }
}

/**
 * Get storage type for logging/debugging
 */
export function getStorageType(): string {
  return process.env.SSE_STORAGE_TYPE ?? 'json-file';
}

/**
 * Check if Redis is enabled
 */
export function isRedisEnabled(): boolean {
  return getStorageType() === 'redis';
}

/**
 * Check if JSON file storage is enabled
 */
export function isJsonFileEnabled(): boolean {
  return getStorageType() === 'json-file';
}

/**
 * Check if memory-only storage is enabled
 */
export function isMemoryOnlyEnabled(): boolean {
  return getStorageType() === 'memory-only';
} 