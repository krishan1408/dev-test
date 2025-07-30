import { getSSEService } from "@/features/sse";

/**
 * SSE Persistent Storage Management Endpoint
 * 
 * GET: View stored client information
 * DELETE: Clear persistent storage
 */
export async function GET() {
  try {
    const sseService = getSSEService();
    const manager = sseService.getManager();
    
    // Get current client info
    const clientInfo = {
      totalClients: manager.getClientCount(),
      userClients: {}, // Will be populated by the manager's internal methods
      sessionClients: {}, // Will be populated by the manager's internal methods
      timestamp: Date.now(),
    };

    return Response.json(clientInfo);
  } catch (error) {
    console.error('Error getting persistent storage info:', error);
    return Response.json(
      { error: 'Failed to get persistent storage info' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const sseService = getSSEService();
    await sseService.getManager().clearPersistentStorage();
    
    return Response.json({ 
      success: true, 
      message: 'Persistent storage cleared' 
    });
  } catch (error) {
    console.error('Error clearing persistent storage:', error);
    return Response.json(
      { error: 'Failed to clear persistent storage' },
      { status: 500 }
    );
  }
} 