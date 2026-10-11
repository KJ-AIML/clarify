---
title: Codebase Tour · Clarify
eyebrow: Codebase tour
subtitle: What it is, how a draft becomes a page, and why it is built this way
theme: auto
cols: 3
---

Lead: Clarify turns a Markdown file written by an AI agent into one interactive HTML page. The agent explains with diagrams and tables instead of walls of text, and you answer back on the page. This tour covers the problem, the pipeline, the design decisions and where to start changing things.

## A The Problem It Solves {span=2}
AI coding agents explain everything in terminal text. That works for a one-line answer but breaks down for architecture, trade-offs and reviews: you end up scrolling through hundreds of lines and building the picture in your head.

Clarify gives the agent a better output format. The agent writes a short Markdown **draft** (diagrams in a simple text syntax, tables, questions), and Clarify compiles it into a page you can explore: zoom into the architecture, click a component to see its files, follow a request path, and answer the agent's questions.

Two things make it different from just drawing a diagram:
- **It's two-way.** You comment on any box or arrow and press **Copy reply for agent**. The reply tells the agent exactly which draft line you mean.
- **It's zero-dependency.** It's one Node script, no `npm install`, and the output is a single HTML file you can email or attach to a ticket.

## B Who Uses It, For What
```kv
Agent: Writes the draft, runs the CLI
You: Read, explore, decide, comment
Typical jobs: Onboarding, design reviews, PR reviews, incident write-ups
Output: One .html file (or GitHub Markdown)
```

```callout info Good to know
You never write the draft yourself unless you want to. You ask the agent to "clarify" something and it does the rest.
```

## C The Compile Pipeline {span=3}
**How to read this diagram:** boxes are source modules, arrows show what data passes between them, and dashed boxes group modules by role. Click any box to see its file and what it's responsible for. Press **▶ Render path** to follow one draft through the system, stop by stop.

```arch LR
[Agent:claude] -> [CLI]: draft.md / stdin
group "Compiler (Node)" {
  [CLI] -> [Draft Parser]: text
  [Draft Parser] -> [Block Tokenizer]: panels + line numbers
  [Block Tokenizer] -> [Diagram Dispatch]: fences
  group "Diagram engine" {
    [Diagram Dispatch] -> [Arch Parser]: arch / flow
    [Diagram Dispatch] -> [Mermaid Parser]: mermaid
    [Arch Parser] -> [Layout Engine]: Graph
    [Mermaid Parser] -> [Layout Engine]: Graph
    [Layout Engine] -> [SVG Renderer]: Layout
  }
  [SVG Renderer] -> [Page Compiler]: svg + model
  [Block Tokenizer] -> [Page Compiler]: tables, asks, callouts
}
[Page Compiler] -> [(HTML Page)]: single file
[Live Server:node] --> [(HTML Page)]: SSE reload

[CLI] { files: bin/clarify.mjs; desc: Entry point with four commands: render, serve, md and view. }
[Draft Parser] { files: src/parser.js; desc: Splits the draft into settings, the lead and panels. Remembers line numbers so review comments can point back to the source. }
[Block Tokenizer] { files: src/markdown.js; desc: Breaks each panel into blocks (tables, lists, fenced diagrams). Escapes all text first, so a draft can never inject HTML. }
[Diagram Dispatch] { files: src/diagram/index.js; desc: Decides which parser handles a fence. Detects raw Mermaid even inside an arch block. }
[Arch Parser] { files: src/diagram/arch-parser.js; desc: Reads Clarify's own diagram syntax for nodes, edges, groups, metadata and traces. Never crashes; bad lines become warnings with line numbers. }
[Mermaid Parser] { files: src/diagram/mermaid.js; desc: Reads existing Mermaid diagrams and can write any diagram back out as Mermaid for GitHub. }
[Layout Engine] { files: src/diagram/layout.js; status: ok; desc: Decides where every box goes: layers, ordering to minimize crossings, spacing, and group boxes that never overlap. }
[SVG Renderer] { files: src/diagram/svg.js, src/diagram/sequence-svg.js; desc: Draws the laid-out graph. Colors come from theme variables, so switching themes needs no re-render. }
[Page Compiler] { files: src/render.js, src/runtime/client.js; desc: Assembles the page and inlines the CSS and the browser script that powers zoom, the inspector and replies. }
[Live Server] { files: src/serve.js; desc: For live preview. Watches the draft and tells open browsers to reload. Local machine only. }

trace "Render path" {
  Agent -> CLI: The agent pipes a Markdown draft into `clarify render`.
  CLI -> Draft Parser: The CLI reads the draft and hands the raw text to the parser.
  Draft Parser -> Block Tokenizer: Settings, the lead and panels are split out, each with its source line number.
  Block Tokenizer -> Diagram Dispatch: Each panel is broken into blocks. Fenced diagrams go to dispatch.
  Diagram Dispatch -> Arch Parser: An `arch` fence goes to Clarify's own diagram parser.
  Arch Parser -> Layout Engine: The text becomes a graph of nodes, edges and groups.
  Layout Engine -> SVG Renderer: Every box gets a position, and crossings are minimized.
  SVG Renderer -> Page Compiler: The laid-out graph is drawn as themeable SVG.
  Page Compiler -> HTML Page: CSS and the browser script are inlined into one standalone file.
}
```

