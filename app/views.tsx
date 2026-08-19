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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  CATEGORIES,
  type Ingredient,
  type Recipe,
  type RecipeCategory,
  type RecipeStep,
  RECIPES,
} from './recipes';

const COOKING_PATH = '/cook';

type CookingTimer = {
  id: string;
  label: string;
  totalSeconds: number;
  secondsLeft: number;
  isDone: boolean;
};

type ActiveRecipe = {
  name: string;
  slug?: string;
  caloriesLabel?: string;
  proteinLabel?: string;
};

type CurrentStep = {
  index: number;
  total: number;
  text?: string;
  title?: string;
};

type IngredientState = Ingredient & {
  checked: boolean;
};

type SessionState = {
  timers: CookingTimer[];
  step: CurrentStep | null;
  recipe: ActiveRecipe | null;
  ingredients: IngredientState[];
  completed: boolean;
};

const INITIAL_SESSION: SessionState = {
  timers: [],
  step: null,
  recipe: null,
  ingredients: [],
  completed: false,
};

function ingredientKey(name: string) {
  return name.trim().toLowerCase();
}

export function buildAgentBriefing(recipe: Recipe): string {
  const lines: string[] = [];
  lines.push(`The user just picked "${recipe.name}" (${recipe.category}).`);
  lines.push(
    `Macros target: ${recipe.calories[0]}-${recipe.calories[1]} kcal, ${recipe.protein[0]}-${recipe.protein[1]}g protein.`,
  );
  lines.push('');
  lines.push(
    "The full recipe — every ingredient and every step — is already on the user's screen. You do NOT read it out word for word. You talk them through it warmly, like a friend cooking beside them, in your own natural words.",
  );
  if (recipe.ingredients?.length) {
    lines.push('');
    lines.push('Ingredients (shown on screen):');
    for (const i of recipe.ingredients) {
      lines.push(`- ${i.item} — ${i.qty}${i.note ? ` (${i.note})` : ''}`);
    }
  }
  if (recipe.steps?.length) {
    lines.push('');
    lines.push(`Steps (${recipe.steps.length} total):`);
    recipe.steps.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title}: ${s.body}`);
    });
  }
  lines.push('');
  lines.push('How to drive the screen with client tools:');
  lines.push(
    `- Call setActiveRecipe(name="${recipe.name}", slug="${recipe.slug}") once at the very start.`,
  );
  lines.push(
    `- The moment you begin a step, call setCurrentStep(index, total=${recipe.steps?.length ?? 1}) with that step's number FIRST — this highlights the matching step on screen so the user can follow along. Then explain it naturally and wait for them to say "done" before moving on. If they say "repeat", explain the same step again.`,
  );
  lines.push(
    '- As the user gathers or uses an ingredient, call checkIngredient(name) to tick it off.',
  );
  lines.push('- When a step has a timer, call startTimer(seconds, label).');
  lines.push('- When the dish is finished and plated, call completeRecipe().');
  lines.push('');
  lines.push(
    'The user can also tap the screen instead of speaking. When you get a message that starts with "I tapped the screen", the display has already moved — do not call setCurrentStep for it. Just pick up from there out loud: if it names a step, walk them through that step; if it says the dish is plated, give a short warm send-off.',
  );
  return lines.join('\n');
}

// The chooser greets by mealtime — the right three dishes at the right hour.
const MEAL_HEADLINES: Record<RecipeCategory, string> = {
  Breakfast: 'What’s for breakfast?',
  Lunch: 'What’s for lunch?',
  Dinner: 'What’s for dinner?',
  Snacks: 'Craving something?',
};

function mealForHour(hour: number): RecipeCategory {
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snacks';
}

const emptySubscribe = () => () => {};

