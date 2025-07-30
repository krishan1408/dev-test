import { auth } from "@/features/auth/handlers";
import { SSEDemo } from "@/features/sse";
import Link from "next/link";

/**
 * SSE Demo Page
 * 
 * Demonstrates the Server-Sent Events functionality with:
 * - Real-time connection status
 * - Test buttons to send events
 * - Live display of received messages
 * - Event history tracking
 */
export default async function SSEDemoPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600">
            Please log in to access the SSE demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">SSE Demo</span>
          </nav>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Server-Sent Events Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This page demonstrates the SSE functionality with real-time event streaming.
            Connect to the SSE endpoint and send test events to see them appear instantly.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Connected as: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{userId}</span>
          </p>
        </div>

        <SSEDemo userId={userId} />

        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">How it works</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>1. Connection:</strong> The page automatically connects to the SSE endpoint at{' '}
                <code className="bg-gray-100 px-1 rounded">/api/sse</code>
              </p>
              <p>
                <strong>2. Event Sending:</strong> Click the test buttons to send events to the server
              </p>
              <p>
                <strong>3. Real-time Display:</strong> Events are received instantly and displayed in real-time
              </p>
              <p>
                <strong>4. Heartbeat:</strong> The connection is kept alive with automatic ping messages
              </p>
              <p>
                <strong>5. Reconnection:</strong> If the connection drops, it automatically reconnects
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 