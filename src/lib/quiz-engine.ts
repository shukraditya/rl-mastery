import { QuizYaml, QuizSubmission, QuizResult, GradedAnswer } from './types';

export function gradeQuiz(quiz: QuizYaml, submission: QuizSubmission): QuizResult {
  const gradedAnswers: GradedAnswer[] = [];
  let correctCount = 0;
  let gradableCount = 0;
  const weakTags: Set<string> = new Set();

  for (const question of quiz.questions) {
    const userAnswer = submission.answers[question.id];
    let correct = false;
    let gradingStatus: 'graded' | 'pending' = 'graded';

    if (question.type === 'multiple_choice') {
      gradableCount++;
      const userIndex = typeof userAnswer === 'string' ? parseInt(userAnswer, 10) : userAnswer;
      correct = userIndex === question.correct_index;
      if (!correct) {
        question.tags.forEach((t) => weakTags.add(t));
      }
      gradedAnswers.push({
        question_id: question.id,
        correct,
        user_answer: userIndex,
        correct_answer: question.correct_index,
        explanation: question.explanation,
        tags: question.tags,
      });
    } else if (question.type === 'numeric') {
      gradableCount++;
      const userNum = typeof userAnswer === 'string' ? parseFloat(userAnswer) : userAnswer;
      correct = Math.abs(userNum - question.correct) <= question.tolerance;
      if (!correct) {
        question.tags.forEach((t) => weakTags.add(t));
      }
      gradedAnswers.push({
        question_id: question.id,
        correct,
        user_answer: userNum,
        correct_answer: question.correct,
        explanation: question.explanation,
        tags: question.tags,
      });
    } else {
      // free_text
      gradingStatus = 'pending';
      gradedAnswers.push({
        question_id: question.id,
        correct: false,
        user_answer: String(userAnswer ?? ''),
        explanation: question.explanation,
        tags: question.tags,
        grading_status: gradingStatus,
      });
      // free text does not count toward auto-grade until LLM wired
    }

    if (correct) {
      correctCount++;
    }
  }

  const totalQuestions = quiz.questions.length;
  // Score is based on gradable questions (MCQ + numeric). Free text excluded until graded.
  const score = gradableCount > 0 ? correctCount / gradableCount : 0;
  const passed = score >= quiz.passing_threshold;

  return {
    week: quiz.week,
    day: quiz.day,
    score,
    passed,
    total_questions: totalQuestions,
    correct_count: correctCount,
    graded_answers: gradedAnswers,
    weak_tags: Array.from(weakTags),
  };
}
