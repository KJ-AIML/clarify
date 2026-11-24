/**
 * Everything a theme may change, in one object. Read it anywhere as `config.…`; change it with
 * `configure({...})`, which deep-merges and then tells the caches (text widths, dark colours,
 * shared `<defs>`) to refresh.
 *
 * Colour case matters. A hex written in lowercase is remapped for dark mode by `themed()`.
 * A hex with an UPPERCASE letter is left exactly as written. Use uppercase for colours that
 * must stay vivid on a dark floor (people, screens, chart bars).
 */
import { deepMerge } from './util.js';

export const config = {
  /** Pixels per world unit along the screen x axis. One world step moves `unit` px right and `unit / 2` px up or down. */
  unit: 14,
  /** Outlines and text. */
  ink: '#211e1b',
  /** The solid offset copy under pills and cards (the "hard shadow"). */
  hard: '#1c1a17',
  /** Font stack for the SVG and for text measuring. */
  font: '"JetBrains Mono", ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Consolas, monospace',
  /** True when `font` is monospace: plain text is then measured as `characters × size × charWidth`, with no canvas. */
  monospace: true,
  /** Advance width of one character as a fraction of the font size (JetBrains Mono is exactly 0.6). */
  charWidth: 0.6,
  /** Prefix of every id in the shared `<defs>` (`iso-g-blue-top`, `iso-blur-lg`, `iso-arrow`, …). */
  idPrefix: 'iso-',
  /** Right-to-left page: text gets a `direction` attribute and panels mirror their layout. */
  rtl: false,
  /** Locale for upper-casing panel titles (`undefined` = the runtime default). */
  locale: undefined,

  /**
   * Box colours. Each is two gradients: the lid (`top`, lit from the top left) and the walls
   * (`side`, lighter at the top). Blocks, the crowd slab, cylinders and ring arcs read from here.
   */
  palette: {
    orange: { top: ['#fee6cc', '#fcd4ad'], side: ['#f9c697', '#f3b47f'] },
    green: { top: ['#e2f2d7', '#d1e9c2'], side: ['#c3e1b2', '#b3d79f'] },
    blue: { top: ['#dfebf9', '#cde0f5'], side: ['#bcd3ef', '#a9c5e8'] },
    yellow: { top: ['#fff3d6', '#fee7b8'], side: ['#fcdb9c', '#f6cd82'] },
    purple: { top: ['#f2eaf9', '#e6dbf4'], side: ['#d9cbef', '#cbbae6'] },
    slab: { top: ['#f7f0e7', '#f0e7dc'], side: ['#ece2d5', '#e3d7c8'] },
    store: { top: ['#f6f1fa', '#ece4f4'], side: ['#e2d8ee', '#d6c9e6'] },
    // Kit addition, not in the original site.
    rose: { top: ['#fde6ec', '#f9d0da'], side: ['#f3bbc8', '#eaa3b4'] },
  },
  /** Other names for palette entries (the names used by the earlier single-file engine). */
  aliases: { sky: 'blue', coral: 'orange', mint: 'green', lemon: 'yellow', lilac: 'purple' },

  /** Pill colours: background and text. */
  tones: {
    paper: { bg: '#fbf6ef', fg: '#211e1b' },
    red: { bg: '#f8d5cf', fg: '#8f2a22' },
    green: { bg: '#dcefd2', fg: '#24521c' },
    amber: { bg: '#fbe5bd', fg: '#6d4a0c' },
    violet: { bg: '#e7ddf5', fg: '#47306f' },
    gray: { bg: '#ebe5dc', fg: '#5f5850' },
    // Kit addition, not in the original site.
    blue: { bg: '#dbe7f8', fg: '#1f4f86' },
  },

  /** Shirt colours of the people in a crowd. Uppercase, so they are not darkened. */
  people: ['#F3B47F', '#A9C5E8', '#B3D79F', '#CBBAE6', '#F6CD82'],

  /** Single-purpose colours shared by several primitives. */
  colors: {
    glyph: '#1d1b19', // default icon stroke
    highlight: '#fff', // sheen, bevel light, cylinder rim
    shadow: '#6b5236', // every soft shadow
    faceShade: '#3a2a14', // darkens the right wall
    bevelShade: '#5a4123', // the faint dark line under the bevel light
    heat: '#f0552f', // overload glow and tint
    dead: '#b9b2a8', // grey wash over a dead block
    deadCross: '#c0392b',
    dim: '#f4ebe0', // paper wash over a dimmed block
    slabStroke: '#3b3631', // outline of the crowd slab and device base
    muted: '#6f6961', // zone labels, card titles, the CPU icon
    track: '#e6ddd0', // CPU meter track, card divider
    paper: '#fbf6ef', // CPU pill, unowned ring keys
    card: '#fbf7f1', // panel and note background
    cardText: '#34302b',
    cardMuted: '#8b847a',
    zoneFill: '#fffaf2',
    grid: '#a8916f', // floor grid lines
    arrowMuted: '#a59c90', // muted arrowhead, chart axes, ring direction marks
    head: '#fdf6ec', // a person's head
    ringGuide: '#e8ddcf',
    moved: '#e5534b', // pulsing circle around a ring key that changed owner
    barTrack: '#f1e8db',
  },

  /** Load colouring for the CPU meter, the cylinder fill level and the latency marker. */
  load: {
    warnAt: 0.6,
    hotAt: 0.85,
    ok: '#7fc278',
    warn: '#efb041',
    hot: '#e5534b',
    /** Cylinder liquid: [fill, surface line] per level. */
    liquid: { ok: ['#cfe8c0', '#5fa95a'], warn: ['#f9dca3', '#d99a2b'], hot: ['#f5bdb2', '#d9473d'] },
  },

  /** Fill colours of panel bar charts by `tone`. Uppercase, so they are not darkened. */
  barTones: { green: '#9FD28F', amber: '#EFB041', red: '#E5534B', gray: '#B5AB9E', violet: '#CBBAE6', blue: '#A9C5E8' },

  /** Pills. Sizes in px. */
  pill: {
    height: 21, // one-line pill
    padX: 9, // text inset on each side
    iconSlot: 15, // extra width when the pill has an icon
    size: 10.5, // font size
    stroke: 1.3,
    drop: 2, // offset of the hard shadow
    step: 26, // distance between stacked pills
  },

  /** Laptop and phone colours. Uppercase values are kept in dark mode. */
  device: {
    deck: { top: '#efeae4', right: '#cfc8c0', left: '#ddd6ce' },
    bezel: { top: '#8B8580', right: '#3D3935', left: '#6E6862' },
    key: '#fbf8f4',
    keyStroke: '#b9b1a7',
    page: '#FBF8F4',
    chrome: '#E4D9CB',
    textLine: '#D6CCBF',
    bubble: '#ECE6DC',
    bubbleMine: '#CBBAE6',
    screenFrom: '#E3D6F3',
    screenTo: '#C9B5E6',
  },

  /**
   * Dark mode. Colours are converted by rule (see `color.js`); these tables are the exceptions.
   * `map` applies everywhere, `svgMap` only to SVG markup.
   */
  dark: {
    map: {
      '#1d1b18': '#efe6d6',
      '#211e1b': '#ece2d0',
      '#34302b': '#ddd3c2',
      '#1c1a17': '#050403',
      '#6b5236': '#000000',
      '#5a4123': '#000000',
      '#3a2a14': '#000000',
    },
    svgMap: { '#ffffff': '#ffffff', '#e6ddd0': '#4d463c' },
  },
};

