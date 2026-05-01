import { NextRequest, NextResponse } from 'next/server';
import { loadQuizYaml } from '@/lib/yaml-loader';
import { GradedAnswer } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ week: string; day: string }> }
) {
  const { week, day } = await params;
  const weekNum = parseInt(week, 10);
  const dayNum = parseInt(day, 10);

  const quiz = await loadQuizYaml(weekNum, dayNum);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const body = await req.json() as { question_id: string; answer: string | number };
  const question = quiz.questions.find((q) => q.id === body.question_id);
  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  }

  const userAnswer = body.answer;
  let correct = false;
  let correctAnswer: string | number | undefined;
  let gradingStatus: 'graded' | 'pending' = 'graded';

  if (question.type === 'multiple_choice') {
    const userIndex = typeof userAnswer === 'string' ? parseInt(userAnswer, 10) : userAnswer;
    correct = userIndex === question.correct_index;
    correctAnswer = question.correct_index;
  } else if (question.type === 'numeric') {
    const userNum = typeof userAnswer === 'string' ? parseFloat(userAnswer) : userAnswer;
    correct = Math.abs(userNum - question.correct) <= question.tolerance;
    correctAnswer = question.correct;
  } else {
    gradingStatus = 'pending';
  }

  const graded: GradedAnswer = {
    question_id: question.id,
    correct,
    user_answer: userAnswer,
    correct_answer: correctAnswer,
    explanation: question.explanation,
    tags: question.tags,
    grading_status: gradingStatus,
  };

  return NextResponse.json(graded);
}
