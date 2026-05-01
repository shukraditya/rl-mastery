import { loadProgress } from '@/lib/progress-store';
import { auth } from '@/auth';
import MathText from '@/components/MathText';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({ params }: { params: Promise<{ wid: string; did: string }> }) {
  const { wid, did } = await params;
  const week = parseInt(wid, 10);
  const day = parseInt(did, 10);

  const session = await auth();
  const userId = session?.user?.email ?? null;
  const progress = userId ? await loadProgress(userId) : null;
  const dayProg = progress?.weeks[String(week)]?.days[String(day)];
  const result = dayProg?.last_result;

  if (!result) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h1 className={styles.emptyTitle}>No results yet</h1>
          <p className={styles.emptyText}>Take the quiz first to see your results and track your progress.</p>
          <a href={`/week/${week}/day/${day}/quiz`} className={styles.btn}>Start Quiz</a>
        </div>
      </div>
    );
  }

  const pct = Math.round(result.score * 100);
  const passed = result.passed;
  const gradableCount = result.graded_answers.filter(ga => ga.grading_status !== 'pending').length;

  return (
    <div className={styles.container}>
      <a href={`/week/${week}`} className={styles.backLink}>← Week {week}</a>

      <div className={styles.scoreHero}>
        <div className={styles.scoreBig}>{pct}%</div>
        <div className={styles.scoreMeta}>
          <span>{passed ? 'Passed' : 'Failed'}</span>
          <span>·</span>
          <span>{result.correct_count} correct</span>
          <span>·</span>
          <span>{result.total_questions - result.correct_count} incorrect</span>
          <span>·</span>
          <span>{gradableCount} graded</span>
        </div>
        {!passed && (
          <p className={styles.retryHint}>
            You need 80% to pass. Review the explanations and try again.
          </p>
        )}
      </div>

      <div className={styles.breakdown}>
        <h2 className={styles.sectionTitle}>Question Breakdown</h2>
        <div className={styles.breakdownList}>
          {result.graded_answers.map((ga, idx) => (
            <div
              key={ga.question_id}
              className={`${styles.answerCard} ${
                ga.correct ? styles.answerCorrect : ga.grading_status === 'pending' ? styles.answerPending : styles.answerWrong
              }`}
            >
              <div className={styles.answerHeader}>
                <span className={styles.answerNum}>Question {idx + 1}</span>
                <span className={styles.answerBadge}>
                  {ga.grading_status === 'pending' ? 'Pending' : ga.correct ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              {!ga.correct && ga.grading_status !== 'pending' && ga.correct_answer !== undefined && (
                <div className={styles.answerCorrectVal}>
                  <span className={styles.correctLabel}>Correct answer:</span>{' '}
                  <span className={styles.correctVal}>
                    <MathText text={String(ga.correct_answer)} />
                  </span>
                </div>
              )}
              <div className={styles.answerExplanation}>
                <span className={styles.expLabel}>Explanation</span>
                <p className={styles.expText}>
                  <MathText text={ga.explanation} />
                </p>
              </div>
              {ga.tags.length > 0 && (
                <div className={styles.answerTags}>
                  {ga.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {result.weak_tags.length > 0 && (
        <div className={styles.weakAreas}>
          <h2 className={styles.sectionTitle}>Focus Areas</h2>
          <p className={styles.weakHint}>Topics that showed up in questions you missed.</p>
          <div className={styles.tagList}>
            {result.weak_tags.map((tag) => (
              <span key={tag} className={styles.weakTag}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <a href={`/week/${week}/day/${day}/quiz`} className={styles.btnSecondary}>
          Retake Quiz
        </a>
        {passed ? (
          <a href={`/week/${week}/day/${day + 1}/quiz`} className={styles.btn}>
            Next Day →
          </a>
        ) : (
          <a href={`/week/${week}`} className={styles.btn}>
            Back to Week
          </a>
        )}
      </div>
    </div>
  );
}
