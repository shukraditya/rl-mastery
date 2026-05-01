import fs from 'fs/promises';
import path from 'path';
import { ProgressData, DayProgress, WeekProgress, QuizResult } from './types';

const PROGRESS_PATH = path.join(process.cwd(), 'data', 'progress.json');

function createInitialProgress(): ProgressData {
  const weeks: Record<string, WeekProgress> = {};
  for (let w = 1; w <= 8; w++) {
    const days: Record<string, DayProgress> = {};
    for (let d = 1; d <= 7; d++) {
      days[String(d)] = {
        status: w === 1 && d === 1 ? 'available' : 'locked',
        best_score: 0,
        attempts: 0,
        last_attempt_at: null,
        weak_tags: [],
      };
    }
    weeks[String(w)] = {
      status: w === 1 ? 'in_progress' : 'locked',
      days,
    };
  }

  return {
    student_id: 'default',
    started_at: new Date().toISOString(),
    weeks,
    total_attempts: 0,
    current_streak_days: 0,
  };
}

export async function loadProgress(): Promise<ProgressData> {
  try {
    const content = await fs.readFile(PROGRESS_PATH, 'utf-8');
    return JSON.parse(content) as ProgressData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const initial = createInitialProgress();
      await saveProgress(initial);
      return initial;
    }
    throw err;
  }
}

export async function saveProgress(progress: ProgressData): Promise<void> {
  await fs.mkdir(path.dirname(PROGRESS_PATH), { recursive: true });
  await fs.writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8');
}

export async function recordAttempt(result: QuizResult): Promise<ProgressData> {
  const progress = await loadProgress();
  const w = String(result.week);
  const d = String(result.day);

  if (!progress.weeks[w]) {
    throw new Error(`Week ${result.week} not found`);
  }
  if (!progress.weeks[w].days[d]) {
    throw new Error(`Day ${result.day} not found in week ${result.week}`);
  }

  const day = progress.weeks[w].days[d];
  day.attempts += 1;
  day.last_attempt_at = new Date().toISOString();
  day.best_score = Math.max(day.best_score, result.score);
  day.weak_tags = result.weak_tags;
  day.last_result = result;

  if (result.passed) {
    day.status = 'passed';
  } else {
    day.status = 'failed_last';
  }

  progress.total_attempts += 1;

  // Unlock next day if passed
  if (result.passed) {
    const nextDay = String(result.day + 1);
    if (progress.weeks[w].days[nextDay]) {
      if (progress.weeks[w].days[nextDay].status === 'locked') {
        progress.weeks[w].days[nextDay].status = 'available';
      }
    } else {
      // End of week, unlock next week day 1
      const nextWeek = String(result.week + 1);
      if (progress.weeks[nextWeek]) {
        progress.weeks[nextWeek].status = 'in_progress';
        if (progress.weeks[nextWeek].days['1'].status === 'locked') {
          progress.weeks[nextWeek].days['1'].status = 'available';
        }
      }
    }
  }

  // Recalculate week status
  const weekDays = Object.values(progress.weeks[w].days);
  const allPassed = weekDays.every((day) => day.status === 'passed');
  if (allPassed) {
    progress.weeks[w].status = 'complete';
  } else if (weekDays.some((day) => day.status !== 'locked')) {
    progress.weeks[w].status = 'in_progress';
  }

  // Streak: count consecutive passed days from day 1 forward
  let streak = 0;
  for (let weekNum = 1; weekNum <= 8; weekNum++) {
    const weekStr = String(weekNum);
    if (!progress.weeks[weekStr]) break;
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const dayStr = String(dayNum);
      if (progress.weeks[weekStr].days[dayStr]?.status === 'passed') {
        streak++;
      } else {
        break;
      }
    }
    if (weekDays[weekDays.length - 1].status !== 'passed') break;
  }
  progress.current_streak_days = streak;

  await saveProgress(progress);
  return progress;
}
