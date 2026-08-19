'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { MEAL_HEADLINES, useMealtime } from '@/lib/mealtime';
import { RECIPES, type Recipe, type RecipeCategory } from '@/lib/recipes';
import { ArrowIcon, ClockIcon, MicIcon, RefreshIcon } from '../icons';
import { BrowseAll } from './browse-all';

const COOKING_PATH = '/cook';

export function HomeView() {
  const router = useRouter();
  const meal = useMealtime();

  // The menu tab follows mealtime until the user picks one themselves.
  const [chosenCategory, setChosenCategory] = useState<RecipeCategory | null>(
    null,
  );
  const category = chosenCategory ?? meal ?? 'Breakfast';

  // This meal's dishes, quickest first. "Another" walks down the list.
  const mealList = useMemo(() => {
    const pool = meal ? RECIPES.filter((r) => r.category === meal) : RECIPES;
    return [...pool].sort((a, b) => a.minutes - b.minutes);
  }, [meal]);
  const [pickIndex, setPickIndex] = useState(0);
  const pickPosition = pickIndex % mealList.length;
  const pick = mealList[pickPosition];

  const filtered = useMemo(
    () =>
      RECIPES.filter((r) => r.category === category).sort(
        (a, b) => a.minutes - b.minutes,
      ),
    [category],
  );

  const counts = useMemo(() => {
    const map: Record<RecipeCategory, number> = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snacks: 0,
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
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5 md:px-8">
        <span className="font-display text-base tracking-tight text-ink">
          Tap. Talk. <span className="italic text-terracotta">Cook.</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Hands-free · high-protein
        </span>
      </header>

      {/* The static prerender can't know the visitor's clock, so time-aware
          content stays invisible (height reserved) until hydration resolves
          the mealtime, then fades in — no flash of the wrong headline. */}
      <div
        className={`flex flex-col transition-opacity duration-300 ${
          meal ? 'opacity-100' : 'opacity-0'
        }`}
      >
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
              isFastest={pickPosition === 0}
              onCook={() => handleStart(pick)}
              onAnother={() => setPickIndex((i) => i + 1)}
            />
          </div>
        </section>

        <BrowseAll
          category={chosenCategory ?? meal}
          counts={counts}
          recipes={filtered}
          onChangeCategory={setChosenCategory}
          onPick={handleStart}
        />
      </div>
    </div>
  );
}

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
    meal === 'Dinner' ? 'Tonight’s pick' : meal ? `${meal} pick` : 'Our pick';
  // Keyed by slug: rerolling remounts the card so anim-step-in replays.
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
