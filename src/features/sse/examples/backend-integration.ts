/**
 * Backend Integration Examples
 * 
 * This file demonstrates how to integrate SSE functionality into various backend modules.
 * These examples show the clean API for sending events without managing SSE protocol details.
 */

import { 
  sendNotification, 
  sendReelUploadProgress, 
  sendReelReady, 
  sendUserUpdate, 
  sendSystemAlert, 
  sendCustomEvent,
  getSSEClientCount,
  getSSEClientCountForUser 
} from '../utils/sse-utils';

// ============================================================================
// Example 1: Webhook Handler Integration
// ============================================================================

export async function handleMuxWebhook(webhookData: any) {
  const { type, data } = webhookData;
  const userId = data.user_id || 'unknown';

  switch (type) {
    case 'video.upload.created':
      await sendReelUploadProgress(userId, {
        reelId: data.id,
        progress: 0,
        status: 'uploading',
        message: 'Upload started'
      });
      break;

    case 'video.upload.asset_created':
      await sendReelUploadProgress(userId, {
        reelId: data.id,
        progress: 50,
        status: 'processing',
        message: 'Video processing started'
      });
      break;

    case 'video.asset.ready':
      await sendReelReady(userId, {
        reelId: data.id,
        playbackUrl: data.playback_url,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration
      });
      break;

    case 'video.upload.errored':
      await sendReelUploadProgress(userId, {
        reelId: data.id,
        progress: 0,
        status: 'error',
        message: 'Upload failed'
      });
      break;
  }
}

// ============================================================================
// Example 2: Background Job Integration
// ============================================================================

export async function processUserDataJob(userId: string, jobData: any) {
  try {
    // Start processing
    await sendNotification(userId, {
      title: 'Processing Started',
      message: 'Your data is being processed',
      type: 'info'
    });

    // Simulate processing steps
    await simulateProcessingStep(userId, 'Validating data...', 20);
    await simulateProcessingStep(userId, 'Processing records...', 50);
    await simulateProcessingStep(userId, 'Generating reports...', 80);
    await simulateProcessingStep(userId, 'Finalizing...', 100);

    // Success notification
    await sendNotification(userId, {
      title: 'Processing Complete',
      message: 'Your data has been processed successfully',
      type: 'success',
      actionUrl: `/reports/${jobData.reportId}`
    });

  } catch (error) {
    // Error notification
    await sendNotification(userId, {
      title: 'Processing Failed',
      message: 'There was an error processing your data',
      type: 'error'
    });
  }
}

