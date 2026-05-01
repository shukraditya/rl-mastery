'use client';

import { useEffect, useState } from 'react';
import { GradedAnswer } from '@/lib/types';
import MathText from '@/components/MathText';
import styles from './AnswerFeedback.module.css';

interface Props {
  graded: GradedAnswer;
  onNext: () => void;
  isLast: boolean;
}

export default function AnswerFeedback({ graded, onNext, isLast }: Props) {
  const isPending = graded.grading_status === 'pending';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const statusTitle = isPending
    ? 'Answer Submitted'
    : graded.correct
    ? 'Correct'
    : 'Not quite';

  return (
    <div className={`${styles.container} ${visible ? styles.visible : ''}`}>
      <div className={`${styles.statusBanner} ${graded.correct ? styles.correct : isPending ? styles.pending : styles.incorrect}`}>
        <span className={styles.statusTitle}>{statusTitle}</span>
      </div>

      {!isPending && !graded.correct && graded.correct_answer !== undefined && (
        <div className={styles.correctAnswer}>
          <div className={styles.answerLabel}>Correct answer</div>
          <div className={styles.answerValue}>
            <MathText
              text={
                typeof graded.correct_answer === 'number' && Number.isInteger(graded.correct_answer)
                  ? String(graded.correct_answer)
                  : String(graded.correct_answer)
              }
            />
          </div>
        </div>
      )}

      <div className={styles.explanation}>
        <div className={styles.explanationLabel}>Explanation</div>
        <p className={styles.explanationText}>
          <MathText text={graded.explanation} />
        </p>
      </div>

      {graded.tags && graded.tags.length > 0 && (
        <div className={styles.tagsRow}>
          {graded.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      <button className={styles.nextBtn} onClick={onNext} autoFocus>
        {isLast ? 'See Results' : 'Next Question'}
      </button>
    </div>
  );
}
