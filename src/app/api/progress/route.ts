import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { loadProgress } from '@/lib/progress-store';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const progress = await loadProgress(session.user.email);
  return NextResponse.json(progress);
}
