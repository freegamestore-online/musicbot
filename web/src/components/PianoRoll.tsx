import { useState, useMemo } from "react";
import type { Note } from "../types";

interface PianoRollProps {
  notes: Note[];
  targetNotes: Note[];
  playbackPosition: number; // current beat position, -1 if not playing
  isPlaying: boolean;
}

// Full range of pitches we display (C3 to C6, bottom to top)
const ALL_PITCHES: string[] = [];
const NOTE_ORDER = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

for (let octave = 6; octave >= 3; octave--) {
  for (let n = NOTE_ORDER.length - 1; n >= 0; n--) {
    ALL_PITCHES.push(NOTE_ORDER[n]! + octave);
  }
}

// Normalize enharmonic for display matching
function normalizePitch(pitch: string): string {
  const m = pitch.match(/^([A-G][#b]?)(\d)$/);
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

function pitchIndex(pitch: string): number {
  const normalized = normalizePitch(pitch);
  return ALL_PITCHES.indexOf(normalized);
}

function isSharp(pitch: string): boolean {
  return pitch.includes("#");
}

// Color by pitch class (hue based on note name)
const PITCH_COLORS: Record<string, string> = {
  C: "#e11d48",
  "C#": "#db2777",
  D: "#c026d3",
  "D#": "#9333ea",
  E: "#7c3aed",
  F: "#6366f1",
  "F#": "#3b82f6",
  G: "#0ea5e9",
  "G#": "#06b6d4",
  A: "#14b8a6",
  "A#": "#10b981",
  B: "#22c55e",
};

function noteColor(pitch: string): string {
  const m = pitch.match(/^([A-G]#?)/);
  const name = m ? normalizePitch(pitch).replace(/\d$/, "") : "C";
  return PITCH_COLORS[name] ?? "#e11d48";
}

const KEY_WIDTH = 48;
const ROW_HEIGHT = 16;
const BEAT_WIDTH = 80;

export default function PianoRoll({
  notes,
  targetNotes,
  playbackPosition,
  isPlaying,
}: PianoRollProps) {
  const [hoveredNote, setHoveredNote] = useState<{
    pitch: string;
    duration: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate total beats for the timeline
  const totalBeats = useMemo(() => {
    let max = 4; // minimum 4 beats
    for (const n of notes) {
      const end = n.time + n.duration;
      if (end > max) max = end;
    }
    for (const n of targetNotes) {
      const end = n.time + n.duration;
      if (end > max) max = end;
    }
    return Math.ceil(max) + 1;
  }, [notes, targetNotes]);

  const gridWidth = totalBeats * BEAT_WIDTH;
  const gridHeight = ALL_PITCHES.length * ROW_HEIGHT;

  return (
    <div className="piano-roll" style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Piano key labels */}
      <div
        style={{
          width: KEY_WIDTH,
          flexShrink: 0,
          background: "#181825",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        {ALL_PITCHES.map((pitch, i) => (
          <div
            key={pitch}
            className={`piano-key${isSharp(pitch) ? " piano-key--sharp" : ""}`}
            style={{
              height: ROW_HEIGHT,
              fontSize: 9,
              background: isSharp(pitch) ? "#11111b" : "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              paddingRight: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              color: pitch.startsWith("C") && !pitch.includes("#") ? "#89b4fa" : "#6c7086",
              fontWeight: pitch.startsWith("C") && !pitch.includes("#") ? 600 : 400,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {/* Only show label for every C and every few notes */}
            {(pitch.startsWith("C") && !pitch.includes("#")) ||
            i % 6 === 0
              ? pitch
              : ""}
          </div>
        ))}
      </div>

      {/* Grid area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          className="piano-roll-grid"
          style={{
            width: gridWidth,
            height: gridHeight,
            position: "relative",
          }}
        >
          {/* Horizontal pitch lines */}
          {ALL_PITCHES.map((pitch, i) => (
            <div
              key={`h-${pitch}`}
              className={`pitch-line${pitch.startsWith("C") && !pitch.includes("#") ? " pitch-line--c" : ""}`}
              style={{ top: i * ROW_HEIGHT }}
            />
          ))}

          {/* Vertical beat lines */}
          {Array.from({ length: totalBeats + 1 }, (_, beat) => (
            <div
              key={`v-${beat}`}
              className={`beat-line${beat % 4 === 0 ? " beat-line--strong" : ""}`}
              style={{ left: beat * BEAT_WIDTH }}
            />
          ))}

          {/* Beat number labels */}
          {Array.from({ length: totalBeats }, (_, beat) => (
            <div
              key={`bl-${beat}`}
              style={{
                position: "absolute",
                top: 2,
                left: beat * BEAT_WIDTH + 4,
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                color: "rgba(255,255,255,0.15)",
                userSelect: "none",
                zIndex: 1,
              }}
            >
              {beat + 1}
            </div>
          ))}

          {/* Target notes (dimmed) */}
          {targetNotes.map((note, i) => {
            const row = pitchIndex(note.pitch);
            if (row < 0) return null;
            return (
              <div
                key={`target-${i}`}
                className="note-block"
                style={{
                  top: row * ROW_HEIGHT + 2,
                  left: note.time * BEAT_WIDTH + 1,
                  width: note.duration * BEAT_WIDTH - 2,
                  height: ROW_HEIGHT - 4,
                  background: noteColor(note.pitch),
                  opacity: 0.15,
                  border: `1px dashed ${noteColor(note.pitch)}`,
                }}
              />
            );
          })}

          {/* Player notes */}
          {notes.map((note, i) => {
            const row = pitchIndex(note.pitch);
            if (row < 0) return null;
            const color = noteColor(note.pitch);
            const isPast =
              playbackPosition >= 0 &&
              note.time + note.duration <= playbackPosition;
            const isCurrent =
              playbackPosition >= 0 &&
              note.time <= playbackPosition &&
              note.time + note.duration > playbackPosition;

            return (
              <div
                key={`note-${i}`}
                className="note-block"
                style={{
                  top: row * ROW_HEIGHT + 1,
                  left: note.time * BEAT_WIDTH,
                  width: note.duration * BEAT_WIDTH - 1,
                  height: ROW_HEIGHT - 2,
                  background: color,
                  opacity: isCurrent ? 1 : isPast ? 0.5 : 0.8,
                  boxShadow: isCurrent ? `0 0 8px ${color}` : "none",
                }}
                onMouseEnter={(e) => {
                  const rect = (
                    e.currentTarget.parentElement as HTMLElement
                  ).getBoundingClientRect();
                  setHoveredNote({
                    pitch: note.pitch,
                    duration: note.duration,
                    x: e.clientX - rect.left,
                    y: row * ROW_HEIGHT - 24,
                  });
                }}
                onMouseLeave={() => setHoveredNote(null)}
              />
            );
          })}

          {/* Playback cursor */}
          {playbackPosition >= 0 && (
            <div
              className={`playback-cursor${isPlaying ? " playback-cursor--playing" : ""}`}
              style={{ left: playbackPosition * BEAT_WIDTH }}
            />
          )}

          {/* Tooltip */}
          {hoveredNote && (
            <div
              className="note-tooltip"
              style={{
                left: hoveredNote.x,
                top: hoveredNote.y,
              }}
            >
              {hoveredNote.pitch} ({hoveredNote.duration}
              {hoveredNote.duration === 1 ? " beat" : " beats"})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
