export type QuestionType = 'multiple_choice' | 'numeric' | 'free_text';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  text: string;
  explanation: string;
  tags: string[];
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correct_index: number;
}

export interface NumericQuestion extends BaseQuestion {
  type: 'numeric';
  correct: number;
  tolerance: number;
}

export interface FreeTextQuestion extends BaseQuestion {
  type: 'free_text';
  rubric: string;
}

export type Question = MultipleChoiceQuestion | NumericQuestion | FreeTextQuestion;

export interface QuizYaml {
  week: number;
  day: number;
  title: string;
  description: string;
  passing_threshold: number;
  questions: Question[];
}

export interface QuizForClient {
  week: number;
  day: number;
  title: string;
  description: string;
  passing_threshold: number;
  questions: ClientQuestion[];
}

export type ClientQuestion =
  | Omit<MultipleChoiceQuestion, 'correct_index'>
  | Omit<NumericQuestion, 'correct' | 'tolerance'>
  | Omit<FreeTextQuestion, 'rubric'>;

export interface DayProgress {
  status: 'locked' | 'available' | 'passed' | 'failed_last';
  best_score: number;
  attempts: number;
  last_attempt_at: string | null;
  weak_tags: string[];
  last_result?: QuizResult;
}

export interface WeekProgress {
  status: 'locked' | 'in_progress' | 'complete';
  days: Record<string, DayProgress>;
}

export interface ProgressData {
  student_id: string;
  started_at: string;
  weeks: Record<string, WeekProgress>;
  total_attempts: number;
  current_streak_days: number;
}

export interface QuizSubmission {
  answers: Record<string, string | number>;
}

export interface GradedAnswer {
  question_id: string;
  correct: boolean;
  user_answer: string | number;
  correct_answer?: string | number;
  explanation: string;
  tags: string[];
  grading_status?: 'graded' | 'pending';
}

export interface QuizResult {
  week: number;
  day: number;
  score: number;
  passed: boolean;
  total_questions: number;
  correct_count: number;
  graded_answers: GradedAnswer[];
  weak_tags: string[];
}

export interface WeekSummary {
  week: number;
  title: string;
  theme: string;
  days_completed: number;
  total_days: number;
  status: 'locked' | 'available' | 'in_progress' | 'complete';
}

export interface DaySummary {
  day: number;
  title: string;
  status: 'locked' | 'available' | 'passed' | 'failed_last';
  best_score: number | null;
}
