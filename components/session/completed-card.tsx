import type { Recipe } from '@/lib/recipes';
import { ArrowIcon, CheckIcon, ClockIcon } from '../icons';

export function CompletedCard({
  recipeName,
  recipe,
  onEnd,
}: {
  recipeName: string;
  recipe: Recipe;
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
