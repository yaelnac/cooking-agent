'use client';

import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from '@elevenlabs/react';

const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

export default function Page() {
  return (
    <ConversationProvider>
      <App />
    </ConversationProvider>
  );
}

function App() {
  const { status } = useConversationStatus();
  const isCooking = status === 'connected' || status === 'connecting';

  return (
    <main className="flex w-full flex-1 flex-col">
      {isCooking ? (
        <div className="mx-auto w-full max-w-md">
          <CookingView />
        </div>
      ) : (
        <HomeView />
      )}
    </main>
  );
}

function HomeView() {
  const { startSession } = useConversationControls();
  const { status } = useConversationStatus();

  async function handleStart() {
    if (!agentId) {
      alert('Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID');
      return;
    }
    await navigator.mediaDevices.getUserMedia({ audio: true });
    startSession({ agentId, connectionType: 'websocket' });
  }

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-5 py-16 text-center">
        <h1 className="font-display text-[26px] leading-tight tracking-tight md:text-[34px]">
          Tap. Talk.{' '}
          <span className="italic text-terracotta">Cook.</span>
        </h1>

        <IdleOrb onTap={handleStart} loading={status === 'connecting'} />

        <p className="text-sm text-ink-faint">
          {status === 'connecting'
            ? 'Warming up the kitchen…'
            : 'Tap to start.'}
        </p>
      </div>
    </section>
  );
}

function CookingView() {
  const { endSession } = useConversationControls();

  return (
    <div className="flex min-h-screen flex-col px-5 py-6">
      <button
        onClick={endSession}
        className="self-start rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft"
      >
        End session
      </button>
    </div>
  );
}

function IdleOrb({ onTap, loading }: { onTap: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={loading}
      aria-label="Start cooking with voice"
      className="relative z-10 grid h-44 w-44 place-items-center disabled:cursor-wait md:h-52 md:w-52"
    >
      <span
        className="absolute inset-0 rounded-full bg-terracotta/15"
        style={{ animation: 'orb-breathe 3.6s ease-in-out infinite' }}
      />
      <span
        className="absolute inset-3 rounded-full bg-terracotta/25"
        style={{ animation: 'orb-pulse 2.4s ease-in-out infinite' }}
      />
      <span className="absolute inset-7 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_18px_40px_-12px_rgba(223,98,56,0.55)]" />
      <span className="relative z-10 flex flex-col items-center gap-1 text-paper">
        <MicIcon className="h-7 w-7" />
        <span className="text-[13px] font-medium tracking-wide">
          {loading ? 'Connecting…' : 'Tap to cook'}
        </span>
      </span>
    </button>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        fill="currentColor"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
