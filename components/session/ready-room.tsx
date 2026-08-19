import type { IngredientState, Recipe } from '@/lib/recipes';
import { ArrowIcon, CheckIcon, ClockIcon, MicIcon } from '../icons';
import { Card } from '../shared/card';
import { ReadyOrb, WaveBars } from '../shared/voice';

// Pre-session screen: gather ingredients and preview the steps. No mic and
// no ElevenLabs connection until the user taps start.
export function ReadyRoom({
  recipe,
  ingredients,
  onToggleIngredient,
  onStart,
  starting,
  startError,
  onClose,
}: {
  recipe: Recipe;
  ingredients: IngredientState[];
  onToggleIngredient: (idx: number) => void;
  onStart: () => void;
  starting: boolean;
  startError?: string | null;
  onClose: () => void;
}) {
  const steps = recipe.steps;
  const gathered = ingredients.filter((i) => i.checked).length;
  const allGathered = ingredients.length > 0 && gathered === ingredients.length;

  const hero = (
    <header className="anim-rise flex flex-col items-center text-center">
      <ReadyOrb starting={starting} size="h-32 w-32 lg:h-36 lg:w-36" />

      <span className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta">
        {recipe.angle}
      </span>

      <h1 className="mt-2 font-display text-[30px] leading-[1.07] tracking-tight text-ink md:text-[36px] lg:text-[38px]">
        {recipe.name}
      </h1>

      <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-ink-soft lg:text-[15px]">
        I read every step out loud and wait for you, so your hands stay in the
        bowl, not on the screen.
      </p>

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
    </header>
  );

  const ingredientsCard =
    ingredients.length > 0 ? (
      <Card className="anim-rise p-5 lg:p-4" style={{ animationDelay: '90ms' }}>
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
      </Card>
    ) : null;

  const pathCard =
    steps.length > 0 ? (
      <Card className="anim-rise p-5 lg:p-4" style={{ animationDelay: '170ms' }}>
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
      </Card>
    ) : null;

  const startCta = (
    <StartCTA onStart={onStart} starting={starting} error={startError} />
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <span className="absolute left-1/2 top-[-70px] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-butter/55 blur-3xl" />
        <span className="absolute right-[-90px] top-[180px] h-72 w-72 rounded-full bg-terracotta/12 blur-3xl" />
        <span className="absolute left-[-90px] top-[540px] h-72 w-72 rounded-full bg-forest/10 blur-3xl" />
      </div>

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
            {recipe.category}
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl px-5 pb-44 pt-8 lg:flex lg:max-w-6xl lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:pb-8 lg:pt-4">
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
          <div className="lg:col-span-5 lg:sticky lg:top-10">
            {hero}
            <div className="mt-6 hidden lg:block">{startCta}</div>
          </div>
          <div className="mt-6 flex flex-col gap-6 lg:col-span-7 lg:mt-0 lg:gap-3">
            {ingredientsCard}
            {pathCard}
          </div>
        </div>
      </div>

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
  error,
}: {
  onStart: () => void;
  starting: boolean;
  error?: string | null;
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
      {error ? (
        <p className="mt-2.5 text-center text-[11px] font-medium leading-relaxed text-terracotta-deep">
          {error}
        </p>
      ) : (
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-faint">
          Mic turns on · say{' '}
          <span className="font-semibold text-ink-soft">“done”</span> to
          advance,{' '}
          <span className="font-semibold text-ink-soft">“repeat”</span> to hear
          it again
        </p>
      )}
    </div>
  );
}
