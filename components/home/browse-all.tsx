import {
  CATEGORIES,
  type Recipe,
  type RecipeCategory,
} from '@/lib/recipes';
import { RecipeRow } from './recipe-row';

export function BrowseAll({
  category,
  counts,
  recipes,
  onChangeCategory,
  onPick,
}: {
  // null = mealtime not known yet; no tab renders as selected, so a refresh
  // can never flash the wrong one.
  category: RecipeCategory | null;
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
            Your <span className="relative inline-block italic">menu</span>.
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            {Object.values(counts).reduce((a, b) => a + b, 0)} recipes ·
            quickest first
          </span>
        </div>

        <CategoryTabs
          active={category}
          counts={counts}
          onChange={onChangeCategory}
        />

        <div className="mt-6 grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:gap-x-5">
          {recipes.map((r, i) => (
            <div
              key={r.slug}
              className="anim-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
            >
              <RecipeRow
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
  active: RecipeCategory | null;
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
