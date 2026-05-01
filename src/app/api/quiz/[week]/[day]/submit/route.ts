import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { loadQuizYaml } from '@/lib/yaml-loader';
import { gradeQuiz } from '@/lib/quiz-engine';
import { recordAttempt } from '@/lib/progress-store';
import { QuizSubmission } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ week: string; day: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { week, day } = await params;
  const weekNum = parseInt(week, 10);
  const dayNum = parseInt(day, 10);

  const quiz = await loadQuizYaml(weekNum, dayNum);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const body = (await req.json()) as QuizSubmission;
  const result = gradeQuiz(quiz, body);
  await recordAttempt(session.user.email, result);

  return NextResponse.json(result);
}
