import { NextResponse } from 'next/server';
import { loadProgress } from '@/lib/progress-store';

export async function GET() {
  const progress = await loadProgress();
  return NextResponse.json(progress);
}
