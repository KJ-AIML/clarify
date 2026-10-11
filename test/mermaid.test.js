// clarify/test/mermaid.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isMermaidSequence,
  parseMermaid,
  parseMermaidFlowchart,
  parseSequence,
  graphToMermaid,
  sequenceToMermaid,
} from "../src/diagram/mermaid.js";

const flow = (src, opts) => parseMermaidFlowchart(src, opts);
const node = (g, id) => g.nodes.find((n) => n.id === id);
const edgeSig = (e) => `${e.from}>${e.to}|${e.label}|${e.style}|${e.arrowStart ? "<" : ""}${e.arrowEnd ? ">" : ""}`;
const messages = (seq) => seq.items.filter((i) => i.type === "message");

describe("dispatch", () => {
  test("isMermaidSequence looks at the first meaningful line", () => {
    assert.equal(isMermaidSequence("\n%% hi\nsequenceDiagram\nA->>B: x"), true);
    assert.equal(isMermaidSequence("flowchart LR\nA-->B"), false);
    assert.equal(isMermaidSequence(""), false);
    assert.equal(isMermaidSequence(undefined), false);
  });

  test("parseMermaid dispatches on the header", () => {
    assert.equal(parseMermaid("sequenceDiagram\nA->>B: hi").kind, "sequence");
    assert.equal(parseMermaid("graph LR\nA-->B").kind, "graph");
  });
});

describe("flowchart: header and statements", () => {
  test("direction mapping and output shape", () => {
    for (const [dir, want] of [["LR", "LR"], ["RL", "LR"], ["TD", "TD"], ["TB", "TD"], ["BT", "TD"]]) {
      assert.equal(flow(`flowchart ${dir}\nA-->B`).direction, want);
    }
    const g = flow("A --> B");
    assert.equal(g.direction, "TD");
    assert.deepEqual(Object.keys(g).sort(), ["direction", "edges", "groups", "kind", "nodes", "traces", "warnings"]);
    assert.deepEqual(g.traces, []);
    assert.deepEqual(g.nodes[0], { id: "A", label: "A", shape: "box", tech: null, group: null, meta: {}, line: 1 });
    assert.deepEqual(g.edges[0], {
      id: "e0", from: "A", to: "B", label: "", style: "solid",
      arrowStart: false, arrowEnd: true, meta: {}, line: 1,
    });
  });

  test("semicolons, comments and styling statements", () => {
    const g = flow(`graph LR;
%% full-line comment
%%{init: {"theme": "dark"}}%%
A --> B; B --> C %% trailing comment
classDef hot fill:#f96,stroke:#333;
class A,B hot
style C fill:#bbf
linkStyle 0 stroke:#ff3
click A "https://example.com" _blank
accTitle: Hello
accDescr {
  multi-line A --> Z
}
D:::hot --> E[Eee]:::cold`);
    assert.deepEqual(g.warnings, []);
    assert.deepEqual(g.nodes.map((n) => n.id), ["A", "B", "C", "D", "E"]);
    assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["A>B", "B>C", "D>E"]);
    assert.equal(node(g, "E").label, "Eee");
  });

  test("unsupported diagram types yield an empty graph with a warning", () => {
    const g = flow("classDiagram\nAnimal <|-- Duck");
    assert.equal(g.nodes.length, 0);
    assert.match(g.warnings[0], /unsupported Mermaid diagram type "classDiagram"/);
  });
});

