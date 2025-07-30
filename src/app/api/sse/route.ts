import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { getSSEService } from "@/features/sse";
import { randomUUID } from "crypto";

/**
 * SSE Connection Endpoint
 * 
 * Establishes Server-Sent Events connections for real-time updates.
 * Supports user-specific and session-specific event filtering.
 * 
 * @param request The incoming HTTP request
 * @returns SSE stream response
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session for authentication
    const session = await auth();
    const userId = session?.user?.id;
    console.log('SSE Route - Session:', session);
    console.log('SSE Route - User ID:', userId);
    console.log('SSE Route - Session user:', session?.user);
    console.log('SSE Route - User ID type:', typeof userId);
    console.log('SSE Route - User ID truthy:', !!userId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') ?? randomUUID();
    const events = searchParams.get('events')?.split(',') ?? [];
    const retryTimeout = parseInt(searchParams.get('retry') ?? '30000');
    const queryUserId = searchParams.get('userId'); // Allow userId from query params as fallback

    console.log('SSE Route - Query params:', { sessionId, events, retryTimeout, queryUserId });

    // Use session userId or fallback to query userId
    const finalUserId = userId ?? queryUserId ?? undefined;
    console.log('SSE Route - Final User ID:', finalUserId);

    // Create unique client ID
    const clientId = randomUUID();

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Create SSE client
        const sseClient = {
          id: clientId,
          userId: finalUserId,
          sessionId,
          controller,
          lastPing: Date.now(),
          isConnected: true,
          events: events,
          retryTimeout: retryTimeout,
        };

        console.log('SSE Route - Creating client:', sseClient);
        console.log('SSE Route - Client userId:', sseClient.userId);
        console.log('SSE Route - Client userId truthy:', !!sseClient.userId);

        // Add client to SSE manager
        const sseService = getSSEService();
        sseService.getManager().addClient(sseClient);

        console.log('SSE Route - Client added, total clients:', sseService.getManager().getClientCount());
        console.log('SSE Route - Clients for user:', sseService.getManager().getClientCountForUser(finalUserId ?? 'undefined'));
        console.log('SSE Route - All userClients after add:', sseService.getManager().getUserClients(finalUserId ?? 'undefined'));

        // Send initial connection event
        const connectionEvent = {
          event: 'connected',
          data: JSON.stringify({
            clientId,
            userId: finalUserId,
            sessionId,
            timestamp: Date.now(),
          }),
        };

        controller.enqueue(
          new TextEncoder().encode(
            `event: ${connectionEvent.event}\ndata: ${connectionEvent.data}\n\n`
          )
        );

        // Track if controller has been closed to prevent double-closing
        let isControllerClosed = false;

        // Handle client disconnect
        const handleDisconnect = () => {
          if (!isControllerClosed) {
            sseService.getManager().removeClient(clientId);
            try {
              controller.close();
              isControllerClosed = true;
            } catch (error) {
              // Controller might already be closed, ignore error
              console.debug('Controller already closed:', error);
            }
          }
        };

        // Listen for connection close events
        request.signal.addEventListener('abort', handleDisconnect);
        request.signal.addEventListener('close', handleDisconnect);
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
    },
  });
} 