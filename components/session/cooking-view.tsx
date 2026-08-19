'use client';

import {
  useConversation,
  useConversationClientTool,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  RECIPES,
  type IngredientState,
  type Recipe,
} from '@/lib/recipes';
import {
  detectStepCommand,
  resolveStepMove,
  screenCompletedMessage,
  screenStepMessage,
  type StepPosition,
} from '@/lib/step-commands';
import { MicIcon, MicOffIcon, XIcon } from '../icons';
import { CompletedCard } from './completed-card';
import { IngredientsPanel } from './ingredients-panel';
import { ReadyRoom } from './ready-room';
import { SessionHeader } from './session-header';
import { StepList } from './step-list';
import { TimerStack, type CookingTimer } from './timers';

type SessionState = {
  timers: CookingTimer[];
  // null until a step is highlighted (by the agent or by a voice command).
  step: StepPosition | null;
  recipeName: string | null;
  ingredients: IngredientState[];
  completed: boolean;
};

function initialSession(recipe: Recipe | null): SessionState {
  return {
    timers: [],
    step: null,
    recipeName: recipe?.name ?? null,
    ingredients: (recipe?.ingredients ?? []).map((i) => ({
      ...i,
      checked: false,
    })),
    completed: false,
  };
}

function ingredientKey(name: string) {
  return name.trim().toLowerCase();
}

