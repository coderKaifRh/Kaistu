import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flame } from 'lucide-react';
import type { PomodoroState } from '../../types';

export const PomodoroBar: React.FC = () => {
  const [state, setState] = useState<PomodoroState>({
    workMinutes: 25,
    breakMinutes: 5,
    secondsRemaining: 25 * 60,
    isRunning: false,
    mode: 'work',
    completedSessions: 0,
  });

  useEffect(() => {
    let interval: any = null;

    if (state.isRunning && state.secondsRemaining > 0) {
      interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          secondsRemaining: prev.secondsRemaining - 1,
        }));
      }, 1000);
    } else if (state.isRunning && state.secondsRemaining === 0) {
      // Switch mode
      const nextMode = state.mode === 'work' ? 'break' : 'work';
      const nextSeconds = nextMode === 'work' ? state.workMinutes * 60 : state.breakMinutes * 60;
      const nextCompleted = state.mode === 'work' ? state.completedSessions + 1 : state.completedSessions;

      setState((prev) => ({
        ...prev,
        mode: nextMode,
        secondsRemaining: nextSeconds,
        completedSessions: nextCompleted,
      }));

      // Play audio notification chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        console.warn('Audio context error', e);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isRunning, state.secondsRemaining, state.mode, state.workMinutes, state.breakMinutes]);

  const toggleTimer = () => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const resetTimer = () => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      secondsRemaining: prev.mode === 'work' ? prev.workMinutes * 60 : prev.breakMinutes * 60,
    }));
  };

  const minutes = Math.floor(state.secondsRemaining / 60);
  const seconds = state.secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const totalSeconds = (state.mode === 'work' ? state.workMinutes : state.breakMinutes) * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - state.secondsRemaining) / totalSeconds) * 100));

  return (
    <div className="group relative overflow-hidden rounded-xl bg-slate-900/70 border border-white/[0.07] p-2.5 shadow-sm transition-all hover:border-white/[0.12]">
      {/* Progress track */}
      <div
        className={`absolute bottom-0 left-0 h-[2px] transition-all duration-1000 ${
          state.mode === 'work' ? 'bg-indigo-500/80' : 'bg-amber-500/80'
        }`}
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                state.isRunning
                  ? state.mode === 'work'
                    ? 'bg-emerald-400 ring-4 ring-emerald-400/20'
                    : 'bg-amber-400 ring-4 ring-amber-400/20'
                  : 'bg-slate-500'
              }`}
            />
          </div>
          <span className="font-mono text-xs font-semibold tracking-tight text-white">
            {timeFormatted}
          </span>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              state.mode === 'work'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
            }`}
          >
            {state.mode}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {state.completedSessions > 0 && (
            <div
              className="flex items-center gap-0.5 text-amber-400 font-mono text-[10px] font-bold mr-1"
              title={`${state.completedSessions} sessions completed`}
            >
              <Flame className="w-3 h-3 fill-amber-400" />
              <span>{state.completedSessions}</span>
            </div>
          )}

          <button
            onClick={toggleTimer}
            className={`p-1 rounded-lg text-xs font-medium transition-colors ${
              state.isRunning
                ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
            }`}
            title={state.isRunning ? 'Pause timer' : 'Start focus timer'}
          >
            {state.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          </button>

          <button
            onClick={resetTimer}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Reset timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
