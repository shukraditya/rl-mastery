import { listAvailableQuizzes } from '@/lib/yaml-loader';
import { loadProgress } from '@/lib/progress-store';
import WeekCard from '@/components/WeekCard';
import { WeekSummary } from '@/lib/types';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const quizzes = await listAvailableQuizzes();
  const progress = await loadProgress();

  const weekMap = new Map<number, { title: string; days: number }>();
  for (const q of quizzes) {
    if (!weekMap.has(q.week)) {
      weekMap.set(q.week, { title: `Week ${q.week}`, days: 0 });
    }
    weekMap.get(q.week)!.days += 1;
    if (weekMap.get(q.week)!.title === `Week ${q.week}`) {
      weekMap.get(q.week)!.title = q.title.split('—')[0]?.trim() || q.title;
    }
  }

  const summaries: WeekSummary[] = [];
  let totalPassed = 0;
  let totalDays = 0;
  for (let w = 1; w <= 8; w++) {
    const meta = weekMap.get(w);
    const weekProg = progress.weeks[String(w)];
    const daysCompleted = Object.values(weekProg?.days || {}).filter(
      (d) => d.status === 'passed'
    ).length;
    const daysTotal = meta?.days || 7;
    totalPassed += daysCompleted;
    totalDays += daysTotal;

    let status: WeekSummary['status'] = 'locked';
    if (weekProg?.status === 'complete') status = 'complete';
    else if (weekProg?.status === 'in_progress') status = 'in_progress';
    else if (weekProg?.days?.['1']?.status !== 'locked') status = 'available';

    summaries.push({
      week: w,
      title: meta?.title || `Week ${w}`,
      theme: '',
      days_completed: daysCompleted,
      total_days: daysTotal,
      status,
    });
  }

  const overallPct = totalDays > 0 ? Math.round((totalPassed / totalDays) * 100) : 0;
  const currentStreak = progress.current_streak_days;
  const totalAttempts = progress.total_attempts;

  // Find next available day
  let continueWeek = 1;
  let continueDay = 1;
  for (let w = 1; w <= 8; w++) {
    const weekProg = progress.weeks[String(w)];
    if (!weekProg) continue;
    for (let d = 1; d <= 7; d++) {
      const dayProg = weekProg.days[String(d)];
      if (dayProg?.status === 'available') {
        continueWeek = w;
        continueDay = d;
        break;
      }
    }
    if (continueWeek !== w || continueDay !== 1) break;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>RL Mastery</h1>
        <p className={styles.heroSubtitle}>
          8 weeks. 56 days. Build deep intuition for reinforcement learning.
        </p>
        <a href={`/week/${continueWeek}/day/${continueDay}/quiz`} className={styles.cta}>
          {totalPassed === 0 ? 'Start Day 1' : 'Continue Learning'}
        </a>
      </section>

      <section className={styles.stats}>
        <span>{currentStreak} day streak</span>
        <span>&middot;</span>
        <span>{totalPassed} of {totalDays} days passed</span>
        <span>&middot;</span>
        <span>{totalAttempts} attempts</span>
        <span>&middot;</span>
        <span>{overallPct}% complete</span>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Curriculum</h2>
        <div className={styles.grid}>
          {summaries.map((week) => (
            <WeekCard key={week.week} week={week} />
          ))}
        </div>
      </section>
    </div>
  );
}
