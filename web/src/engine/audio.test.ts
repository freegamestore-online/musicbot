import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicPlayer } from './audio';

const gains: Array<{
  gain: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];
const oscillators: Array<{ stop: ReturnType<typeof vi.fn> }> = [];

beforeEach(() => {
  vi.useFakeTimers();
  gains.length = 0;
  oscillators.length = 0;
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    currentTime = 10;
    destination = {};
    createGain() {
      const gain = { gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
      gains.push(gain);
      return gain;
    }
    createOscillator() {
      const osc = { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }
    resume = vi.fn(async () => {});
    close = vi.fn(async () => {});
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const notes = [{ pitch: 'C4', time: 0, duration: 1 }];

describe('platform mute during music playback', () => {
  it('starts silent and applies mute changes to an already scheduled melody', async () => {
    const player = new MusicPlayer();
    const playback = player.playSequence(notes, 120, 'sine', 0.4);
    expect(gains[0]?.gain.value).toBe(0);
    player.setMuted(false);
    expect(gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0.4, 10);
    player.setMuted(true);
    expect(gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10);
    await vi.runAllTimersAsync();
    await playback;
    player.dispose();
  });

  it('retains an unmuted preference for the next melody and clamps its volume', async () => {
    const player = new MusicPlayer();
    player.setMuted(false);
    const playback = player.playSequence(notes, 120, 'sine', 2);
    expect(gains[0]?.gain.value).toBe(1);
    await vi.runAllTimersAsync();
    await playback;
    player.dispose();
  });

  it('disconnects the output and stops notes when playback is cancelled', async () => {
    const player = new MusicPlayer();
    const playback = player.playSequence(notes, 120);
    player.stop();
    expect(gains[0]?.disconnect).toHaveBeenCalledOnce();
    expect(oscillators[0]?.stop).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync();
    await playback;
    player.dispose();
  });
});