```callout ok Key takeaway
All the hard work happens once, at compile time in Node. The browser only handles interaction, which is why the output is one small file with no server and no internet connection needed.
```

## D Step by Step: What Happens When You Run It {span=2}
1. **The agent runs** `clarify render draft.md`. The CLI reads the file, or the draft piped on stdin.
2. **Parse the draft.** The frontmatter sets the title and theme, `Lead:` becomes the summary bar, and each `## Title` becomes a panel.
3. **Tokenize each panel.** Paragraphs, tables, lists and fenced blocks are separated, and every block keeps its source line number.
4. **Build each diagram.** The text syntax becomes a graph (nodes, edges, groups), and the layout engine computes positions.
5. **Draw and assemble.** Diagrams become SVG and the rest becomes HTML. CSS and the browser script are inlined into one file.
6. **Open and interact.** You explore, comment, and copy a structured reply back to the agent, which edits the draft and re-renders.

## E How the Layout Engine Thinks
Good automatic layout is what makes a diagram readable without anyone dragging boxes around. The engine works in four steps:
- **Layers:** every box gets a column, so arrows mostly flow left to right.
- **Ordering:** within each column, boxes are reordered to minimize crossing arrows.
- **Spacing:** each box is placed close to its neighbors, with guaranteed gaps, and labels get their own lane so they never cover boxes.
- **Groups:** boundary boxes such as "VPC" are pushed apart until they never overlap anything they don't contain.

A test generates 1,200 random diagrams and checks these rules on every run.

## F Design Decisions & Trade-offs {span=3}
| Decision | Why | Trade-off | Status |
| --- | --- | --- | --- |
| Zero dependencies, no build step | Agents can run it anywhere instantly; nothing to install or break | We wrote our own layout engine and Mermaid parser instead of using libraries | ok Kept |
| Single HTML file output | Easy to share, attach to tickets, open offline | Pages are 85–130 KB, larger than a plain doc | ok Kept |
| Markdown-like draft, not JSON | LLMs write Markdown reliably; JSON coordinates caused syntax failures in other tools | Less precise control over exact positions | ok Kept |
| Line numbers on everything | Review comments map straight back to the source line | Parser must track offsets carefully | ok Kept |
| Auto layout instead of manual dragging | Diagrams stay correct when the agent edits the draft | You can't hand-tune positions yet | warn Revisit |
| JSDoc types instead of TypeScript | Keeps zero-build | Types aren't checked in CI yet | warn Revisit |

## G The Reply Loop {span=2}
This is the part that turns a picture into a conversation. Instead of describing "the box on the left," you click it and comment, and the agent gets the exact draft line.

```sequence
autonumber
participant Agent:claude
participant Page
participant Reviewer
Agent -> Page: clarify render draft.md
Page -> Reviewer: interactive board
Reviewer -> Page: pick options, comment on nodes
Reviewer -> Page: Copy reply for agent
Page --> Agent: "# Re: …" with draft line numbers
Agent -> Agent: apply changes, re-render
```

## H Where to Start Changing Things
```kv
New diagram syntax: src/diagram/arch-parser.js
Layout spacing: LAYOUT in src/diagram/layout.js
New theme: src/runtime/themes.css
Browser behavior: src/runtime/client.js
Run tests: npm test · npm run visual
```

```callout warn Watch out
Visual test baselines depend on this machine's fonts. On a new machine, run `npm run visual:update` first.
```

## I Your Call {span=3}
```ask
What should the next iteration focus on?
* Descriptions visible without clicking | hover cards and an auto-generated component list
- Node dragging that writes positions back to the draft
- A real TypeScript type-check in CI
- More brand icons (AWS, GCP services)
```
