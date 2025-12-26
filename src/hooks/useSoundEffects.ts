import { useCallback, useRef } from "react";

// Create audio context and oscillators for sound effects
const createSound = (frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

export const useSoundEffects = () => {
  const lastPlayedRef = useRef<{ [key: string]: number }>({});

  const playWinSound = useCallback(() => {
    // Prevent rapid repeated plays
    const now = Date.now();
    if (lastPlayedRef.current.win && now - lastPlayedRef.current.win < 1000) return;
    lastPlayedRef.current.win = now;

    // Victory fanfare - ascending notes
    setTimeout(() => createSound(523.25, 0.15, "sine", 0.4), 0);    // C5
    setTimeout(() => createSound(659.25, 0.15, "sine", 0.4), 100);  // E5
    setTimeout(() => createSound(783.99, 0.15, "sine", 0.4), 200);  // G5
    setTimeout(() => createSound(1046.50, 0.3, "sine", 0.5), 300);  // C6 (longer, louder)
    
    // Add a sparkle effect
    setTimeout(() => createSound(1318.51, 0.1, "sine", 0.2), 400);  // E6
    setTimeout(() => createSound(1567.98, 0.15, "sine", 0.15), 450); // G6
  }, []);

  const playLoseSound = useCallback(() => {
    // Prevent rapid repeated plays
    const now = Date.now();
    if (lastPlayedRef.current.lose && now - lastPlayedRef.current.lose < 1000) return;
    lastPlayedRef.current.lose = now;

    // Descending sad tone
    setTimeout(() => createSound(392.00, 0.2, "sine", 0.3), 0);    // G4
    setTimeout(() => createSound(349.23, 0.2, "sine", 0.25), 150); // F4
    setTimeout(() => createSound(293.66, 0.3, "sine", 0.2), 300);  // D4
    setTimeout(() => createSound(261.63, 0.4, "sine", 0.15), 450); // C4 (longer, softer)
  }, []);

  const playBetPlacedSound = useCallback(() => {
    // Quick confirmation beep
    createSound(880, 0.08, "sine", 0.25);
    setTimeout(() => createSound(1108.73, 0.1, "sine", 0.2), 80);
  }, []);

  const playTransactionSuccessSound = useCallback(() => {
    // Prevent rapid repeated plays
    const now = Date.now();
    if (lastPlayedRef.current.transaction && now - lastPlayedRef.current.transaction < 1000) return;
    lastPlayedRef.current.transaction = now;

    // Coin/money sound with ascending chime
    setTimeout(() => createSound(1200, 0.05, "sine", 0.2), 0);    // High ping
    setTimeout(() => createSound(800, 0.08, "sine", 0.25), 50);   // Coin drop
    setTimeout(() => createSound(1000, 0.06, "sine", 0.2), 100);  // Bounce
    setTimeout(() => createSound(600, 0.1, "sine", 0.3), 150);    // Register
    
    // Success melody
    setTimeout(() => createSound(523.25, 0.12, "sine", 0.35), 250);  // C5
    setTimeout(() => createSound(659.25, 0.12, "sine", 0.35), 350);  // E5
    setTimeout(() => createSound(783.99, 0.12, "sine", 0.35), 450);  // G5
    setTimeout(() => createSound(1046.50, 0.25, "sine", 0.4), 550);  // C6
    
    // Sparkle finish
    setTimeout(() => createSound(1318.51, 0.08, "sine", 0.15), 700);
    setTimeout(() => createSound(1567.98, 0.1, "sine", 0.12), 750);
    setTimeout(() => createSound(2093.00, 0.15, "sine", 0.1), 800);
  }, []);

  const playNotificationSound = useCallback(() => {
    // Prevent rapid repeated plays
    const now = Date.now();
    if (lastPlayedRef.current.notification && now - lastPlayedRef.current.notification < 500) return;
    lastPlayedRef.current.notification = now;

    // Soft notification chime
    setTimeout(() => createSound(880, 0.08, "sine", 0.2), 0);     // A5
    setTimeout(() => createSound(1174.66, 0.1, "sine", 0.25), 80); // D6
    setTimeout(() => createSound(1396.91, 0.12, "sine", 0.2), 160); // F6
  }, []);

  return { playWinSound, playLoseSound, playBetPlacedSound, playTransactionSuccessSound, playNotificationSound };
};
