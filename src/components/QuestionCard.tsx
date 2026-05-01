'use client';

import { useState, useCallback } from 'react';
import { ClientQuestion } from '@/lib/types';
import MathText from '@/components/MathText';
import styles from './QuestionCard.module.css';

interface Props {
  question: ClientQuestion;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (answer: string | number) => void;
}

export default function QuestionCard({ question, questionNumber, totalQuestions, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | number>('');

  const handleSubmit = useCallback(() => {
    if (selected === '') return;
    onSubmit(selected);
    setSelected('');
  }, [selected, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selected !== '') {
      handleSubmit();
    }
  }, [selected, handleSubmit]);

  return (
    <div className={styles.container} onKeyDown={handleKeyDown}>
      <div className={styles.header}>
        <span className={styles.progressText}>
          {questionNumber} / {totalQuestions}
        </span>
        <span className={styles.typeTag}>{question.type.replace('_', ' ')}</span>
      </div>

      <h2 className={styles.questionText}>
        <MathText text={question.text} />
      </h2>

      {question.type === 'multiple_choice' && (
        <div className={styles.options} role="radiogroup" aria-label="Answer options">
          {question.options.map((opt, idx) => {
            const isSelected = selected === String(idx);
            return (
              <button
                key={idx}
                type="button"
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => setSelected(String(idx))}
                role="radio"
                aria-checked={isSelected}
              >
                <span className={`${styles.optionLetter} ${isSelected ? styles.optionLetterSelected : ''}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className={styles.optionText}>
                  <MathText text={opt} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'numeric' && (
        <div className={styles.inputWrap}>
          <input
            type="number"
            step="any"
            className={styles.input}
            placeholder="Enter your answer..."
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {question.type === 'free_text' && (
        <div className={styles.inputWrap}>
          <textarea
            className={styles.textarea}
            rows={6}
            placeholder="Write your answer here..."
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            autoFocus
          />
          <p className={styles.textareaHint}>
            This will be graded by an LLM later. For now, write your best answer.
          </p>
        </div>
      )}

      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={selected === ''}
      >
        {questionNumber === totalQuestions ? 'Submit Final Answer' : 'Submit Answer'}
      </button>
    </div>
  );
}
