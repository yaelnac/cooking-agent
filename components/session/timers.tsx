import { formatSeconds } from '@/lib/format';
import { ClockIcon, XIcon } from '../icons';
import { Card } from '../shared/card';

export type CookingTimer = {
  id: string;
  label: string;
  totalSeconds: number;
  secondsLeft: number;
  isDone: boolean;
};

export function TimerStack({
  timers,
  onDismiss,
}: {
  timers: CookingTimer[];
  onDismiss: (id: string) => void;
}) {
  if (timers.length === 0) return null;

  // Finished timers first — they need attention — then soonest to ring.
  const sorted = [...timers].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? -1 : 1;
    return a.secondsLeft - b.secondsLeft;
  });

  const activeCount = timers.filter((t) => !t.isDone).length;

  return (
    <Card className="anim-rise p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            Timers
          </span>
          <span className="font-display text-lg tracking-tight text-ink">
            {activeCount > 0 ? `${activeCount} running` : 'All done'}
          </span>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream text-ink-soft">
          <ClockIcon className="h-4 w-4" />
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.map((t) => (
          <li key={t.id}>
            <TimerRow timer={t} onDismiss={() => onDismiss(t.id)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TimerRow({
  timer,
  onDismiss,
}: {
  timer: CookingTimer;
  onDismiss: () => void;
}) {
  const ratio = timer.totalSeconds
    ? 1 - timer.secondsLeft / timer.totalSeconds
    : 0;

  return (
    <div
      className={`anim-fade-up flex items-center justify-between gap-3 rounded-2xl border p-3 ${
        timer.isDone
          ? 'border-butter-deep/50 bg-butter/70'
          : 'border-line bg-cream/40'
      }`}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">{timer.label}</span>
          <span className="font-mono text-base tabular-nums text-ink">
            {timer.isDone ? 'Ready' : formatSeconds(timer.secondsLeft)}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            className={`h-full rounded-full ${
              timer.isDone ? 'bg-butter-deep' : 'bg-terracotta'
            }`}
            style={{ width: `${Math.min(1, ratio) * 100}%` }}
          />
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss timer"
        className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-faint hover:bg-line-soft"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
