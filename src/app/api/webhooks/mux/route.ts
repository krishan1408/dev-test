import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { muxWebhookService } from "@/features/mux";
import { sendReelUploadProgress, sendReelReady } from "@/features/sse";

/**
 * Handles incoming Mux webhook events
 * This endpoint processes video-related events from Mux's webhook system
 *
 * @param request The incoming HTTP request from Mux's servers
 * @returns HTTP response indicating success or failure
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const body = await request.text();
    const event = await muxWebhookService.verifyWebhookEvent(body, headersList);

    switch (event.type) {
      // Upload-related events
      case "video.upload.created":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send initial upload progress
        if (event.data?.id) {
          await sendReelUploadProgress('user123', { // TODO: Get actual user ID from event
            reelId: event.data.id,
            progress: 0,
            status: 'uploading',
            message: 'Upload started'
          });
        }
        break;
        
      case "video.upload.asset_created":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send processing progress
        if (event.data?.id) {
          await sendReelUploadProgress('user123', { // TODO: Get actual user ID from event
            reelId: event.data.id,
            progress: 50,
            status: 'processing',
            message: 'Video processing started'
          });
        }
        break;
        
      case "video.upload.cancelled":
      case "video.upload.errored":
        console.info(`Upload event: ${event.type}`, event.data);
        // Send error notification
        if (event.data?.id) {
          await sendReelUploadProgress('user123', { // TODO: Get actual user ID from event
            reelId: event.data.id,
            progress: 0,
            status: 'error',
            message: `Upload ${event.type.includes('cancelled') ? 'cancelled' : 'failed'}`
          });
        }
        break;

      // Asset-related events
      case "video.asset.created":
      case "video.asset.updated":
        console.info(`Asset event: ${event.type}`, event.data);
        break;
        
      case "video.asset.ready":
        console.info(`Asset ready event: ${event.type}`, event.data);
        // Send reel ready notification
        if (event.data?.id) {
          await sendReelReady('user123', { // TODO: Get actual user ID from event
            reelId: event.data.id,
            playbackUrl: '', // TODO: Extract from event.data.playback_ids
            thumbnailUrl: '', // TODO: Extract from event.data
            duration: event.data.duration
          });
        }
        break;

      case "video.asset.deleted":
      case "video.asset.errored":
        // TODO: Handle asset problems
        console.info(`Asset issue event: ${event.type}`, event.data);
        break;

      // For any unhandled event types
      default:
        console.warn(`Unhandled webhook type: ${event.type}`, event.data);
        break;
    }

    return Response.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error processing Mux webhook:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