export function CookingView({
  initialRecipe,
  onStart,
  startError,
}: {
  initialRecipe: Recipe | null;
  onStart: () => Promise<void> | void;
  startError?: string | null;
}) {
  const { status, message } = useConversationStatus();
  const { endSession } = useConversationControls();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking, isListening } = useConversationMode();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(() =>
    initialSession(initialRecipe),
  );
  const [starting, setStarting] = useState(false);

  useConversationClientTool('startTimer', (parameters) => {
    const { seconds, label } = parameters as { seconds: number; label: string };
    const id = `${label}-${Date.now()}`;
    setSession((s) => ({
      ...s,
      timers: [
        ...s.timers.filter((t) => !t.isDone),
        { id, label, totalSeconds: seconds, secondsLeft: seconds, isDone: false },
      ],
    }));
    return `Started ${label} for ${seconds}s.`;
  });

  useConversationClientTool('setCurrentStep', (parameters) => {
    const { index, total } = parameters as { index: number; total: number };
    setSession((s) => ({
      ...s,
      step: { index, total },
      completed: false,
    }));
    return `Step ${index} of ${total} highlighted.`;
  });

  useConversationClientTool('setActiveRecipe', (parameters) => {
    const { name, slug } = parameters as { name: string; slug?: string };
    const matched = slug ? RECIPES.find((r) => r.slug === slug) : null;
    setSession((s) => ({
      ...s,
      recipeName: name,
      ingredients:
        s.ingredients.length > 0
          ? s.ingredients
          : (matched?.ingredients ?? []).map((i) => ({ ...i, checked: false })),
      step: null,
      completed: false,
    }));
    return `Recipe set: ${name}`;
  });

  useConversationClientTool('setIngredients', (parameters) => {
    const { items } = parameters as {
      items: { item: string; qty: string; note?: string }[];
    };
    setSession((s) => ({
      ...s,
      ingredients: items.map((i) => ({ ...i, checked: false })),
    }));
    return `Loaded ${items.length} ingredients.`;
  });

  useConversationClientTool('checkIngredient', (parameters) => {
    const { name } = parameters as { name: string };
    const target = ingredientKey(name);
    setSession((s) => ({
      ...s,
      ingredients: s.ingredients.map((i) =>
        ingredientKey(i.item) === target || i.item.toLowerCase().includes(target)
          ? { ...i, checked: true }
          : i,
      ),
    }));
    return `Checked ${name}.`;
  });

  useConversationClientTool('completeRecipe', () => {
    setSession((s) => ({ ...s, completed: true }));
    return 'Marked complete.';
  });

  // Voice fallback: advance the highlighted step from the user's own words,
  // so the screen follows even if the agent forgets to call setCurrentStep.
  const { sendUserMessage } = useConversation({
    onMessage: ({ message: text, role }) => {
      if (role !== 'user') return;
      const cmd = detectStepCommand(text);
      if (!cmd) return;
      const stepCount = initialRecipe?.steps.length ?? 0;
      setSession((s) => {
        const move = resolveStepMove(cmd, s.step, stepCount);
        if (move.kind === 'stay') return s;
        if (move.kind === 'complete') return { ...s, completed: true };
        return {
          ...s,
          step: { index: move.index, total: move.total },
          completed: false,
        };
      });
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setSession((s) => {
        const running = s.timers.some((t) => !t.isDone);
        if (!running) return s;
        return {
          ...s,
          timers: s.timers.map((t) => {
            if (t.isDone) return t;
            return t.secondsLeft <= 1
              ? { ...t, secondsLeft: 0, isDone: true }
              : { ...t, secondsLeft: t.secondsLeft - 1 };
          }),
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const onDismissTimer = (id: string) =>
    setSession((s) => ({ ...s, timers: s.timers.filter((t) => t.id !== id) }));

  const toggleIngredient = (idx: number) =>
    setSession((s) => ({
      ...s,
      ingredients: s.ingredients.map((it, i) =>
        i === idx ? { ...it, checked: !it.checked } : it,
      ),
    }));

  // Screen taps move the UI immediately and tell the agent via a prefixed
  // message (see lib/step-commands.ts) so the voice follows without the
  // transcript re-triggering the voice fallback above.
  const handleManualStep = (index: number) => {
    if (!initialRecipe) return;
    setSession((s) => ({
      ...s,
      step: { index, total: s.step?.total ?? initialRecipe.steps.length },
      completed: false,
    }));
    sendUserMessage(screenStepMessage(index));
  };

  const handleManualComplete = () => {
    setSession((s) => ({ ...s, completed: true }));
    sendUserMessage(screenCompletedMessage());
  };

  const sessionStarted = status === 'connected' || status === 'connecting';

  const handleStart = useCallback(async () => {
    if (starting || sessionStarted) return;
    setStarting(true);
    try {
      await onStart();
    } finally {
      setStarting(false);
    }
  }, [starting, sessionStarted, onStart]);

  // The /cook page redirects home when the slug is invalid; render nothing
  // while that happens.
  if (!initialRecipe) return null;

  const recipeName = session.recipeName ?? initialRecipe.name;
  const totalSteps = initialRecipe.steps.length;
  const currentIndex = session.step?.index ?? 0;
  const progress = session.completed
    ? 1
    : totalSteps > 0
    ? Math.min(currentIndex, totalSteps) / totalSteps
    : 0;
  const ingredientsReady = session.ingredients.filter((i) => i.checked).length;

  if (!sessionStarted) {
    return (
      <ReadyRoom
        recipe={initialRecipe}
        ingredients={session.ingredients}
        onToggleIngredient={toggleIngredient}
        onStart={handleStart}
        starting={starting}
        startError={startError}
        onClose={() => router.push('/')}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span className="absolute left-1/2 top-[-70px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-butter/50 blur-3xl" />
        <span className="absolute right-[-90px] top-[220px] h-72 w-72 rounded-full bg-terracotta/12 blur-3xl" />
        <span className="absolute left-[-90px] top-[560px] h-72 w-72 rounded-full bg-forest/10 blur-3xl" />
      </div>

      <div className="relative z-10 px-5 pt-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={endSession}
            aria-label="End session"
            className="flex items-center gap-1.5 rounded-full border border-line bg-paper/80 py-1.5 pl-2.5 pr-3.5 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-ink-faint hover:text-ink"
          >
            <XIcon className="h-3.5 w-3.5" />
            End session
          </button>
          <ConnectionChip status={status} message={message} />
        </div>
      </div>

      <div className="relative z-10 mx-auto my-auto w-full max-w-xl px-5 py-8 lg:max-w-6xl lg:px-8 lg:py-10">
        {session.completed ? (
          <div className="mx-auto w-full max-w-xl">
            <CompletedCard
              recipeName={recipeName}
              recipe={initialRecipe}
              onEnd={endSession}
            />
          </div>
        ) : (
          <>
            <SessionHeader
              recipeName={recipeName}
              currentIndex={currentIndex}
              totalSteps={totalSteps}
              progress={progress}
              isSpeaking={isSpeaking}
              isListening={isListening}
              status={status}
            />

            <div className="mt-7 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
              <div className="lg:col-span-8">
                <StepList
                  steps={initialRecipe.steps}
                  currentIndex={currentIndex}
                  completed={session.completed}
                  isSpeaking={isSpeaking}
                  onGoToStep={handleManualStep}
                  onComplete={handleManualComplete}
                />
              </div>

              <div className="mt-6 flex flex-col gap-5 lg:col-span-4 lg:mt-0">
                <TimerStack timers={session.timers} onDismiss={onDismissTimer} />
                <IngredientsPanel
                  ingredients={session.ingredients}
                  readyCount={ingredientsReady}
                  totalCount={session.ingredients.length}
                  onToggle={toggleIngredient}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <BottomBar isMuted={isMuted} onToggleMute={() => setMuted(!isMuted)} />
    </div>
  );
}

function BottomBar({
  isMuted,
  onToggleMute,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-10">
      <div className="pointer-events-auto mx-auto flex w-fit items-center justify-center rounded-full border border-line bg-paper/90 p-1.5 shadow-[0_18px_45px_-30px_rgba(26,20,16,0.55)] backdrop-blur">
        <button
          onClick={onToggleMute}
          className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            isMuted
              ? 'bg-ink text-cream'
              : 'text-ink-soft hover:bg-cream hover:text-ink'
          }`}
        >
          {isMuted ? (
            <MicOffIcon className="h-4 w-4" />
          ) : (
            <MicIcon className="h-4 w-4" />
          )}
          {isMuted ? 'Mic off' : 'Mic on'}
        </button>
      </div>
    </div>
  );
}

function ConnectionChip({
  status,
  message,
}: {
  status: string;
  message?: string;
}) {
  const label =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
      ? 'Connecting'
      : status === 'error'
      ? message || 'Connection trouble'
      : 'Idle';
  const dot =
    status === 'connected'
      ? 'bg-forest'
      : status === 'error'
      ? 'bg-terracotta'
      : 'bg-ink-faint';
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint backdrop-blur">
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot}`}
        style={
          status === 'connecting'
            ? { animation: 'orb-pulse 1.2s ease-in-out infinite' }
            : undefined
        }
      />
      {label}
    </span>
  );
}