describe("flowchart: nodes", () => {
  test("every shape", () => {
    const cases = [
      ["A[Text]", "box"], ["A(Text)", "round"], ["A([Text])", "round"], ["A[[Text]]", "box"],
      ["A[(Text)]", "cylinder"], ["A((Text))", "circle"], ["A(((Text)))", "circle"], ["A{Text}", "diamond"],
      ["A{{Text}}", "diamond"], ["A>Text]", "box"], ["A[/Text/]", "box"], ["A[\\Text\\]", "box"],
      ["A[/Text\\]", "box"], ["A[\\Text/]", "box"],
    ];
    for (const [src, shape] of cases) {
      const g = flow(src);
      assert.deepEqual(g.warnings, [], src);
      assert.equal(g.nodes.length, 1, src);
      assert.equal(g.nodes[0].shape, shape, src);
      assert.equal(g.nodes[0].label, "Text", src);
    }
    assert.equal(flow("A").nodes[0].label, "A");
  });

  test("quoted labels, <br>, entities and markdown strings", () => {
    const g = flow(`A["Text (with) [brackets]"] --> B("x {y} z")
C["one<br>two<br/>three"]
D["say #quot;hi#quot; #35;1"]
E["\`**md**\`"]`);
    assert.deepEqual(g.warnings, []);
    assert.equal(node(g, "A").label, "Text (with) [brackets]");
    assert.equal(node(g, "B").label, "x {y} z");
    assert.equal(node(g, "C").label, "one two three");
    assert.equal(node(g, "D").label, 'say "hi" #1');
    assert.equal(node(g, "E").label, "**md**");
  });

  test("tech suffix", () => {
    const g = flow(`api[API Gateway:cloudflare] --> db[(Order DB:postgres)]
s[Step 1: validate]
u[http://example.com]
p[Port :8080]`);
    assert.deepEqual([node(g, "api").label, node(g, "api").tech], ["API Gateway", "cloudflare"]);
    assert.deepEqual([node(g, "db").label, node(g, "db").tech, node(g, "db").shape], ["Order DB", "postgres", "cylinder"]);
    assert.deepEqual([node(g, "s").label, node(g, "s").tech], ["Step 1: validate", null]);
    assert.deepEqual([node(g, "u").label, node(g, "u").tech], ["http://example.com", null]);
    assert.deepEqual([node(g, "p").label, node(g, "p").tech], ["Port :8080", null]);
  });

  test("a later definition updates label and shape but keeps the first line", () => {
    const g = flow("A --> B\nB{Decide}\nB --> C", { lineOffset: 10 });
    assert.deepEqual(node(g, "B"), {
      id: "B", label: "Decide", shape: "diamond", tech: null, group: null, meta: {}, line: 11,
    });
    assert.equal(g.edges[1].line, 13);
  });
});

describe("flowchart: edges", () => {
  test("every operator", () => {
    const cases = [
      ["-->", "solid", false, true], ["---", "solid", false, false], ["-.->", "dashed", false, true],
      ["-.-", "dashed", false, false], ["==>", "thick", false, true], ["===", "thick", false, false],
      ["<-->", "solid", true, true], ["<-.->", "dashed", true, true], ["<==>", "thick", true, true],
      ["--o", "solid", false, true], ["--x", "solid", false, true], ["--->", "solid", false, true],
      ["----", "solid", false, false], ["-..->", "dashed", false, true], ["====>", "thick", false, true],
    ];
    for (const [op, style, arrowStart, arrowEnd] of cases) {
      for (const src of [`A ${op} B`, `A${op}B`]) {
        const g = flow(src);
        assert.deepEqual(g.warnings, [], src);
        assert.equal(g.edges.length, 1, src);
        const e = g.edges[0];
        assert.deepEqual([e.from, e.to, e.style, e.arrowStart, e.arrowEnd], ["A", "B", style, arrowStart, arrowEnd], src);
      }
    }
  });

  test("labels in pipe and inline forms, quoted or not", () => {
    const g = flow(`A -->|yes| B
A-->|"a | b"|C
A -- no --> D
A -. maybe .-> E
A == sure ==> F
A -- "quoted --> text" --- G
A <-- both --> H`);
    assert.deepEqual(g.warnings, []);
    assert.deepEqual(g.edges.map(edgeSig), [
      "A>B|yes|solid|>",
      "A>C|a | b|solid|>",
      "A>D|no|solid|>",
      "A>E|maybe|dashed|>",
      "A>F|sure|thick|>",
      "A>G|quoted --> text|solid|",
      "A>H|both|solid|<>",
    ]);
  });

  test("chains and & cross products", () => {
    const g = flow("A --> B -->|two| C[See]\nX & Y --> P & Q");
    assert.deepEqual(g.edges.map((e) => `${e.id}:${e.from}>${e.to}`), [
      "e0:A>B", "e1:B>C", "e2:X>P", "e3:X>Q", "e4:Y>P", "e5:Y>Q",
    ]);
    assert.equal(g.edges[1].label, "two");
    assert.equal(node(g, "C").label, "See");
  });

  test("ids with dashes and dots are not mistaken for arrows", () => {
    const g = flow("web-app --> api.v2\nmy--thing --- other");
    assert.deepEqual(g.warnings, []);
    assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["web-app>api.v2", "my--thing>other"]);
  });
});

