import type { Recipe } from '@/lib/recipes';
import { ArrowIcon, ClockIcon } from '../icons';

// A recipe as a single tappable row: name, one-line pitch, and the facts the
// choice turns on (protein, minutes, kcal).
export function RecipeRow({
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
