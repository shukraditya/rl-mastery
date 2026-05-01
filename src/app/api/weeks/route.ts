import { NextResponse } from 'next/server';
import { loadProgress } from '@/lib/progress-store';
import { listAvailableQuizzes } from '@/lib/yaml-loader';
import { WeekSummary } from '@/lib/types';

export async function GET() {
  const quizzes = await listAvailableQuizzes();
  const progress = await loadProgress();

  const weekMap = new Map<number, { title: string; days: number }>();
  for (const q of quizzes) {
    if (!weekMap.has(q.week)) {
      weekMap.set(q.week, { title: `Week ${q.week}`, days: 0 });
    }
    weekMap.get(q.week)!.days += 1;
    // Use first available title
    if (weekMap.get(q.week)!.title === `Week ${q.week}`) {
      weekMap.get(q.week)!.title = q.title.split('—')[0]?.trim() || q.title;
    }
  }

  const summaries: WeekSummary[] = [];
  for (let w = 1; w <= 8; w++) {
    const meta = weekMap.get(w);
    const weekProg = progress.weeks[String(w)];
    const daysCompleted = Object.values(weekProg?.days || {}).filter(
      (d) => d.status === 'passed'
    ).length;
    const totalDays = meta?.days || 7;

    let status: WeekSummary['status'] = 'locked';
    if (weekProg?.status === 'complete') status = 'complete';
    else if (weekProg?.status === 'in_progress') status = 'in_progress';
    else if (weekProg?.days?.['1']?.status !== 'locked') status = 'available';

    summaries.push({
      week: w,
      title: meta?.title || `Week ${w}`,
      theme: '',
      days_completed: daysCompleted,
      total_days: totalDays,
      status,
    });
  }

  return NextResponse.json(summaries);
}
