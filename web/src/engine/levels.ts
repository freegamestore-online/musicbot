import type { Level, Note } from "../types";

/** Helper to build a note sequence from a simple array */
function seq(
  pitches: string[],
  duration: number = 1,
): Note[] {
  let time = 0;
  return pitches.map((pitch) => {
    const note: Note = { pitch, duration, time };
    time += duration;
    return note;
  });
}

/** Helper for notes with explicit durations */
function notes(entries: [string, number][]): Note[] {
  let time = 0;
  return entries.map(([pitch, duration]) => {
    const note: Note = { pitch, duration, time };
    time += duration;
    return note;
  });
}

export const levels: Level[] = [
  {
    id: 1,
    name: "First Note",
    description: "Play your very first note!",
    hint: 'Use play("C4") to play middle C',
    targetNotes: seq(["C4"]),
    targetDescription: "Play a single C4 note",
    availableCommands: ["play", "comment"],
    tempo: 120,
    starterCode: '// Play middle C!\nplay("C4")\n',
  },
  {
    id: 2,
    name: "Three Notes",
    description: "Play three notes in a row.",
    hint: "Add three play() commands, one per line",
    targetNotes: seq(["C4", "D4", "E4"]),
    targetDescription: "Play C4, D4, E4",
    availableCommands: ["play", "comment"],
    tempo: 120,
    starterCode: "// Play C, D, then E\n",
  },
  {
    id: 3,
    name: "Twinkle Twinkle",
    description: "Play the first line of Twinkle Twinkle Little Star.",
    hint: "The melody is C C G G A A G",
    targetNotes: seq(["C4", "C4", "G4", "G4", "A4", "A4", "G4"]),
    targetDescription: "C C G G A A G (Twinkle Twinkle)",
    availableCommands: ["play", "comment"],
    tempo: 120,
    starterCode: "// Twinkle, twinkle, little star...\n",
  },
  {
    id: 4,
    name: "Rest & Play",
    description: "Add silence between notes using rest().",
    hint: "Use rest(1) to pause for one beat",
    targetNotes: notes([
      ["C4", 1],
      ["E4", 1],
      ["G4", 1],
    ]),
    targetDescription: "C4, rest, E4, rest, G4 with pauses between",
    availableCommands: ["play", "rest", "comment"],
    tempo: 120,
    starterCode: "// Play notes with rests between them\n",
  },
  {
    id: 5,
    name: "Mary Had a Lamb",
    description: "Play Mary Had a Little Lamb.",
    hint: "The melody is E D C D E E E",
    targetNotes: seq(["E4", "D4", "C4", "D4", "E4", "E4", "E4"]),
    targetDescription: "E D C D E E E (Mary Had a Little Lamb)",
    availableCommands: ["play", "rest", "comment"],
    tempo: 120,
    starterCode: "// Mary had a little lamb...\n",
  },
  {
    id: 6,
    name: "Speed It Up",
    description: "Change the tempo to play faster or slower.",
    hint: "Use tempo(160) for a faster beat",
    targetNotes: seq(["C4", "E4", "G4", "C5"], 0.5),
    targetDescription: "Fast arpeggio: C4 E4 G4 C5 at half-beat each",
    availableCommands: ["play", "tempo", "comment"],
    tempo: 160,
    starterCode: "// Set a fast tempo and play short notes\ntempo(160)\n",
  },
  {
    id: 7,
    name: "Repeat Beat",
    description: "Use repeat to play the same note multiple times.",
    hint: "repeat(4) { play(\"C4\", 0.25) }",
    targetNotes: seq(["C4", "C4", "C4", "C4"], 0.25),
    targetDescription: "Four quick C4 notes (0.25 beats each)",
    availableCommands: ["play", "repeat", "comment"],
    tempo: 120,
    starterCode: "// Use repeat to play 4 quick beats\n",
  },
  {
    id: 8,
    name: "Simple Scale",
    description: "Play the C major scale up and down.",
    hint: "C D E F G A B C — eight notes ascending",
    targetNotes: seq(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]),
    targetDescription: "C major scale ascending: C D E F G A B C",
    availableCommands: ["play", "repeat", "comment"],
    tempo: 120,
    starterCode: "// Play the C major scale\n",
  },
  {
    id: 9,
    name: "Different Sounds",
    description: "Try different instrument sounds.",
    hint: 'Use instrument("square") for a retro game sound',
    targetNotes: seq(["C4", "E4", "G4"]),
    targetDescription: "Play C E G with a square wave instrument",
    availableCommands: ["play", "instrument", "comment"],
    tempo: 120,
    starterCode: '// Try a different sound\ninstrument("square")\n',
  },
  {
    id: 10,
    name: "Loud & Soft",
    description: "Control dynamics with volume.",
    hint: "Use volume(0.2) for soft, volume(0.8) for loud",
    targetNotes: seq(["C4", "C4", "C4"]),
    targetDescription: "Play C4 three times (soft, medium, loud)",
    availableCommands: ["play", "volume", "comment"],
    tempo: 120,
    starterCode: "// Play from soft to loud\n",
  },
  {
    id: 11,
    name: "Rhythm Pattern",
    description: "Mix different durations to create a beat.",
    hint: "Try mixing 0.25, 0.5, and 1 beat durations",
    targetNotes: notes([
      ["C4", 0.5],
      ["C4", 0.5],
      ["E4", 1],
      ["C4", 0.5],
      ["C4", 0.5],
      ["G4", 1],
    ]),
    targetDescription: "Short-short-long pattern: C C E, C C G",
    availableCommands: ["play", "rest", "repeat", "tempo", "comment"],
    tempo: 120,
    starterCode: "// Create a rhythm with mixed durations\n",
  },
  {
    id: 12,
    name: "Freestyle",
    description: "Compose your own melody! All commands unlocked.",
    hint: "Experiment with everything you've learned",
    targetNotes: [],
    targetDescription: "No target — compose anything you like!",
    availableCommands: [
      "play",
      "rest",
      "tempo",
      "instrument",
      "volume",
      "repeat",
      "comment",
    ],
    tempo: 120,
    starterCode:
      '// Freestyle mode! Compose your own melody\ntempo(120)\ninstrument("sine")\n\n',
  },
];
