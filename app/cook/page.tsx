'use client';

import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CookingView } from '@/components/session/cooking-view';
import { buildAgentBriefing } from '@/lib/agent-briefing';
import { getRecipeBySlug } from '@/lib/recipes';

const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

function CookPageInner() {
  const { status } = useConversationStatus();
  const { startSession } = useConversationControls();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const recipe = useMemo(() => getRecipeBySlug(slug), [slug]);
  const hadActiveSessionRef = useRef(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Return home once a session that was live ends.
  useEffect(() => {
    if (status === 'connected' || status === 'connecting') {
      hadActiveSessionRef.current = true;
      return;
    }
    if (hadActiveSessionRef.current && status === 'disconnected') {
      router.replace('/');
    }
  }, [status, router]);

  // Recipes are chosen on the homepage; /cook without a valid slug has
  // nothing to show.
  useEffect(() => {
    if (!recipe) {
      router.replace('/');
    }
  }, [recipe, router]);

  // The session starts only on user tap — landing here opens no connection.
  const handleStart = useCallback(async () => {
    if (!recipe) return;
    if (!agentId) {
      setStartError(
        'Voice is not configured — set NEXT_PUBLIC_ELEVENLABS_AGENT_ID and restart.',
      );
      return;
    }
    setStartError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStartError(
        'Microphone access was blocked. Allow it in your browser, then try again.',
      );
      return;
    }
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
      <CookingView
        initialRecipe={recipe}
        onStart={handleStart}
        startError={startError}
      />
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
