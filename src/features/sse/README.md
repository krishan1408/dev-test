# Server-Sent Events (SSE) Feature

A comprehensive Server-Sent Events implementation for real-time, server-to-client notifications across the application.

## Overview

This SSE feature provides:

- **Centralized SSE Manager**: Tracks active client connections and handles event dispatching
- **Redis Integration**: Distributed messaging across multiple server instances
- **React Hooks**: Easy client-side integration with automatic reconnection
- **React Components**: Pre-built notification components
- **Utility Functions**: Clean API for backend modules to send events
- **Connection Lifecycle Management**: Automatic cleanup and error handling
- **Heartbeat System**: Keeps connections alive and detects disconnections

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   SSE Service   │    │   Redis Pub/Sub │
│                 │    │                 │    │                 │
│  useSSE Hook    │◄──►│  SSEManager     │◄──►│  Event Channel  │
│  Components     │    │  SSEService     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   API Routes    │
                       │   /api/sse      │
                       └─────────────────┘
```

## Quick Start

### 1. Server-Side Usage

```typescript
import { sendNotification, sendReelUploadProgress } from '@/features/sse';

// Send a notification to a user
await sendNotification('user123', {
  title: 'New Message',
  message: 'You have a new message from John',
  type: 'info',
  actionUrl: '/messages'
});

// Send reel upload progress
await sendReelUploadProgress('user123', {
  reelId: 'reel_456',
  progress: 75,
  status: 'processing',
  message: 'Processing your video...'
});

// Send system alert to all users
await sendSystemAlert({
  message: 'System maintenance in 5 minutes',
  type: 'warning',
  duration: 300000
});
```

### 2. Client-Side Usage

```typescript
import { useSSE, SSENotifications } from '@/features/sse';

// Using the hook
function MyComponent() {
  const { isConnected, lastEvent, error } = useSSE({
    userId: 'user123',
    events: ['notification', 'reel_upload_progress'],
    onMessage: (event) => {
      console.log('Received SSE event:', event);
    }
  });

  return (
    <div>
      <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {error && <p>Error: {error}</p>}
      {lastEvent && <p>Last event: {lastEvent.event}</p>}
    </div>
  );
}

// Using the notification component
function App() {
  return (
    <div>
      <h1>My App</h1>
      <SSENotifications 
        userId="user123"
        maxNotifications={5}
        autoDismiss={true}
        dismissDelay={5000}
        position="top-right"
      />
    </div>
  );
}
```

## API Reference

### Server-Side Utilities

#### `sendNotification(userId, notification)`
Sends a notification to a specific user.

```typescript
await sendNotification('user123', {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
});
```

#### `sendReelUploadProgress(userId, progress)`
Sends reel upload progress updates.

```typescript
await sendReelUploadProgress('user123', {
  reelId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  message?: string;
});
```

#### `sendReelReady(userId, reelData)`
Sends notification when a reel is ready for playback.

```typescript
await sendReelReady('user123', {
  reelId: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  duration?: number;
});
```

#### `sendUserUpdate(userId, update)`
Sends user-related updates.

```typescript
await sendUserUpdate('user123', {
  type: 'profile' | 'settings' | 'subscription';
  data: unknown;
});
```

#### `sendSystemAlert(alert)`
Sends system alerts to all connected users.

```typescript
await sendSystemAlert({
  message: string;
  type: 'info' | 'warning' | 'maintenance';
  duration?: number;
});
```

#### `sendCustomEvent(userId, eventType, data)`
Sends custom events to a user.

```typescript
await sendCustomEvent('user123', 'custom_event', { customData: 'value' });
```

### Client-Side Hook

#### `useSSE(options)`
React hook for connecting to SSE streams.

```typescript
const { isConnected, isConnecting, error, connect, disconnect, lastEvent } = useSSE({
  userId?: string;
  sessionId?: string;
  events?: string[];
  retryTimeout?: number;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
});
```

### React Components

#### `SSENotifications`
Pre-built notification component with auto-dismiss and positioning.

```typescript
<SSENotifications 
  userId?: string;
  sessionId?: string;
  maxNotifications?: number;
  autoDismiss?: boolean;
  dismissDelay?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
