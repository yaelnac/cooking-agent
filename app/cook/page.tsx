'use client';

import {
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CookingView } from '../views';

const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

export default function CookPage() {
  const { status } = useConversationStatus();
  const { startSession } = useConversationControls();
  const router = useRouter();
  const attemptedStartRef = useRef(false);
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

  useEffect(() => {
    if (
      attemptedStartRef.current ||
      status === 'connected' ||
      status === 'connecting'
    ) {
      return;
    }

    attemptedStartRef.current = true;

    if (!agentId) {
      alert('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
      return;
    }

    const start = async () => {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startSession({
        agentId,
        connectionType: 'websocket',
      });
    };

    void start();
  }, [startSession, status]);

  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-md">
        <CookingView />
      </div>
    </main>
  );
}
