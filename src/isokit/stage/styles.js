/**
 * The stylesheet the stage injects once per document.
 *
 * Classes are the original's with an `iso-` prefix (`.link--beat` → `.iso-link--beat`,
 * `.pkt--held` → `.iso-pkt--held`); values are the original's (index.pretty.css:1297-1510 for
 * links, packets, effects, spotlight; 1048-1080 and 3156 for the host and the svg).
 *
 * Theme hooks (custom properties on `.iso-stage-svg`):
 *   --iso-ink          line and packet outline colour; the stage sets it inline from the core's ink
 *   --iso-link-off     the muted link
 *   --iso-ok, --iso-bad, --iso-bad-line, --iso-fx-cross, --iso-spot, --iso-spot-fill
 *   --iso-speed        clock rate; the stage sets it so CSS animations slow down with `timeScale`
 */

const STYLE_ID = 'iso-stage-css';

export const STAGE_CSS = `
/* host element: gestures need these */
.iso-stage-host{touch-action:pan-y;-webkit-user-select:none;user-select:none}
.iso-stage-host.is-zoomed{touch-action:none;cursor:grab}
.iso-stage-host.is-dragging{cursor:grabbing}

.iso-stage-svg{
  width:100%;height:100%;display:block;overflow:visible;direction:ltr;
  --iso-ink:#1d1b18;--iso-link-off:#b0a698;--iso-ok:#3fa456;--iso-bad:#e5534b;--iso-bad-line:#8f2a22;
  --iso-cut:#c0392b;--iso-fx-cross:#fff;--iso-spot:#5fae57;--iso-spot-fill:#7fc2781f;--iso-speed:1;
}
:root:is([data-theme="dark"],[data-theme="tokyo-night"],[data-theme="nord"],[data-theme="catppuccin"],[data-theme="blueprint"]) .iso-stage-svg{--iso-ink:#efe6d6;--iso-link-off:#675d4f;--iso-bad-line:#ebb2ad;--iso-fx-cross:#37312a}
@media (prefers-color-scheme:dark){:root[data-theme="auto"] .iso-stage-svg{--iso-ink:#efe6d6;--iso-link-off:#675d4f;--iso-bad-line:#ebb2ad;--iso-fx-cross:#37312a}}
.iso-stage-svg text{white-space:pre}

/* links */
.iso-link{fill:none;stroke:var(--iso-ink);stroke-width:1.9px;stroke-linecap:round;stroke-linejoin:round;transition:stroke .5s}
.iso-link--dashed{stroke-dasharray:5 4.5}
.iso-link--off{stroke:var(--iso-link-off);stroke-width:1.6px;stroke-dasharray:4 5}
.iso-link--beat{stroke:var(--iso-ok);stroke-width:2px;stroke-dasharray:1.5 5.5}
.iso-link--cut{stroke:var(--iso-cut);stroke-width:2px;stroke-dasharray:7 6}
.iso-link-label{pointer-events:none}

/* packets */
.iso-pkt{transition:opacity .25s}
.iso-pkt circle,.iso-pkt rect{fill:#f3b47f;stroke:var(--iso-ink);stroke-width:1.5px}
.iso-pkt--heavy rect{fill:#e8834d;stroke-width:1.7px}
.iso-pkt--ping circle{fill:#f4fbef;stroke:#2f8a43;stroke-width:2.1px}
.iso-pkt--ping.iso-pkt--back circle{fill:#9fd28f}
.iso-pkt--slow circle{fill:#efb041}
.iso-pkt--mine circle{fill:#b79ce6;stroke-width:1.7px}
.iso-pkt--write rect{fill:#5d5466;stroke:var(--iso-ink)}
.iso-pkt--kill circle{fill:#fde3df;stroke:#c0392b;stroke-width:2.1px}
.iso-pkt--mine.iso-pkt--back circle{fill:#9fd28f}
.iso-pkt--msg rect{fill:#efb041;stroke:var(--iso-ink);stroke-width:1.5px}
.iso-pkt--poison rect{fill:#e5534b;stroke:#5e1b16;stroke-width:1.6px}
.iso-pkt--push circle{fill:#9fd28f}
.iso-pkt--empty circle{fill:#fbf6ef}
.iso-pkt--empty.iso-pkt--back circle{fill:#d9d0c4}
.iso-pkt--held circle{animation:iso-held calc(.8s / var(--iso-speed)) ease-in-out infinite}
@keyframes iso-held{0%,to{stroke-width:1.5px}50%{stroke-width:3.4px}}
.iso-pkt--req.iso-pkt--back circle,.iso-pkt--slow.iso-pkt--back circle{fill:#9fd28f}
.iso-pkt--leave{opacity:0}

/* arrival and failure effects, floor flash */
.iso-fx-ring,.iso-fx-x,.iso-spot,.iso-moved{transform-box:fill-box;transform-origin:50%}
.iso-fx--fail .iso-fx-ring{fill:var(--iso-bad);stroke:var(--iso-bad-line);stroke-width:1.4px;animation:iso-fx-burst calc(.65s / var(--iso-speed)) ease-out forwards}
.iso-fx--fail .iso-fx-x{fill:none;stroke:var(--iso-fx-cross);stroke-width:1.9px;stroke-linecap:round;animation:iso-fx-fade calc(.65s / var(--iso-speed)) ease-out forwards}
.iso-fx--ok .iso-fx-ring{fill:none;stroke:var(--iso-ok);stroke-width:1.6px;animation:iso-fx-pop calc(.45s / var(--iso-speed)) ease-out forwards}
@keyframes iso-fx-burst{0%{opacity:1;transform:scale(.7)}45%{opacity:1;transform:scale(1.25)}to{opacity:0;transform:scale(2.3)}}
@keyframes iso-fx-fade{0%,45%{opacity:1}to{opacity:0}}
@keyframes iso-fx-pop{0%{opacity:.9;transform:scale(.8)}to{opacity:0;transform:scale(2)}}
.iso-spot{fill:var(--iso-spot-fill);stroke:var(--iso-spot);stroke-width:2.4px;pointer-events:none;animation:iso-spot calc(1.5s / var(--iso-speed)) ease-out forwards}
@keyframes iso-spot{0%{opacity:0;transform:scale(.75)}20%{opacity:1}to{opacity:0;transform:scale(1.4)}}

/* loops that primitives switch on with a class: an overloaded block's glow, a moved ring key */
.iso-pulse{animation:iso-pulse 1.3s ease-in-out infinite}
@keyframes iso-pulse{0%,to{opacity:.4}50%{opacity:1}}
.iso-moved{animation:iso-moved 1.4s ease-out infinite}
@keyframes iso-moved{0%{opacity:.9;transform:scale(.6)}to{opacity:0;transform:scale(1.5)}}

/* drawing-core rules repeated here, so the stage is also styled on a core that does not inject them */
:root:is([data-theme="dark"],[data-theme="tokyo-night"],[data-theme="nord"],[data-theme="catppuccin"],[data-theme="blueprint"]) .iso-bevel{stroke-opacity:.22}
:root:is([data-theme="dark"],[data-theme="tokyo-night"],[data-theme="nord"],[data-theme="catppuccin"],[data-theme="blueprint"]) .iso-sheen{opacity:.1}
@media (prefers-color-scheme:dark){:root[data-theme="auto"] .iso-bevel{stroke-opacity:.22}:root[data-theme="auto"] .iso-sheen{opacity:.1}}

/* authoring overlay */
.iso-xray{pointer-events:none}
.iso-xray text{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}

/* kit addition: the stage adds this class when it honours prefers-reduced-motion */
.iso-reduce-motion .iso-pulse,.iso-reduce-motion .iso-moved,.iso-reduce-motion .iso-pkt--held circle{animation:none}
`;

/**
 * Inject the stylesheet into a document once. Later calls are no-ops.
 * @param {Document} [doc]
 * @returns {HTMLStyleElement}
 */
export function ensureStageStyles(doc = document) {
  let el = doc.getElementById(STYLE_ID);
  if (!el) {
    el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = STAGE_CSS;
    doc.head.appendChild(el);
  }
  return el;
}
