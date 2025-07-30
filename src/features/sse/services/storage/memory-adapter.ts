import type { SSEStorageAdapter, SSEEvent } from '../../types';

interface StoredEvent {
  id: string;
  channel: string;
  message: string;
  timestamp: number;
}

/**
 * Memory Storage Adapter for SSE
 * 
 * Stores events in memory for simple testing.
 * Events are lost when the server restarts.
 */
export class MemoryStorageAdapter implements SSEStorageAdapter {
  private events: StoredEvent[] = [];
  private maxEvents: number;
  private subscribers = new Map<string, Set<(message: string) => void>>();

  constructor(maxEvents = 1000) {
    this.maxEvents = maxEvents;
  }

  async publish(channel: string, message: string): Promise<boolean> {
    try {
      const event: StoredEvent = {
        id: `${channel}-${Date.now()}-${Math.random()}`,
        channel,
        message,
        timestamp: Date.now(),
      };

      this.events.push(event);

      // Keep only the latest events
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }

      // Notify subscribers
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in subscriber callback:', error);
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to publish to memory storage:', error);
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }

    this.subscribers.get(channel)!.add(callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.subscribers.delete(channel);
  }

  isAvailable(): boolean {
    return true; // Always available for memory storage
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
    try {
      const channels = new Set(this.events.map(e => e.channel));
      const totalSubscribers = Array.from(this.subscribers.values()).reduce((sum, set) => sum + set.size, 0);

      return {
        available: true,
        usage: {
          requests: this.events.length,
          limit: this.maxEvents,
          percentage: Math.round((this.events.length / this.maxEvents) * 100),
        },
      };
    } catch (error) {
      return {
        available: false,
        error: 'Failed to get stats',
      };
    }
  }

  async getChannelEvents(channel: string, limit = 10): Promise<SSEEvent[]> {
    const channelEvents = this.events
      .filter(e => e.channel === channel)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return channelEvents.map(event => ({
      event: event.channel,
      data: event.message,
      id: event.id,
    }));
  }

  async clearEvents(): Promise<void> {
    this.events = [];
  }
} 