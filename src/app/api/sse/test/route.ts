import { type NextRequest } from "next/server";
import { sendCustomEvent, sendNotification } from "@/features/sse";

interface TestEventBody {
  userId: string;
  event: string;
  data: {
    title?: string;
    message?: string;
    type?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * Test SSE Endpoint
 * 
 * Allows sending test events to demonstrate SSE functionality.
 * This endpoint is for testing purposes only and should not be used in production.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TestEventBody;
    const { userId, event, data } = body;

    if (!userId || !event || !data) {
      return Response.json(
        { error: 'Missing required fields: userId, event, data' },
        { status: 400 }
      );
    }

    // Send the event based on type
    switch (event) {
      case 'notification':
        await sendNotification(userId, {
          title: data.title ?? 'Test Notification',
          message: data.message ?? 'This is a test notification',
          type: (data.type as 'info' | 'success' | 'warning' | 'error') ?? 'info',
          actionUrl: data.actionUrl,
        });
        break;

      case 'test_event':
        await sendCustomEvent(userId, 'test_event', data);
        break;

      default:
        await sendCustomEvent(userId, event, data);
        break;
    }

    return Response.json({ 
      success: true, 
      message: `Event '${event}' sent to user '${userId}'` 
    });

  } catch (error) {
    console.error('Error sending test SSE event:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 