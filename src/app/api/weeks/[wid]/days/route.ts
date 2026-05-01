import { NextRequest, NextResponse } from 'next/server';
import { loadProgress } from '@/lib/progress-store';
import { loadQuizYaml } from '@/lib/yaml-loader';
import { DaySummary } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wid: string }> }
) {
  const { wid } = await params;
  const weekNum = parseInt(wid, 10);

  const progress = await loadProgress();
  const weekProg = progress.weeks[String(weekNum)];

  const days: DaySummary[] = [];
  for (let d = 1; d <= 7; d++) {
    const quiz = await loadQuizYaml(weekNum, d);
    const dayProg = weekProg?.days[String(d)];
    days.push({
      day: d,
      title: quiz?.title || `Day ${d}`,
      status: dayProg?.status || 'locked',
      best_score: dayProg?.best_score || null,
    });
  }

  return NextResponse.json(days);
}
