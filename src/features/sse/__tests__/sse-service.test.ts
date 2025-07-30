import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SSEManager } from '../services/sse-manager';
import { SSEService } from '../services/sse-service';
import type { SSEClient, SSEEvent } from '../types';

// Mock ReadableStream and controller
const mockController = {
  enqueue: vi.fn(),
  close: vi.fn(),
} as unknown as ReadableStreamDefaultController;

const mockResponse = new Response();

describe('SSEManager', () => {
  let sseManager: SSEManager;

  beforeEach(() => {
    sseManager = new SSEManager();
  });

  afterEach(() => {
    sseManager.destroy();
  });

  it('should add and remove clients', () => {
    const client: SSEClient = {
      id: 'test-client-1',
      userId: 'user123',
      sessionId: 'session456',
      response: mockResponse,
      controller: mockController as any,
      lastPing: Date.now(),
      isConnected: true,
    };

    sseManager.addClient(client);
    expect(sseManager.getClientCount()).toBe(1);
    expect(sseManager.getClientCountForUser('user123')).toBe(1);

    sseManager.removeClient('test-client-1');
    expect(sseManager.getClientCount()).toBe(0);
    expect(sseManager.getClientCountForUser('user123')).toBe(0);
  });

  it('should send events to specific clients', () => {
    const client: SSEClient = {
      id: 'test-client-1',
      userId: 'user123',
      response: mockResponse,
      controller: mockController as any,
      lastPing: Date.now(),
      isConnected: true,
    };

    sseManager.addClient(client);

    const event: SSEEvent = {
      event: 'notification',
      data: JSON.stringify({ message: 'Test notification' }),
    };

    const result = sseManager.sendToClient('test-client-1', event);
    expect(result).toBe(true);
    expect(mockController.enqueue).toHaveBeenCalled();
  });

  it('should send events to all clients of a user', () => {
    const client1: SSEClient = {
      id: 'test-client-1',
      userId: 'user123',
      response: mockResponse,
      controller: mockController as any,
      lastPing: Date.now(),
      isConnected: true,
    };

    const client2: SSEClient = {
      id: 'test-client-2',
      userId: 'user123',
      response: mockResponse,
      controller: mockController as any,
      lastPing: Date.now(),
      isConnected: true,
    };

    sseManager.addClient(client1);
    sseManager.addClient(client2);

    const event: SSEEvent = {
      event: 'notification',
      data: JSON.stringify({ message: 'Test notification' }),
    };

    sseManager.sendToUser('user123', event);
    expect(mockController.enqueue).toHaveBeenCalledTimes(2);
  });

  it('should enforce max clients per user', () => {
    const maxClients = 2;
    const sseManagerWithLimit = new SSEManager({ maxClientsPerUser: maxClients });

    // Add more clients than the limit
    for (let i = 0; i < maxClients + 2; i++) {
      const client: SSEClient = {
        id: `test-client-${i}`,
        userId: 'user123',
        response: mockResponse,
        controller: mockController as any,
        lastPing: Date.now(),
        isConnected: true,
      };
      sseManagerWithLimit.addClient(client);
    }

    expect(sseManagerWithLimit.getClientCountForUser('user123')).toBe(maxClients);
    sseManagerWithLimit.destroy();
  });
});

describe('SSEService', () => {
  let sseService: SSEService;

  beforeEach(() => {
    sseService = new SSEService();
  });

  afterEach(() => {
    sseService.destroy();
  });

  it('should send notifications', async () => {
    const sendToUserSpy = vi.spyOn(sseService.getManager(), 'sendToUser');

    await sseService.sendNotification('user123', {
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'info',
    });

    expect(sendToUserSpy).toHaveBeenCalledWith('user123', expect.objectContaining({
      event: 'notification',
      data: expect.stringContaining('Test Notification'),
    }));
  });

  it('should send reel upload progress', async () => {
    const sendToUserSpy = vi.spyOn(sseService.getManager(), 'sendToUser');

    await sseService.sendReelUploadProgress('user123', {
      reelId: 'reel123',
      progress: 75,
      status: 'processing',
      message: 'Processing video...',
    });

    expect(sendToUserSpy).toHaveBeenCalledWith('user123', expect.objectContaining({
      event: 'reel_upload_progress',
      data: expect.stringContaining('reel123'),
    }));
  });

  it('should send system alerts', async () => {
    const broadcastSpy = vi.spyOn(sseService.getManager(), 'broadcast');

    // Test system alert
    await sseService.sendSystemAlert('user123', {
      message: 'System maintenance in 5 minutes',
      type: 'maintenance',
      duration: 300000,
    });

    expect(broadcastSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: 'system_alert',
      data: expect.stringContaining('System maintenance'),
    }));
  });
}); 