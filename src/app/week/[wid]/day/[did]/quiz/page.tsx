'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizForClient, GradedAnswer } from '@/lib/types';
import { getQuiz, checkAnswer, submitQuiz } from '@/lib/api';
import QuestionCard from '@/components/QuestionCard';
import AnswerFeedback from '@/components/AnswerFeedback';
import styles from './page.module.css';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const week = parseInt(params.wid as string, 10);
  const day = parseInt(params.did as string, 10);

  const [quiz, setQuiz] = useState<QuizForClient | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [graded, setGraded] = useState<GradedAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuiz(week, day)
      .then(setQuiz)
      .catch(() => setError('Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [week, day]);

  const handleSubmit = useCallback(async (answer: string | number) => {
    if (!quiz) return;
    const question = quiz.questions[currentIdx];
    const updated = { ...answersRef.current, [question.id]: answer };
    setAnswers(updated);
    answersRef.current = updated;

    try {
      const result = await checkAnswer(week, day, question.id, answer);
      setGraded(result);
    } catch {
      setError('Failed to check answer');
    }
  }, [quiz, currentIdx, week, day]);

  const handleNext = useCallback(async () => {
    if (!quiz) return;

    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setGraded(null);
    } else {
      try {
        await submitQuiz(week, day, answersRef.current);
        router.push(`/week/${week}/day/${day}/results`);
      } catch {
        setError('Failed to submit quiz');
      }
    }
  }, [quiz, currentIdx, week, day, router]);

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading quiz...</p>
      </div>
    );
  }
  if (error) return <div className={styles.center}>{error}</div>;
  if (!quiz) return <div className={styles.center}>Quiz not found.</div>;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <a href={`/week/${week}`} className={styles.backLink}>← Week {week}</a>
        <span className={styles.progressText}>
          Question {currentIdx + 1} of {quiz.questions.length}
        </span>
      </div>

      <div className={styles.content}>
        {!graded ? (
          <QuestionCard
            question={quiz.questions[currentIdx]}
            questionNumber={currentIdx + 1}
            totalQuestions={quiz.questions.length}
            onSubmit={handleSubmit}
          />
        ) : (
          <AnswerFeedback
            graded={graded}
            onNext={handleNext}
            isLast={currentIdx === quiz.questions.length - 1}
          />
        )}
      </div>
    </div>
  );
}
