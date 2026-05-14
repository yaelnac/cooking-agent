'use client';

import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
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
  const { status, message } = useConversationStatus();
  const { endSession } = useConversationControls();

  return (
    <div className="flex min-h-screen flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={endSession}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft"
        >
          End session
        </button>
        <ConnectionPill status={status} message={message} />
      </div>

      <VoiceOrb status={status} />
    </div>
  );
}

function ConnectionPill({
  status,
  message,
}: {
  status: string;
  message?: string;
}) {
  const tone =
    status === 'connected'
      ? 'bg-forest-soft text-forest'
      : status === 'error'
      ? 'bg-terracotta-soft text-terracotta-deep'
      : 'bg-cream text-ink-soft border border-line';
  const label =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
      ? 'Connecting…'
      : status === 'error'
      ? message || 'Trouble connecting'
      : 'Idle';
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'connected' ? 'bg-forest' : 'bg-ink-faint'
        }`}
      />
      {label}
    </span>
  );
}

function VoiceOrb({ status }: { status: string }) {
  const { isSpeaking, isListening } = useConversationMode();
  const isConnecting = status === 'connecting';
  const label = isConnecting
    ? 'Warming up…'
    : isSpeaking
    ? 'Your chef is talking'
    : isListening
    ? 'Listening — say it'
    : 'Standing by';

  return (
    <div className="my-6 flex flex-col items-center gap-3">
      <div className="relative grid h-40 w-40 place-items-center">
        {isSpeaking && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-terracotta/25"
              style={{ animation: 'ring-ripple 1.6s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full bg-terracotta/20"
              style={{ animation: 'ring-ripple 1.6s ease-out 0.5s infinite' }}
            />
          </>
        )}
        {!isSpeaking && (
          <span
            className="absolute inset-2 rounded-full bg-terracotta/15"
            style={{ animation: 'orb-breathe 3.2s ease-in-out infinite' }}
          />
        )}
        <span className="absolute inset-6 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_22px_45px_-15px_rgba(223,98,56,0.6)]" />
        <span className="relative z-10">
          {isListening ? <WaveBars /> : <MicIcon className="h-8 w-8 text-paper" />}
        </span>
      </div>
      <p className="text-sm font-medium text-ink-soft">{label}</p>
    </div>
  );
}

function WaveBars() {
  return (
    <span className="flex h-8 items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-1 origin-center rounded-full bg-paper"
          style={{
            height: '100%',
            animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </span>
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
