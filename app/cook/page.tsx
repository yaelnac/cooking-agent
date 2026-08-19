'use client';

import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { getRecipeBySlug } from '../recipes';
import { buildAgentBriefing, CookingView } from '../views';

const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

function CookPageInner() {
  const { status } = useConversationStatus();
  const { startSession } = useConversationControls();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const recipe = useMemo(() => getRecipeBySlug(slug), [slug]);
  const hadActiveSessionRef = useRef(false);

  useEffect(() => {
    if (status === 'connected' || status === 'connecting') {
      hadActiveSessionRef.current = true;
      return;
    }

    if (hadActiveSessionRef.current && status === 'disconnected') {
      router.replace('/');
    }
  }, [status, router]);

  // The voice session starts only when the user taps "Start" — never on page
  // load — so landing on /cook (with or without a slug) spends no tokens.
  const handleStart = useCallback(async () => {
    // Sessions always start from a chosen recipe — without one, the page
    // shows the recipe chooser and there is nothing to start.
    if (!recipe) return;
    if (!agentId) {
      alert('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
      return;
    }
    await navigator.mediaDevices.getUserMedia({ audio: true });
    startSession({
      agentId,
      connectionType: 'websocket',
      overrides: {
        agent: {
          firstMessage: `Let's make ${recipe.name}. Ready when you are.`,
          prompt: {
            prompt: buildAgentBriefing(recipe),
          },
        },
      },
    });
  }, [startSession, recipe]);

  return (
    <main className="flex w-full flex-1 flex-col">
      <CookingView initialRecipe={recipe} onStart={handleStart} />
    </main>
  );
}

export default function CookPage() {
  return (
    <Suspense fallback={<main className="flex w-full flex-1" />}>
      <CookPageInner />
    </Suspense>
  );
}
