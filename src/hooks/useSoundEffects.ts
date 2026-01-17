/**
 * useSoundEffects - Sound Effects & Haptic Feedback
 * เสียงเอฟเฟกต์และการสั่นสำหรับเกม (ปรับปรุงให้ดีขึ้น)
 */

import { useCallback, useRef, useEffect } from "react";

interface UseSoundEffectsOptions {
  enabled?: boolean;
  volume?: number; // 0-1
  hapticEnabled?: boolean;
}

interface UseSoundEffectsReturn {
  playTick: () => void;
  playCountdown: () => void;
  playTimeUp: () => void;
  playNewQuestion: () => void;
  playDrink: () => void;
  playCelebration: () => void;
  playCustom: (url: string) => void;
  vibrate: (pattern?: number | number[]) => void;
  vibrateShort: () => void;
  vibrateLong: () => void;
  vibratePattern: (pattern: number[]) => void;
}

export function useSoundEffects({
  enabled = true,
  volume = 0.6,
  hapticEnabled = true,
}: UseSoundEffectsOptions = {}): UseSoundEffectsReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize AudioContext on first interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current && typeof window !== "undefined") {
        try {
          audioContextRef.current = new (
            window.AudioContext ||
            (
              window as typeof window & {
                webkitAudioContext: typeof AudioContext;
              }
            ).webkitAudioContext
          )();
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.gain.value = volume;
          gainNodeRef.current.connect(audioContextRef.current.destination);
        } catch {
          console.warn("Web Audio API not supported");
        }
      }
    };

    const handleInteraction = () => {
      initAudio();
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [volume]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Play a nice bell/chime sound
  const playNote = useCallback(
    (
      frequency: number,
      duration: number,
      type: OscillatorType = "sine",
      delay: number = 0,
    ) => {
      if (!enabled || !audioContextRef.current) return;

      try {
        const ctx = audioContextRef.current;
        const now = ctx.currentTime + delay;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);

        // Smooth attack and decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now);
        oscillator.stop(now + duration);
      } catch {
        // Ignore errors
      }
    },
    [enabled, volume],
  );

  // Nice tick sound
  const playTick = useCallback(() => {
    playNote(1200, 0.05, "sine");
    if (hapticEnabled) {
      vibrateShort();
    }
  }, [playNote, hapticEnabled]);

  // Warning countdown - descending notes
  const playCountdown = useCallback(() => {
    playNote(880, 0.15, "sine");
    if (hapticEnabled) {
      vibratePattern([30, 20, 30]);
    }
  }, [playNote, hapticEnabled]);

  // Time's up - dramatic descending
  const playTimeUp = useCallback(() => {
    playNote(440, 0.2, "sine", 0);
    playNote(330, 0.2, "sine", 0.15);
    playNote(220, 0.4, "sine", 0.3);
    if (hapticEnabled) {
      vibratePattern([100, 50, 200]);
    }
  }, [playNote, hapticEnabled]);

  // New question - ascending whoosh
  const playNewQuestion = useCallback(() => {
    playNote(400, 0.08, "sine", 0);
    playNote(600, 0.08, "sine", 0.05);
    playNote(800, 0.12, "sine", 0.1);
    if (hapticEnabled) {
      vibrateShort();
    }
  }, [playNote, hapticEnabled]);

  // Drink sound - bubble pop
  const playDrink = useCallback(() => {
    playNote(300, 0.1, "sine", 0);
    playNote(400, 0.15, "sine", 0.08);
    if (hapticEnabled) {
      vibratePattern([50, 30, 80]);
    }
  }, [playNote, hapticEnabled]);

  // Celebration - happy ascending scale
  const playCelebration = useCallback(() => {
    const notes = [523, 659, 784, 1047]; // C, E, G, C octave
    notes.forEach((freq, i) => {
      playNote(freq, 0.2, "sine", i * 0.1);
    });
    if (hapticEnabled) {
      vibratePattern([50, 30, 50, 30, 100, 50, 150]);
    }
  }, [playNote, hapticEnabled]);

  // Play custom audio file
  const playCustom = useCallback(
    (url: string) => {
      if (!enabled) return;
      try {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(() => {});
      } catch {
        // Ignore errors
      }
    },
    [enabled, volume],
  );

  // Vibration helpers
  const vibrate = useCallback(
    (pattern: number | number[] = 50) => {
      if (
        !hapticEnabled ||
        typeof navigator === "undefined" ||
        !navigator.vibrate
      )
        return;
      try {
        navigator.vibrate(pattern);
      } catch {
        // Vibration not supported
      }
    },
    [hapticEnabled],
  );

  const vibrateShort = useCallback(() => vibrate(25), [vibrate]);
  const vibrateLong = useCallback(() => vibrate(150), [vibrate]);
  const vibratePattern = useCallback(
    (pattern: number[]) => vibrate(pattern),
    [vibrate],
  );

  return {
    playTick,
    playCountdown,
    playTimeUp,
    playNewQuestion,
    playDrink,
    playCelebration,
    playCustom,
    vibrate,
    vibrateShort,
    vibrateLong,
    vibratePattern,
  };
}

export default useSoundEffects;
