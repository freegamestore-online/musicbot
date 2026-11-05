import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(label),
  );
  if (!found) throw new Error(`No button "${label}"`);
  return found;
}

async function click(label: string) {
  await act(async () => {
    button(label).click();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

function mount() {
  act(() => root.render(<App />));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

// Level 1's starter code is already a solution, and jsdom has no AudioContext,
// so a Play run completes immediately and schedules the success modal.
describe("success modal timer (#2)", () => {
  it("appears after a win", async () => {
    mount();
    await click("Play");
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(container.textContent).toContain("Level Complete!");
  });

  it("does not appear when Reset is pressed right after a win", async () => {
    mount();
    await click("Play");
    await click("Reset");
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(container.textContent).not.toContain("Level Complete!");
  });

  it("does not appear when the level changes right after a win", async () => {
    mount();
    await click("Play");
    await click("Levels");
    await click("Three Notes");
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(container.textContent).not.toContain("Level Complete!");
  });
});

describe("tempo display", () => {
  it("shows the saved level's tempo on load", () => {
    localStorage.setItem("musicbot_level", "6"); // "Speed It Up", tempo 160
    mount();
    expect(container.textContent).toContain("= 160 BPM");
  });
});
