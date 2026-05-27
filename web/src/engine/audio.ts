import type { Note, WaveType } from "../types";

/**
 * Convert a pitch string like "C4" to its frequency in Hz.
 * Uses equal temperament tuning with A4 = 440 Hz.
 */
function pitchToFrequency(pitch: string): number {
  const m = pitch.match(/^([A-G][#b]?)(\d)$/);
  if (!m) return 440;

  const noteMap: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };

  const noteName = m[1]!;
  const octave = parseInt(m[2]!, 10);
  const semitone = noteMap[noteName];
  if (semitone === undefined) return 440;

  // Semitones relative to A4 (A4 = MIDI 69, C4 = MIDI 60)
  const midi = semitone + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type ProgressCallback = (beatPosition: number) => void;

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private scheduledNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private totalDuration = 0;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /**
   * Play a sequence of notes.
   * @param notes - The notes to play
   * @param tempo - BPM
   * @param waveType - Oscillator type
   * @param volume - Master volume 0-1
   * @param onProgress - Called with current beat position during playback
   * @returns Promise that resolves when playback ends
   */
  async playSequence(
    notes: Note[],
    tempo: number,
    waveType: WaveType = "sine",
    volume: number = 0.5,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    this.stop();

    if (notes.length === 0) return;

    const ctx = this.ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const beatDuration = 60 / tempo; // seconds per beat
    const now = ctx.currentTime + 0.05; // small lookahead

    // Calculate total duration
    let maxEnd = 0;
    for (const note of notes) {
      const end = note.time + note.duration;
      if (end > maxEnd) maxEnd = end;
    }
    this.totalDuration = maxEnd;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
    masterGain.connect(ctx.destination);

    // Schedule each note
    for (const note of notes) {
      const startSec = now + note.time * beatDuration;
      const durSec = note.duration * beatDuration;
      const freq = pitchToFrequency(note.pitch);

      const osc = ctx.createOscillator();
      osc.type = waveType;
      osc.frequency.value = freq;

      const env = ctx.createGain();
      env.gain.value = 0;

      // Attack/decay envelope for clean tones
      const attack = Math.min(0.02, durSec * 0.1);
      const decay = Math.min(0.05, durSec * 0.2);
      const release = Math.min(0.05, durSec * 0.2);

      env.gain.setValueAtTime(0, startSec);
      env.gain.linearRampToValueAtTime(0.8, startSec + attack);
      env.gain.linearRampToValueAtTime(0.6, startSec + attack + decay);
      env.gain.setValueAtTime(0.6, startSec + durSec - release);
      env.gain.linearRampToValueAtTime(0, startSec + durSec);

      osc.connect(env);
      env.connect(masterGain);

      osc.start(startSec);
      osc.stop(startSec + durSec + 0.01);

      this.scheduledNodes.push({ osc, gain: env });
    }

    // Progress tracking
    if (onProgress) {
      this.progressTimer = setInterval(() => {
        const elapsed = ctx.currentTime - now;
        const beatPos = elapsed / beatDuration;
        if (beatPos >= this.totalDuration) {
          onProgress(this.totalDuration);
          this.clearProgressTimer();
        } else {
          onProgress(Math.max(0, beatPos));
        }
      }, 16); // ~60fps
    }

    // Wait for playback to finish
    const totalSec = maxEnd * beatDuration;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.clearProgressTimer();
        resolve();
      }, totalSec * 1000 + 100);
    });
  }

  stop(): void {
    this.clearProgressTimer();
    for (const { osc } of this.scheduledNodes) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
    }
    this.scheduledNodes = [];
  }

  private clearProgressTimer(): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  get duration(): number {
    return this.totalDuration;
  }

  dispose(): void {
    this.stop();
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
  }
}
