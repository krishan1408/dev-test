import { NextResponse } from 'next/server';
import { getSSEStats, checkRedisStatus } from '@/features/sse';

export async function GET() {
  try {
    const [sseStats, redisStatus] = await Promise.all([
      getSSEStats(),
      checkRedisStatus(),
    ]);

    return NextResponse.json({
      sse: sseStats,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting SSE status:', error);
    return NextResponse.json(
      { error: 'Failed to get SSE status' },
      { status: 500 }
    );
  }
} 