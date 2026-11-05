import { describe, it, expect } from "vitest";
import { highlightCode } from "./CodeEditor";

/** The text a user sees: highlighted HTML with tags stripped and entities decoded. */
function visibleText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.textContent ?? "";
}

const programs = [
  'play("C4")',
  "play('C#4', 0.5)\nrest(0.25)",
  'tempo(160)\ninstrument("sawtooth")\nvolume(0.8)',
  'repeat(4) {\n  play("Eb5", 1.5)\n}',
  'play("C4") // repeat play rest tempo 120 "D4"',
  '// comment only\nplay("H4") <b>&amp;</b>',
];

describe("highlightCode", () => {
  for (const code of programs) {
    it(`shows exactly the source text: ${JSON.stringify(code)}`, () => {
      expect(visibleText(highlightCode(code))).toBe(code);
    });
  }

  it("colours tokens the same as the original chained highlighter", () => {
    expect(programs.map(highlightCode)).toMatchInlineSnapshot(`
      [
        "<span style="color:#f38ba8">play</span>(<span style="color:#a6e3a1">&quot;C4&quot;</span>)",
        "<span style="color:#f38ba8">play</span>('C#<span style="color:#fab387">4</span>', <span style="color:#fab387">0.5</span>)
      <span style="color:#f38ba8">rest</span>(<span style="color:#fab387">0.25</span>)",
        "<span style="color:#89b4fa">tempo</span>(<span style="color:#fab387">160</span>)
      <span style="color:#89b4fa">instrument</span>(<span style="color:#a6e3a1">&quot;sawtooth&quot;</span>)
      <span style="color:#89b4fa">volume</span>(<span style="color:#fab387">0.8</span>)",
        "<span style="color:#cba6f7">repeat</span>(<span style="color:#fab387">4</span>) {
        <span style="color:#f38ba8">play</span>(<span style="color:#a6e3a1">&quot;Eb5&quot;</span>, <span style="color:#fab387">1.5</span>)
      }",
        "<span style="color:#f38ba8">play</span>(<span style="color:#a6e3a1">&quot;C4&quot;</span>) <span style="color:#5c6370;font-style:italic">// repeat play rest tempo 120 &quot;D4&quot;</span>",
        "<span style="color:#5c6370;font-style:italic">// comment only</span>
      <span style="color:#f38ba8">play</span>(&quot;H4&quot;) &lt;b&gt;&amp;amp;&lt;/b&gt;",
      ]
    `);
  });
});
