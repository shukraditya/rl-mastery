import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { QuizYaml, QuizForClient, ClientQuestion } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'questions');

export async function loadQuizYaml(week: number, day: number): Promise<QuizYaml | null> {
  const filePath = path.join(DATA_DIR, `week${String(week).padStart(2, '0')}`, `day${String(day).padStart(2, '0')}.yaml`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = yaml.load(content) as QuizYaml;
    return parsed;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export function stripAnswers(quiz: QuizYaml): QuizForClient {
  const questions: ClientQuestion[] = quiz.questions.map((q) => {
    if (q.type === 'multiple_choice') {
      const { correct_index, ...rest } = q;
      return rest;
    }
    if (q.type === 'numeric') {
      const { correct, tolerance, ...rest } = q;
      return rest;
    }
    const { rubric, ...rest } = q;
    return rest;
  });

  return {
    week: quiz.week,
    day: quiz.day,
    title: quiz.title,
    description: quiz.description,
    passing_threshold: quiz.passing_threshold,
    questions,
  };
}

export async function listAvailableQuizzes(): Promise<{ week: number; day: number; title: string }[]> {
  const quizzes: { week: number; day: number; title: string }[] = [];
  try {
    const weeks = await fs.readdir(DATA_DIR);
    for (const weekDir of weeks.sort()) {
      const weekPath = path.join(DATA_DIR, weekDir);
      const stat = await fs.stat(weekPath);
      if (!stat.isDirectory()) continue;

      const weekNum = parseInt(weekDir.replace('week', ''), 10);
      const files = await fs.readdir(weekPath);
      for (const file of files.sort()) {
        if (!file.endsWith('.yaml')) continue;
        const dayNum = parseInt(file.replace('day', '').replace('.yaml', ''), 10);
        const quiz = await loadQuizYaml(weekNum, dayNum);
        if (quiz) {
          quizzes.push({ week: weekNum, day: dayNum, title: quiz.title });
        }
      }
    }
  } catch {
    // data/questions may not exist yet
  }
  return quizzes;
}
