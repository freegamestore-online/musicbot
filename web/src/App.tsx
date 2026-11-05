import { GameShell, GameTopbar, GameButton, useSound } from "@freegamestore/games";
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

function loadSavedCode(): Record<number, string> {
  try {
    const raw = localStorage.getItem("musicbot_code");
    if (raw) return JSON.parse(raw) as Record<number, string>;
  } catch {
    /* ignore */
  }
  return {};
}

function loadCode(levelId: number): string {
  return (
    loadSavedCode()[levelId] ??
    levels.find((l) => l.id === levelId)?.starterCode ??
    ""
  );
}

function saveCode(levelId: number, code: string) {
  try {
    localStorage.setItem(
      "musicbot_code",
      JSON.stringify({ ...loadSavedCode(), [levelId]: code }),
    );
    localStorage.setItem("musicbot_level", String(levelId));
  } catch {
    /* ignore */
  }
}

function loadLevel(): number {
  try {
    const id = Number(localStorage.getItem("musicbot_level"));
    if (levels.some((l) => l.id === id)) return id;
  } catch {
    /* ignore */
  }
  return 1;
}

function GameContent() {
  const { muted } = useSound();
  const [levelId, setLevelId] = useState(loadLevel);
  const [code, setCode] = useState(() => loadCode(levelId));
  const [notes, setNotes] = useState<Note[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [errorLine, setErrorLine] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(loadCompleted);

  const playerRef = useRef<MusicPlayer | null>(null);
  useEffect(() => { playerRef.current?.setMuted(muted); }, [muted]);

  const level = useMemo(
    () => levels.find((l) => l.id === levelId) ?? levels[0]!,
    [levelId],
  );

  useEffect(() => {
    saveCode(levelId, code);
  }, [levelId, code]);

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
    setErrorLine(0);
    setIsSuccess(false);
    setShowComplete(false);
    setPlaybackPosition(-1);
  }, [handleStop]);

  const handleLevelChange = useCallback(
    (id: number) => {
      handleReset();
      setLevelId(id);
      const newLevel = levels.find((l) => l.id === id);
      setCode(loadCode(id));
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
      setErrorLine(result.errorLine);
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

    let completed = true;
    try {
      playerRef.current.setMuted(muted);
      completed = await playerRef.current.playSequence(
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

    // Stopped, or superseded by a newer run
    if (!completed) return;

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
  }, [code, level, handleReset, muted]);

  const hasNextLevel = levels.some((l) => l.id === levelId + 1);

  const playingLine = isPlaying
    ? notes.find(
        (n) =>
          playbackPosition >= n.time && playbackPosition < n.time + n.duration,
      )?.line ?? 0
    : 0;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className="shrink-0">
        <GameTopbar title="MusicBot" actions={<GameButton size="sm" variant="ghost" onClick={() => setShowLevels(true)}>Levels</GameButton>} />
      </div>

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
          flexWrap: "wrap",
          rowGap: 2,
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
          {level.targetDescription} · Hint: {level.hint}
        </span>
      </div>

      {/* Stacked on phones (stage on top), side by side from md up */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Piano roll */}
        <div
          className="flex shrink-0 basis-[40%] flex-col overflow-hidden md:basis-[55%]"
          style={{ background: "#1e1e2e" }}
        >
          <PianoRoll
            notes={notes}
            targetNotes={level.targetNotes}
            playbackPosition={playbackPosition}
            isPlaying={isPlaying}
          />
        </div>

        {/* Editor + Controls */}
        <div
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto border-t border-[var(--line)] p-3 md:border-t-0 md:border-l"
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
            activeLine={errorLine || playingLine}
            availableCommands={level.availableCommands}
            disabled={isPlaying}
            hasError={errorLine > 0}
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

export default function App() {
  return <GameShell><GameContent /></GameShell>;
}
