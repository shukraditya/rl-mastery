import { WeekSummary } from '@/lib/types';
import styles from './WeekCard.module.css';

const STATUS_LABEL: Record<string, string> = {
  complete: 'Complete',
  in_progress: 'In Progress',
  available: 'Available',
  locked: 'Locked',
};

export default function WeekCard({ week }: { week: WeekSummary }) {
  const label = STATUS_LABEL[week.status];

  return (
    <a
      href={week.status !== 'locked' ? `/week/${week.week}` : undefined}
      className={`${styles.card} ${week.status === 'locked' ? styles.locked : ''}`}
    >
      <div className={styles.header}>
        <span className={styles.weekNum}>Week {week.week}</span>
        <span className={styles.status}>{label}</span>
      </div>
      <h3 className={styles.title}>{week.title}</h3>
      <p className={styles.progress}>
        {week.days_completed} of {week.total_days} days
      </p>
    </a>
  );
}
