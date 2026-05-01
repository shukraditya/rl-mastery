import { loadProgress } from '@/lib/progress-store';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const progress = await loadProgress();

  const allDays: { week: number; day: number; score: number; status: string }[] = [];
  for (let w = 1; w <= 8; w++) {
    const weekProg = progress.weeks[String(w)];
    if (!weekProg) continue;
    for (let d = 1; d <= 7; d++) {
      const dayProg = weekProg.days[String(d)];
      if (dayProg && dayProg.attempts > 0) {
        allDays.push({ week: w, day: d, score: dayProg.best_score, status: dayProg.status });
      }
    }
  }

  const weakTagCounts: Record<string, number> = {};
  for (const day of allDays) {
    const tags = progress.weeks[String(day.week)]?.days[String(day.day)]?.weak_tags || [];
    for (const tag of tags) {
      weakTagCounts[tag] = (weakTagCounts[tag] || 0) + 1;
    }
  }

  const sortedWeakTags = Object.entries(weakTagCounts).sort((a, b) => b[1] - a[1]);
  const totalPassed = allDays.filter((d) => d.status === 'passed').length;
  const totalDays = 56;
  const overallPct = Math.round((totalPassed / totalDays) * 100);
  const avgScore = allDays.length > 0
    ? Math.round((allDays.reduce((s, d) => s + d.score, 0) / allDays.length) * 100)
    : 0;

  // Heatmap data
  const heatmap: { w: number; d: number; status: string; score: number }[][] = [];
  for (let w = 1; w <= 8; w++) {
    const row: { w: number; d: number; status: string; score: number }[] = [];
    const weekProg = progress.weeks[String(w)];
    for (let d = 1; d <= 7; d++) {
      const dayProg = weekProg?.days[String(d)];
      row.push({
        w,
        d,
        status: dayProg?.status || 'locked',
        score: dayProg?.best_score || 0,
      });
    }
    heatmap.push(row);
  }

  const statusMarker = (status: string) => {
    if (status === 'passed') return 'x';
    if (status === 'failed_last') return 'o';
    if (status === 'available') return '·';
    return '';
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Your Progress</h1>

      <section className={styles.stats}>
        <span>{totalPassed} of {totalDays} days passed</span>
        <span>·</span>
        <span>{overallPct}% complete</span>
        <span>·</span>
        <span>{progress.current_streak_days} day streak</span>
        <span>·</span>
        <span>{progress.total_attempts} attempts</span>
        <span>·</span>
        <span>{avgScore}% average</span>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Curriculum Map</h2>
        <div className={styles.heatmap}>
          <div className={styles.heatmapHeader}>
            <span></span>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className={styles.heatmapDayLabel}>
                {i + 1}
              </span>
            ))}
          </div>
          {heatmap.map((row, ri) => (
            <div key={ri} className={styles.heatmapRow}>
              <span className={styles.heatmapWeekLabel}>{ri + 1}</span>
              {row.map((cell) => (
                <a
                  key={cell.d}
                  href={
                    cell.status !== 'locked'
                      ? `/week/${cell.w}/day/${cell.d}/quiz`
                      : undefined
                  }
                  className={`${styles.heatmapCell} ${styles[cell.status]}`}
                  title={`Week ${cell.w}, Day ${cell.d}`}
                >
                  {statusMarker(cell.status)}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.heatmapLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot}>x</span> Passed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot}>o</span> Failed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot}>·</span> Available
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot}>&nbsp;</span> Locked
          </span>
        </div>
      </section>

      {sortedWeakTags.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Focus Areas</h2>
          <p className={styles.weakHint}>
            Topics that showed up in questions you missed.
          </p>
          <div className={styles.weakList}>
            {sortedWeakTags.map(([tag, count]) => {
              const max = sortedWeakTags[0][1];
              const pct = (count / max) * 100;
              return (
                <div key={tag} className={styles.weakItem}>
                  <div className={styles.weakTop}>
                    <span className={styles.weakName}>{tag}</span>
                    <span className={styles.weakCount}>{count} miss{count > 1 ? 'es' : ''}</span>
                  </div>
                  <div className={styles.weakBarBg}>
                    <div
                      className={styles.weakBarFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
