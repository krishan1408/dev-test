import { RedisStorageAdapter } from './redis-adapter';
import { JsonFileStorageAdapter } from './json-file-adapter';
import { MemoryStorageAdapter } from './memory-adapter';
import type { SSEStorageAdapter, SSEServiceConfig } from '../../types';

/**
 * Factory for creating SSE storage adapters
 * 
 * Provides a centralized way to create storage adapters based on configuration.
 * Supports Redis, JSON file, and memory-only storage options.
 */
export class StorageFactory {
  /**
   * Create a storage adapter based on configuration
   */
  static createStorage(config: SSEServiceConfig): SSEStorageAdapter {
    switch (config.storage.type) {
      case 'redis':
        return new RedisStorageAdapter();
      
      case 'json-file':
        return new JsonFileStorageAdapter(
          config.storage.jsonFile?.filePath ?? './sse-events.json',
          config.storage.jsonFile?.maxEvents ?? 1000
        );
      
      case 'memory-only':
        return new MemoryStorageAdapter(
          config.storage.memoryOnly?.maxEvents ?? 1000
        );
      
      default:
        throw new Error(`Unsupported storage type: ${String(config.storage.type)}`);
    }
  }

  /**
   * Get default configuration (memory-only)
   */
  static getDefaultConfig(): SSEServiceConfig {
    return {
      storage: {
        type: 'json-file',
        jsonFile: {
          enabled: true,
          filePath: './sse-events.json',
          maxEvents: 1000,
        },
      },
    };
  }

  /**
   * Get Redis configuration
   */
  static getRedisConfig(): SSEServiceConfig {
    return {
      storage: {
        type: 'redis',
        redis: {
          enabled: true,
          channel: 'sse:events',
        },
      },
    };
  }

  /**
   * Get JSON file configuration
   */
  static getJsonFileConfig(): SSEServiceConfig {
    return {
      storage: {
        type: 'json-file',
        jsonFile: {
          enabled: true,
          filePath: './sse-events.json',
          maxEvents: 1000,
        },
      },
    };
  }
} 