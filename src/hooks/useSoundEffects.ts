/**
 * useSoundEffects - Sound Effects & Haptic Feedback
 * เสียงเอฟเฟกต์และการสั่นสำหรับเกม
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

// Pre-defined sound URLs (using Web Audio API for better performance)
const SOUNDS = {
  tick: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAC/v7+/v7+/v7+/",
  countdown:
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
  timeUp:
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
  newQuestion:
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
  drink:
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
  celebration:
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
};

export function useSoundEffects({
  enabled = true,
  volume = 0.5,
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

    // Initialize on user interaction
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

  // Update volume when it changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Play sound using Web Audio API
  const playSound = useCallback(
    (
      frequency: number,
      duration: number = 0.1,
      type: OscillatorType = "sine",
    ) => {
      if (!enabled || !audioContextRef.current || !gainNodeRef.current) return;

      try {
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
          frequency,
          audioContextRef.current.currentTime,
        );
        oscillator.connect(gainNodeRef.current);
        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + duration);
      } catch {
        // Ignore errors
      }
    },
    [enabled],
  );

  // Tick sound (for countdown each second)
  const playTick = useCallback(() => {
    playSound(800, 0.05, "sine");
  }, [playSound]);

  // Countdown warning sound (last 5 seconds)
  const playCountdown = useCallback(() => {
    playSound(600, 0.15, "square");
    if (hapticEnabled) {
      vibrateShort();
    }
  }, [playSound, hapticEnabled]);

  // Time's up sound
  const playTimeUp = useCallback(() => {
    playSound(200, 0.3, "sawtooth");
    setTimeout(() => playSound(150, 0.4, "sawtooth"), 300);
    if (hapticEnabled) {
      vibrateLong();
    }
  }, [playSound, hapticEnabled]);

  // New question whoosh
  const playNewQuestion = useCallback(() => {
    playSound(400, 0.1, "sine");
    setTimeout(() => playSound(600, 0.1, "sine"), 50);
    setTimeout(() => playSound(800, 0.1, "sine"), 100);
  }, [playSound]);

  // Drink sound
  const playDrink = useCallback(() => {
    playSound(300, 0.2, "triangle");
    if (hapticEnabled) {
      vibratePattern([50, 50, 100]);
    }
  }, [playSound, hapticEnabled]);

  // Celebration sound
  const playCelebration = useCallback(() => {
    [400, 500, 600, 700, 800].forEach((freq, i) => {
      setTimeout(() => playSound(freq, 0.1, "sine"), i * 80);
    });
    if (hapticEnabled) {
      vibratePattern([50, 30, 50, 30, 100]);
    }
  }, [playSound, hapticEnabled]);

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

  const vibrateShort = useCallback(() => vibrate(30), [vibrate]);
  const vibrateLong = useCallback(() => vibrate(200), [vibrate]);
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
