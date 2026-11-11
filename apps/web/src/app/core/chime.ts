import { Injectable } from '@angular/core';

/** Two short notes, generated with the Web Audio API, so the app ships no sound files. */
const NOTES = [
  { frequency: 784, offset: 0 },
  { frequency: 1046.5, offset: 0.18 },
];

/** Plays the sound that marks the end of a phase. */
@Injectable({ providedIn: 'root' })
export class Chime {
  private context: AudioContext | undefined;

  /**
   * Prepares audio during a user gesture. Browsers only let a page play sound after the user has
   * interacted with it, and the end of a phase comes long after the click that started it.
   */
  unlock(): void {
    if (typeof AudioContext === 'undefined') {
      return;
    }
    this.context ??= new AudioContext();
    void this.context.resume();
  }

  play(): void {
    const context = this.context;
    if (!context) {
      return;
    }
    const start = context.currentTime;
    for (const { frequency, offset } of NOTES) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.45);
    }
  }
}
