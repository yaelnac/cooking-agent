'use client';

import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, type Recipe, type RecipeCategory, RECIPES } from './recipes';

const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

type CookingTimer = {
  id: string;
  label: string;
  totalSeconds: number;
  secondsLeft: number;
  isDone: boolean;
};

type ActiveRecipe = {
  name: string;
  caloriesLabel?: string;
  proteinLabel?: string;
};

type CurrentStep = {
  index: number;
  total: number;
  text: string;
};

type SessionState = {
  timers: CookingTimer[];
  step: CurrentStep | null;
  recipe: ActiveRecipe | null;
  completed: boolean;
};

const INITIAL_SESSION: SessionState = {
  timers: [],
  step: null,
  recipe: null,
  completed: false,
};

export default function Page() {
  return (
    <ConversationProvider>
      <App />
    </ConversationProvider>
  );
}

function App() {
  const { status } = useConversationStatus();
  const isCooking = status === 'connected' || status === 'connecting';

  return (
    <main className="flex w-full flex-1 flex-col">
      {isCooking ? (
        <div className="mx-auto w-full max-w-md">
          <CookingView />
        </div>
      ) : (
        <HomeView />
      )}
    </main>
  );
}

function HomeView() {
  const [category, setCategory] = useState<RecipeCategory>('Breakfast');
  const { startSession } = useConversationControls();
  const { status } = useConversationStatus();

  const filtered = useMemo(
    () => RECIPES.filter((r) => r.category === category),
    [category],
  );

  const quickPicks = useMemo(
    () => RECIPES.filter((r) => r.minutes <= 5).slice(0, 6),
    [],
  );

  const counts = useMemo(() => {
    const map: Record<RecipeCategory, number> = {
      Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0,
    };
    for (const r of RECIPES) map[r.category]++;
    return map;
  }, []);

  const handleStart = useCallback(
    async (recipe?: Recipe) => {
      if (!agentId) {
        alert('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
        return;
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const overrides = recipe
        ? {
            conversationConfigOverride: {
              agent: {
                firstMessage: `Let's make ${recipe.name}. Ready when you are.`,
                prompt: {
                  prompt: `The user just selected the recipe "${recipe.name}" (${recipe.category}). Macros: ${recipe.calories[0]}-${recipe.calories[1]} kcal, ${recipe.protein[0]}-${recipe.protein[1]}g protein. Walk them through it one step at a time, wait for "done", and call client tools setActiveRecipe, setCurrentStep, startTimer, and completeRecipe to drive the screen.`,
                },
              },
            },
          }
        : undefined;
      startSession({
        agentId,
        connectionType: 'websocket',
        ...overrides,
      });
    },
    [startSession],
  );

  return (
    <div className="flex flex-col">
      <Hero onTap={() => handleStart()} status={status} />
      <QuickPicks recipes={quickPicks} onPick={handleStart} />
      <BrowseAll
        category={category}
        counts={counts}
        recipes={filtered}
        onChangeCategory={setCategory}
        onPick={handleStart}
      />
    </div>
  );
}

function todayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function Hero({ onTap, status }: { onTap: () => void; status: string }) {
  const isConnecting = status === 'connecting';
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    // post-mount sync of user-local time; can't run during SSR without hydration mismatch
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setDateLabel(todayLabel(new Date()));
  }, []);

  return (
    <section className="relative overflow-hidden">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[55%] -z-0 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-butter/55 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[28%] top-[70%] -z-0 h-56 w-56 -translate-x-1/2 rounded-full bg-terracotta/12 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-[24%] top-[30%] -z-0 h-48 w-48 rounded-full bg-forest/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-5 py-12 text-center md:gap-6 md:py-16">
        <span className="min-h-[1em] text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          {dateLabel}
        </span>

        <h1 className="font-display text-[26px] leading-tight tracking-tight md:text-[34px]">
          Tap. Talk.{' '}
          <span className="italic text-terracotta">Cook.</span>
        </h1>

        <IdleOrb onTap={onTap} loading={isConnecting} />

        <p className="text-sm text-ink-faint">
          {isConnecting
            ? 'Warming up the kitchen…'
            : 'or pick something below.'}
        </p>
      </div>
    </section>
  );
}