// The homepage decides dinner. A hungry, decision-tired visitor gets ONE
// recommended dish for this mealtime with one big CTA; rejecting it costs one
// tap ("show me another"), exploring costs one scroll (the full menu below).
export function HomeView() {
  const router = useRouter();

  // Mealtime from the visitor's clock (null during the static prerender).
  const meal = useSyncExternalStore(
    emptySubscribe,
    () => mealForHour(new Date().getHours()),
    () => null,
  );

  // The menu tab follows mealtime until the user picks one themselves.
  const [chosenCategory, setChosenCategory] = useState<RecipeCategory | null>(
    null,
  );
  const category = chosenCategory ?? meal ?? 'Breakfast';

  // This meal's dishes, quickest first. The pick starts at the fastest and
  // "show me another" walks down the list, wrapping around.
  const mealList = useMemo(() => {
    const pool = meal ? RECIPES.filter((r) => r.category === meal) : RECIPES;
    return [...pool].sort((a, b) => a.minutes - b.minutes);
  }, [meal]);
  const [pickIndex, setPickIndex] = useState(0);
  const pick = mealList[pickIndex % Math.max(mealList.length, 1)];

  // Quickest first — the same priority a hungry person sorts by mentally.
  const filtered = useMemo(
    () =>
      RECIPES.filter((r) => r.category === category).sort(
        (a, b) => a.minutes - b.minutes,
      ),
    [category],
  );

  const counts = useMemo(() => {
    const map: Record<RecipeCategory, number> = {
      Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0,
    };
    for (const r of RECIPES) map[r.category]++;
    return map;
  }, []);

  const handleStart = useCallback(
    (recipe: Recipe) => {
      router.push(`${COOKING_PATH}?slug=${recipe.slug}`);
    },
    [router],
  );

  return (
    <div className="flex flex-col">
      {/* slim chrome: who we are on the left, why we exist on the right */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5 md:px-8">
        <span className="font-display text-base tracking-tight text-ink">
          Tap. Talk. <span className="italic text-terracotta">Cook.</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Hands-free · high-protein
        </span>
      </header>

      {/* split hero: the question on the left, the answer on the right —
          and the menu starts right below, peeking above the fold */}
      {pick && (
        <section className="relative overflow-hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute right-[15%] top-[-60px] -z-0 h-72 w-72 rounded-full bg-butter/55 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-[8%] top-[45%] -z-0 h-56 w-56 rounded-full bg-terracotta/10 blur-3xl"
          />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-5 pb-10 pt-8 md:px-8 lg:grid-cols-2 lg:gap-14 lg:pb-14 lg:pt-12">
            <div className="flex flex-col items-start text-left">
              <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink md:text-[46px]">
                {meal ? MEAL_HEADLINES[meal] : 'What are we cooking?'}
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Pick a dish and cook it hands-free — I’ll read every step
                aloud and wait for you.
              </p>
              <HowItWorks />
            </div>

            <PickCard
              meal={meal}
              recipe={pick}
              isFastest={pickIndex % mealList.length === 0}
              onCook={() => handleStart(pick)}
              onAnother={() => setPickIndex((i) => i + 1)}
            />
          </div>
        </section>
      )}

      <BrowseAll
        category={category}
        counts={counts}
        recipes={filtered}
        onChangeCategory={setChosenCategory}
        onPick={handleStart}
      />
    </div>
  );
}

// One dish, one CTA — a grounded card, not a floating dialog. Rerolling
// lives inside the card, right next to the thing it replaces.
function PickCard({
  meal,
  recipe,
  isFastest,
  onCook,
  onAnother,
}: {
  meal: RecipeCategory | null;
  recipe: Recipe;
  isFastest: boolean;
  onCook: () => void;
  onAnother: () => void;
}) {
  const pickLabel =
    meal === 'Dinner'
      ? 'Tonight’s pick'
      : meal
      ? `${meal} pick`
      : 'Our pick';
  return (
    <div
      key={recipe.slug}
      className="anim-step-in w-full rounded-3xl border border-line bg-paper/90 p-6 shadow-[0_32px_70px_-40px_rgba(26,20,16,0.5)] backdrop-blur md:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-terracotta">
          {pickLabel}
          {isFastest ? ' · fastest' : ''}
        </span>
        <button
          onClick={onAnother}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-cream/50 px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-ink-faint hover:text-ink"
        >
          <RefreshIcon className="h-3 w-3" />
          Another
        </button>
      </div>

      <h2 className="mt-3 font-display text-[26px] leading-tight tracking-tight text-ink md:text-3xl">
        {recipe.name}
      </h2>
      <p className="mt-1.5 text-sm italic text-ink-soft">“{recipe.angle}.”</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <ClockIcon className="h-3.5 w-3.5 text-ink-faint" />
          {recipe.minutes} min
        </span>
        <span aria-hidden className="text-ink-faint/60">
          ·
        </span>
        <span className="font-semibold text-forest">
          {recipe.protein[0]}–{recipe.protein[1]}g protein
        </span>
        <span aria-hidden className="text-ink-faint/60">
          ·
        </span>
        <span>
          {recipe.calories[0]}–{recipe.calories[1]} kcal
        </span>
      </div>

      <button
        onClick={onCook}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-terracotta px-6 py-3.5 text-[15px] font-semibold text-paper shadow-[0_22px_44px_-16px_rgba(223,98,56,0.8)] transition hover:bg-terracotta-deep"
      >
        <MicIcon className="h-4.5 w-4.5" />
        Cook this with me
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-faint">
        Ingredient check first — the mic stays off until you start.
      </p>
    </div>
  );
}

// The whole product in one quiet line — a mental model for first-timers,
// invisible to everyone rushing past it.
function HowItWorks() {
  const beats = ['Pick a dish', 'Gather ingredients', 'Cook by voice'];
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {beats.map((beat, i) => (
        <span key={beat} className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
            <span className="grid h-5 w-5 place-items-center rounded-full border border-line bg-paper font-mono text-[10px] font-semibold text-ink-soft">
              {i + 1}
            </span>
            {beat}
          </span>
          {i < beats.length - 1 && (
            <ArrowIcon aria-hidden className="h-3 w-3 text-ink-faint/50" />
          )}
        </span>
      ))}
    </div>
  );
}