const listeners = new Set();

/**
 * Run `fn(config)` after every `configure()` call. Caches use this to reset themselves.
 * @param {(cfg: typeof config) => void} fn
 * @returns {() => void} call it to stop listening
 */
export function onConfigure(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Deep-merge overrides into the live config. Nested objects merge key by key, so
 * `configure({ palette: { teal: {...} } })` adds a colour without removing the others.
 * Arrays (for example `people`) are replaced whole.
 * @param {Partial<typeof config>} [overrides]
 * @returns {typeof config} the live config
 */
export function configure(overrides = {}) {
  deepMerge(config, overrides);
  for (const fn of listeners) fn(config);
  return config;
}

/**
 * Resolve a colour name to a palette key. Follows `config.aliases`; an unknown name falls
 * back to `fallback`.
 * @param {string} name
 * @param {string} [fallback='slab']
 * @returns {string} a key of `config.palette`
 */
export function paletteName(name, fallback = 'slab') {
  if (config.palette[name]) return name;
  const alias = config.aliases[name];
  return alias && config.palette[alias] ? alias : fallback;
}

/**
 * The gradient stops of a palette colour.
 * @param {string} name palette key or alias
 * @param {string} [fallback='slab']
 * @returns {{ top: [string, string], side: [string, string] }}
 */
export const paletteOf = (name, fallback = 'slab') => config.palette[paletteName(name, fallback)];

/**
 * The colour for a load value: green below `warnAt`, amber below `hotAt`, red from there on.
 * @param {number} load 0…1
 * @returns {string} hex colour
 */
export const loadColor = (load) =>
  load < config.load.warnAt ? config.load.ok : load < config.load.hotAt ? config.load.warn : config.load.hot;

/**
 * The same three-way split as `loadColor`, returning the level name.
 * @param {number} load 0…1
 * @returns {'ok'|'warn'|'hot'}
 */
export const loadLevel = (load) => (load < config.load.warnAt ? 'ok' : load < config.load.hotAt ? 'warn' : 'hot');
