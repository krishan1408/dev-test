import type { SSEClient, SSEEvent, SSEManagerConfig, SSEServiceType } from "../types";
import { JsonFileStorageAdapter } from "./storage/json-file-adapter";

/**
 * Server-Sent Events Manager
 * 
 * Manages SSE client connections, handles event dispatching,
 * and provides utilities for backend modules to send real-time updates.
 * Uses persistent storage to maintain clients across server restarts.
 * 
 * @example
 * ```typescript
 * const sseManager = new SSEManager();
 * 
 * // Send event to specific user
 * sseManager.sendToUser('user123', {
 *   event: 'notification',
 *   data: JSON.stringify({ message: 'New message received' })
 * });
 * 
 * // Broadcast to all clients
 * sseManager.broadcast({
 *   event: 'system_alert',
 *   data: JSON.stringify({ message: 'System maintenance in 5 minutes' })
 * });
 * ```
 */
export class SSEManager implements SSEServiceType {
  private clients = new Map<string, SSEClient>();
  private userClients = new Map<string, Set<string>>();
  private sessionClients = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;
  private clientStorage: JsonFileStorageAdapter;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
      maxClientsPerUser: config.maxClientsPerUser ?? 5,
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
      eventRetentionTime: config.eventRetentionTime ?? 300000, // 5 minutes
    };

    // Initialize persistent client storage
    this.clientStorage = new JsonFileStorageAdapter('./sse-clients.json', 1000);
    
    // Load existing client info (will clear stale data if needed)
    void this.loadClientInfo();
    
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Add a new SSE client connection
   */
  addClient(client: SSEClient): void {
    console.log("SSE Manager - addClient called:", { 
      clientId: client.id, 
      userId: client.userId, 
      sessionId: client.sessionId,
      userIdType: typeof client.userId,
      userIdTruthy: !!client.userId
    });

    // Remove existing client if same ID exists
    this.removeClient(client.id);

    // Add client to main registry
    this.clients.set(client.id, client);
    console.log("SSE Manager - Client added to main registry, total clients:", this.clients.size);

    // Add to user-specific registry
    if (client.userId) {
      console.log("SSE Manager - Adding client to user registry for userId:", client.userId);
      if (!this.userClients.has(client.userId)) {
        console.log("SSE Manager - Creating new user client set for userId:", client.userId);
        this.userClients.set(client.userId, new Set());
      }
      this.userClients.get(client.userId)!.add(client.id);
      console.log("SSE Manager - Client added to user set, user clients count:", this.userClients.get(client.userId)!.size);

      // Enforce max clients per user
      const userClientSet = this.userClients.get(client.userId)!;
      if (userClientSet.size > this.config.maxClientsPerUser) {
        const oldestClientId = userClientSet.values().next().value;
        if (oldestClientId) {
          this.removeClient(oldestClientId);
        }
      }
    } else {
      console.log("SSE Manager - No userId provided, skipping user registry");
    }

    // Add to session-specific registry
    if (client.sessionId) {
      if (!this.sessionClients.has(client.sessionId)) {
        this.sessionClients.set(client.sessionId, new Set());
      }
      this.sessionClients.get(client.sessionId)!.add(client.id);
    }

    // Save client info to persistent storage
    void this.saveClientInfo();

    console.info(`SSE client connected: ${client.id}`, {
      userId: client.userId,
      sessionId: client.sessionId,
      totalClients: this.clients.size,
      userClientsCount: client.userId ? this.userClients.get(client.userId)?.size : 0,
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from main registry
    this.clients.delete(clientId);

    // Remove from user registry
    if (client.userId) {
      const userSet = this.userClients.get(client.userId);
      if (userSet) {
        userSet.delete(clientId);
        if (userSet.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    // Remove from session registry
    if (client.sessionId) {
      const sessionSet = this.sessionClients.get(client.sessionId);
      if (sessionSet) {
        sessionSet.delete(clientId);
        if (sessionSet.size === 0) {
          this.sessionClients.delete(client.sessionId);
        }
      }
    }

    // Mark client as disconnected
    client.isConnected = false;

    // Save client info to persistent storage
    void this.saveClientInfo();

    console.info(`SSE client disconnected: ${clientId}`, {
      totalClients: this.clients.size,
    });
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    console.log("SSE Manager - sendToClient called:", { clientId, event });
    const client = this.clients.get(clientId);
    console.log("SSE Manager - Client found:", client);
    console.log("SSE Manager - Client connected:", client?.isConnected);
    
    if (!client?.isConnected) {
      console.log("SSE Manager - Client not found or not connected:", clientId);
      return false;
    }

    try {
      const eventData = this.formatSSEEvent(event);
      console.log("SSE Manager - Formatted event data:", eventData);
      client.controller.enqueue(new TextEncoder().encode(eventData));
      client.lastPing = Date.now();
      console.log("SSE Manager - Event sent successfully to client:", clientId);
      return true;
    } catch (error) {
      console.error("SSE Manager - Error sending to client:", clientId, error);
      // Handle specific controller errors
      if (error instanceof Error && error.message?.includes('Controller is already closed')) {
        console.debug(`Client ${clientId} controller already closed, removing client`);
      } else {
        console.error(`Failed to send event to client ${clientId}:`, error);
      }
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send an event to all clients of a specific user
   */
  sendToUser(userId: string, event: SSEEvent): void {
    console.log("SSE Manager - sendToUser called:", { userId, event });
    const userClientSet = this.userClients.get(userId);
    console.log("SSE Manager - userClientSet:", userClientSet);
    console.log("SSE Manager - userClientSet size:", userClientSet?.size);
    console.log("SSE Manager - All userClients:", this.userClients);
    
    if (!userClientSet) {
      console.log("SSE Manager - No clients found for user:", userId);
      return;
    }

    const failedClients: string[] = [];
    let successCount = 0;
    
    for (const clientId of userClientSet) {
      console.log("SSE Manager - Sending to client:", clientId);
      if (!this.sendToClient(clientId, event)) {
        console.log("SSE Manager - Failed to send to client:", clientId);
        failedClients.push(clientId);
      } else {
        console.log("SSE Manager - Successfully sent to client:", clientId);
        successCount++;
      }
    }

    console.log("SSE Manager - Send results:", { successCount, failedClients });

    // Clean up failed clients
    failedClients.forEach(clientId => this.removeClient(clientId));
  }

  /**
   * Send an event to all clients of a specific session
   */
  sendToSession(sessionId: string, event: SSEEvent): void {
    const sessionClientSet = this.sessionClients.get(sessionId);
    if (!sessionClientSet) return;

    const failedClients: string[] = [];
    for (const clientId of sessionClientSet) {
      if (!this.sendToClient(clientId, event)) {
        failedClients.push(clientId);
      }
    }

    // Clean up failed clients
    failedClients.forEach(clientId => this.removeClient(clientId));
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: SSEEvent, excludeClientIds: string[] = []): void {
    const failedClients: string[] = [];
    
    for (const [clientId, client] of this.clients) {
      if (excludeClientIds.includes(clientId)) continue;
      
      if (!this.sendToClient(clientId, event)) {
        failedClients.push(clientId);
      }
    }

    // Clean up failed clients
    failedClients.forEach(clientId => this.removeClient(clientId));
  }

  /**
   * Get total number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get client count for a specific user
   */
  getClientCountForUser(userId: string): number {
    return this.userClients.get(userId)?.size ?? 0;
  }

  /**
   * Get client IDs for a specific user
   */
  getUserClients(userId: string): string[] {
    const userSet = this.userClients.get(userId);
    return userSet ? Array.from(userSet) : [];
  }

  /**
   * Send a ping/heartbeat to a specific client
   */
  pingClient(clientId: string): boolean {
    return this.sendToClient(clientId, {
      event: 'heartbeat',
      data: JSON.stringify({ timestamp: Date.now() }),
    });
  }

  /**
   * Clean up disconnected clients and perform maintenance
   */
  cleanup(): void {
    const now = Date.now();
    const disconnectedClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      // Check if client hasn't been pinged recently
      if (now - client.lastPing > this.config.heartbeatInterval * 2) {
        disconnectedClients.push(clientId);
      }
    }

    // Remove disconnected clients
    disconnectedClients.forEach(clientId => this.removeClient(clientId));

    if (disconnectedClients.length > 0) {
      console.info(`SSE cleanup: removed ${disconnectedClients.length} disconnected clients`);
    }
  }

  /**
   * Start heartbeat interval to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: SSEEvent = {
        event: 'heartbeat',
        data: JSON.stringify({ timestamp: Date.now() }),
      };

      this.broadcast(heartbeatEvent);
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup interval to remove stale connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Format SSE event according to SSE specification
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = '';

    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    if (event.event) {
      formatted += `event: ${event.event}\n`;
    }

    if (event.data) {
      formatted += `data: ${event.data}\n`;
    }

    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    formatted += '\n';
    return formatted;
  }

  /**
   * Save client information to persistent storage
   */
  private async saveClientInfo(): Promise<void> {
    try {
      const clientInfo = {
        clients: Array.from(this.clients.entries()).map(([id, client]) => ({
          id,
          userId: client.userId,
          sessionId: client.sessionId,
          lastPing: client.lastPing,
          events: client.events,
          retryTimeout: client.retryTimeout,
        })),
        userClients: Object.fromEntries(
          Array.from(this.userClients.entries()).map(([userId, clientSet]) => [
            userId,
            Array.from(clientSet)
          ])
        ),
        sessionClients: Object.fromEntries(
          Array.from(this.sessionClients.entries()).map(([sessionId, clientSet]) => [
            sessionId,
            Array.from(clientSet)
          ])
        ),
        timestamp: Date.now(),
      };

      await this.clientStorage.publish('client_info', JSON.stringify(clientInfo));
      console.log('SSE Manager - Client info saved to persistent storage');
    } catch (error) {
      console.error('SSE Manager - Failed to save client info:', error);
    }
  }

  /**
   * Load client information from persistent storage
   */
  private async loadClientInfo(): Promise<void> {
    try {
      const events = await this.clientStorage.getChannelEvents('client_info', 1);
      if (events.length > 0 && events[0]?.message) {
        const clientInfo = JSON.parse(events[0].message) as Record<string, unknown>;
        console.log('SSE Manager - Loading client info from persistent storage:', clientInfo);
        
        // Since we can't restore actual client connections after server restart,
        // we should just clear the persistent storage and start fresh
        console.log('SSE Manager - Clearing persistent storage to start fresh');
        await this.clearPersistentStorage();
        
        console.log('SSE Manager - Ready for new connections');
      }
    } catch (error) {
      console.error('SSE Manager - Failed to load client info:', error);
      // Clear storage on error to ensure clean state
      await this.clearPersistentStorage();
    }
  }

  /**
   * Clear all client information from persistent storage
   */
  async clearPersistentStorage(): Promise<void> {
    try {
      await this.clientStorage.clearEvents();
      console.log('SSE Manager - Cleared persistent client storage');
    } catch (error) {
      console.error('SSE Manager - Failed to clear persistent storage:', error);
    }
  }

  /**
   * Cleanup resources when shutting down
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Save final client state
    void this.saveClientInfo();

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.controller.close();
      } catch (error) {
        console.error(`Error closing client ${clientId}:`, error);
      }
    }

    this.clients.clear();
    this.userClients.clear();
    this.sessionClients.clear();

    console.info('SSE Manager destroyed');
  }
} 