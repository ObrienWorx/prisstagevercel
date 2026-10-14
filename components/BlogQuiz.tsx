'use client';

import { useState } from 'react';

interface Question {
  q: string;
  opts: string[];
  correct: number;
  explanation: string;
}

const LABELS = ['A', 'B', 'C', 'D'];

function QuestionBlock({
  question,
  index,
  isOpen,
  onToggle,
}: {
  question: Question;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === question.correct;

  const reset = () => setSelected(null);

  return (
    <div
      className={`bq-q-accordion${isOpen ? ' is-open' : ''}${
        answered ? (isCorrect ? ' is-correct' : ' is-wrong') : ''
      }`}
    >
      <button
        type="button"
        className="bq-q-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="bq-q-title-wrap">
          <span className="bq-q-num">Q{index + 1}</span>
          <span className="bq-q-text">{question.q}</span>
        </div>
        <div className="bq-q-meta">
          {answered && (
            <span className={`bq-status-badge ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? '✓ Correct' : '✕ Try again'}
            </span>
          )}
          <span className={`bq-q-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
            ▼
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="bq-q-body">
          <div className="bq-options">
            {question.opts.map((opt, idx) => {
              let cls = 'bq-option';
              if (answered) {
                if (idx === question.correct) cls += ' bq-correct';
                else if (idx === selected) cls += ' bq-wrong';
                else cls += ' bq-dim';
              }
              return (
                <button
                  key={idx}
                  type="button"
                  className={cls}
                  onClick={() => !answered && setSelected(idx)}
                  disabled={answered && idx !== question.correct && idx !== selected}
                >
                  <span className="bq-label">{LABELS[idx]}</span>
                  <span className="bq-opt-text">{opt}</span>
                  {answered && idx === question.correct && (
                    <span className="bq-icon bq-icon-correct">✓</span>
                  )}
                  {answered && idx === selected && idx !== question.correct && (
                    <span className="bq-icon bq-icon-wrong">✕</span>
                  )}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="bq-feedback">
              <div className={`bq-verdict ${isCorrect ? 'bq-verdict-correct' : 'bq-verdict-wrong'}`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </div>
              {question.explanation && (
                <p className="bq-explanation">{question.explanation}</p>
              )}
              {!isCorrect && (
                <button type="button" className="bq-try-again" onClick={reset}>
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BlogQuiz({ questions }: { questions: Question[] }) {
  // All questions closed by default
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  if (!questions || !questions.length) return null;

  const toggle = (idx: number) => {
    setOpenMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const allOpen = questions.every((_, i) => !!openMap[i]);
  const toggleAll = () => {
    if (allOpen) {
      setOpenMap({});
    } else {
      const next: Record<number, boolean> = {};
      questions.forEach((_, i) => {
        next[i] = true;
      });
      setOpenMap(next);
    }
  };

  return (
    <div className="bq-section">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">
              📝
            </span>
            <h2 className="bq-heading mb-0">Test your knowledge</h2>
          </div>
          <p className="bq-subheading mb-0">
            {questions.length} practice {questions.length === 1 ? 'question' : 'questions'} — click any question to expand and answer.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: 8 }}
          onClick={toggleAll}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="bq-list">
        {questions.map((q, i) => (
          <QuestionBlock
            key={i}
            question={q}
            index={i}
            isOpen={!!openMap[i]}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>
    </div>
  );
}
