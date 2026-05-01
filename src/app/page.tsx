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
          <h1 className={styles.heroTitle}>Build Deep Intuition for Reinforcement Learning</h1>
          <p className={styles.heroSubtitle}>
            8 weeks. 56 days. One quiz at a time. RL Mastery is a structured curriculum
            designed to take you from Bellman equations to production-grade RLHF systems.
          </p>
          <a href="/api/auth/signin" className={styles.cta}>Sign in with Google</a>
        </section>

        <section className={styles.section}>
          <div className={styles.bodyText}>
            <p>
              Reinforcement learning is the engine behind modern AI breakthroughs — from
              AlphaGo to ChatGPT, from robotics to reasoning models. Yet most learners
              get lost in the math without ever building the gut feeling for why these
              algorithms work. RL Mastery fixes that.
            </p>
            <p>
              Every day you tackle a short, targeted quiz that forces active recall on
              the concepts that matter. No passive video watching. No endless notebooks.
              Just consistent, deliberate practice across value-based methods, policy
              gradients, proximal policy optimization, reward modeling, direct preference
              optimization, and the latest reasoning RL techniques powering models like DeepSeek-R1.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The Curriculum</h2>
          <div className={styles.curriculumGrid}>
            {themes.slice(1).map((title, i) => (
              <div key={i} className={styles.weekCard}>
                <div className={styles.weekNum}>Week {i + 1}</div>
                <div className={styles.weekTitle}>{title}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className={styles.bodyText}>
            <p>
              Progress is tracked per-user and persists across sessions. Pass a day to
              unlock the next. Miss a question and the system tags your weak areas so
              you know exactly what to revisit. By the end of 56 days, you will not just
              understand RL — you will think in rewards, policies, and advantage estimates.
            </p>
          </div>
          <a href="/api/auth/signin" className={styles.cta} style={{ marginTop: '1.5rem' }}>
            Start Learning — Sign in with Google
          </a>
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
