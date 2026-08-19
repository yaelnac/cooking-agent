'use client';

import { useState } from 'react';
import type { IngredientState } from '@/lib/recipes';
import { BowlIcon, CheckIcon, ChevronIcon } from '../icons';
import { Card } from '../shared/card';

export function IngredientsPanel({
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
    <Card className="anim-rise p-5">
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
      )}
    </Card>
  );
}
