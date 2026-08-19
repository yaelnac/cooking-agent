import type { Recipe } from './recipes';
import { SCREEN_ACTION_PREFIX } from './step-commands';

// System-prompt override sent when a session starts. The tool names must
// match the client tools registered in CookingView and configured on the
// ElevenLabs agent.
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
  lines.push('');
  lines.push('Ingredients (shown on screen):');
  for (const i of recipe.ingredients) {
    lines.push(`- ${i.item} — ${i.qty}${i.note ? ` (${i.note})` : ''}`);
  }
  lines.push('');
  lines.push(`Steps (${recipe.steps.length} total):`);
  recipe.steps.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.title}: ${s.body}`);
  });
  lines.push('');
  lines.push('How to drive the screen with client tools:');
  lines.push(
    `- Call setActiveRecipe(name="${recipe.name}", slug="${recipe.slug}") once at the very start.`,
  );
  lines.push(
    `- The moment you begin a step, call setCurrentStep(index, total=${recipe.steps.length}) with that step's number FIRST — this highlights the matching step on screen so the user can follow along. Then explain it naturally and wait for them to say "done" before moving on. If they say "repeat", explain the same step again.`,
  );
  lines.push(
    '- As the user gathers or uses an ingredient, call checkIngredient(name) to tick it off.',
  );
  lines.push('- When a step has a timer, call startTimer(seconds, label).');
  lines.push('- When the dish is finished and plated, call completeRecipe().');
  lines.push('');
  lines.push(
    `The user can also tap the screen instead of speaking. Messages starting with "${SCREEN_ACTION_PREFIX}" describe what the screen already shows — do not call setCurrentStep for them. If one names a step, walk the user through that step; if it says the dish is plated, give a short warm send-off.`,
  );
  return lines.join('\n');
}