function CookingView() {
  const { status, message } = useConversationStatus();
  const { endSession } = useConversationControls();
  const { isMuted, setMuted } = useConversationInput();
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);

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
    const { index, total, text } = parameters as {
      index: number;
      total: number;
      text: string;
    };
    setSession((s) => ({ ...s, step: { index, total, text }, completed: false }));
    return `Step ${index}/${total} shown.`;
  });

  useConversationClientTool('setActiveRecipe', (parameters) => {
    const { name, calories, protein } = parameters as {
      name: string;
      calories?: string;
      protein?: string;
    };
    setSession((s) => ({
      ...s,
      recipe: { name, caloriesLabel: calories, proteinLabel: protein },
      step: null,
      completed: false,
    }));
    return `Recipe set: ${name}`;
  });

  useConversationClientTool('completeRecipe', () => {
    setSession((s) => ({ ...s, completed: true }));
    return 'Marked complete.';
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setSession((s) => {
        if (s.timers.length === 0) return s;
        let changed = false;
        const next = s.timers.map((t) => {
          if (t.isDone) return t;
          if (t.secondsLeft <= 1) {
            changed = true;
            return { ...t, secondsLeft: 0, isDone: true };
          }
          changed = true;
          return { ...t, secondsLeft: t.secondsLeft - 1 };
        });
        return changed ? { ...s, timers: next } : s;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const onDismissTimer = (id: string) =>
    setSession((s) => ({ ...s, timers: s.timers.filter((t) => t.id !== id) }));

  return (
    <div className="flex min-h-screen flex-col px-5 pb-32 pt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={endSession}
          className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-ink-faint"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Wrap it up
        </button>
        <ConnectionPill status={status} message={message} />
      </div>

      <RecipeHeader recipe={session.recipe} />
      <VoiceOrb status={status} />
      <StepCard step={session.step} completed={session.completed} />
      <TimerStack timers={session.timers} onDismiss={onDismissTimer} />
      <ListenHint completed={session.completed} />

      <BottomBar
        isMuted={isMuted}
        onToggleMute={() => setMuted(!isMuted)}
        onEnd={endSession}
      />
    </div>
  );
}

function BottomBar({
  isMuted,
  onToggleMute,
  onEnd,
}: {
  isMuted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur">
        <button
          onClick={onToggleMute}
          className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            isMuted
              ? 'bg-ink text-cream'
              : 'bg-cream text-ink hover:bg-line-soft'
          }`}
        >
          {isMuted ? (
            <MicOffIcon className="h-4 w-4" />
          ) : (
            <MicIcon className="h-4 w-4" />
          )}
          {isMuted ? 'Mic off' : 'Mic on'}
        </button>
        <button
          onClick={onEnd}
          className="flex items-center gap-2 rounded-full bg-terracotta px-4 py-2.5 text-sm font-medium text-paper shadow-[0_8px_20px_-8px_rgba(223,98,56,0.6)] hover:bg-terracotta-deep"
        >
          End session
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ConnectionPill({
  status,
  message,
}: {
  status: string;
  message?: string;
}) {
  const tone =
    status === 'connected'
      ? 'bg-forest-soft text-forest'
      : status === 'error'
      ? 'bg-terracotta-soft text-terracotta-deep'
      : 'bg-cream text-ink-soft border border-line';
  const label =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
      ? 'Connecting…'
      : status === 'error'
      ? message || 'Trouble connecting'
      : 'Idle';
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'connected' ? 'bg-forest' : 'bg-ink-faint'
        }`}
      />
      {label}
    </span>
  );
}

function RecipeHeader({ recipe }: { recipe: ActiveRecipe | null }) {
  if (!recipe) {
    return (
      <div className="mt-5 flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          Cooking together
        </span>
        <h2 className="font-display text-2xl leading-tight tracking-tight text-ink">
          Tell your chef what to make.
        </h2>
      </div>
    );
  }
  return (
    <div className="mt-5 flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        Now cooking
      </span>
      <h2 className="font-display text-[26px] leading-[1.1] tracking-tight">
        {recipe.name}
      </h2>
      {(recipe.proteinLabel || recipe.caloriesLabel) && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.proteinLabel && (
            <span className="rounded-full bg-forest-soft px-2.5 py-1 text-[11px] font-medium text-forest">
              {recipe.proteinLabel} protein
            </span>
          )}
          {recipe.caloriesLabel && (
            <span className="rounded-full bg-butter px-2.5 py-1 text-[11px] font-medium text-ink">
              {recipe.caloriesLabel} kcal
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function VoiceOrb({ status }: { status: string }) {
  const { isSpeaking, isListening } = useConversationMode();
  const isConnecting = status === 'connecting';
  const label = isConnecting
    ? 'Warming up…'
    : isSpeaking
    ? 'Your chef is talking'
    : isListening
    ? 'Listening — say it'
    : 'Standing by';

  return (
    <div className="my-6 flex flex-col items-center gap-3">
      <div className="relative grid h-40 w-40 place-items-center">
        {isSpeaking && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-terracotta/25"
              style={{ animation: 'ring-ripple 1.6s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full bg-terracotta/20"
              style={{ animation: 'ring-ripple 1.6s ease-out 0.5s infinite' }}
            />
          </>
        )}
        {!isSpeaking && (
          <span
            className="absolute inset-2 rounded-full bg-terracotta/15"
            style={{ animation: 'orb-breathe 3.2s ease-in-out infinite' }}
          />
        )}
        <span className="absolute inset-6 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_22px_45px_-15px_rgba(223,98,56,0.6)]" />
        <span className="relative z-10">
          {isListening ? <WaveBars /> : <MicIcon className="h-8 w-8 text-paper" />}
        </span>
      </div>
      <p className="text-sm font-medium text-ink-soft">{label}</p>
    </div>
  );
}

function WaveBars() {
  return (
    <span className="flex h-8 items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-1 origin-center rounded-full bg-paper"
          style={{
            height: '100%',
            animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function StepCard({
  step,
  completed,
}: {
  step: CurrentStep | null;
  completed: boolean;
}) {
  if (completed) {
    return (
      <div className="anim-fade-up mt-2 flex flex-col items-center gap-2 rounded-3xl border border-forest/20 bg-forest-soft p-6 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-paper">
          <CheckIcon className="h-5 w-5" />
        </span>
        <h3 className="font-display text-xl tracking-tight text-forest">
          Plated. Nicely done.
        </h3>
        <p className="text-sm text-forest/80">Eat first. Dishes later.</p>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="mt-2 rounded-3xl border border-dashed border-line bg-paper/60 p-6 text-center">
        <p className="text-sm text-ink-faint">
          Say a recipe out loud — or pick one before starting next time.
        </p>
      </div>
    );
  }

  const progress = Math.min(1, step.index / step.total);

  return (
    <div className="anim-fade-up mt-2 flex flex-col gap-4 rounded-3xl border border-line bg-paper p-5 shadow-[0_4px_18px_-8px_rgba(26,20,16,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">
          Step {step.index} <span className="text-ink-faint">/ {step.total}</span>
        </span>
        <span className="text-[11px] text-ink-faint">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-terracotta transition-[width] duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="font-display text-[22px] leading-snug tracking-tight">
        {step.text}
      </p>
    </div>
  );
}

function TimerStack({
  timers,
  onDismiss,
}: {
  timers: CookingTimer[];
  onDismiss: (id: string) => void;
}) {
  if (timers.length === 0) return null;

  const sorted = [...timers].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? -1 : 1;
    return a.secondsLeft - b.secondsLeft;
  });

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          Timers
        </span>
        <span className="text-[11px] text-ink-faint">
          {timers.filter((t) => !t.isDone).length} running
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((t) => (
          <li key={t.id}>
            <TimerRow timer={t} onDismiss={() => onDismiss(t.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimerRow({
  timer,
  onDismiss,
}: {
  timer: CookingTimer;
  onDismiss: () => void;
}) {
  const ratio = timer.totalSeconds
    ? 1 - timer.secondsLeft / timer.totalSeconds
    : 0;

  return (
    <div
      className={`anim-fade-up flex items-center justify-between gap-3 rounded-2xl border p-3 ${
        timer.isDone
          ? 'border-butter-deep/40 bg-butter/60'
          : 'border-line bg-paper'
      }`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{timer.label}</span>
          <span className="font-mono text-base tabular-nums text-ink">
            {timer.isDone ? 'Ding!' : formatSeconds(timer.secondsLeft)}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            className={`h-full rounded-full ${
              timer.isDone ? 'bg-butter-deep' : 'bg-terracotta'
            }`}
            style={{ width: `${Math.min(1, ratio) * 100}%` }}
          />
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss timer"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-line-soft"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ListenHint({ completed }: { completed: boolean }) {
  if (completed) return null;
  return (
    <p className="mt-6 text-center text-xs text-ink-faint">
      Say <span className="font-semibold text-ink">“done”</span> to move on ·{' '}
      Say <span className="font-semibold text-ink">“repeat”</span> to hear it again
    </p>
  );
}

function QuickPicks({
  recipes,
  onPick,
}: {
  recipes: Recipe[];
  onPick: (r: Recipe) => void;
}) {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-2 md:px-8 md:pb-14">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl tracking-tight md:text-2xl">
            Need it <span className="italic text-terracotta">fast</span>?
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            Under 5 min
          </span>
        </div>

        <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-6">
          {recipes.map((r, i) => (
            <div
              key={r.slug}
              className="anim-fade-up w-[78%] min-w-[78%] snap-start md:w-auto md:min-w-0"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <QuickPickCard recipe={r} onPick={() => onPick(r)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickPickCard({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) {
  const accent = categoryAccent(recipe.category);
  return (
    <button
      onClick={onPick}
      className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-line bg-paper p-4 text-left transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent.chip}`}>
          {recipe.category}
        </span>
        <span className="font-mono text-[11px] text-ink-faint">
          ~{recipe.minutes}m
        </span>
      </div>
      <h3 className="font-display text-lg leading-tight tracking-tight">
        {recipe.name}
      </h3>
      <p className="flex-1 text-sm text-ink-soft">{recipe.angle}</p>
      <div className="flex items-end justify-between">
        <span className="font-display text-2xl tracking-tight text-forest">
          {recipe.protein[0]}&ndash;{recipe.protein[1]}
          <span className="ml-1 text-xs font-medium text-forest/70">g protein</span>
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-cream text-ink transition group-hover:bg-terracotta group-hover:text-paper">
          <ArrowIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function BrowseAll({
  category,
  counts,
  recipes,
  onChangeCategory,
  onPick,
}: {
  category: RecipeCategory;
  counts: Record<RecipeCategory, number>;
  recipes: Recipe[];
  onChangeCategory: (c: RecipeCategory) => void;
  onPick: (r: Recipe) => void;
}) {
  return (
    <section id="browse">
      <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-2 md:px-8 md:pb-20">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl tracking-tight md:text-3xl">
            Your <span className="italic">menu</span>.
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            {Object.values(counts).reduce((a, b) => a + b, 0)} recipes
          </span>
        </div>

        <CategoryTabs active={category} counts={counts} onChange={onChangeCategory} />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r, i) => (
            <div
              key={r.slug}
              className="anim-fade-up"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <RecipeCard recipe={r} onPick={() => onPick(r)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTabs({
  active,
  counts,
  onChange,
}: {
  active: RecipeCategory;
  counts: Record<RecipeCategory, number>;
  onChange: (c: RecipeCategory) => void;
}) {
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1 md:w-fit">
      {CATEGORIES.map((c) => {
        const isActive = c === active;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-ink text-cream shadow-sm'
                : 'text-ink-soft hover:bg-cream'
            }`}
          >
            {c}
            <span
              className={`rounded-full px-1.5 text-[10px] font-semibold ${
                isActive ? 'bg-cream/20 text-cream' : 'bg-cream text-ink-faint'
              }`}
            >
              {counts[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RecipeCard({ recipe, onPick }: { recipe: Recipe; onPick: () => void }) {
  const accent = categoryAccent(recipe.category);
  return (
    <button
      onClick={onPick}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-line bg-paper text-left transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-[0_20px_40px_-25px_rgba(26,20,16,0.3)]"
    >
      <div className={`h-1.5 w-full ${accent.bar}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent.chip}`}>
            {recipe.category}
          </span>
          <span className="font-mono text-[11px] text-ink-faint">
            ~{recipe.minutes} min
          </span>
        </div>

        <h3 className="font-display text-xl leading-tight tracking-tight">
          {recipe.name}
        </h3>
        <p className="text-sm italic text-ink-soft">&ldquo;{recipe.angle}.&rdquo;</p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-ink-faint">
              Protein
            </span>
            <span className="font-display text-2xl leading-none tracking-tight text-forest">
              {recipe.protein[0]}&ndash;{recipe.protein[1]}
              <span className="ml-0.5 text-xs font-medium text-forest/70">g</span>
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wide text-ink-faint">
              kcal
            </span>
            <span className="font-display text-2xl leading-none tracking-tight text-ink">
              {recipe.calories[0]}&ndash;{recipe.calories[1]}
            </span>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full bg-cream text-ink transition group-hover:bg-terracotta group-hover:text-paper">
            <ArrowIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

function categoryAccent(c: RecipeCategory) {
  switch (c) {
    case 'Breakfast':
      return { bar: 'bg-butter-deep', chip: 'bg-butter text-ink' };
    case 'Lunch':
      return { bar: 'bg-forest', chip: 'bg-forest-soft text-forest' };
    case 'Dinner':
      return { bar: 'bg-terracotta', chip: 'bg-terracotta-soft text-terracotta-deep' };
    case 'Snacks':
      return { bar: 'bg-ink', chip: 'bg-cream text-ink border border-line' };
  }
}

function IdleOrb({ onTap, loading }: { onTap: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={loading}
      aria-label="Start cooking with voice"
      className="relative z-10 grid h-44 w-44 place-items-center disabled:cursor-wait md:h-52 md:w-52"
    >
      <span
        className="absolute inset-0 rounded-full bg-terracotta/15"
        style={{ animation: 'orb-breathe 3.6s ease-in-out infinite' }}
      />
      <span
        className="absolute inset-3 rounded-full bg-terracotta/25"
        style={{ animation: 'orb-pulse 2.4s ease-in-out infinite' }}
      />
      <span className="absolute inset-7 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_18px_40px_-12px_rgba(223,98,56,0.55)]" />
      <span className="relative z-10 flex flex-col items-center gap-1 text-paper">
        <MicIcon className="h-7 w-7" />
        <span className="text-[13px] font-medium tracking-wide">
          {loading ? 'Connecting…' : 'Tap to cook'}
        </span>
      </span>
    </button>
  );
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        fill="currentColor"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M9 9V6a3 3 0 0 1 6 0v3m0 3a3 3 0 0 1-5.12 2.12M5 11a7 7 0 0 0 11.95 4.95M19 11a7 7 0 0 1-.49 2.57M12 18v3M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m5 12 5 5 9-11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
