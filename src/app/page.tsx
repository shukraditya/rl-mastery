import { listAvailableQuizzes } from '@/lib/yaml-loader';
import { loadProgress } from '@/lib/progress-store';
import { auth } from '@/auth';
import WeekCard from '@/components/WeekCard';
import { WeekSummary } from '@/lib/types';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const themes = [
  '',
  'The Bellman Contract',
  'Deep Q-Networks & Non-Stationarity',
  'Policy Gradients & The LLM Connection',
  'PPO — Build The Engine',
  'Reward Modeling & RLHF Theory',
  'DPO — The Closed-Form Revolution',
  'Reasoning RL — GRPO & R1-Style Training',
  'Capstone — Ship an Artifact',
];

export default async function Dashboard() {
  const session = await auth();
  const userId = session?.user?.email ?? null;

  if (!userId) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Master Reinforcement Learning</h1>
            <p className={styles.heroSubtitle}>
              A daily quiz curriculum that builds intuition from Bellman equations to RLHF.
            </p>
          </div>
          <div className={styles.heroCta}>
            <a href="/api/auth/signin" className={styles.cta}>
              Sign in with Google
            </a>
          </div>
        </section>

        <div className={styles.metaStrip}>
          <span><span className={styles.metaNum}>8</span> Weeks</span>
          <span><span className={styles.metaNum}>56</span> Days</span>
          <span><span className={styles.metaNum}>240+</span> Questions</span>
        </div>

        <section>
          <h2 className={styles.sectionTitle}>Curriculum</h2>
          <div className={styles.curriculumGrid}>
            {themes.slice(1).map((title, i) => (
              <div key={i} className={styles.weekCard}>
                <div className={styles.weekNum}>Week {i + 1}</div>
                <div className={styles.weekTitle}>{title}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureTitle}>Active Recall</div>
            <div className={styles.featureDesc}>
              Daily quizzes force you to retrieve concepts, not just re-read them.
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureTitle}>Adaptive Progression</div>
            <div className={styles.featureDesc}>
              Pass a day to unlock the next. Weak tags show exactly what to revisit.
            </div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureTitle}>Production-Ready</div>
            <div className={styles.featureDesc}>
              From DQN to GRPO — learn the algorithms behind modern LLM training pipelines.
            </div>
          </div>
        </section>

        <section className={styles.bottomCta}>
          <a href="/api/auth/signin" className={styles.cta}>
            Start Learning
          </a>
          <span className={styles.bottomHint}>Free. Sign in with Google to track progress.</span>
        </section>
      </div>
    );
  }

  const progress = await loadProgress(userId);
  const quizzes = await listAvailableQuizzes();

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
    const weekProg = progress?.weeks[String(w)];
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
  const currentStreak = progress?.current_streak_days ?? 0;
  const totalAttempts = progress?.total_attempts ?? 0;

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
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>RL Mastery</h1>
          <p className={styles.heroSubtitle}>
            8 weeks. 56 days. Build deep intuition for reinforcement learning.
          </p>
        </div>
        <div className={styles.heroCta}>
          <a href={`/week/${continueWeek}/day/${continueDay}/quiz`} className={styles.cta}>
            {totalPassed === 0 ? 'Start Day 1' : 'Continue Learning'}
          </a>
        </div>
      </section>

      <section className={styles.stats}>
        <span>{currentStreak} day streak</span>
        <span>·</span>
        <span>{totalPassed} of {totalDays} days passed</span>
        <span>·</span>
        <span>{totalAttempts} attempts</span>
        <span>·</span>
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