describe("flowchart: subgraphs", () => {
  test("nesting, title forms and deepest-mention group assignment", () => {
    const g = flow(`flowchart LR
  Ext --> Lb
  subgraph cloud [Cloud Platform]
    direction TB
    Lb --> Api
    subgraph data["Data (tier)"]
      Db[(DB)]
    end
    Api --> Db
  end
  subgraph "Quoted Title"
    Q1
  end
  subgraph Title With Spaces
    S1
  end
  subgraph solo
    S2
  end`);
    assert.deepEqual(g.warnings, []);
    assert.deepEqual(g.groups, [
      { id: "g:cloud", label: "Cloud Platform", parent: null, line: 3 },
      { id: "g:data", label: "Data (tier)", parent: "g:cloud", line: 6 },
      { id: "g:quoted-title", label: "Quoted Title", parent: null, line: 11 },
      { id: "g:title-with-spaces", label: "Title With Spaces", parent: null, line: 14 },
      { id: "g:solo", label: "solo", parent: null, line: 17 },
    ]);
    const groupOf = Object.fromEntries(g.nodes.map((n) => [n.id, n.group]));
    assert.deepEqual(groupOf, {
      Ext: null, Lb: "g:cloud", Api: "g:cloud", Db: "g:data", Q1: "g:quoted-title", S1: "g:title-with-spaces", S2: "g:solo",
    });
  });

  test("links to subgraphs are dropped with a warning instead of creating stray nodes", () => {
    const g = flow("one --> X\nsubgraph one\nA --> B\nend\nsubgraph two[Two]\nC\nend\none --> two\nB --> C");
    assert.deepEqual(g.nodes.map((n) => n.id), ["X", "A", "B", "C"]);
    assert.deepEqual(g.edges.map((e) => `${e.id}:${e.from}>${e.to}`), ["e0:A>B", "e1:B>C"]);
    assert.deepEqual(g.warnings, [
      'line 2: links to subgraph "one" are not supported (2 dropped)',
      'line 5: links to subgraph "two" are not supported (1 dropped)',
    ]);
  });

  test("duplicate subgraph ids stay unique and stray end warns", () => {
    const g = flow("subgraph a\nX\nend\nsubgraph a\nY\nend\nend");
    assert.deepEqual(g.groups.map((x) => x.id), ["g:a", "g:a-2"]);
    assert.equal(g.warnings.length, 1);
    assert.match(g.warnings[0], /^line 7: unexpected "end"/);
  });
});