async function simulateProcessingStep(userId: string, message: string, progress: number) {
  await sendCustomEvent(userId, 'processing_progress', {
    message,
    progress,
    timestamp: Date.now()
  });
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// ============================================================================
// Example 3: User Management Integration
// ============================================================================

export async function handleUserProfileUpdate(userId: string, profileData: any) {
  // Update user profile in database
  // ... database operations ...

  // Send user update notification
  await sendUserUpdate(userId, {
    type: 'profile',
    data: {
      updatedFields: Object.keys(profileData),
      timestamp: Date.now()
    }
  });

  // Send success notification
  await sendNotification(userId, {
    title: 'Profile Updated',
    message: 'Your profile has been updated successfully',
    type: 'success'
  });
}

export async function handleUserSubscriptionChange(userId: string, subscriptionData: any) {
  // Update subscription in database
  // ... database operations ...

  // Send subscription update
  await sendUserUpdate(userId, {
    type: 'subscription',
    data: {
      plan: subscriptionData.plan,
      status: subscriptionData.status,
      nextBilling: subscriptionData.nextBilling
    }
  });

  // Send appropriate notification
  const notificationType = subscriptionData.status === 'active' ? 'success' : 'warning';
  await sendNotification(userId, {
    title: 'Subscription Updated',
    message: `Your subscription is now ${subscriptionData.status}`,
    type: notificationType
  });
}

// ============================================================================
// Example 4: System Maintenance Integration
// ============================================================================

export async function scheduleSystemMaintenance(maintenanceData: any) {
  const { message, scheduledTime, duration } = maintenanceData;

  // Send immediate alert
  await sendSystemAlert('user123', {
    message: `Scheduled maintenance: ${message}`,
    type: 'maintenance',
    duration: duration
  });

  // Schedule follow-up notifications
  setTimeout(async () => {
    await sendSystemAlert('user123', {
      message: 'Maintenance starting in 5 minutes',
      type: 'warning',
      duration: 300000 // 5 minutes
    });
  }, scheduledTime - Date.now() - 300000);

  setTimeout(async () => {
    await sendSystemAlert('user123', {
      message: 'Maintenance in progress',
      type: 'info',
      duration: duration
    });
  }, scheduledTime - Date.now());
}

// ============================================================================
// Example 5: Analytics and Monitoring
// ============================================================================

export async function logSSEUsage() {
  const totalClients = getSSEClientCount();
  const activeUsers = await getActiveUserCount();

  console.log(`SSE Usage Stats:
    - Total connected clients: ${totalClients}
    - Active users: ${activeUsers}
    - Average clients per user: ${activeUsers > 0 ? (totalClients / activeUsers).toFixed(2) : 0}
  `);

  // Send system alert if too many connections
  if (totalClients > 1000) {
    await sendSystemAlert('user123', {
      message: 'High SSE connection count detected',
      type: 'warning'
    });
  }
}

async function getActiveUserCount(): Promise<number> {
  // This would typically query your database
  // For demo purposes, return a mock value
  return 150;
}

// ============================================================================
// Example 6: Custom Event Integration
// ============================================================================

export async function handleCustomBusinessEvent(userId: string, eventData: any) {
  const { eventType, businessData } = eventData;

  switch (eventType) {
    case 'new_follower':
      await sendCustomEvent(userId, 'social_update', {
        type: 'new_follower',
        follower: businessData.follower,
        timestamp: Date.now()
      });
      break;

    case 'content_liked':
      await sendCustomEvent(userId, 'social_update', {
        type: 'content_liked',
        contentId: businessData.contentId,
        liker: businessData.liker,
        timestamp: Date.now()
      });
      break;

    case 'achievement_unlocked':
      await sendCustomEvent(userId, 'achievement', {
        achievementId: businessData.achievementId,
        title: businessData.title,
        description: businessData.description,
        timestamp: Date.now()
      });
      break;

    default:
      // Send generic custom event
      await sendCustomEvent(userId, eventType, businessData);
  }
}

// ============================================================================
// Example 7: Error Handling and Logging
// ============================================================================

export async function sendErrorNotification(userId: string, error: Error, context: string) {
  try {
    await sendNotification(userId, {
      title: 'System Error',
      message: `An error occurred: ${error.message}`,
      type: 'error'
    });

    // Log error for monitoring
    console.error(`SSE Error Notification sent to user ${userId}:`, {
      error: error.message,
      context,
      timestamp: Date.now()
    });

  } catch (sseError) {
    // Fallback logging if SSE fails
    console.error('Failed to send SSE error notification:', sseError);
    console.error('Original error:', error);
  }
}

// ============================================================================
// Example 8: Batch Operations
// ============================================================================

export async function sendBatchNotifications(userIds: string[], notification: any) {
  const promises = userIds.map(userId => 
    sendNotification(userId, notification)
  );

  try {
    await Promise.all(promises);
    console.log(`Sent batch notification to ${userIds.length} users`);
  } catch (error) {
    console.error('Batch notification failed:', error);
    
    // Fallback: send individually
    for (const userId of userIds) {
      try {
        await sendNotification(userId, notification);
      } catch (individualError) {
        console.error(`Failed to send notification to ${userId}:`, individualError);
      }
    }
  }
}

// ============================================================================
// Example 9: Conditional Notifications
// ============================================================================

export async function sendConditionalNotification(userId: string, condition: boolean, notification: any) {
  if (condition) {
    await sendNotification(userId, notification);
  }
}

export async function sendNotificationBasedOnUserStatus(userId: string, userStatus: string) {
  const notifications = {
    'premium': {
      title: 'Premium Feature Available',
      message: 'You have access to premium features',
      type: 'success' as const
    },
    'basic': {
      title: 'Upgrade Available',
      message: 'Upgrade to premium for more features',
      type: 'info' as const
    },
    'trial': {
      title: 'Trial Ending Soon',
      message: 'Your trial expires in 3 days',
      type: 'warning' as const
    }
  };

  const notification = notifications[userStatus as keyof typeof notifications];
  if (notification) {
    await sendNotification(userId, notification);
  }
} 