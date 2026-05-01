import { loadProgress } from '@/lib/progress-store';
import { loadQuizYaml } from '@/lib/yaml-loader';
import { auth } from '@/auth';
import DayButton from '@/components/DayButton';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function WeekPage({ params }: { params: Promise<{ wid: string }> }) {
  const { wid } = await params;
  const weekNum = parseInt(wid, 10);

  const session = await auth();
  const userId = session?.user?.email ?? null;
  const progress = userId ? await loadProgress(userId) : null;
  const weekProg = progress?.weeks[String(weekNum)];

  const days = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const dayNum = i + 1;
      const quiz = await loadQuizYaml(weekNum, dayNum);
      const dayProg = weekProg?.days[String(dayNum)];
      return {
        day: dayNum,
        title: quiz?.title || `Day ${dayNum}`,
        status: dayProg?.status || 'locked',
        best_score: dayProg?.best_score || null,
      };
    })
  );

  const passedCount = days.filter((d) => d.status === 'passed').length;

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

  return (
    <div className={styles.page}>
      <a href="/" className={styles.backLink}>← Dashboard</a>

      <div className={styles.weekHeader}>
        <div>
          <span className={styles.weekLabel}>Week {weekNum}</span>
          <h1 className={styles.heading}>{themes[weekNum] || `Week ${weekNum}`}</h1>
        </div>
        <span className={styles.stat}>{passedCount} of 7 days passed</span>
      </div>

      <div className={styles.grid}>
        {days.map((day) => (
          <DayButton key={day.day} day={day} weekId={weekNum} />
        ))}
      </div>
    </div>
  );
}
