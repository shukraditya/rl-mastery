import { DaySummary } from '@/lib/types';
import styles from './DayButton.module.css';

const STATUS_LABEL: Record<string, string> = {
  passed: 'Passed',
  failed_last: 'Try Again',
  available: 'Start',
  locked: 'Locked',
};

export default function DayButton({ day, weekId }: { day: DaySummary; weekId: number }) {
  const label = STATUS_LABEL[day.status];
  const pct = day.best_score != null && day.best_score > 0
    ? Math.round(day.best_score * 100)
    : null;

  return (
    <a
      href={day.status !== 'locked' ? `/week/${weekId}/day/${day.day}/quiz` : undefined}
      className={`${styles.card} ${day.status === 'locked' ? styles.locked : ''}`}
    >
      <div className={styles.topRow}>
        <span className={styles.dayNum}>Day {day.day}</span>
        <span className={styles.status}>{label}</span>
      </div>
      <div className={styles.title}>{day.title}</div>
      {pct != null && (
        <div className={styles.score}>{pct}%</div>
      )}
      {day.status === 'available' && !pct && (
        <span className={styles.cta}>Start &rarr;</span>
      )}
      {day.status === 'failed_last' && (
        <span className={styles.ctaRetry}>Try Again &rarr;</span>
      )}
    </a>
  );
}
