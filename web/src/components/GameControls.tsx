interface GameControlsProps {
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  isPlaying: boolean;
  hasCode: boolean;
  tempo: number;
  message: string;
  isError: boolean;
  isSuccess: boolean;
}

export default function GameControls({
  onRun,
  onStop,
  onReset,
  isPlaying,
  hasCode,
  tempo,
  message,
  isError,
  isSuccess,
}: GameControlsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Buttons row */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {isPlaying ? (
          <button
            onClick={onStop}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--error)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {"■ Stop"}
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!hasCode}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: !hasCode ? "default" : "pointer",
              opacity: !hasCode ? 0.5 : 1,
            }}
          >
            {"▶ Play"}
          </button>
        )}

        <button
          onClick={onReset}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid var(--line-strong)",
            background: "transparent",
            color: "var(--ink)",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {"↺ Reset"}
        </button>

        {/* Tempo display */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--panel)",
            borderRadius: 6,
            border: "1px solid var(--line)",
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            color: "var(--muted)",
          }}
        >
          <span style={{ fontSize: 14 }}>{"♩"}</span>
          <span>= {tempo} BPM</span>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: isError
              ? "rgba(220, 38, 38, 0.1)"
              : isSuccess
                ? "rgba(5, 150, 105, 0.1)"
                : "var(--panel)",
            color: isError
              ? "var(--error)"
              : isSuccess
                ? "var(--success)"
                : "var(--ink)",
            border: `1px solid ${
              isError
                ? "var(--error)"
                : isSuccess
                  ? "var(--success)"
                  : "var(--line)"
            }`,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
