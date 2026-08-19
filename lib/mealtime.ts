import { useSyncExternalStore } from 'react';
import type { RecipeCategory } from './recipes';

export const MEAL_HEADLINES: Record<RecipeCategory, string> = {
  Breakfast: 'What’s for breakfast?',
  Lunch: 'What’s for lunch?',
  Dinner: 'What’s for dinner?',
  Snacks: 'Craving something?',
};

export function mealForHour(hour: number): RecipeCategory {
  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snacks';
}

const subscribe = () => () => {};

// Returns null on the server and during hydration: the prerendered HTML
// cannot know the visitor's local time, so callers must render a neutral
// state until this resolves.
export function useMealtime(): RecipeCategory | null {
  return useSyncExternalStore(
    subscribe,
    () => mealForHour(new Date().getHours()),
    () => null,
  );
}
