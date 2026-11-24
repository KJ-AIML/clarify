/**
 * Every number the stage runs on, in one object. All values are the original's
 * (index.pretty.js:18027-18041 and 18237-18249) unless a comment says "kit".
 *
 * Change them for every stage with `configureStage({...})`, or for one stage with
 * `new Stage(host, { config: {...} })`. Both deep-merge.
 */

export const stageConfig = {
  /** Durations and gaps in milliseconds on the stage clock (scaled by `stage.timeScale`). */
  timings: {
    exit: 420,        // an entity leaving
    move: 820,        // an entity changing; also the camera move
    enter: 680,       // an entity arriving
    stagger: 130,     // gap between consecutive arrivals
    draw: 560,        // a new link drawing in
    linkFade: 300,    // a removed link fading out
    linkLead: 60,     // wait after both ends of a new link have landed
    linkStagger: 90,  // gap between consecutive new links
    labelSwap: 320,   // a link label fading back in after its text changed
    viewBlend: 360,   // double-click zoom and "fit" animation
  },
  /** How the phases overlap, as fractions of the durations above. */
  phases: {
    moveAfterExit: 0.55,    // moves start at exit × 0.55 when something is leaving
    enterAfterMove: 0.75,   // arrivals start at moveStart + move × 0.75 when something is changing
    enterAfterExit: 0.7,    // …or at exit × 0.7 when things only leave
    landedAt: 0.8,          // an arrival counts as "landed" (links may attach) at enter × 0.8
    linkAfterMove: 0.6,     // new links never start before moveStart + move × 0.6 when something is changing
    cameraAfterExit: 0.4,   // the camera starts at exit × 0.4 when something is leaving
  },
  /** Cross-fade windows inside a change tween, as fractions of its progress. */
  swap: {
    fadeOutEnd: 0.42,       // old tags/label reach 0 here
    fadeInStart: 0.55,      // new tags/label start here…
    fadeInSpan: 0.4,        // …and take this long
    cardResizeStart: 0.24,  // a card's box starts resizing here…
    cardResizeSpan: 0.48,   // …for this long
    cardFadeOutEnd: 0.24,   // old card content is gone here
    cardFadeInStart: 0.72,  // new card content starts here…
    cardFadeInSpan: 0.28,   // …for this long
  },
  /** State an arriving entity starts from (merged over its target state with opacity 0), by type. */
  enter: {
    default: { lift: 120 },
    block: { lift: 120 },
    db: { lift: 120 },
    crowd: { count: 0, lift: 26 },
    device: { lift: 40 },
    ghost: {},
    zone: {},
    ring: {},
    queue: { n: 0, opacity: 1 },
    panel: { lift: -14 },
    note: { lift: -14 },    // kit: the legacy card type behaves like `panel`
  },
  /** State a leaving entity tweens to (merged over its current state with opacity 0), by type. */
  exit: {
    default: { lift: -22 },
    block: { lift: -22 },
    db: { lift: -22 },
    device: { lift: -22 },
    crowd: { count: 0 },
    queue: { n: 0, opacity: 1 },
    ghost: {},
    zone: {},
    ring: {},
    panel: { lift: -10 },
    note: { lift: -10 },
  },
  /** Draw order. Entities sort by `x − y`; these override or nudge it. */
  depth: {
    floor: -1e4,                         // zones and rings: always under everything
    fixed: { queue: -1e3, panel: 1e4 },  // absolute depth by type
    bias: { ghost: -0.5 },               // added to x − y by type
  },
  /** Camera fitting. */
  camera: {
    maxZoom: 1.6,                        // never magnify a small scene past this
    minZoom: 0.3,
    pad: 16,                             // px kept free on every side of the fitted bounds
    zoomStep: 0.05,                      // zoom is floored to a multiple of this
    emptyBounds: [-100, -60, 100, 60],   // what an empty scene frames
    keepMargin: 12,                      // px the bounds must stay inside the previous camera to reuse it
    keepDriftSame: 0.12,                 // max centre drift (fraction of the view) when the zoom is unchanged
    keepDriftNear: 0.18,                 // …and when the previous zoom is slightly lower
    keepZoomRatio: 0.9,                  // "slightly lower" = at least this fraction of the new zoom
    gridRadius: 0.56,                    // vignette radius as a fraction of the view width
    gridSquash: 0.6,                     // vignette is an ellipse this flat
  },
  /** User zoom on top of the planned camera. */
  view: {
    maxPxPerUnit: 3.2,                   // deepest zoom, in screen px per SVG unit
    minCap: 1.5,                         // the zoom limit is never below this factor…
    maxCap: 6,                           // …or above this one
    doubleClick: 2,                      // factor applied by a double-click or double-tap
    wheelRate: 0.01,                     // zoom factor = exp(−deltaY × wheelRate)
    lineHeight: 16,                      // px per wheel "line" (deltaMode 1)
  },
  /** Docked cards (the HUD panel). */
  cards: {
    key: '__card',                       // every scene's card shares this id, so it morphs instead of re-entering
    maxScale: 1.16,
    minScale: 0.86,
    scaleWidth: 780,                     // scale = clamp(hostWidth / 780, minScale, maxScale)
    minHostWidth: 520,                   // narrower hosts hide docked cards and fire onCards(false)
    margin: { x: 10, top: 16, bottom: 10 },   // px from the host edge
    clearance: 12,                       // px a card keeps from the diagram
    shadow: 4,                           // px added to a card's height for its hard shadow
    corners: ['tr', 'br', 'tl', 'bl'],   // search order
    alignPenalty: 0.004,                 // score lost per alignment tried (centred first)
    cornerPenalty: 0.001,                // score lost per position in `corners`
    stickBonus: 0.045,                   // score gained by the corner the previous step used
    fallbackZoom: 0.7,                   // no corner works: fit × this, diagram bottom-left, card top-right
    swapKeys: ['title', 'icon', 'chart', 'lines', 'bars', 'w'],   // a change in any of these cross-fades the content
  },
  /** Link geometry. */
  links: {
    radius: 9,                           // corner rounding in px
    gapStart: 3,                         // px between the source outline and the line start
    gapEnd: 4,                           // px before the target outline (room for the arrowhead)
    gapEndPlain: 3,                      // …when the link has no arrowhead
    headAt: 0.97,                        // arrowheads appear when the draw-in passes this
    fadeGain: 1.4,                       // non-solid links fade in as clamp(draw × 1.4)
    labelFrom: 0.6,                      // a label fades in over draw 0.6 → 1
    labelChase: 0.16,                    // during a transition a label closes 16 % of the gap per 60 Hz frame
    sampleStep: 12,                      // px between the points sampled along a link for planning
    samplePad: 3,                        // each sample counts as a box this many px around it
  },
  /** Link label solver. */
  labels: {
    size: 9.5,                           // font size
    height: 21,                          // one-line pill height
    padX: 18,                            // pill width = text width + this
    lineHeight: 12,                      // extra height per extra line (round(size × 1.3))
    gap: 7,                              // px between the path and the pill
    straightExtra: 3,                    // extra gap on horizontal and vertical segments
    farStepY: 9,                         // second-row candidates sit (height + this) px further out
    farStepX: 26,                        // …or this many px further sideways
    offsets: [0, -0.1, 0.1, -0.2, 0.2, -0.3, 0.3, -0.4, 0.4],   // tried positions along the path, relative to labelAt
    range: [0.12, 0.88],                 // shifted positions must stay inside this part of the path
    axisSnap: 0.12,                      // |direction component| below this counts as axis-aligned
    wrapOver: 70,                        // labels wider than this also try a two-line form
    wrapPenalty: 14,
    belowTypes: ['crowd', 'device'],     // types whose label sits under the shape
    rightTypes: ['db'],                  // types whose label sits to the right
    cost: {
      slide: 90,                         // × |offset along the path|
      second: 2,                         // the second side of a pair
      far: 22,                           // a second-row candidate
      polygon: 170,                      // overlapping an entity outline
      box: 90, boxArea: 1 / 6,           // overlapping a pill area: box + area × boxArea
      label: 90, labelArea: 1 / 3, labelPad: 4,   // overlapping an already placed label
      line: 18, linePad: 5,              // per link sample point under the label
    },
  },
  /** Packets. */
  packets: {
    speed: 155,                          // px per second along the link
    kindSpeed: { heavy: 0.7, ping: 0.85, slow: 0.32 },
    headPad: 16,                         // px of the link reserved for an arrowhead
    minRun: 10,                          // a shorter usable run ignores headPad
    dwell: 0.16,                         // seconds hidden while hopping between links
    firstSpawn: 0.6,                     // spawn accumulator at settle: first packet after (1 − 0.6) / rate seconds
    leaveMs: 260,                        // fade-out when the scene changes
    burstMs: 700,                        // lifetime of an arrival or failure effect
  },
  /** The floor flash under something new or changed. */
  spot: {
    margin: 0.6,                         // world units around the footprint
    radius: 7,                           // corner rounding in px
    ms: 1600,                            // element lifetime (the CSS animation is 1.5 s)
    skipTypes: ['panel', 'note', 'queue', 'zone', 'ring'],
  },
  /** Gesture thresholds. */
  gestures: {
    moveSlop: 8,                         // px a finger may wander and still count as a tap
    swipeMs: 700,                        // a swipe must finish within this…
    swipeMin: 50,                        // …travel at least this far sideways…
    swipeSlope: 0.6,                     // …and stay flatter than |dy| < |dx| × this
    tapMs: 300,                          // longest press that is a tap
    doubleTapMs: 320,                    // longest gap between the taps of a double-tap
    doubleTapDist: 40,                   // px the two taps may be apart
  },
  /** Longest real frame gap in ms; longer gaps are cut so nothing jumps after a background tab. */
  maxFrameMs: 50,
};

const isPlain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Deep-merge `source` into a copy of `base`. Arrays and scalars replace, plain objects merge.
 * @template T
 * @param {T} base
 * @param {object} [source]
 * @returns {T}
 */
export function mergeConfig(base, source) {
  const out = {};
  for (const key in base) out[key] = isPlain(base[key]) ? mergeConfig(base[key], undefined) : Array.isArray(base[key]) ? [...base[key]] : base[key];
  for (const key in source || {}) {
    const v = source[key];
    out[key] = isPlain(v) && isPlain(out[key]) ? mergeConfig(out[key], v) : v;
  }
  return out;
}

/**
 * Change the defaults used by every stage created afterwards.
 * @param {object} overrides  partial `stageConfig`
 * @returns {typeof stageConfig}
 */
export function configureStage(overrides) {
  const merged = mergeConfig(stageConfig, overrides);
  for (const key in merged) stageConfig[key] = merged[key];
  return stageConfig;
}
