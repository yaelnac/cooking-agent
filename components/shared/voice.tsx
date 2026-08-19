import { SoundWaveIcon } from '../icons';

export function WaveBars() {
  return (
    <span className="flex h-6 items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-0.5 origin-center rounded-full bg-paper"
          style={{
            height: '100%',
            animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function ReadyOrb({
  starting,
  size = 'h-36 w-36 lg:h-44 lg:w-44',
}: {
  starting: boolean;
  size?: string;
}) {
  return (
    <div className={`anim-float relative grid place-items-center ${size}`}>
      <span
        className="absolute inset-0 rounded-full bg-terracotta/20"
        style={{ animation: 'ring-ripple 3.6s ease-out infinite' }}
      />
      <span
        className="absolute inset-0 rounded-full bg-terracotta/15"
        style={{ animation: 'ring-ripple 3.6s ease-out 1.8s infinite' }}
      />
      <span
        className="absolute inset-2 rounded-full bg-terracotta/15"
        style={{ animation: 'orb-breathe 4.2s ease-in-out infinite' }}
      />
      <span
        className="absolute inset-6 rounded-full bg-terracotta/30"
        style={{ animation: 'orb-pulse 3s ease-in-out infinite' }}
      />
      <span className="absolute inset-10 rounded-full bg-gradient-to-br from-terracotta to-terracotta-deep shadow-[0_24px_46px_-14px_rgba(223,98,56,0.72)]" />
      <span className="relative z-10 text-paper">
        {starting ? (
          <WaveBars />
        ) : (
          <SoundWaveIcon className="h-7 w-7 lg:h-9 lg:w-9" />
        )}
      </span>
    </div>
  );
}
