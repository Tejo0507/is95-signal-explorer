/**
 * KnowledgeCheck.tsx, end-of-module quiz.
 *
 * Answers are revealed one question at a time and stay revealed, with the
 * explanation shown whether the reader was right or wrong (being right for the
 * wrong reason is the common failure mode with this material). Reset clears
 * every answer in the module.
 */

import { useState } from 'react';
import { quizFor } from '../lib/quiz';
import { ResetButton } from './ui';

const KEYS = ['a', 'b', 'c', 'd', 'e'];

export function KnowledgeCheck({ moduleId, title = 'Knowledge check' }: { moduleId: string; title?: string }) {
  const questions = quizFor(moduleId);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) return null;

  const answered = questions.filter((q) => answers[q.id] !== undefined);
  const correct = answered.filter((q) => answers[q.id] === q.correctId);

  return (
    <section className="quiz">
      <header className="quiz__head">
        <div>
          <p className="eyebrow eyebrow--brick">{title}</p>
          <p className="small muted" style={{ margin: '0.35rem 0 0', maxWidth: '30rem' }}>
            These test whether the distinctions landed, not whether you memorised the numbers.
          </p>
        </div>
        <div className="btn-row">
          <span className="quiz__score" aria-live="polite">
            {correct.length} / {questions.length} correct
            {answered.length < questions.length ? ` · ${questions.length - answered.length} unanswered` : ''}
          </span>
          <ResetButton onReset={() => setAnswers({})} label="Clear answers" />
        </div>
      </header>

      <div className="quiz__body">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          const isAnswered = chosen !== undefined;
          const wasRight = chosen === q.correctId;

          return (
            <div className="quiz__q" key={q.id}>
              <p className="quiz__prompt">
                <span className="quiz__prompt-num">Q{qi + 1}</span>
                <span>{q.prompt}</span>
              </p>

              <div className="quiz__options">
                {q.options.map((opt, oi) => {
                  // Once answered: mark the right answer, and mark the chosen
                  // one as wrong if it was not the right one.
                  let state: string | undefined;
                  if (isAnswered) {
                    if (opt.id === q.correctId) state = 'correct';
                    else if (opt.id === chosen) state = 'wrong';
                  }
                  return (
                    <button
                      type="button"
                      className="quiz__option"
                      key={opt.id}
                      data-state={state}
                      disabled={isAnswered}
                      aria-pressed={chosen === opt.id}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                    >
                      <span className="quiz__option-key">{KEYS[oi]}</span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered ? (
                <div className="quiz__feedback" data-correct={wasRight} role="status">
                  <span className="quiz__verdict">{wasRight ? 'Correct' : 'Not quite'}</span>
                  <p>{q.explanation}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
