import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AudioPlayerProps {
  src: string;
  nome?: string;
  canal?: 'whatsapp' | 'telegram';
}

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// Generate a deterministic waveform pattern from a string seed
const generateBars = (seed: string, count: number): number[] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash << 13) ^ hash) - (hash >>> 7);
    hash = (hash ^ 0xdeadbeef) + (hash << 4);
    const normalized = (Math.abs(hash % 1000)) / 1000;
    // Shape into a nice waveform: min 0.18 max 1.0 with a natural curve
    bars.push(0.18 + normalized * 0.82);
  }
  return bars;
};

const BAR_COUNT = 40;

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, nome = '', canal = 'whatsapp' }) => {
  const isTelegram = canal === 'telegram';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rate, setRate] = useState(1);
  const barsRef = useRef<HTMLDivElement>(null);

  const bars = React.useMemo(() => generateBars(src + nome, BAR_COUNT), [src, nome]);
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => { if (!dragging) setCurrentTime(audio.currentTime); };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [dragging]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  const toggleRate = useCallback(() => {
    const audio = audioRef.current;
    const nextRate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(nextRate);
    if (audio) audio.playbackRate = nextRate;
  }, [rate]);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = barsRef.current;
      const audio = audioRef.current;
      if (!el || !audio || !duration) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    },
    [duration]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      seekFromEvent(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [seekFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      seekFromEvent(e.clientX);
    },
    [dragging, seekFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
          isTelegram
            ? 'bg-sky-500 hover:bg-sky-400 shadow-[0_2px_10px_rgba(56,189,248,0.3)] hover:shadow-[0_2px_16px_rgba(56,189,248,0.45)]'
            : 'bg-primary hover:bg-primary-hover shadow-[0_2px_10px_var(--color-primary-bg)] hover:shadow-[0_2px_16px_var(--color-primary-bg)]',
          'active:scale-95'
        )}
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-white fill-white" />
        ) : (
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0">
        {/* Waveform bars */}
        <div
          ref={barsRef}
          className="relative h-8 flex items-center gap-[2px] cursor-pointer select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {bars.map((height, i) => {
            const barProgress = i / BAR_COUNT;
            const isActive = barProgress < progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-100"
                style={{
                  height: `${height * 100}%`,
                  backgroundColor: isActive
                    ? (isTelegram ? 'rgb(56, 189, 248)' : 'rgb(52, 211, 153)')
                    : 'rgba(255,255,255,0.04)',
                }}
              />
            );
          })}
        </div>

        {/* Time */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-txt-dim font-mono tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] text-txt-dim font-mono tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <button
        onClick={toggleRate}
        className={cn(
          'px-2 py-1 rounded-lg text-[10px] font-mono text-txt-muted border border-surface-200 bg-surface-50/60 transition-all',
          isTelegram ? 'hover:border-sky-500/30 hover:text-sky-300' : 'hover:border-primary-bg hover:text-primary-light'
        )}
      >
        {rate.toFixed(1)}x
      </button>
    </div>
  );
};
