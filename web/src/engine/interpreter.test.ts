import { describe, it, expect } from "vitest";
import { interpret, isValidNote, extractSettings, checkMatch } from "./interpreter";
import type { Note } from "../types";

// ── Helpers ─────────────────────────────────────────────────

/** Shorthand: interpret code and assert no error. */
function ok(code: string) {
  const result = interpret(code);
  expect(result.error).toBeNull();
  return result;
}

// ── Tests ───────────────────────────────────────────────────

describe("MusicBot interpreter", () => {
  // ── isValidNote ─────────────────────────────────────────────

  describe("isValidNote", () => {
    it("accepts natural notes C3-C6", () => {
      expect(isValidNote("C4")).toBe(true);
      expect(isValidNote("A3")).toBe(true);
      expect(isValidNote("G6")).toBe(true);
    });

    it("accepts sharps", () => {
      expect(isValidNote("C#4")).toBe(true);
      expect(isValidNote("F#5")).toBe(true);
    });

    it("accepts flats", () => {
      expect(isValidNote("Bb4")).toBe(true);
      expect(isValidNote("Eb3")).toBe(true);
    });

    it("rejects octave 2 and 7", () => {
      expect(isValidNote("C2")).toBe(false);
      expect(isValidNote("C7")).toBe(false);
    });

    it("rejects invalid note names", () => {
      expect(isValidNote("H4")).toBe(false);
      expect(isValidNote("X#5")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidNote("")).toBe(false);
    });
  });

  // ── play ────────────────────────────────────────────────────

  describe("play", () => {
    it('play("C4") produces a single note with default duration 1', () => {
      const { notes } = ok('play("C4")');
      expect(notes.length).toBe(1);
      expect(notes[0]!.pitch).toBe("C4");
      expect(notes[0]!.duration).toBe(1);
      expect(notes[0]!.time).toBe(0);
    });

    it('play("C4", 0.5) sets custom duration', () => {
      const { notes } = ok('play("C4", 0.5)');
      expect(notes[0]!.duration).toBe(0.5);
    });

    it("single quotes work for note names", () => {
      const { notes } = ok("play('D4')");
      expect(notes[0]!.pitch).toBe("D4");
    });

    it("multiple play commands accumulate time correctly", () => {
      const { notes } = ok('play("C4")\nplay("D4")\nplay("E4")');
      expect(notes.length).toBe(3);
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(1); // after 1 beat
      expect(notes[2]!.time).toBe(2); // after 2 beats
    });

    it("play with custom durations accumulates time correctly", () => {
      const { notes } = ok('play("C4", 0.5)\nplay("D4", 0.25)');
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(0.5);
    });
  });

  // ── rest ────────────────────────────────────────────────────

  describe("rest", () => {
    it("rest(1) advances time by 1 beat", () => {
      const { notes } = ok('rest(1)\nplay("C4")');
      expect(notes.length).toBe(1);
      expect(notes[0]!.time).toBe(1);
    });

    it("rest(0.5) advances time by 0.5 beats", () => {
      const { notes } = ok('play("C4")\nrest(0.5)\nplay("D4")');
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(1.5); // 1 (C4 dur) + 0.5 (rest)
    });

    it("multiple rests accumulate", () => {
      const { notes } = ok('rest(1)\nrest(1)\nplay("C4")');
      expect(notes[0]!.time).toBe(2);
    });
  });

  // ── tempo ───────────────────────────────────────────────────

  describe("tempo", () => {
    it("tempo(140) changes BPM", () => {
      const result = ok("tempo(140)");
      expect(result.tempo).toBe(140);
    });

    it("default tempo is 120", () => {
      const result = ok('play("C4")');
      expect(result.tempo).toBe(120);
    });

    it("tempo rejects values below 20", () => {
      const result = interpret("tempo(10)");
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("20");
    });

    it("tempo rejects values above 300", () => {
      const result = interpret("tempo(500)");
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("300");
    });
  });

  // ── instrument ──────────────────────────────────────────────

  describe("instrument", () => {
    it('instrument("square") is accepted', () => {
      const result = ok('instrument("square")');
      expect(result.error).toBeNull();
    });

    it("all four wave types are accepted", () => {
      for (const wave of ["sine", "square", "triangle", "sawtooth"]) {
        const result = interpret(`instrument("${wave}")`);
        expect(result.error).toBeNull();
      }
    });

    it("invalid wave type produces an error", () => {
      const result = interpret('instrument("piano")');
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("piano");
    });
  });

  // ── volume ──────────────────────────────────────────────────

  describe("volume", () => {
    it("volume(0.8) is accepted", () => {
      const result = ok("volume(0.8)");
      expect(result.error).toBeNull();
    });

    it("volume(0) is accepted (mute)", () => {
      const result = ok("volume(0)");
      expect(result.error).toBeNull();
    });

    it("volume(1) is accepted (max)", () => {
      const result = ok("volume(1)");
      expect(result.error).toBeNull();
    });

    it("volume above 1 produces an error", () => {
      const result = interpret("volume(1.5)");
      expect(result.error).not.toBeNull();
    });
  });

  // ── repeat ──────────────────────────────────────────────────

  describe("repeat", () => {
    it("repeat(3) repeats notes 3 times", () => {
      const { notes } = ok('repeat(3) {\nplay("C4")\n}');
      expect(notes.length).toBe(3);
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(1);
      expect(notes[2]!.time).toBe(2);
    });

    it("repeat body with multiple statements", () => {
      const { notes } = ok('repeat(2) {\nplay("C4")\nplay("D4")\n}');
      expect(notes.length).toBe(4);
      expect(notes[0]!.pitch).toBe("C4");
      expect(notes[1]!.pitch).toBe("D4");
      expect(notes[2]!.pitch).toBe("C4");
      expect(notes[3]!.pitch).toBe("D4");
    });

    it("nested repeat multiplies iterations", () => {
      const { notes } = ok(
        'repeat(2) {\nrepeat(3) {\nplay("C4")\n}\n}',
      );
      expect(notes.length).toBe(6); // 2 * 3
    });

    it("repeat with rest accumulates time correctly", () => {
      const { notes } = ok(
        'repeat(2) {\nplay("C4", 0.5)\nrest(0.5)\n}',
      );
      expect(notes.length).toBe(2);
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(1); // 0.5 (play dur) + 0.5 (rest)
    });
  });

  // ── Comments ────────────────────────────────────────────────

  describe("comments", () => {
    it("line comments are ignored", () => {
      const { notes } = ok('// this is a comment\nplay("C4")');
      expect(notes.length).toBe(1);
    });

    it("inline comments after code are stripped", () => {
      const { notes } = ok('play("C4") // middle C');
      expect(notes.length).toBe(1);
      expect(notes[0]!.pitch).toBe("C4");
    });

    it("program with only comments produces no notes", () => {
      const result = ok("// nothing here");
      expect(result.notes.length).toBe(0);
    });
  });

  // ── Parse errors ────────────────────────────────────────────

  describe("parse errors", () => {
    it("invalid note name produces an error", () => {
      const result = interpret('play("H4")');
      expect(result.error).not.toBeNull();
    });

    it("bad syntax produces a syntax error", () => {
      const result = interpret("foobar");
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("Syntax error");
    });

    it("unclosed repeat produces an error", () => {
      const result = interpret('repeat(3) {\nplay("C4")');
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("Missing closing }");
    });

    it("unexpected closing brace produces an error", () => {
      const result = interpret("}");
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("Unexpected }");
    });

    it("repeat count above 100 produces an error", () => {
      const result = interpret('repeat(200) {\nplay("C4")\n}');
      expect(result.error).not.toBeNull();
    });

    it("duration <= 0 produces an error", () => {
      const result = interpret('play("C4", 0)');
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("Duration");
    });

    it("duration > 16 produces an error", () => {
      const result = interpret('play("C4", 20)');
      expect(result.error).not.toBeNull();
    });

    it("rest duration <= 0 produces an error", () => {
      const result = interpret("rest(0)");
      expect(result.error).not.toBeNull();
    });
  });

  // ── Note limit protection ───────────────────────────────────

  describe("note limit", () => {
    it("programs exceeding 2000 notes produce an error", () => {
      // 100 * 100 = 10,000 notes — well over the 2000 limit
      const result = interpret(
        'repeat(100) {\nrepeat(100) {\nplay("C4", 0.01)\n}\n}',
      );
      expect(result.error).not.toBeNull();
      expect(result.error).toContain("2000");
    });
  });

  // ── Time accumulation ───────────────────────────────────────

  describe("time accumulation", () => {
    it("notes after rests start at correct time", () => {
      const { notes } = ok(
        'play("C4", 1)\nrest(2)\nplay("E4", 1)\nrest(0.5)\nplay("G4", 0.5)',
      );
      expect(notes[0]!.time).toBe(0);
      expect(notes[1]!.time).toBe(3); // 1 + 2
      expect(notes[2]!.time).toBe(4.5); // 3 + 1 + 0.5
    });

    it("time accumulates correctly through repeat blocks", () => {
      const { notes } = ok(
        'play("C4", 1)\nrepeat(3) {\nplay("D4", 0.5)\n}\nplay("E4", 1)',
      );
      expect(notes.length).toBe(5);
      expect(notes[0]!.time).toBe(0); // C4
      expect(notes[1]!.time).toBe(1); // first D4
      expect(notes[2]!.time).toBe(1.5); // second D4
      expect(notes[3]!.time).toBe(2); // third D4
      expect(notes[4]!.time).toBe(2.5); // E4
    });
  });

  // ── Twinkle melody ─────────────────────────────────────────

  describe("twinkle melody", () => {
    it("twinkle twinkle little star first phrase has correct pitches", () => {
      const code = [
        'play("C4")',
        'play("C4")',
        'play("G4")',
        'play("G4")',
        'play("A4")',
        'play("A4")',
        'play("G4", 2)',
      ].join("\n");
      const { notes } = ok(code);
      expect(notes.length).toBe(7);
      expect(notes.map((n) => n.pitch)).toEqual([
        "C4", "C4", "G4", "G4", "A4", "A4", "G4",
      ]);
      // Last note is 2 beats, rest are 1
      expect(notes[6]!.duration).toBe(2);
      // Time check: first 6 are each 1 beat, last starts at beat 6
      expect(notes[6]!.time).toBe(6);
    });
  });

  // ── extractSettings ─────────────────────────────────────────

  describe("extractSettings", () => {
    it("returns defaults when no settings in code", () => {
      const s = extractSettings('play("C4")');
      expect(s.instrument).toBe("sine");
      expect(s.volume).toBe(0.5);
    });

    it("returns last-set instrument and volume", () => {
      const s = extractSettings(
        'instrument("square")\nvolume(0.8)\ninstrument("triangle")',
      );
      expect(s.instrument).toBe("triangle");
      expect(s.volume).toBe(0.8);
    });
  });

  // ── checkMatch ──────────────────────────────────────────────

  describe("checkMatch", () => {
    it("exact match returns true", () => {
      const target: Note[] = [
        { pitch: "C4", duration: 1, time: 0 },
        { pitch: "D4", duration: 1, time: 1 },
      ];
      const player: Note[] = [
        { pitch: "C4", duration: 1, time: 0 },
        { pitch: "D4", duration: 1, time: 1 },
      ];
      expect(checkMatch(player, target)).toBe(true);
    });

    it("wrong pitch returns false", () => {
      const target: Note[] = [{ pitch: "C4", duration: 1, time: 0 }];
      const player: Note[] = [{ pitch: "D4", duration: 1, time: 0 }];
      expect(checkMatch(player, target)).toBe(false);
    });

    it("duration within 50% tolerance matches", () => {
      const target: Note[] = [{ pitch: "C4", duration: 1, time: 0 }];
      const player: Note[] = [{ pitch: "C4", duration: 1.4, time: 0 }];
      expect(checkMatch(player, target)).toBe(true);
    });

    it("duration outside 50% tolerance fails", () => {
      const target: Note[] = [{ pitch: "C4", duration: 1, time: 0 }];
      const player: Note[] = [{ pitch: "C4", duration: 2, time: 0 }];
      expect(checkMatch(player, target)).toBe(false);
    });

    it("enharmonic equivalents match (Db = C#)", () => {
      const target: Note[] = [{ pitch: "C#4", duration: 1, time: 0 }];
      const player: Note[] = [{ pitch: "Db4", duration: 1, time: 0 }];
      expect(checkMatch(player, target)).toBe(true);
    });

    it("different lengths return false", () => {
      const target: Note[] = [{ pitch: "C4", duration: 1, time: 0 }];
      const player: Note[] = [];
      expect(checkMatch(player, target)).toBe(false);
    });

    it("empty target (freestyle) returns true for any non-empty player notes", () => {
      const target: Note[] = [];
      const player: Note[] = [{ pitch: "C4", duration: 1, time: 0 }];
      expect(checkMatch(player, target)).toBe(true);
    });

    it("empty target returns false for empty player notes", () => {
      expect(checkMatch([], [])).toBe(false);
    });
  });
});
