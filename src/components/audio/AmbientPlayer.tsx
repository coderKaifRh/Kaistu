import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, CloudRain, Waves, Coffee, Wind, Play, Square } from 'lucide-react';
import { audioSynth } from '../../services/audioSynth';
import type { AmbientSoundType } from '../../types';

interface AmbientPlayerProps {
  compact?: boolean;
}

export const AmbientPlayer: React.FC<AmbientPlayerProps> = ({ compact = false }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundType, setSoundType] = useState<AmbientSoundType>('rain');
  const [volume, setVolume] = useState<number>(50);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 16;
    const popoverWidth = Math.min(288, window.innerWidth - padding * 2);
    const popoverHeight = 220;

    // Preferred placement: bottom-end (align right edge of popover with trigger)
    let left = rect.right - popoverWidth;

    // Boundary detection & collision avoidance (shift horizontally if overflowing)
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - padding - popoverWidth;
    }
    if (left < padding) {
      left = padding;
    }

    // Vertical placement: default below with auto-flip above if exceeding viewport bottom
    let top = rect.bottom + 8;
    if (top + popoverHeight > window.innerHeight - padding && rect.top - popoverHeight - 8 > padding) {
      top = rect.top - popoverHeight - 8;
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => {
      // Keep playing across component unmounts unless explicitly stopped, or user controls it
    };
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      audioSynth.stop();
      setIsPlaying(false);
    } else {
      audioSynth.setVolume(volume / 100);
      audioSynth.play(soundType);
      setIsPlaying(true);
    }
  };

  const handleTypeChange = (type: AmbientSoundType) => {
    setSoundType(type);
    if (isPlaying) {
      audioSynth.play(type);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    audioSynth.setVolume(val / 100);
  };

  const sounds: { type: AmbientSoundType; label: string; icon: React.ReactNode }[] = [
    { type: 'rain', label: 'Rain', icon: <CloudRain className="w-4 h-4" /> },
    { type: 'waves', label: 'Waves', icon: <Waves className="w-4 h-4" /> },
    { type: 'cafe', label: 'Cafe', icon: <Coffee className="w-4 h-4" /> },
    { type: 'whitenoise', label: 'White Noise', icon: <Wind className="w-4 h-4" /> },
  ];

  if (compact) {
    return (
      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
            isPlaying
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Ambient Focus Soundscapes"
        >
          {isPlaying ? (
            <div className="flex items-end gap-[2px] h-3 w-3">
              <span className="w-[2.5px] bg-indigo-400 rounded-full animate-wave-1" />
              <span className="w-[2.5px] bg-indigo-400 rounded-full animate-wave-2" />
              <span className="w-[2.5px] bg-indigo-400 rounded-full animate-wave-3" />
            </div>
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden md:inline">{isPlaying ? sounds.find((s) => s.type === soundType)?.label : 'Sounds'}</span>
        </button>

        {isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              className="z-[9999] w-72 max-w-[calc(100vw-2rem)] bg-[#0e121b]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-4 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150 select-none"
            >
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">Focus Soundscapes</span>
                </div>
                <button
                  onClick={togglePlay}
                  className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1 font-semibold transition-all ${
                    isPlaying
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                  }`}
                >
                  {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3.5">
                {sounds.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => handleTypeChange(s.type)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      soundType === s.type
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-sm'
                        : 'bg-black/30 text-slate-400 border border-white/[0.05] hover:bg-white/[0.08] hover:text-slate-200'
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <span className="text-[11px] text-slate-400 font-medium">Vol</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[11px] text-slate-400 font-mono w-7 text-right">{volume}%</span>
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-slate-200">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-blue-400" /> Focus Sounds
        </span>
        <button
          onClick={togglePlay}
          className={`px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 font-medium transition-colors ${
            isPlaying
              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {sounds.map((s) => (
          <button
            key={s.type}
            onClick={() => handleTypeChange(s.type)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              soundType === s.type
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-slate-900/40 text-slate-400 border border-transparent hover:bg-slate-900/80 hover:text-slate-200'
            }`}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">Vol</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-[11px] text-slate-400 w-6 text-right">{volume}%</span>
      </div>
    </div>
  );
};
