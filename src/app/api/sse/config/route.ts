import { getStorageType, getSSEConfig } from "@/features/sse";

/**
 * SSE Configuration Endpoint
 * 
 * Returns the current SSE storage configuration and environment variables.
 * This endpoint is for debugging and monitoring purposes.
 */
export async function GET() {
  try {
    const storageType = getStorageType();
    const config = getSSEConfig();
    
    return Response.json({
      storageType,
      config,
      environment: {
        SSE_STORAGE_TYPE: process.env.SSE_STORAGE_TYPE ?? 'json-file',
        SSE_JSON_FILE_PATH: process.env.SSE_JSON_FILE_PATH ?? './sse-events.json',
        SSE_MAX_EVENTS: process.env.SSE_MAX_EVENTS ?? '1000',
      }
    });
  } catch (error) {
    console.error('Error getting SSE config:', error);
    return Response.json(
      { error: 'Failed to get SSE configuration' },
      { status: 500 }
    );
  }
} 