// Reads a short user utterance and decides how to move the recipe.
// 'next' = the user finished the step they're looking at ("done").
// 'begin' = a soft go-ahead ("ready") — starts step 1 if nothing is
// highlighted yet, otherwise advances like 'next'.
function detectStepCommand(message: string): 'next' | 'begin' | 'back' | null {
  const norm = message
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = norm ? norm.split(' ').length : 0;
  if (wordCount === 0 || wordCount > 7) return null;
  if (/\b(repeat|again)\b/.test(norm)) return null;
  if (/\b(back|previous|go back)\b/.test(norm)) return 'back';
  if (/\b(done|finished|next|next step|move on)\b/.test(norm)) return 'next';
  if (
    /\b(ready|continue|proceed|go on|keep going|got it|all set|start|begin)\b/.test(
      norm,
    )
  ) {
    return 'begin';
  }
  return null;
}

export function CookingView({
  initialRecipe,
  onStart,
}: {
  initialRecipe?: Recipe | null;
  onStart: () => Promise<void> | void;
}) {
  const { status, message } = useConversationStatus();
  const { endSession } = useConversationControls();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking, isListening } = useConversationMode();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(() => {
    if (!initialRecipe) return INITIAL_SESSION;
    return {
      ...INITIAL_SESSION,
      recipe: { name: initialRecipe.name, slug: initialRecipe.slug },
      ingredients: (initialRecipe.ingredients ?? []).map((i) => ({
        ...i,
        checked: false,
      })),
    };
  });

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
    const { index, total, text, title } = parameters as {
      index: number;
      total: number;
      text?: string;
      title?: string;
    };
    setSession((s) => ({
      ...s,
      step: { index, total, text, title },
      completed: false,
    }));
    return `Step ${index} of ${total} highlighted.`;
  });

  useConversationClientTool('setActiveRecipe', (parameters) => {
    const { name, slug, calories, protein } = parameters as {
      name: string;
      slug?: string;
      calories?: string;
      protein?: string;
    };
    const matched = slug ? RECIPES.find((r) => r.slug === slug) : null;
    setSession((s) => {
      const ingredients =
        s.ingredients.length > 0
          ? s.ingredients
          : (matched?.ingredients ?? []).map((i) => ({ ...i, checked: false }));
      return {
        ...s,
        recipe: { name, slug, caloriesLabel: calories, proteinLabel: protein },
        ingredients,
        step: null,
        completed: false,
      };
    });
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

  // Follow the user's own voice: when they say "done" / "next" / "back", move
  // the highlighted step — no dependency on the agent calling setCurrentStep.
  const { sendUserMessage } = useConversation({
    onMessage: ({ message, role }) => {
      if (role !== 'user') return;
      const cmd = detectStepCommand(message);
      if (!cmd) return;
      const stepTotal = initialRecipe?.steps?.length ?? 0;
      setSession((s) => {
        // Index 0 = "not started", but the screen already shows step 1 as
        // current. So a completion word ('next') moves past the step the
        // user is looking at — max(cur, 1) + 1 — while a kickoff word
        // ('begin') with nothing highlighted yet just lands on step 1.
        const cur = s.step?.index ?? 0;
        const total = s.step?.total ?? stepTotal;
        if (cmd === 'back') {
          if (cur <= 1) return s;
          return {
            ...s,
            step: { index: cur - 1, total: total > 0 ? total : cur },
            completed: false,
          };
        }
        const target =
          cmd === 'begin' && cur === 0 ? 1 : Math.max(cur, 1) + 1;
        if (total > 0 && target > total) {
          return { ...s, completed: true };
        }
        return {
          ...s,
          step: { index: target, total: total > 0 ? total : target },
          completed: false,
        };
      });
    },
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

  const toggleIngredient = (idx: number) =>
    setSession((s) => ({
      ...s,
      ingredients: s.ingredients.map((it, i) =>
        i === idx ? { ...it, checked: !it.checked } : it,
      ),
    }));

  // Manual step controls — a fallback for when the voice agent doesn't
  // advance the screen itself.
  const goToStep = (index: number) =>
    setSession((s) => ({
      ...s,
      step: {
        index,
        total: s.step?.total ?? initialRecipe?.steps?.length ?? index,
      },
      completed: false,
    }));

  const markComplete = () =>
    setSession((s) => ({ ...s, completed: true }));

  // Tapping the screen must reach the agent too, or the voice keeps narrating
  // the old step while the screen has moved on. The messages are phrased to
  // dodge every detectStepCommand keyword, so when their transcript comes
  // back through onMessage it can't re-advance the step a second time.
  const handleManualStep = (index: number) => {
    goToStep(index);
    sendUserMessage(`I tapped the screen — please walk me through step ${index} now.`);
  };

  const handleManualComplete = () => {
    markComplete();
    sendUserMessage('I tapped the screen — the dish is plated, we are wrapped up.');
  };

  const recipeName =
    session.recipe?.name ?? initialRecipe?.name ?? 'Voice cook-along';
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
  const totalSteps =
    initialRecipe?.steps?.length ?? session.step?.total ?? 0;
  const currentIndex = session.step?.index ?? 0;
  const progress = session.completed
    ? 1
    : totalSteps > 0
    ? Math.min(currentIndex, totalSteps) / totalSteps
    : 0;
  const recipeSteps = initialRecipe?.steps ?? null;
  const ingredientsReady = session.ingredients.filter((i) => i.checked).length;
  const ingredientsTotal = session.ingredients.length;

  // Choosing happens on the homepage — /cook without a recipe just goes
  // there (the page-level effect redirects; render nothing meanwhile).
  if (!initialRecipe) {
    return null;
  }

  // Before the voice session connects, the page is a calm "ready room" — no
  // mic, no tokens — where you gather ingredients and start when you choose.
  if (!sessionStarted) {
    return (
      <ReadyRoom
        recipe={initialRecipe}
        ingredients={session.ingredients}
        onToggleIngredient={toggleIngredient}
        onStart={handleStart}
        starting={starting}
        onClose={() => router.push('/')}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col pb-24">
      {/* ambient warmth — matches the home & ready-room pages */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span className="absolute left-1/2 top-[-70px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-butter/50 blur-3xl" />
        <span className="absolute right-[-90px] top-[220px] h-72 w-72 rounded-full bg-terracotta/12 blur-3xl" />
        <span className="absolute left-[-90px] top-[560px] h-72 w-72 rounded-full bg-forest/10 blur-3xl" />
      </div>

      {/* top bar */}
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
          // The finish gets the whole stage. Header, progress bar, step list,
          // voice chip — each would only restate "done" and crowd the moment.
          <div className="mx-auto w-full max-w-xl">
            <CompletedCard
              recipeName={recipeName}
              recipe={initialRecipe ?? null}
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
              {/* the recipe — lit up step by step as the agent narrates */}
              <div className="lg:col-span-8">
                {recipeSteps && recipeSteps.length > 0 ? (
                  <RecipeFollow
                    steps={recipeSteps}
                    currentIndex={currentIndex}
                    completed={session.completed}
                    isSpeaking={isSpeaking}
                    onGoToStep={handleManualStep}
                    onComplete={handleManualComplete}
                  />
                ) : (
                  <SoloStep step={session.step} />
                )}
              </div>

              {/* support */}
              <div className="mt-6 flex flex-col gap-5 lg:col-span-4 lg:mt-0">
                <TimerStack timers={session.timers} onDismiss={onDismissTimer} />
                <IngredientsPanel
                  ingredients={session.ingredients}
                  readyCount={ingredientsReady}
                  totalCount={ingredientsTotal}
                  onToggle={toggleIngredient}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <BottomBar
        isMuted={isMuted}
        onToggleMute={() => setMuted(!isMuted)}
      />
    </div>
  );
}

function SessionHeader({
  recipeName,
  currentIndex,
  totalSteps,
  progress,
  isSpeaking,
  isListening,
  status,
}: {
  recipeName: string;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  isSpeaking: boolean;
  isListening: boolean;
  status: string;
}) {
  const pct = Math.round(progress * 100);
  const stepLabel =
    totalSteps > 0
      ? `Step ${Math.min(Math.max(1, currentIndex), totalSteps)} of ${totalSteps}`
      : 'Getting started';

  return (
    <div className="anim-rise flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2.5">
        <h1 className="truncate font-display text-[26px] leading-tight tracking-tight text-ink md:text-[32px]">
          {recipeName}
        </h1>
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {stepLabel}
          </span>
          {totalSteps > 0 && (
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line-soft sm:w-40">
              <div
                className="h-full rounded-full bg-terracotta transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <VoiceMeter
        isSpeaking={isSpeaking}
        isListening={isListening}
        status={status}
      />
    </div>
  );
}

function VoiceMeter({
  isSpeaking,
  isListening,
  status,
}: {
  isSpeaking: boolean;
  isListening: boolean;
  status: string;
}) {
  const connecting = status === 'connecting';
  const label = connecting
    ? 'Connecting'
    : isSpeaking
    ? 'Speaking'
    : isListening
    ? 'Your turn'
    : 'Ready';
  return (
    <div className="flex shrink-0 items-center gap-2.5 self-start rounded-full border border-line bg-paper/80 py-1.5 pl-1.5 pr-4 backdrop-blur">
      <span className="relative grid h-9 w-9 place-items-center">
        {isSpeaking && (
          <span
            className="absolute inset-0 rounded-full bg-terracotta/25"
            style={{ animation: 'ring-ripple 1.8s ease-out infinite' }}
          />
        )}
        <span
          className="absolute inset-0.5 rounded-full bg-terracotta/15"
          style={{ animation: 'orb-breathe 3.4s ease-in-out infinite' }}
        />
        <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep" />
        <span className="relative z-10 text-paper">
          {isListening ? (
            <WaveBars />
          ) : (
            <SoundWaveIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Kitchen voice
        </span>
        <span className="mt-1 text-sm font-semibold text-ink">{label}</span>
      </span>
    </div>
  );
}

// The finish is the peak of the whole experience: celebrate, show the payoff
// the user actually cooked for (time + macros), and offer one clear way out —
// the voice session shouldn't keep running while the food gets cold.
function CompletedCard({
  recipeName,
  recipe,
  onEnd,
}: {
  recipeName: string;
  recipe: Recipe | null;
  onEnd: () => void;
}) {
  return (
    <div className="anim-rise flex flex-col items-center gap-5 rounded-3xl border border-forest/25 bg-forest-soft p-7 text-center shadow-[0_24px_60px_-40px_rgba(31,77,60,0.5)] md:p-9">
      <span className="anim-check-pop grid h-16 w-16 shrink-0 place-items-center rounded-full bg-forest text-paper shadow-[0_18px_36px_-16px_rgba(31,77,60,0.9)]">
        <CheckIcon className="h-7 w-7" />
      </span>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-forest/70">
          Cook-along complete
        </span>
        <h2 className="font-display text-2xl leading-tight tracking-tight text-forest md:text-3xl">
          {recipeName} is plated. Take the first bite.
        </h2>
      </div>

      {recipe && (
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm text-forest/80">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5" />
            ~{recipe.minutes} min, start to plate
          </span>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span className="font-semibold text-forest">
            {recipe.protein[0]}–{recipe.protein[1]}g protein banked
          </span>
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <span>
            {recipe.calories[0]}–{recipe.calories[1]} kcal
          </span>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onEnd}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-paper shadow-[0_18px_36px_-16px_rgba(31,77,60,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-16px_rgba(31,77,60,0.95)]"
        >
          Wrap up & enjoy
          <ArrowIcon className="h-4 w-4" />
        </button>
        <p className="text-xs leading-relaxed text-forest/70">
          Ends the voice session — or just keep chatting.
        </p>
      </div>
    </div>
  );
}

type StepStatus = 'done' | 'current' | 'upcoming';

function RecipeFollow({
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
      {/* timeline rail */}
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

      {/* step content */}
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

function SoloStep({ step }: { step: CurrentStep | null }) {
  if (!step) {
    return (
      <div className="anim-rise flex flex-col items-center gap-2 rounded-3xl border border-line bg-paper/80 p-8 text-center shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur">
        <h2 className="font-display text-2xl tracking-tight text-ink">
          What are we cooking?
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-ink-faint">
          Say a dish, an ingredient, or a craving out loud, and I’ll walk you
          through it, step by step.
        </p>
      </div>
    );
  }
  return (
    <div className="anim-step-in rounded-3xl border border-line bg-paper/80 p-6 shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur md:p-7">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta-deep">
        Step {step.index} of {step.total}
      </span>
      {step.title && (
        <h3 className="mt-2 font-display text-xl leading-snug tracking-tight text-ink md:text-2xl">
          {step.title}
        </h3>
      )}
      {step.text && (
        <p className="mt-2.5 text-[17px] leading-relaxed text-ink md:text-[18px]">
          {step.text}
        </p>
      )}
      <p className="mt-4 border-t border-line pt-3.5 text-xs leading-relaxed text-ink-faint">
        Say <span className="font-semibold text-ink-soft">“done”</span> to
        continue, <span className="font-semibold text-ink-soft">“repeat”</span>{' '}
        to hear it again.
      </p>
    </div>
  );
}

function IngredientsPanel({
  ingredients,
  readyCount,
  totalCount,
  onToggle,
}: {
  ingredients: IngredientState[];
  readyCount: number;
  totalCount: number;
  onToggle: (idx: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (totalCount === 0) return null;
  const pct = Math.round((readyCount / totalCount) * 100);
  const allReady = readyCount === totalCount;
  return (
    <section className="anim-rise rounded-3xl border border-line bg-paper/80 p-5 shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur">
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-cream text-ink-soft">
            <BowlIcon className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              Ingredients
            </span>
            <span className="font-display text-base tracking-tight">
              {allReady ? (
                <span className="text-forest">All ready · let&apos;s cook</span>
              ) : (
                <>
                  <span className="text-ink">{readyCount}</span>
                  <span className="text-ink-faint"> of {totalCount} ready</span>
                </>
              )}
            </span>
          </div>
        </div>
        <span className="flex items-center gap-2">
          <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line-soft md:block">
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${
                allReady ? 'bg-forest' : 'bg-terracotta'
              }`}
              style={{ width: `${Math.max(6, pct)}%` }}
            />
          </span>
          <ChevronIcon
            className={`h-4 w-4 text-ink-faint transition-transform ${
              collapsed ? '' : 'rotate-180'
            }`}
          />
        </span>
      </button>

      {!collapsed && (
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ingredients.map((it, i) => (
            <li key={`${it.item}-${i}`}>
              <button
                onClick={() => onToggle(i)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  it.checked
                    ? 'border-forest/30 bg-forest-soft/60'
                    : 'border-line bg-cream/40 hover:border-ink-faint'
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${
                    it.checked
                      ? 'bg-forest text-paper anim-check-pop'
                      : 'border border-line bg-paper text-transparent'
                  }`}
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-sm font-medium ${
                      it.checked ? 'text-forest line-through decoration-forest/40' : 'text-ink'
                    }`}
                  >
                    {it.item}
                  </span>
                  {(it.qty || it.note) && (
                    <span className="truncate text-[11px] text-ink-faint">
                      {it.qty}
                      {it.note ? ` · ${it.note}` : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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

function WaveBars() {
  return (
    <span className="flex h-6 items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-0.5 origin-center rounded-full bg-paper"
          style={{
            height: '100%',
            animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </span>
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

  const activeCount = timers.filter((t) => !t.isDone).length;

  return (
    <section className="anim-rise rounded-3xl border border-line bg-paper/80 p-5 shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            Timers
          </span>
          <span className="font-display text-lg tracking-tight text-ink">
            {activeCount > 0 ? `${activeCount} running` : 'All done'}
          </span>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-ink-soft">
          <ClockIcon className="h-4 w-4" />
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.map((t) => (
          <li key={t.id}>
            <TimerRow timer={t} onDismiss={() => onDismiss(t.id)} />
          </li>
        ))}
      </ul>
    </section>
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
          ? 'border-butter-deep/50 bg-butter/70'
          : 'border-line bg-cream/40'
      }`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{timer.label}</span>
          <span className="font-mono text-base tabular-nums text-ink">
            {timer.isDone ? 'Ready' : formatSeconds(timer.secondsLeft)}
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
        className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-line-soft"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
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
        <div className="mb-6 flex items-baseline justify-between gap-4 md:mb-8">
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            Your{' '}
            <span className="relative inline-block italic">
              menu
            </span>
            .
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            {Object.values(counts).reduce((a, b) => a + b, 0)} recipes ·
            quickest first
          </span>
        </div>

        <CategoryTabs active={category} counts={counts} onChange={onChangeCategory} />

        {/* same row grammar as the hero pick — one visual language to learn */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-x-5">
          {recipes.map((r, i) => (
            <div
              key={r.slug}
              className="anim-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
            >
              <ChooserRecipeRow
                recipe={r}
                badge={i === 0 ? 'Fastest' : undefined}
                onPick={() => onPick(r)}
              />
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
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
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

// A dish as one glanceable, tappable row: name, its one-line pitch, and the
// facts the choice actually turns on — protein, minutes, kcal.
function ChooserRecipeRow({
  recipe,
  badge,
  onPick,
}: {
  recipe: Recipe;
  badge?: string;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-line bg-paper/80 p-4 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-[0_24px_45px_-30px_rgba(26,20,16,0.4)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-lg tracking-tight text-ink">
            {recipe.name}
          </span>
          {badge && (
            <span className="shrink-0 rounded-full bg-butter px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
              {badge}
            </span>
          )}
        </span>
        <span className="truncate text-[13px] italic text-ink-soft">
          {recipe.angle}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[13px] font-semibold text-forest">
          {recipe.protein[0]}–{recipe.protein[1]}g protein
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-soft">
          <ClockIcon className="h-3 w-3 text-ink-faint" />
          {recipe.minutes} min · {recipe.calories[0]}–{recipe.calories[1]} kcal
        </span>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-ink transition group-hover:bg-terracotta group-hover:text-paper">
        <ArrowIcon className="h-4 w-4" />
      </span>
    </button>
  );
}

function ReadyRoom({
  recipe,
  ingredients,
  onToggleIngredient,
  onStart,
  starting,
  onClose,
}: {
  recipe: Recipe | null;
  ingredients: IngredientState[];
  onToggleIngredient: (idx: number) => void;
  onStart: () => void;
  starting: boolean;
  onClose: () => void;
}) {
  const steps = recipe?.steps ?? [];
  const gathered = ingredients.filter((i) => i.checked).length;
  const allGathered = ingredients.length > 0 && gathered === ingredients.length;

  const hero = (
    <header className="anim-rise flex flex-col items-center text-center">
      <ReadyOrb
        starting={starting}
        size={recipe ? 'h-32 w-32 lg:h-36 lg:w-36' : 'h-36 w-36 lg:h-44 lg:w-44'}
      />

      {recipe && (
        <span className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
          {recipe.angle}
        </span>
      )}

      <h1
        className={`font-display leading-[1.07] tracking-tight text-ink ${
          recipe
            ? 'mt-2 text-[30px] md:text-[36px] lg:text-[38px]'
            : 'mt-8 text-[34px] md:text-[42px] lg:text-[46px]'
        }`}
      >
        {recipe ? recipe.name : 'What should we cook?'}
      </h1>

      <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-ink-soft lg:text-[15px]">
        {recipe
          ? 'I read every step out loud and wait for you, so your hands stay in the bowl, not on the screen.'
          : "Say what you're craving. I'll turn it into a recipe and talk you through it, step by step."}
      </p>

      {!recipe && (
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Try saying
          </span>
          <ul className="flex flex-wrap justify-center gap-2">
            {[
              'Something high-protein for lunch',
              'I have chicken and rice',
              'A sweet snack, no cooking',
            ].map((example) => (
              <li
                key={example}
                className="rounded-full border border-line bg-paper/70 px-3.5 py-1.5 font-display text-[13px] italic text-ink-soft backdrop-blur"
              >
                “{example}”
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[13px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-ink-faint" />
            {recipe.minutes} min
          </span>
          <span aria-hidden className="text-ink-faint/60">
            ·
          </span>
          <span className="font-semibold text-forest">
            {recipe.protein[0]}–{recipe.protein[1]}g protein
          </span>
          <span aria-hidden className="text-ink-faint/60">
            ·
          </span>
          <span>
            {recipe.calories[0]}–{recipe.calories[1]} kcal
          </span>
        </div>
      )}
    </header>
  );

  const ingredientsCard =
    recipe && ingredients.length > 0 ? (
      <section
        className="anim-rise rounded-3xl border border-line bg-paper/80 p-5 shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur lg:p-4"
        style={{ animationDelay: '90ms' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="font-display text-lg tracking-tight text-ink">
              Gather your ingredients
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
              Tap each one as it lands on the counter.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              allGathered ? 'bg-forest text-paper' : 'bg-cream text-ink-soft'
            }`}
          >
            {allGathered ? 'All set' : `${gathered} / ${ingredients.length}`}
          </span>
        </div>
        <ul className="mt-2.5 grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-5">
          {ingredients.map((it, i) => (
            <li key={`${it.item}-${i}`}>
              <button
                onClick={() => onToggleIngredient(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition ${
                  it.checked ? 'bg-forest-soft/50' : 'hover:bg-cream'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition ${
                    it.checked
                      ? 'anim-check-pop bg-forest text-paper'
                      : 'border border-line bg-paper text-transparent'
                  }`}
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-sm font-medium ${
                      it.checked
                        ? 'text-forest line-through decoration-forest/40'
                        : 'text-ink'
                    }`}
                  >
                    {it.item}
                  </span>
                  {(it.qty || it.note) && (
                    <span className="truncate text-[11px] text-ink-faint">
                      {it.qty}
                      {it.note ? ` · ${it.note}` : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const pathCard =
    recipe && steps.length > 0 ? (
      <section
        className="anim-rise rounded-3xl border border-line bg-paper/80 p-5 shadow-[0_22px_55px_-44px_rgba(26,20,16,0.55)] backdrop-blur lg:p-4"
        style={{ animationDelay: '170ms' }}
      >
        <h2 className="font-display text-lg tracking-tight text-ink">
          The path ahead
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
          {steps.length} steps, read aloud one at a time. You set the pace.
        </p>
        <ol
          className={`mt-3 flex flex-col ${
            steps.length >= 4
              ? 'lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3'
              : ''
          }`}
        >
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center self-stretch">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cream font-mono text-[11px] font-semibold text-ink-soft">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className={`my-1 w-px flex-1 bg-line ${
                      steps.length >= 4 ? 'lg:hidden' : ''
                    }`}
                  />
                )}
              </div>
              <div
                className={`flex min-w-0 flex-col ${
                  i < steps.length - 1
                    ? steps.length >= 4
                      ? 'pb-3 lg:pb-0'
                      : 'pb-3'
                    : ''
                }`}
              >
                <span className="text-sm font-medium leading-snug text-ink">
                  {s.title}
                </span>
                <span className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-ink-faint">
                  {s.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    ) : null;

  const startCta = (
    <StartCTA
      onStart={onStart}
      starting={starting}
      hint={recipe ? undefined : 'Your mic turns on when you tap · end anytime'}
    />
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ambient warmth — clipped to the viewport */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span className="absolute left-1/2 top-[-70px] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-butter/55 blur-3xl" />
        <span className="absolute right-[-90px] top-[180px] h-72 w-72 rounded-full bg-terracotta/12 blur-3xl" />
        <span className="absolute left-[-90px] top-[540px] h-72 w-72 rounded-full bg-forest/10 blur-3xl" />
      </div>

      {/* top bar */}
      <div className="relative z-10 px-5 pt-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            onClick={onClose}
            aria-label="Back to recipes"
            className="flex items-center gap-1.5 rounded-full border border-line bg-paper/80 py-1.5 pl-2 pr-3.5 text-xs font-medium text-ink-soft backdrop-blur transition hover:border-ink-faint hover:text-ink"
          >
            <ArrowIcon className="h-3.5 w-3.5 rotate-180" />
            Back
          </button>
          <span className="flex items-center gap-1.5 rounded-full bg-paper/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
            {recipe ? recipe.category : 'Voice cook-along'}
          </span>
        </div>
      </div>

      {recipe ? (
        <div className="relative z-10 mx-auto w-full max-w-xl px-5 pb-44 pt-8 lg:flex lg:max-w-6xl lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:pb-8 lg:pt-4">
          <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
            {/* identity + action — sticky on desktop */}
            <div className="lg:col-span-5 lg:sticky lg:top-10">
              {hero}
              <div className="mt-6 hidden lg:block">{startCta}</div>
            </div>
            {/* the practical detail */}
            <div className="mt-6 flex flex-col gap-6 lg:col-span-7 lg:mt-0 lg:gap-3">
              {ingredientsCard}
              {pathCard}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-5 pb-44 pt-8 lg:min-h-[calc(100vh-72px)] lg:pb-24 lg:pt-0">
          {hero}
          <div className="mx-auto hidden w-full max-w-md lg:block">{startCta}</div>
        </div>
      )}

      {/* sticky start — mobile & tablet only */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden">
        <div className="h-20 bg-gradient-to-t from-cream via-cream/85 to-transparent" />
        <div className="bg-cream/95 backdrop-blur">
          <div className="pointer-events-auto mx-auto w-full max-w-xl px-5 pb-6 pt-1">
            {startCta}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartCTA({
  onStart,
  starting,
  hint,
}: {
  onStart: () => void;
  starting: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onStart}
        disabled={starting}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-terracotta px-6 py-4 text-base font-semibold text-paper shadow-[0_22px_44px_-16px_rgba(223,98,56,0.8)] transition hover:bg-terracotta-deep disabled:cursor-wait disabled:opacity-80"
      >
        {!starting && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/4 bg-paper/30 blur-md"
            style={{ animation: 'sheen-sweep 3.8s ease-in-out infinite' }}
          />
        )}
        <span className="relative flex items-center gap-2.5">
          {starting ? (
            <>
              <WaveBars />
              Waking the kitchen…
            </>
          ) : (
            <>
              <MicIcon className="h-5 w-5" />
              Start voice cook-along
            </>
          )}
        </span>
      </button>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-faint">
        {hint ?? (
          <>
            Mic turns on · say{' '}
            <span className="font-semibold text-ink-soft">“done”</span> to
            advance,{' '}
            <span className="font-semibold text-ink-soft">“repeat”</span> to
            hear it again
          </>
        )}
      </p>
    </div>
  );
}

function ReadyOrb({
  starting,
  size = 'h-36 w-36 lg:h-44 lg:w-44',
}: {
  starting: boolean;
  size?: string;
}) {
  return (
    <div className={`anim-float relative grid place-items-center ${size}`}>
      <span
        className="absolute inset-0 rounded-full bg-terracotta/20"
        style={{ animation: 'ring-ripple 3.6s ease-out infinite' }}
      />
      <span
        className="absolute inset-0 rounded-full bg-terracotta/15"
        style={{ animation: 'ring-ripple 3.6s ease-out 1.8s infinite' }}
      />
      <span
        className="absolute inset-2 rounded-full bg-terracotta/15"
        style={{ animation: 'orb-breathe 4.2s ease-in-out infinite' }}
      />
      <span
        className="absolute inset-6 rounded-full bg-terracotta/30"
        style={{ animation: 'orb-pulse 3s ease-in-out infinite' }}
      />
      <span className="absolute inset-10 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_24px_46px_-14px_rgba(223,98,56,0.72)]" />
      <span className="relative z-10 text-paper">
        {starting ? (
          <WaveBars />
        ) : (
          <SoundWaveIcon className="h-7 w-7 lg:h-9 lg:w-9" />
        )}
      </span>
    </div>
  );
}



function SoundWaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M16.6 7.8a6 6 0 0 1 0 8.4M19.6 4.8a10.2 10.2 0 0 1 0 14.4M7.4 7.8a6 6 0 0 0 0 8.4M4.4 4.8a10.2 10.2 0 0 0 0 14.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m6 15 6-6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.5v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BowlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 11h18a9 9 0 0 1-18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 11c0-2 1.5-4 4-4M3 11h18M10 4l1 2M14 3l-1 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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
