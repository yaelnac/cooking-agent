import { SoundWaveIcon } from '../icons';
import { WaveBars } from '../shared/voice';

export function SessionHeader({
  recipeName,
  currentIndex,
  totalSteps,
  progress,
  isSpeaking,
  isListening,
  status,
}: {
  recipeName: string;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  isSpeaking: boolean;
  isListening: boolean;
  status: string;
}) {
  const pct = Math.round(progress * 100);
  const stepLabel =
    totalSteps > 0
      ? `Step ${Math.min(Math.max(1, currentIndex), totalSteps)} of ${totalSteps}`
      : 'Getting started';

  return (
    <div className="anim-rise flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-2.5">
        <h1 className="truncate font-display text-[26px] leading-tight tracking-tight text-ink md:text-[32px]">
          {recipeName}
        </h1>
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {stepLabel}
          </span>
          {totalSteps > 0 && (
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line-soft sm:w-40">
              <div
                className="h-full rounded-full bg-terracotta transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <VoiceMeter
        isSpeaking={isSpeaking}
        isListening={isListening}
        status={status}
      />
    </div>
  );
}

function VoiceMeter({
  isSpeaking,
  isListening,
  status,
}: {
  isSpeaking: boolean;
  isListening: boolean;
  status: string;
}) {
  const label =
    status === 'connecting'
      ? 'Connecting'
      : isSpeaking
      ? 'Speaking'
      : isListening
      ? 'Your turn'
      : 'Ready';
  return (
    <div className="flex shrink-0 items-center gap-2.5 self-start rounded-full border border-line bg-paper/80 py-1.5 pl-1.5 pr-4 backdrop-blur">
      <span className="relative grid h-9 w-9 place-items-center">
        {isSpeaking && (
          <span
            className="absolute inset-0 rounded-full bg-terracotta/25"
            style={{ animation: 'ring-ripple 1.8s ease-out infinite' }}
          />
        )}
        <span
          className="absolute inset-0.5 rounded-full bg-terracotta/15"
          style={{ animation: 'orb-breathe 3.4s ease-in-out infinite' }}
        />
        <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep" />
        <span className="relative z-10 text-paper">
          {isListening ? (
            <WaveBars />
          ) : (
            <SoundWaveIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Kitchen voice
        </span>
        <span className="mt-1 text-sm font-semibold text-ink">{label}</span>
      </span>
    </div>
  );
}
