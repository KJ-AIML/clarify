// clarify/src/lesson/kinds.js
// The lesson vocabulary shared by the parser, the stage and the renderer. Data only.

/** Object kinds a place can be drawn as; anything else is drawn as a `box` with a warning. */
export const OBJECT_KINDS = [
  "laptop", "phone", "monitor", "server", "database", "cabinet", "tray", "queue",
  "cache", "gate", "router", "mailbox", "folder", "cloud", "box"
];

/** Tint names a place may use. */
export const TINTS = ["neutral", "amber", "violet", "blue", "green", "rose", "teal"];

/** Puck kinds, each with a fixed colour. */
export const PUCK_KINDS = ["change", "reply", "fail", "store", "slow"];

/** Step chapters and the label shown for each. */
export const CHAPTERS = {
  problem: "Problem",
  how: "How it works",
  why: "Why it helps",
  case: "What goes wrong",
  recap: "Recap"
};

/** Authoring limits; going past one raises a warning. */
export const LIMITS = { places: 7, steps: 12, words: 45, title: 32 };
