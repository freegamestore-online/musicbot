/** A single note to be played */
export interface Note {
  /** e.g. "C4", "C#4", "Eb4" */
  pitch: string;
  /** Duration in beats */
  duration: number;
  /** Absolute start time in beats */
  time: number;
}

/** A parsed command from the user's code */
export interface MusicCommand {
  type:
    | "play"
    | "rest"
    | "tempo"
    | "instrument"
    | "volume"
    | "repeat_start"
    | "repeat_end";
  args: (string | number)[];
  line: number;
}

/** Oscillator waveform types */
export type WaveType = "sine" | "square" | "triangle" | "sawtooth";

/** A game level */
export interface Level {
  id: number;
  name: string;
  description: string;
  hint: string;
  /** The melody the player needs to recreate (empty for freestyle) */
  targetNotes: Note[];
  /** Human-readable description of the target melody */
  targetDescription: string;
  /** Commands available in this level */
  availableCommands: string[];
  /** Default tempo for this level */
  tempo: number;
  /** Starter code shown when level loads */
  starterCode: string;
}

/** Available command reference chips */
export const COMMAND_HELP: Record<string, { syntax: string; desc: string }> = {
  play: { syntax: 'play("C4", 0.5)', desc: "Play a note for N beats" },
  rest: { syntax: "rest(0.5)", desc: "Silence for N beats" },
  tempo: { syntax: "tempo(120)", desc: "Set beats per minute" },
  instrument: {
    syntax: 'instrument("sine")',
    desc: "Set wave: sine, square, triangle, sawtooth",
  },
  volume: { syntax: "volume(0.5)", desc: "Set volume 0-1" },
  repeat: { syntax: "repeat(4) {", desc: "Repeat N times" },
  comment: { syntax: "// comment", desc: "Add a comment" },
};
