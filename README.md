# Cooking Agent

Cook a high-protein meal by talking, not scrolling.

Cooking Agent is a voice-first cook-along. You pick a recipe, tap start, and a voice walks you through it step by step. It reads a step, waits, and moves on when you say "done." Your hands stay in the bowl.

The screen follows the conversation. The current step highlights itself, ingredients tick off as you gather them, and timers appear when a step needs one. Everything lives in the page — no database, no login, no account.

## Why It Exists

Cooking from a screen means touching the screen. Wet hands, greasy fingers, a phone that sleeps at the worst moment, a recipe you have to scroll back through because you lost your place.

A voice assistant that just reads a recipe out loud is not much better. It talks over you, races ahead, and does not know where you are.

Cooking Agent waits. It explains a step in its own words, then holds until you say you are ready. You can say "repeat" to hear it again or "back" to return to the previous step. The screen shows what the voice is saying, so a glance is enough to catch up.

Who it's for: one person cooking one meal, who wants protein on the plate without reading a recipe five times.

## How To Use It

1. Pick a recipe from quick picks or browse by meal.
2. Read the ready room — ingredients, time, steps, protein, and calories — and tick off what you have.
3. Tap start and allow the microphone.
4. Cook. The voice reads a step and waits.
5. Say "done" or "next" to move on, "repeat" to hear it again, "back" to return to the previous step.
6. When the dish is plated, the session ends and you land back home.

Nothing connects until you tap start. Opening the app, browsing recipes, and gathering ingredients all happen with the mic off.

## What's Included

| Area | What it does |
| --- | --- |
| Recipe library | 40 recipes across breakfast, lunch, dinner, and snacks, each with ingredients and full steps |
| Quick picks | Everything that takes five minutes or less, sorted fastest first |
| Ready room | Ingredient checklist, time, step count, protein, and calorie range before the mic turns on |
| Voice cook-along | Step-by-step narration paced by you, not by a timer |
| Live screen | Current step highlights, ingredients tick off, progress bar fills |
| Timers | Named countdowns started by the voice, ticking on screen, dismissible by hand |
| Manual fallback | Tap any step, or use the step controls, if you would rather not talk |

## Local Development

You need Node.js 20+ and an [ElevenLabs](https://elevenlabs.io) agent.

```bash
# create .env.local with your agent id
echo "NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here" > .env.local

npm install
npm run dev
```

Open http://localhost:3000.

Without an agent id the app still runs — you can browse recipes and open the ready room — but tapping start will tell you the id is missing.

### Setting up the agent

The app drives the screen through ElevenLabs client tools. Your agent needs these registered, or the voice will talk while the screen sits still:

| Tool | Parameters | Effect |
| --- | --- | --- |
| `setActiveRecipe` | `name`, `slug?`, `calories?`, `protein?` | Names the dish and loads its ingredients |
| `setCurrentStep` | `index`, `total`, `title?`, `text?` | Highlights the step being explained |
| `setIngredients` | `items[]` | Replaces the ingredient list |
| `checkIngredient` | `name` | Ticks one ingredient off |
| `startTimer` | `seconds`, `label` | Starts a named countdown |
| `completeRecipe` | — | Marks the dish finished |

The rest of the prompt is built per session. When you open a recipe, the app sends that recipe's ingredients, steps, macros, and pacing rules as a prompt override, so the agent always has the exact dish in front of it.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Voice | ElevenLabs Agents via `@elevenlabs/react` |
| Recipes | Static TypeScript module |
| State | React state, per session |

## Project Structure

```
app/
  page.tsx               Home — hero, quick picks, browse by category
  cook/page.tsx          Cook-along route, reads ?slug= and starts the session
  views.tsx              Every view: home, ready room, cooking screen, UI pieces
  recipes.ts             The 40 recipes, their ingredients, steps, and timers
  conversation-shell.tsx ElevenLabs provider wrapping the app
  layout.tsx             Fonts, metadata, shell
  globals.css            Theme tokens and animations
```

Main cooking flow:

```
recipes.ts -> /cook?slug= -> buildAgentBriefing() -> ElevenLabs session -> client tools -> CookingView
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production app |
| `npm run lint` | Run ESLint |

## Design Notes

The voice session starts only when you tap start. Landing on `/cook`, with or without a recipe, opens no connection and spends no credits.

The screen does not depend on the agent behaving. Steps advance from your own words — the app listens for "done," "next," "back," and their cousins — and every step is tappable by hand. If the agent forgets to call a tool, you can still cook.

Recipes are data, not prose. Each one carries structured ingredients and steps, so the same recipe feeds the checklist, the screen, and the agent's briefing without being written three times.

The agent is told not to read the recipe out word for word. It has the full text, but its job is to talk you through it like someone standing next to you.

## Security

The ElevenLabs agent id is public by design — it identifies a public agent and carries no secret. Nothing else is exposed to the browser.

The microphone is requested only on tap, and the session ends when you leave the cooking screen.

Secrets stay out of git. All `.env*` files are ignored.
