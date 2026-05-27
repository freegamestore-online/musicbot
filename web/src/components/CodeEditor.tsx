import { useRef, useCallback, useMemo, useEffect } from "react";
import { COMMAND_HELP } from "../types";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  activeLine: number;
  availableCommands: string[];
  disabled: boolean;
  hasError?: boolean;
}

// --- Syntax highlighting ---

const KEYWORDS = /\b(repeat)\b/g;
const PLAY_REST = /\b(play|rest)\b/g;
const SETTINGS = /\b(instrument|tempo|volume)\b/g;
const NOTE_STRINGS = /(&quot;[A-G][#b]?\d&quot;|"[A-G][#b]?\d")/g;
const WAVE_STRINGS =
  /(&quot;(?:sine|square|triangle|sawtooth)&quot;|"(?:sine|square|triangle|sawtooth)")/g;
const NUMBERS = /\b(\d+\.?\d*)\b/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCode(code: string): string {
  return code
    .split("\n")
    .map((rawLine) => {
      const escaped = escapeHtml(rawLine);

      // Check for comment — if line has a comment, split at it
      const commentMatch = escaped.match(/\/\/.*/);
      if (commentMatch) {
        const commentStart = escaped.indexOf(commentMatch[0]);
        const before = escaped.slice(0, commentStart);
        const comment = escaped.slice(commentStart);
        return (
          highlightExpression(before) +
          `<span style="color:#5c6370;font-style:italic">${comment}</span>`
        );
      }

      return highlightExpression(escaped);
    })
    .join("\n");
}

function highlightExpression(line: string): string {
  return line
    .replace(NOTE_STRINGS, '<span style="color:#a6e3a1">$1</span>')
    .replace(WAVE_STRINGS, '<span style="color:#a6e3a1">$1</span>')
    .replace(KEYWORDS, '<span style="color:#cba6f7">$1</span>')
    .replace(PLAY_REST, '<span style="color:#f38ba8">$1</span>')
    .replace(SETTINGS, '<span style="color:#89b4fa">$1</span>')
    .replace(NUMBERS, '<span style="color:#fab387">$1</span>');
}

export default function CodeEditor({
  code,
  onChange,
  activeLine,
  availableCommands,
  disabled,
  hasError = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const lines = useMemo(() => code.split("\n"), [code]);
  const lineCount = lines.length;

  // Sync scroll between textarea and pre overlay
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, []);

  useEffect(() => {
    handleScroll();
  }, [code, handleScroll]);

  const highlightedHtml = useMemo(() => {
    const highlighted = highlightCode(code);
    if (!hasError || activeLine <= 0) return highlighted;

    const htmlLines = highlighted.split("\n");
    return htmlLines
      .map((line, i) => {
        if (i + 1 === activeLine) {
          return `<span style="background:rgba(220,38,38,0.15);display:inline-block;width:100%;min-width:fit-content">${line}</span>`;
        }
        return line;
      })
      .join("\n");
  }, [code, hasError, activeLine]);

  const insertCommand = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const before = code.slice(0, start);
      const after = code.slice(ta.selectionEnd);
      const newCode = before + text + "\n" + after;
      onChange(newCode);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + text.length + 1;
        ta.selectionStart = pos;
        ta.selectionEnd = pos;
      });
    },
    [code, onChange],
  );

  const commandChips = useMemo(() => {
    return availableCommands
      .map((key) => {
        const help = COMMAND_HELP[key];
        if (!help) return null;
        return { key, ...help };
      })
      .filter(Boolean) as { key: string; syntax: string; desc: string }[];
  }, [availableCommands]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Editor area */}
      <div
        style={{
          display: "flex",
          background: "#1e1e2e",
          borderRadius: 8,
          overflow: "hidden",
          flex: 1,
          minHeight: 120,
          border: "1px solid var(--line)",
        }}
      >
        {/* Line numbers */}
        <div
          className="code-editor"
          style={{
            padding: "12px 0",
            background: "#181825",
            color: "#6c7086",
            textAlign: "right",
            userSelect: "none",
            minWidth: 36,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              style={{
                paddingRight: 8,
                paddingLeft: 8,
                background:
                  activeLine === i + 1
                    ? hasError
                      ? "rgba(220, 38, 38, 0.25)"
                      : "rgba(225, 29, 72, 0.25)"
                    : "transparent",
                color:
                  activeLine === i + 1
                    ? hasError
                      ? "#dc2626"
                      : "#e11d48"
                    : undefined,
                fontWeight: activeLine === i + 1 ? 700 : 400,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area: overlay container */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          {/* Highlighted pre overlay */}
          <pre
            ref={preRef}
            className="code-editor"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: 12,
              color: "#abb2bf",
              background: "transparent",
              border: "none",
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
              overflowY: "auto",
              pointerEvents: "none",
              scrollbarWidth: "none",
            }}
          />

          {/* Textarea (transparent text so caret is visible) */}
          <textarea
            ref={textareaRef}
            className="code-editor"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              padding: 12,
              margin: 0,
              background: "transparent",
              color: "transparent",
              caretColor: "#abb2bf",
              border: "none",
              resize: "none",
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
              overflowY: "auto",
              opacity: disabled ? 0.6 : 1,
              zIndex: 1,
            }}
          />
        </div>
      </div>

      {/* Command reference */}
      <div
        style={{
          background: "var(--panel)",
          borderRadius: 8,
          padding: "8px 10px",
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Commands
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {commandChips.map((cmd) => (
            <button
              key={cmd.key}
              onClick={() => insertCommand(cmd.syntax)}
              disabled={disabled}
              title={cmd.desc}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid var(--line-strong)",
                background: "var(--paper)",
                color: "var(--ink)",
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {cmd.syntax}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
