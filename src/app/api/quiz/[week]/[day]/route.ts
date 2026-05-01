import { NextRequest, NextResponse } from 'next/server';
import { loadQuizYaml, stripAnswers } from '@/lib/yaml-loader';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ week: string; day: string }> }
) {
  const { week, day } = await params;
  const weekNum = parseInt(week, 10);
  const dayNum = parseInt(day, 10);

  const quiz = await loadQuizYaml(weekNum, dayNum);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const clientQuiz = stripAnswers(quiz);
  return NextResponse.json(clientQuiz, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
