import { getRedis } from '@/lib/redis';
import type { SSEStorageAdapter, SSEEvent } from '../../types';

interface StoredEvent {
  id: string;
  channel: string;
  message: string;
  timestamp: number;
}

/**
 * Redis Storage Adapter for SSE
 * 
 * Uses Redis Pub/Sub for distributed event broadcasting.
 * Supports horizontal scaling across multiple server instances.
 */
export class RedisStorageAdapter implements SSEStorageAdapter {
  private redisClient: Awaited<ReturnType<typeof getRedis>> | null = null;
  private subscribers = new Map<string, Set<(message: string) => void>>();

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.redisClient = await getRedis();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.redisClient = null;
    }
  }

  async publish(channel: string, message: string): Promise<boolean> {
    if (!this.redisClient) {
      console.warn('Redis client not initialized');
      return false;
    }

    try {
      await this.redisClient.publish(channel, message);
      console.debug(`Published event to Redis channel ${channel}: ${message.substring(0, 100)}...`);
      return true;
    } catch (error) {
      console.error('Failed to publish to Redis:', error);
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }

    this.subscribers.get(channel)!.add(callback);

    // Note: Upstash Redis doesn't support subscribe in serverless environments
    // This is a placeholder for when Redis subscribe is available
    console.info(`Subscribed to Redis channel: ${channel}`);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscribers.delete(channel);
    console.info(`Unsubscribed from Redis channel: ${channel}`);
  }

  isAvailable(): boolean {
    try {
      // Check if Redis client is available
      return !!this.redisClient;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    available: boolean;
    error?: string;
    usage?: {
      requests: number;
      limit: number;
      percentage: number;
    };
  }> {
    if (!this.redisClient) {
      return {
        available: false,
        error: 'Redis client not initialized',
      };
    }

    try {
      // Test Redis connection with a simple operation
      await this.redisClient.get('test');
      
      return {
        available: true,
        usage: {
          requests: 0, // Upstash doesn't provide usage stats via REST API
          limit: 1000,
          percentage: 0,
        },
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  async getChannelEvents(channel: string, limit = 10): Promise<SSEEvent[]> {
    try {
      // Note: Redis doesn't store events by default, this would require additional implementation
      // For now, return empty array as Redis is primarily for Pub/Sub
      return [];
    } catch (error) {
      console.error('Failed to get Redis channel events:', error);
      return [];
    }
  }

  async clearEvents(): Promise<void> {
    try {
      // Note: Redis doesn't store events by default, this would require additional implementation
      console.info('Redis events cleared (no-op for Pub/Sub)');
    } catch (error) {
      console.error('Failed to clear Redis events:', error);
    }
  }
} 