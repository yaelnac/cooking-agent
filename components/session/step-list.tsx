'use client';

import { useEffect, useRef } from 'react';
import { formatSeconds } from '@/lib/format';
import type { RecipeStep } from '@/lib/recipes';
import { ArrowIcon, CheckIcon, ClockIcon } from '../icons';

type StepStatus = 'done' | 'current' | 'upcoming';

export function StepList({
  steps,
  currentIndex,
  completed,
  isSpeaking,
  onGoToStep,
  onComplete,
}: {
  steps: RecipeStep[];
  currentIndex: number;
  completed: boolean;
  isSpeaking: boolean;
  onGoToStep: (index: number) => void;
  onComplete: () => void;
}) {
  const effectiveCurrent = completed
    ? steps.length + 1
    : Math.min(Math.max(currentIndex, 1), steps.length);
  const currentRef = useRef<HTMLLIElement | null>(null);
  const firstRun = useRef(true);

  // Keep the highlighted step in view as it moves, but not on initial mount.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [effectiveCurrent]);

  return (
    <ol className="anim-rise flex flex-col">
      {steps.map((s, i) => {
        const num = i + 1;
        const status: StepStatus =
          num < effectiveCurrent
            ? 'done'
            : num === effectiveCurrent
            ? 'current'
            : 'upcoming';
        return (
          <li key={i} ref={status === 'current' ? currentRef : null}>
            <StepItem
              step={s}
              num={num}
              status={status}
              isLast={i === steps.length - 1}
              isSpeaking={isSpeaking}
              onGoToStep={onGoToStep}
              onComplete={onComplete}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StepItem({
  step,
  num,
  status,
  isLast,
  isSpeaking,
  onGoToStep,
  onComplete,
}: {
  step: RecipeStep;
  num: number;
  status: StepStatus;
  isLast: boolean;
  isSpeaking: boolean;
  onGoToStep: (index: number) => void;
  onComplete: () => void;
}) {
  const isCurrent = status === 'current';
  const isDone = status === 'done';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`relative grid shrink-0 place-items-center rounded-full font-display text-sm font-semibold ${
            isCurrent
              ? 'h-9 w-9 bg-terracotta text-paper shadow-[0_12px_24px_-10px_rgba(223,98,56,0.85)]'
              : isDone
              ? 'h-8 w-8 bg-forest text-paper'
              : 'h-8 w-8 border border-line bg-paper text-ink-faint'
          }`}
        >
          {isCurrent && isSpeaking && (
            <span
              className="absolute inset-0 rounded-full bg-terracotta/35"
              style={{ animation: 'ring-ripple 1.7s ease-out infinite' }}
            />
          )}
          <span className="relative">
            {isDone ? <CheckIcon className="h-4 w-4" /> : num}
          </span>
        </span>
        {!isLast && (
          <span
            className={`mt-1.5 w-0.5 flex-1 rounded-full ${
              isDone ? 'bg-forest/30' : 'bg-line'
            }`}
          />
        )}
      </div>

      <div
        className={`min-w-0 flex-1 ${
          isLast ? '' : isCurrent ? 'pb-7' : 'pb-5'
        }`}
      >
        {isCurrent ? (
          <div
            className={`anim-step-in rounded-3xl border-2 bg-paper p-5 transition-shadow duration-500 md:p-6 ${
              isSpeaking
                ? 'border-terracotta/55 shadow-[0_28px_64px_-34px_rgba(223,98,56,0.6)]'
                : 'border-terracotta/30 shadow-[0_24px_58px_-40px_rgba(223,98,56,0.45)]'
            }`}
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-terracotta-deep">
              <span
                className="h-1.5 w-1.5 rounded-full bg-terracotta"
                style={
                  isSpeaking
                    ? { animation: 'orb-pulse 1.2s ease-in-out infinite' }
                    : { opacity: 0.4 }
                }
              />
              {isSpeaking ? 'Reading this step aloud' : 'You’re on this step'}
            </span>
            <h3 className="mt-2.5 font-display text-xl leading-snug tracking-tight text-ink md:text-2xl">
              {step.title}
            </h3>
            <p className="mt-2.5 text-[17px] leading-relaxed text-ink md:text-[18px]">
              {step.body}
            </p>
            {step.timer && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-butter/70 px-3 py-1 text-xs font-medium text-ink">
                <ClockIcon className="h-3.5 w-3.5" />
                {step.timer.label} · {formatSeconds(step.timer.seconds)}
              </span>
            )}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3.5">
              <span className="text-xs leading-relaxed text-ink-faint">
                Say <span className="font-semibold text-ink-soft">“done”</span>{' '}
                or <span className="font-semibold text-ink-soft">“repeat”</span>
              </span>
              <button
                onClick={() => (isLast ? onComplete() : onGoToStep(num + 1))}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-cream/50 px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-terracotta/45 hover:bg-paper hover:text-terracotta-deep"
              >
                {isLast ? 'Finish' : 'Next step'}
                {isLast ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`pt-1 text-sm font-medium leading-snug ${
              isDone ? 'text-ink-soft' : 'text-ink-faint'
            }`}
          >
            {step.title}
          </p>
        )}
      </div>
    </div>
  );
}
