import { SSEManager } from "./sse-manager";
import { StorageFactory } from "./storage/storage-factory";
import type {
  SSEServiceType,
  SSEEvent,
  SSEEventType,
  SSEServiceConfig,
  SSEEventPayload,
  SSEStorageAdapter,
} from "../types";

/**
 * Server-Sent Events Service
 *
 * High-level service for managing SSE connections and sending events.
 * Supports configurable storage backends (Redis, JSON file, memory-only).
 *
 * @example
 * ```typescript
 * // Use Redis for production
 * const sseService = new SSEService(StorageFactory.getRedisConfig());
 *
 * // Use JSON file for local testing
 * const sseService = new SSEService(StorageFactory.getJsonFileConfig());
 *
 * // Use memory-only for simple testing
 * const sseService = new SSEService(StorageFactory.getDefaultConfig());
 *
 * // Send events
 * await sseService.sendNotification('user123', { message: 'Hello!' });
 * ```
 */
export class SSEService {
  private sseManager: SSEManager;
  private storageAdapter: SSEStorageAdapter;
  private readonly REDIS_CHANNEL = "sse:events";
  private config: SSEServiceConfig;

  constructor(config?: SSEServiceConfig) {
    this.config = config ?? StorageFactory.getDefaultConfig();
    this.sseManager = new SSEManager(this.config.manager);
    this.storageAdapter = StorageFactory.createStorage(this.config);

    console.info(
      `SSE Service initialized with ${this.config.storage.type} storage`,
    );
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotification(userId: string, data: unknown): Promise<boolean> {
    return this.sendToUser(userId, "notification", data);
  }

  /**
   * Send reel upload progress updates
   */
  async sendReelUploadProgress(
    userId: string,
    data: unknown,
  ): Promise<boolean> {
    return this.sendToUser(userId, "reel_upload_progress", data);
  }

  /**
   * Send reel ready notification
   */
  async sendReelReady(userId: string, data: unknown): Promise<boolean> {
    return this.sendToUser(userId, "reel_ready", data);
  }

  /**
   * Send user update event
   */
  async sendUserUpdate(userId: string, data: unknown): Promise<boolean> {
    return this.sendToUser(userId, "user_update", data);
  }

  /**
   * Send system alert to all users
   */
  async sendSystemAlert(userId: string, data: unknown): Promise<boolean> {
    return this.sendToUser(userId, "system_alert", data);
  }

  /**
   * Send custom event to user
   */
  async sendCustomEvent(
    userId: string,
    eventType: SSEEventType,
    data: unknown,
  ): Promise<boolean> {
    return this.sendToUser(userId, eventType, data);
  }

  /**
   * Send event to specific user with storage distribution
   */
  private async sendToUser(
    userId: string,
    eventType: SSEEventType,
    data: unknown,
  ): Promise<boolean> {
    try {
      const event: SSEEvent = {
        event: eventType,
        data: JSON.stringify({ data, timestamp: Date.now() }),
      };
      
      console.log("SSE Service - sendToUser called:", { userId, eventType, event });
      console.log("SSE Service - Total clients:", this.sseManager.getClientCount());
      console.log("SSE Service - Clients for user:", this.sseManager.getClientCountForUser(userId));
      console.log("SSE Service - User clients:", this.sseManager.getUserClients(userId));
      
      // Send to local SSE manager first
      this.sseManager.sendToUser(userId, event);

      // Try storage adapter for distribution to other server instances (if available)
      if (this.storageAdapter.isAvailable()) {
        try {
          const payload = {
            type: "user_event",
            userId,
            eventType,
            data,
            timestamp: Date.now(),
          };

          await this.storageAdapter.publish(
            this.REDIS_CHANNEL,
            JSON.stringify(payload),
          );
          return true;
        } catch (storageError) {
          console.warn(
            `${this.config.storage.type} publish failed:`,
            storageError,
          );
          // Local SSE manager already sent the event, so we return true
          return true;
        }
      } else {
        console.debug(
          `${this.config.storage.type} not available, using local SSE manager only`,
        );
        return true;
      }
    } catch (error) {
      console.error("Failed to send SSE event to user:", error);
      return false;
    }
  }

  /**
   * Send event to specific session
   */
  async sendToSession(sessionId: string, event: SSEEvent): Promise<void> {
    this.sseManager.sendToSession(sessionId, event);
  }

  /**
   * Broadcast event to all connected clients
   */
  private async broadcast(event: SSEEvent): Promise<void> {
    // Send to local SSE manager
    this.sseManager.broadcast(event);

    // Publish to Redis for other server instances
    if (this.storageAdapter) {
      try {
        const payload: SSEEventPayload = {
          event: event.event,
          data: event.data,
          timestamp: Date.now(),
        };

        await this.storageAdapter.publish(
          this.REDIS_CHANNEL,
          JSON.stringify(payload),
        );
      } catch (error) {
        console.error("Failed to publish SSE broadcast to Redis:", error);
      }
    }
  }

  /**
   * Get SSE manager instance for direct access
   */
  getManager(): SSEManager {
    return this.sseManager;
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.sseManager.getClientCount();
  }

  /**
   * Get client count for specific user
   */
  getClientCountForUser(userId: string): number {
    return this.sseManager.getClientCountForUser(userId);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.sseManager.destroy();
    console.info("SSE Service destroyed");
  }
}
