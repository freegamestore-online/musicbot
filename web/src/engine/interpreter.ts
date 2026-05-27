import type { Note, MusicCommand } from "../types";

/** All valid note names (natural + sharps/flats) */
const NOTE_NAMES = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
];

const NOTE_REGEX = /^([A-G][#b]?)([3-6])$/;

export function isValidNote(pitch: string): boolean {
  const m = pitch.match(NOTE_REGEX);
  if (!m) return false;
  return NOTE_NAMES.includes(m[1]!);
}

const VALID_WAVES = ["sine", "square", "triangle", "sawtooth"];

export interface InterpreterResult {
  notes: Note[];
  tempo: number;
  error: string | null;
  errorLine: number;
}

/**
 * Parse user code into an array of MusicCommands.
 */
function tokenize(code: string): { commands: MusicCommand[]; error: string | null; errorLine: number } {
  const lines = code.split("\n");
  const commands: MusicCommand[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const lineNum = i + 1;

    // Strip trailing comment
    const commentIdx = raw.indexOf("//");
    const line = (commentIdx >= 0 ? raw.slice(0, commentIdx) : raw).trim();

    if (line === "") continue;

    // Closing brace for repeat
    if (line === "}") {
      commands.push({ type: "repeat_end", args: [], line: lineNum });
      continue;
    }

    // play("C4") or play("C4", 0.5)
    const playMatch = line.match(
      /^play\(\s*["']([A-G][#b]?\d)["']\s*(?:,\s*([0-9]*\.?[0-9]+))?\s*\)$/,
    );
    if (playMatch) {
      const pitch = playMatch[1]!;
      const duration = playMatch[2] !== undefined ? parseFloat(playMatch[2]) : 1;
      if (!isValidNote(pitch)) {
        return { commands, error: `Invalid note "${pitch}"`, errorLine: lineNum };
      }
      if (duration <= 0 || duration > 16) {
        return { commands, error: `Duration must be between 0 and 16`, errorLine: lineNum };
      }
      commands.push({ type: "play", args: [pitch, duration], line: lineNum });
      continue;
    }

    // rest(0.5)
    const restMatch = line.match(/^rest\(\s*([0-9]*\.?[0-9]+)\s*\)$/);
    if (restMatch) {
      const duration = parseFloat(restMatch[1]!);
      if (duration <= 0 || duration > 16) {
        return { commands, error: `Rest duration must be between 0 and 16`, errorLine: lineNum };
      }
      commands.push({ type: "rest", args: [duration], line: lineNum });
      continue;
    }

    // tempo(120)
    const tempoMatch = line.match(/^tempo\(\s*([0-9]+)\s*\)$/);
    if (tempoMatch) {
      const bpm = parseInt(tempoMatch[1]!, 10);
      if (bpm < 20 || bpm > 300) {
        return { commands, error: `Tempo must be between 20 and 300 BPM`, errorLine: lineNum };
      }
      commands.push({ type: "tempo", args: [bpm], line: lineNum });
      continue;
    }

    // instrument("sine")
    const instrMatch = line.match(/^instrument\(\s*["'](\w+)["']\s*\)$/);
    if (instrMatch) {
      const wave = instrMatch[1]!;
      if (!VALID_WAVES.includes(wave)) {
        return {
          commands,
          error: `Invalid instrument "${wave}". Use: sine, square, triangle, sawtooth`,
          errorLine: lineNum,
        };
      }
      commands.push({ type: "instrument", args: [wave], line: lineNum });
      continue;
    }

    // volume(0.5)
    const volMatch = line.match(/^volume\(\s*([0-9]*\.?[0-9]+)\s*\)$/);
    if (volMatch) {
      const vol = parseFloat(volMatch[1]!);
      if (vol < 0 || vol > 1) {
        return { commands, error: `Volume must be between 0 and 1`, errorLine: lineNum };
      }
      commands.push({ type: "volume", args: [vol], line: lineNum });
      continue;
    }

    // repeat(n) {
    const repeatMatch = line.match(/^repeat\(\s*(\d+)\s*\)\s*\{$/);
    if (repeatMatch) {
      const count = parseInt(repeatMatch[1]!, 10);
      if (count < 1 || count > 100) {
        return { commands, error: `Repeat count must be between 1 and 100`, errorLine: lineNum };
      }
      commands.push({ type: "repeat_start", args: [count], line: lineNum });
      continue;
    }

    // If nothing matched, it's a syntax error
    return { commands, error: `Syntax error: "${line}"`, errorLine: lineNum };
  }

  return { commands, error: null, errorLine: 0 };
}

/**
 * Execute parsed commands to produce a flat Note[] sequence.
 * Handles nested repeats via recursive descent.
 */
export function interpret(code: string): InterpreterResult {
  const { commands, error, errorLine } = tokenize(code);
  if (error) {
    return { notes: [], tempo: 120, error, errorLine };
  }

  let currentTime = 0;
  let tempo = 120;
  const notes: Note[] = [];
  let idx = 0;

  // Guard against runaway note generation
  const MAX_NOTES = 2000;

  function executeBlock(endOnBrace: boolean): string | null {
    while (idx < commands.length) {
      if (notes.length > MAX_NOTES) {
        return `Too many notes (max ${MAX_NOTES}). Simplify your code.`;
      }

      const cmd = commands[idx]!;

      if (cmd.type === "repeat_end") {
        if (endOnBrace) {
          idx++;
          return null;
        }
        return `Unexpected } at line ${cmd.line}`;
      }

      if (cmd.type === "play") {
        notes.push({
          pitch: cmd.args[0] as string,
          duration: cmd.args[1] as number,
          time: currentTime,
        });
        currentTime += cmd.args[1] as number;
        idx++;
        continue;
      }

      if (cmd.type === "rest") {
        currentTime += cmd.args[0] as number;
        idx++;
        continue;
      }

      if (cmd.type === "tempo") {
        tempo = cmd.args[0] as number;
        idx++;
        continue;
      }

      if (cmd.type === "instrument") {
        // Instrument is handled by audio layer; we still record in notes metadata
        // For simplicity, interpreter doesn't embed instrument — it's set globally
        idx++;
        continue;
      }

      if (cmd.type === "volume") {
        // Volume is handled by audio layer
        idx++;
        continue;
      }

      if (cmd.type === "repeat_start") {
        const count = cmd.args[0] as number;
        idx++; // move past repeat_start
        const bodyStart = idx;
        for (let r = 0; r < count; r++) {
          idx = bodyStart;
          const err = executeBlock(true);
          if (err) return err;
        }
        continue;
      }

      idx++;
    }

    if (endOnBrace) {
      return `Missing closing } for repeat`;
    }

    return null;
  }

  const execError = executeBlock(false);
  if (execError) {
    return { notes, tempo, error: execError, errorLine: 0 };
  }

  return { notes, tempo, error: null, errorLine: 0 };
}

/**
 * Extract instrument/volume commands from code (for the audio player).
 * Returns the last-set values before each note time.
 */
export function extractSettings(code: string): {
  instrument: string;
  volume: number;
} {
  const { commands } = tokenize(code);
  let instrument = "sine";
  let volume = 0.5;

  for (const cmd of commands) {
    if (cmd.type === "instrument") {
      instrument = cmd.args[0] as string;
    }
    if (cmd.type === "volume") {
      volume = cmd.args[0] as number;
    }
  }

  return { instrument, volume };
}

/**
 * Check if the player's notes match the target notes.
 * Same pitches in same order, durations within 50% tolerance.
 */
export function checkMatch(playerNotes: Note[], targetNotes: Note[]): boolean {
  if (targetNotes.length === 0) {
    // Freestyle: any non-empty program completes
    return playerNotes.length > 0;
  }

  if (playerNotes.length !== targetNotes.length) return false;

  for (let i = 0; i < playerNotes.length; i++) {
    const player = playerNotes[i]!;
    const target = targetNotes[i]!;

    // Pitch must match exactly (normalize enharmonics)
    if (normalizePitch(player.pitch) !== normalizePitch(target.pitch)) {
      return false;
    }

    // Duration within 50% tolerance
    const ratio = player.duration / target.duration;
    if (ratio < 0.5 || ratio > 1.5) {
      return false;
    }
  }

  return true;
}

/** Normalize enharmonic equivalents for comparison */
function normalizePitch(pitch: string): string {
  const m = pitch.match(NOTE_REGEX);
  if (!m) return pitch;
  const name = m[1]!;
  const octave = m[2]!;

  const enharmonics: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };

  return (enharmonics[name] ?? name) + octave;
}
