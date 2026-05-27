import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Note, WaveType } from "./types";
import { levels } from "./engine/levels";
import { interpret, extractSettings, checkMatch } from "./engine/interpreter";
import { MusicPlayer } from "./engine/audio";
import PianoRoll from "./components/PianoRoll";
import CodeEditor from "./components/CodeEditor";
import GameControls from "./components/GameControls";
import LevelSelect from "./components/LevelSelect";
import LevelComplete from "./components/LevelComplete";

function loadCompleted(): Set<number> {
  try {
    const raw = localStorage.getItem("musicbot_completed");
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCompleted(set: Set<number>) {
  localStorage.setItem("musicbot_completed", JSON.stringify([...set]));
}

export default function App() {
  const [levelId, setLevelId] = useState(1);
  const [code, setCode] = useState(levels[0]?.starterCode ?? "");
  const [notes, setNotes] = useState<Note[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(loadCompleted);

  const playerRef = useRef<MusicPlayer | null>(null);

  const level = useMemo(
    () => levels.find((l) => l.id === levelId) ?? levels[0]!,
    [levelId],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playerRef.current?.dispose();
    };
  }, []);

  const handleStop = useCallback(() => {
    playerRef.current?.stop();
    setIsPlaying(false);
    setPlaybackPosition(-1);
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    setNotes([]);
    setMessage("");
    setIsError(false);
    setIsSuccess(false);
    setShowComplete(false);
    setPlaybackPosition(-1);
  }, [handleStop]);

  const handleLevelChange = useCallback(
    (id: number) => {
      handleReset();
      setLevelId(id);
      const newLevel = levels.find((l) => l.id === id);
      setCode(newLevel?.starterCode ?? "");
      setTempo(newLevel?.tempo ?? 120);
      setShowLevels(false);
    },
    [handleReset],
  );

  const handleRun = useCallback(async () => {
    handleReset();

    // Interpret the code
    const result = interpret(code);

    if (result.error) {
      setMessage(result.error);
      setIsError(true);
      setNotes(result.notes);
      return;
    }

    if (result.notes.length === 0) {
      setMessage("No notes to play. Add some play() commands!");
      setIsError(true);
      return;
    }

    setNotes(result.notes);
    setTempo(result.tempo);
    setIsPlaying(true);
    setPlaybackPosition(0);

    // Get instrument/volume settings
    const settings = extractSettings(code);

    // Play audio
    if (!playerRef.current) {
      playerRef.current = new MusicPlayer();
    }

    try {
      await playerRef.current.playSequence(
        result.notes,
        result.tempo,
        settings.instrument as WaveType,
        settings.volume,
        (beatPos) => {
          setPlaybackPosition(beatPos);
        },
      );
    } catch {
      // Audio context may fail in some environments
    }

    setIsPlaying(false);
    setPlaybackPosition(-1);

    // Check level completion
    const matched = checkMatch(result.notes, level.targetNotes);
    if (matched) {
      setMessage("Melody matches! Well done!");
      setIsSuccess(true);
      setIsError(false);
      setCompletedLevels((prev) => {
        const next = new Set(prev);
        next.add(level.id);
        saveCompleted(next);
        return next;
      });
      setTimeout(() => setShowComplete(true), 400);
    } else if (level.targetNotes.length > 0) {
      setMessage(
        "Not quite right. Compare your notes with the target (dim blocks).",
      );
      setIsError(true);
      setIsSuccess(false);
    } else {
      // Freestyle — always succeeds
      setMessage("Nice composition!");
      setIsSuccess(true);
      setCompletedLevels((prev) => {
        const next = new Set(prev);
        next.add(level.id);
        saveCompleted(next);
        return next;
      });
      setTimeout(() => setShowComplete(true), 400);
    }
  }, [code, level, handleReset]);

  const hasNextLevel = levels.some((l) => l.id === levelId + 1);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 22 }}>{"🎵"}</span>
          <span>MusicBot</span>
        </h1>

        <div style={{ flex: 1 }} />

        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textDecoration: "none",
            marginRight: 8,
          }}
        >
          FreeGameStore
        </a>

        <button
          onClick={() => setShowLevels(true)}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: "1px solid var(--line-strong)",
            background: "var(--paper)",
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Levels
        </button>
      </header>

      {/* Level info bar */}
      <div
        style={{
          padding: "6px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--accent)" }}>
          Level {level.id}
        </span>
        <span style={{ fontWeight: 600 }}>{level.name}</span>
        <span style={{ color: "var(--muted)" }}>{level.description}</span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--muted)",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          {level.targetDescription}
        </span>
      </div>

      {/* Main split layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Left: Piano roll (55%) */}
        <div
          style={{
            flex: "0 0 55%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#1e1e2e",
          }}
        >
          <PianoRoll
            notes={notes}
            targetNotes={level.targetNotes}
            playbackPosition={playbackPosition}
            isPlaying={isPlaying}
          />
        </div>

        {/* Right: Editor + Controls (45%) */}
        <div
          style={{
            flex: "0 0 45%",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--line)",
            padding: 12,
            gap: 10,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <GameControls
            onRun={() => void handleRun()}
            onStop={handleStop}
            onReset={handleReset}
            isPlaying={isPlaying}
            hasCode={code.trim().length > 0}
            tempo={tempo}
            message={message}
            isError={isError}
            isSuccess={isSuccess}
          />

          <CodeEditor
            code={code}
            onChange={setCode}
            activeLine={0}
            availableCommands={level.availableCommands}
            disabled={isPlaying}
          />
        </div>
      </div>

      {/* Modals */}
      {showLevels && (
        <LevelSelect
          currentLevel={levelId}
          completedLevels={completedLevels}
          onSelect={handleLevelChange}
          onClose={() => setShowLevels(false)}
        />
      )}

      {showComplete && (
        <LevelComplete
          levelName={level.name}
          noteCount={notes.length}
          hasNextLevel={hasNextLevel}
          onNext={() => handleLevelChange(levelId + 1)}
          onRetry={() => {
            setShowComplete(false);
            handleReset();
          }}
          onLevels={() => {
            setShowComplete(false);
            setShowLevels(true);
          }}
        />
      )}
    </div>
  );
}
