import { WeekSummary, QuizForClient, QuizResult, ProgressData, QuizSubmission, GradedAnswer } from './types';

const BASE = '';

export async function getWeeks(): Promise<WeekSummary[]> {
  const res = await fetch(`${BASE}/api/weeks`);
  if (!res.ok) throw new Error('Failed to load weeks');
  return res.json();
}

export async function getQuiz(week: number, day: number): Promise<QuizForClient> {
  const res = await fetch(`${BASE}/api/quiz/${week}/${day}`);
  if (!res.ok) throw new Error('Failed to load quiz');
  return res.json();
}

export async function checkAnswer(week: number, day: number, questionId: string, answer: string | number): Promise<GradedAnswer> {
  const res = await fetch(`${BASE}/api/quiz/${week}/${day}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  if (!res.ok) throw new Error('Failed to check answer');
  return res.json();
}

export async function submitQuiz(week: number, day: number, answers: Record<string, string | number>): Promise<QuizResult> {
  const res = await fetch(`${BASE}/api/quiz/${week}/${day}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers } as QuizSubmission),
  });
  if (!res.ok) throw new Error('Failed to submit quiz');
  return res.json();
}

export async function getProgress(): Promise<ProgressData> {
  const res = await fetch(`${BASE}/api/progress`);
  if (!res.ok) throw new Error('Failed to load progress');
  return res.json();
}
