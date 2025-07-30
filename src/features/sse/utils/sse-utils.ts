import { getSSEService } from "../index";

/**
 * Send a notification to a specific user
 */
export async function sendNotification(
  userId: string,
  notification: {
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    actionUrl?: string;
  }
): Promise<void> {
  const sseService = getSSEService();
  await sseService.sendNotification(userId, notification);
}

/**
 * Send reel upload progress updates
 */
export async function sendReelUploadProgress(
  userId: string,
  progress: {
    reelId: string;
    progress: number;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    message?: string;
  }
): Promise<void> {
  const sseService = getSSEService();
  await sseService.sendReelUploadProgress(userId, progress);
}

/**
 * Send reel ready notification
 */
export async function sendReelReady(
  userId: string,
  reelData: {
    reelId: string;
    playbackUrl: string;
    thumbnailUrl?: string;
    duration?: number;
  }
): Promise<void> {
  const sseService = getSSEService();
  await sseService.sendReelReady(userId, reelData);
}

/**
 * Send user update event
 */
export async function sendUserUpdate(
  userId: string,
  update: {
    type: 'profile' | 'settings' | 'subscription';
    data: unknown;
  }
): Promise<void> {
  const sseService = getSSEService();
  await sseService.sendUserUpdate(userId, update);
}

/**
 * Send system alert to all users
 */
export async function sendSystemAlert(userId: string, alert: {
  message: string;
  type: 'info' | 'warning' | 'maintenance';
  duration?: number;
}): Promise<boolean> {
  const sseService = getSSEService();
  return await sseService.sendSystemAlert(userId, alert);
}

/**
 * Send custom event to user
 */
export async function sendCustomEvent(
  userId: string,
  eventType: string,
  data: unknown
): Promise<void> {
  const sseService = getSSEService();
  await sseService.sendCustomEvent(userId, eventType as any, data);
}

/**
 * Get current SSE client count
 */
export function getSSEClientCount(): number {
  const sseService = getSSEService();
  return sseService.getClientCount();
}

/**
 * Get client count for specific user
 */
export function getSSEClientCountForUser(userId: string): number {
  const sseService = getSSEService();
  return sseService.getClientCountForUser(userId);
}

/**
 * Check if Redis is available and working
 */
export async function checkRedisStatus(): Promise<{
  available: boolean;
  error?: string;
  usage?: {
    requests: number;
    limit: number;
    percentage: number;
  };
}> {
  try {
    const sseService = getSSEService();
    const redisService = (sseService as any).redisService;
    
    if (!redisService) {
      return { available: false, error: 'Redis service not initialized' };
    }

    // Try a simple ping to check connectivity
    await redisService.ping();
    
    return { available: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a rate limit error
    if (errorMessage.includes('max requests limit exceeded')) {
      const match = errorMessage.match(/Limit: (\d+), Usage: (\d+)/);
      if (match && match[1] && match[2]) {
        const limit = parseInt(match[1]);
        const usage = parseInt(match[2]);
        return {
          available: false,
          error: 'Redis rate limit exceeded',
          usage: {
            requests: usage,
            limit,
            percentage: Math.round((usage / limit) * 100)
          }
        };
      }
    }
    
    return { available: false, error: errorMessage };
  }
}

/**
 * Get SSE connection statistics
 */
export function getSSEStats(): {
  totalClients: number;
  connectedUsers: number;
  activeSessions: number;
} {
  const sseService = getSSEService();
  const manager = sseService.getManager();
  
  return {
    totalClients: manager.getClientCount(),
    connectedUsers: 0, // TODO: Implement if needed
    activeSessions: 0, // TODO: Implement if needed
  };
} 