describe("flowchart: robustness", () => {
  test("malformed lines warn with line numbers and do not throw", () => {
    const g = flow("graph TD\nA --> B\nA -> C\nD -->\n--> E\nF[unclosed\nG --> H", { lineOffset: 4 });
    assert.deepEqual(g.edges.map((e) => `${e.from}>${e.to}`), ["A>B", "G>H"]);
    assert.deepEqual(g.nodes.map((n) => n.id), ["A", "B", "G", "H"]);
    assert.equal(g.warnings.length, 4);
    assert.match(g.warnings[0], /^line 7: could not parse "A -> C"/);
    assert.match(g.warnings[1], /^line 8: could not parse "D -->" \(arrow has no target\)/);
    assert.match(g.warnings[2], /^line 9: /);
    assert.match(g.warnings[3], /^line 10: could not parse "F\[unclosed" \(unclosed label/);
  });

  test("truncated streaming input still yields a best-effort graph", () => {
    const full = `flowchart LR
  subgraph svc [Services]
    A[Web] --> B[(Store)]
    B --> C{Check}
  end`;
    for (let cut = 0; cut <= full.length; cut++) {
      const g = flow(full.slice(0, cut));
      assert.equal(g.kind, "graph");
      assert.ok(Array.isArray(g.warnings));
    }
    const partial = flow(full.slice(0, full.indexOf("C{Che") + 5));
    assert.deepEqual(partial.edges.map((e) => `${e.from}>${e.to}`), ["A>B"]);
    assert.equal(node(partial, "B").group, "g:svc");
    assert.equal(partial.warnings.length, 2);
    assert.match(partial.warnings.at(-1), /^line 2: subgraph "Services" is not closed/);
  });

  test("garbage input never throws", () => {
    for (const src of [null, 42, "{{{", "[[[]]]", "-->", "A[\"", "subgraph", "end\nend", "A -- unterminated", "|||"]) {
      assert.doesNotThrow(() => flow(src));
    }
  });
});

describe("sequence", () => {
  test("participants, actors, aliases, tech and auto-added participants", () => {
    const seq = parseSequence(`sequenceDiagram
  actor U as User
  participant API as API Gateway:cloudflare
  participant DB
  participant Cache:redis
  create participant Late
  U->>API: hi
  API->>Worker: job`, { lineOffset: 100 });
    assert.deepEqual(seq.warnings, []);
    assert.deepEqual(seq.participants, [
      { id: "U", label: "User", tech: null, kind: "actor", line: 102 },
      { id: "API", label: "API Gateway", tech: "cloudflare", kind: "participant", line: 103 },
      { id: "DB", label: "DB", tech: null, kind: "participant", line: 104 },
      { id: "Cache", label: "Cache", tech: "redis", kind: "participant", line: 105 },
      { id: "Late", label: "Late", tech: null, kind: "participant", line: 106 },
      { id: "Worker", label: "Worker", tech: null, kind: "participant", line: 108 },
    ]);
  });

  test("every arrow, activation markers and empty labels", () => {
    const seq = parseSequence(`A->>B: a
A-->>B: b
A->B: c
A-->B: d
A-xB: e
A--xB: f
A-)B: g
A--)B: h
A->>+B: activate
B-->>-A: deactivate
A->>B
A->>A: self`);
    assert.deepEqual(seq.warnings, []);
    assert.deepEqual(
      messages(seq).map((m) => [m.from, m.to, m.label, m.style, m.arrow]),
      [
        ["A", "B", "a", "solid", "filled"], ["A", "B", "b", "dashed", "filled"],
        ["A", "B", "c", "solid", "open"], ["A", "B", "d", "dashed", "open"],
        ["A", "B", "e", "solid", "cross"], ["A", "B", "f", "dashed", "cross"],
        ["A", "B", "g", "solid", "open"], ["A", "B", "h", "dashed", "open"],
        ["A", "B", "activate", "solid", "filled"], ["B", "A", "deactivate", "dashed", "filled"],
        ["A", "B", "", "solid", "filled"], ["A", "A", "self", "solid", "filled"],
      ],
    );
    assert.deepEqual(seq.participants.map((p) => p.id), ["A", "B"]);
  });

  test("entity codes in labels survive the trailing-semicolon strip", () => {
    const seq = parseSequence('A->>B: a #quot;b#quot; c#59;\nA->>B: plain;');
    assert.deepEqual(messages(seq).map((m) => m.label), ['a "b" c;', "plain"]);
  });

  test("notes in all placements", () => {
    const seq = parseSequence(`participant A
participant B
Note over A: one
note over A,B: two
Note left of A: three
NOTE right of B: four: with colon`);
    assert.deepEqual(seq.warnings, []);
    assert.deepEqual(seq.items, [
      { type: "note", over: ["A"], placement: "over", text: "one", line: 3 },
      { type: "note", over: ["A", "B"], placement: "over", text: "two", line: 4 },
      { type: "note", over: ["A"], placement: "left", text: "three", line: 5 },
      { type: "note", over: ["B"], placement: "right", text: "four: with colon", line: 6 },
    ]);
  });

  test("nested frames with else / and / option, boxes, rect and ignored statements", () => {
    const seq = parseSequence(`sequenceDiagram
  autonumber
  title Checkout
  box Purple Backend
    participant A
    participant B
  end
  loop every minute
    alt ok
      A->>B: x
    else failed
      par first
        activate B
        B->>A: y
        deactivate B
      and second
        B->>A: z
      end
    end
  end
  critical connect
    A->>B: c
  option timeout
    A->>B: t
  end
  rect rgb(200, 220, 255)
    opt maybe
      break stop
      end
    end
  end`);
    assert.deepEqual(seq.warnings, []);
    assert.equal(seq.autonumber, true);
    const shape = seq.items.map((i) =>
      i.type === "frameStart" ? `start:${i.kind}:${i.label}`
      : i.type === "frameElse" ? `else:${i.label}`
      : i.type === "frameEnd" ? "end"
      : `${i.from}>${i.to}`);
    assert.deepEqual(shape, [
      "start:loop:every minute", "start:alt:ok", "A>B", "else:failed", "start:par:first", "B>A",
      "else:second", "B>A", "end", "end", "end",
      "start:critical:connect", "A>B", "else:timeout", "A>B", "end",
      "start:rect:", "start:opt:maybe", "start:break:stop", "end", "end", "end",
    ]);
  });

  test("Clarify shorthand with spaces in names, label lookup and no header", () => {
    const seq = parseSequence(`participant API as API Gateway
Web Client -> API Gateway: POST /checkout
API Gateway --> Web Client: 201 Created
Web Client->>Order Service: confirm`);
    assert.deepEqual(seq.warnings, []);
    assert.deepEqual(seq.participants.map((p) => p.id), ["API", "Web Client", "Order Service"]);
    assert.deepEqual(messages(seq).map((m) => [m.from, m.to, m.label, m.style, m.arrow]), [
      ["Web Client", "API", "POST /checkout", "solid", "open"],
      ["API", "Web Client", "201 Created", "dashed", "open"],
      ["Web Client", "Order Service", "confirm", "solid", "filled"],
    ]);
  });

  test("unbalanced end, stray else and unclosed frames warn but still balance", () => {
    const seq = parseSequence("end\nelse nope\nloop outer\nalt inner\nA->>B: x\nnonsense here", { lineOffset: 1 });
    assert.equal(seq.warnings.length, 5);
    assert.match(seq.warnings[0], /^line 2: unexpected "end"/);
    assert.match(seq.warnings[1], /^line 3: "else" outside of a block/);
    assert.match(seq.warnings[2], /^line 7: could not parse "nonsense here"/);
    assert.match(seq.warnings[3], /^line 5: "alt" block is not closed/);
    assert.match(seq.warnings[4], /^line 4: "loop" block is not closed/);
    const types = seq.items.map((i) => i.type);
    assert.deepEqual(types, ["frameStart", "frameStart", "message", "frameEnd", "frameEnd"]);
    assert.equal(seq.items.at(-1).line, null);
  });

  test("truncated input mid-message never throws", () => {
    const full = "sequenceDiagram\nparticipant A as Alice\nloop retry\nA->>+B: hello\nend";
    for (let cut = 0; cut <= full.length; cut++) {
      const seq = parseSequence(full.slice(0, cut));
      assert.equal(seq.kind, "sequence");
    }
    const partial = parseSequence("A->>B: ok\nA-");
    assert.equal(messages(partial).length, 1);
    assert.match(partial.warnings[0], /^line 2: could not parse "A-"/);
  });
});

describe("exporters", () => {
  test("graphToMermaid emits safe ids, shapes, tech, nested subgraphs and edge operators", () => {
    /** @type {import("../src/types").Graph} */
    const g = {
      kind: "graph",
      direction: "LR",
      nodes: [
        { id: "Web App", label: "Web App", shape: "round", tech: null, group: null, meta: {}, line: null },
        { id: "Order DB", label: 'Order "DB"', shape: "cylinder", tech: "postgres", group: "inner", meta: {}, line: null },
        { id: "check?", label: "Check?", shape: "diamond", tech: null, group: "outer", meta: {}, line: null },
        { id: "hub", label: "Hub", shape: "circle", tech: null, group: null, meta: {}, line: null },
      ],
      edges: [
        { id: "e0", from: "Web App", to: "check?", label: "go", style: "solid", arrowStart: false, arrowEnd: true, meta: {}, line: null },
        { id: "e1", from: "check?", to: "Order DB", label: "", style: "dashed", arrowStart: true, arrowEnd: true, meta: {}, line: null },
        { id: "e2", from: "hub", to: "Web App", label: "", style: "thick", arrowStart: false, arrowEnd: false, meta: {}, line: null },
      ],
      groups: [
        { id: "outer", label: "Outer", parent: null, line: null },
        { id: "inner", label: "Inner", parent: "outer", line: null },
      ],
      traces: [],
      warnings: [],
    };
    assert.equal(graphToMermaid(g), [
      "flowchart LR",
      '  subgraph sg0["Outer"]',
      '    n2{"Check?"}',
      '    subgraph sg1["Inner"]',
      '      n1[("Order #quot;DB#quot; (postgres)")]',
      "    end",
      "  end",
      '  n0("Web App")',
      '  n3(("Hub"))',
      '  n0 -->|"go"| n2',
      "  n2 <-.-> n1",
      "  n3 === n0",
    ].join("\n"));
  });

  test("flowchart round-trip preserves structure", () => {
    const src = `flowchart TD
  U((User)) --> api[API Gateway]
  subgraph core [Core Services]
    api -->|"route #1"| svc(Orders)
    subgraph data [Data]
      db[(Orders DB)]
      q{{Queue?}}
    end
    svc -.-> db
    svc ==>|publish| q
  end
  q <--> worker[Worker]
  worker --- db
  worker -. "retry" .- api`;
    const a = flow(src);
    assert.deepEqual(a.warnings, []);
    const b = flow(graphToMermaid(a));
    assert.deepEqual(b.warnings, []);
    assert.equal(b.direction, a.direction);
    assert.equal(b.nodes.length, a.nodes.length);
    assert.equal(b.edges.length, a.edges.length);
    assert.equal(b.groups.length, a.groups.length);
    assert.deepEqual(b.nodes.map((n) => n.label).sort(), a.nodes.map((n) => n.label).sort());
    // Map ids through labels (labels are unique here) to compare edges and membership.
    const labelOf = (g) => new Map(g.nodes.map((n) => [n.id, n.label]));
    const groupLabel = (g) => new Map(g.groups.map((x) => [x.id, x.label]));
    const edgesBy = (g) => {
      const l = labelOf(g);
      return g.edges.map((e) => `${l.get(e.from)}>${l.get(e.to)}|${e.label}|${e.style}|${e.arrowStart}|${e.arrowEnd}`);
    };
    const membership = (g) => {
      const gl = groupLabel(g);
      return Object.fromEntries(g.nodes.map((n) => [n.label, gl.get(n.group) ?? null]));
    };
    const nesting = (g) => {
      const gl = groupLabel(g);
      return g.groups.map((x) => `${x.label}<${gl.get(x.parent) ?? ""}`).sort();
    };
    assert.deepEqual(edgesBy(b), edgesBy(a));
    assert.deepEqual(membership(b), membership(a));
    assert.deepEqual(nesting(b), nesting(a));
    assert.deepEqual(b.nodes.map((n) => n.shape).sort(), a.nodes.map((n) => n.shape).sort());
  });

  test("tech round-trips as a readable suffix", () => {
    const b = flow(graphToMermaid(flow("a[Cache:redis] --> b")));
    assert.deepEqual([b.nodes[0].label, b.nodes[0].tech], ["Cache (redis)", null]);
  });

  test("sequenceToMermaid writes keywords per frame kind and escapes text", () => {
    const seq = parseSequence(`autonumber
actor U as Web User
participant API as API Gateway:cloudflare
par fan out
  U->>API: a; b #1
and other
  API--)U: c
end
critical lock
  U-xAPI
option fail
  Note over U,API: oops
end
alt yes
  Note left of U: l
else no
  Note right of Billing: r
end
rect rgb(0,0,0)
  U-->>API: done
end`);
    assert.deepEqual(seq.warnings, []);
    assert.equal(sequenceToMermaid(seq), [
      "sequenceDiagram",
      "  autonumber",
      "  actor p0 as Web User",
      "  participant p1 as API Gateway (cloudflare)",
      "  participant p2 as Billing",
      "  par fan out",
      "    p0->>p1: a#59; b #35;1",
      "  and other",
      "    p1--)p0: c",
      "  end",
      "  critical lock",
      "    p0-xp1: ",
      "  option fail",
      "    Note over p0,p1: oops",
      "  end",
      "  alt yes",
      "    Note left of p0: l",
      "  else no",
      "    Note right of p2: r",
      "  end",
      "  rect rgba(127, 127, 127, 0.12)",
      "    p0-->>p1: done",
      "  end",
    ].join("\n"));
  });

  test("sequence round-trip preserves items", () => {
    const src = `sequenceDiagram
autonumber
actor U as User
participant S as Server
U->>S: login
S-->>U: token
U-xS: drop
U--xS: drop2
loop poll
  alt ok
    S->>U: data
  else err
    Note right of S: retry
  end
end`;
    const a = parseSequence(src);
    const b = parseSequence(sequenceToMermaid(a));
    assert.deepEqual(b.warnings, []);
    assert.equal(b.autonumber, true);
    assert.deepEqual(b.participants.map((p) => [p.label, p.kind]), a.participants.map((p) => [p.label, p.kind]));
    const idToLabel = (seq) => new Map(seq.participants.map((p) => [p.id, p.label]));
    const norm = (seq) => {
      const l = idToLabel(seq);
      return seq.items.map((i) => {
        const { line, ...rest } = i;
        if (rest.type === "message") return { ...rest, from: l.get(rest.from), to: l.get(rest.to) };
        if (rest.type === "note") return { ...rest, over: rest.over.map((id) => l.get(id)) };
        return rest;
      });
    };
    assert.deepEqual(norm(b), norm(a));
  });

  test("exporters tolerate empty or partial input", () => {
    assert.equal(graphToMermaid({ kind: "graph", direction: "TD", nodes: [], edges: [], groups: [], traces: [], warnings: [] }), "flowchart TD");
    assert.equal(sequenceToMermaid({ kind: "sequence", participants: [], items: [], autonumber: false, warnings: [] }), "sequenceDiagram");
    const dangling = graphToMermaid(/** @type {any} */ ({ direction: "LR", nodes: [], edges: [{ from: "x y", to: "z", label: "", style: "solid", arrowStart: false, arrowEnd: true }] }));
    assert.match(dangling, /n0\["x y"\]/);
    assert.match(dangling, /n0 --> n1/);
  });
});