/>
```

## Configuration

### SSE Manager Configuration

```typescript
import { SSEManager } from '@/features/sse';

const sseManager = new SSEManager({
  heartbeatInterval: 30000,      // 30 seconds
  maxClientsPerUser: 5,          // Max connections per user
  cleanupInterval: 60000,        // 1 minute
  eventRetentionTime: 300000,    // 5 minutes
});
```

### Environment Variables

The SSE feature uses Redis for distributed messaging. Ensure these environment variables are set:

```env
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Event Types

The SSE system supports these predefined event types:

- `notification` - User notifications
- `user_update` - User profile/settings updates
- `reel_upload_progress` - Video upload progress
- `reel_ready` - Video processing complete
- `system_alert` - System-wide alerts
- `heartbeat` - Connection keep-alive

## Connection Management

### Automatic Features

- **Heartbeat**: Sends ping messages every 30 seconds to keep connections alive
- **Auto-reconnection**: Clients automatically reconnect on connection loss
- **Cleanup**: Removes stale connections and enforces connection limits
- **Error Handling**: Graceful handling of connection errors and timeouts

### Manual Control

```typescript
import { getSSEService } from '@/features/sse';

// Get service instance
const sseService = getSSEService();

// Get connection statistics
const totalClients = sseService.getClientCount();
const userClients = sseService.getClientCountForUser('user123');

// Cleanup (usually not needed - automatic)
sseService.destroy();
```

## Integration Examples

### Webhook Integration

```typescript
// In your webhook handler
import { sendReelUploadProgress, sendReelReady } from '@/features/sse';

export async function POST(request: NextRequest) {
  const event = await parseWebhookEvent(request);
  
  switch (event.type) {
    case 'video.upload.progress':
      await sendReelUploadProgress(event.userId, {
        reelId: event.reelId,
        progress: event.progress,
        status: 'uploading'
      });
      break;
      
    case 'video.asset.ready':
      await sendReelReady(event.userId, {
        reelId: event.reelId,
        playbackUrl: event.playbackUrl,
        thumbnailUrl: event.thumbnailUrl
      });
      break;
  }
}
```

### Background Job Integration

```typescript
// In your background job processor
import { sendNotification } from '@/features/sse';

export async function processUserData(userId: string) {
  try {
    // Process user data...
    
    await sendNotification(userId, {
      title: 'Processing Complete',
      message: 'Your data has been processed successfully',
      type: 'success'
    });
  } catch (error) {
    await sendNotification(userId, {
      title: 'Processing Failed',
      message: 'There was an error processing your data',
      type: 'error'
    });
  }
}
```

## Testing

Run the SSE tests:

```bash
npm test src/features/sse/__tests__/sse-service.test.ts
```

## Performance Considerations

- **Connection Limits**: Default max 5 connections per user to prevent abuse
- **Heartbeat Optimization**: 30-second intervals balance responsiveness and overhead
- **Redis Integration**: Enables horizontal scaling across multiple server instances
- **Memory Management**: Automatic cleanup of disconnected clients
- **Error Recovery**: Graceful handling of network issues and timeouts

## Troubleshooting

### Common Issues

1. **Connection Drops**: Check network stability and server load
2. **Redis Errors**: Verify Redis connection and credentials
3. **Memory Leaks**: Ensure proper cleanup in long-running processes
4. **Event Not Received**: Check event type filtering and user authentication

### Debug Mode

Enable debug logging by setting the log level:

```typescript
// In your environment
NODE_ENV=development
```

## Security Considerations

- **Authentication**: SSE connections require valid user sessions
- **Rate Limiting**: Consider implementing rate limits on SSE connections
- **Event Validation**: Validate all event data before sending
- **CORS**: Proper CORS headers are set for cross-origin requests

## Future Enhancements

- [ ] Event persistence and replay
- [ ] Advanced filtering and subscriptions
- [ ] WebSocket fallback support
- [ ] Message queuing for offline users
- [ ] Analytics and monitoring dashboard 