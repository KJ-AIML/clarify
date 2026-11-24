/**
 * The packet runner: small shapes that travel along link paths to show traffic.
 *
 * A flow says how often to spawn (`rate` per second) and where packets go (a `route` of link ids,
 * or several `routes` picked round-robin, by weight, or all at once). A packet rides the real SVG
 * path with `getPointAtLength`, hops link to link, may bounce back as a response, may wait at the
 * far end (`hold`), and may be dropped by a link with a `fail` probability.
 *
 * Original: `pickRoute`, `spawn`, `launch`, `stepPackets`, `clearPackets`
 * (index.pretty.js:18956-19082). The runner only needs a layer to draw in and a way to look up
 * links, so it works on any SVG paths, not just this stage's.
 */
import { stageConfig } from './config.js';
import { removeLater, svgEl } from './svg.js';

const circle = (r) => `<circle r="${r}"/>`;
const square = (size, rx) => `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${rx}"/>`;

/** Shape markup per packet kind, centred on (0, 0). Kinds not listed are a circle of radius 4.3. */
export const PACKET_SHAPES = {
  ping: circle(3.6),
  kill: circle(3.6),
  heavy: square(12, 3.5),
  write: square(8.4, 2),
  msg: square(9.6, 2.4),
  poison: square(9.6, 2.4),
};
/** Every kind the stylesheet colours. `req` is the default. */
export const PACKET_KINDS = ['req', 'heavy', 'ping', 'slow', 'mine', 'write', 'kill', 'msg', 'poison', 'push', 'empty'];

/** Markup for a packet kind. */
export const packetMarkup = (kind) => PACKET_SHAPES[kind] || circle(4.3);

/**
 * Add a packet kind (give it a shape; colour it with a `.iso-pkt--<name>` CSS rule).
 * @param {string} name
 * @param {string} shape   SVG markup centred on (0, 0)
 * @param {number} [speed] speed factor for this kind (1 = normal)
 */
export function registerPacketKind(name, shape, speed) {
  PACKET_SHAPES[name] = shape;
  if (!PACKET_KINDS.includes(name)) PACKET_KINDS.push(name);
  if (speed) stageConfig.packets.kindSpeed[name] = speed;
}

/** Effective arrowheads of a link: `beat` and `cut` links never have any. */
const linkHeads = (spec) => (spec.style === 'beat' || spec.style === 'cut' ? 'none' : spec.heads || 'end');
const pathOf = (route) => (Array.isArray(route) ? route : route.path);
function weighted(weights, random) {                       // index drawn in proportion to the weights
  let r = random() * weights.reduce((a, b) => a + b, 0);
  const i = weights.findIndex((w) => (r -= w) <= 0);
  return i < 0 ? weights.length - 1 : i;
}

/**
 * Choose the next packet of a flow. Mutates the flow's counters (`n`, `rr`).
 *
 *   kind     `pattern[n % length]` if the flow has a pattern, else `kind`, else 'req'
 *   routes   `[{ path, kind?, weight? }]` (or plain arrays of link ids): round-robin, or by weight when
 *            `pick: 'weights'` (or a `weights` array as long as `routes` is given)
 *   route    a list of link ids; an entry that is itself a list is a choice point, resolved
 *            round-robin or with `weights` when `pick: 'weights'`
 * @param {object} flow
 * @param {() => number} [random]
 * @returns {{ route: string[], kind: string }}
 */
export function pickRoute(flow, random = Math.random) {
  const kind = flow.pattern ? flow.pattern[flow.n % flow.pattern.length] : flow.kind || 'req';
  if (flow.routes) {
    const routes = flow.routes;
    const flowWeights = Array.isArray(flow.weights) && flow.weights.length === routes.length ? flow.weights : null;
    let i;
    if (flow.pick === 'weights' || (flowWeights && flow.pick !== 'rr')) i = weighted(flowWeights || routes.map((r) => r.weight ?? 1), random);
    else { i = flow.rr % routes.length; flow.rr += 1; }
    flow.n += 1;
    return { route: pathOf(routes[i]), kind: routes[i].kind || kind };
  }
  const route = (flow.route || []).map((hop) => {
    if (typeof hop === 'string') return hop;
    if (flow.pick === 'weights') return hop[weighted(flow.weights || hop.map(() => 1), random)];
    const choice = hop[flow.rr % hop.length];
    flow.rr += 1;
    return choice;
  });
  flow.n += 1;
  return { route, kind };
}

/**
 * @typedef {object} LinkLike
 * @property {SVGPathElement} el   the path to ride
 * @property {number} [len]        cached path length
 * @property {{ style?: string, heads?: string, fail?: number }} spec
 */

export class PacketRunner {
  /**
   * @param {object} o
   * @param {Element} o.layer                          where packet and effect nodes are appended
   * @param {(id: string) => LinkLike | undefined} o.link   look a link up by id
   * @param {(x: number, y: number, kind: 'ok' | 'fail') => void} [o.burst]  arrival / failure effect
   * @param {typeof stageConfig.packets} [o.config]
   * @param {() => number} [o.random]                  inject a seeded generator for repeatable runs
   */
  constructor({ layer, link, burst = () => {}, config = stageConfig.packets, random = Math.random }) {
    this.layer = layer;
    this.link = link;
    this.burst = burst;
    this.cfg = config;
    this.random = random;
    /** @type {object[]} */ this.flows = [];
    /** @type {object[]} */ this.packets = [];
  }
  /**
   * Replace the flows. Each gets fresh counters; the spawn accumulator starts at 0.6 so the first
   * packet leaves after 0.4 / rate seconds instead of a full period.
   * @param {object[]} flows
   */
  setFlows(flows) {
    this.flows = (flows || []).map((f) => ({ rate: 1, ...f, acc: this.cfg.firstSpawn, n: 0, rr: 0 }));
  }
  /** Remove every packet: at once, or with a short fade (`pkt--leave`, 260 ms). */
  clear(immediate = false) {
    for (const p of this.packets) {
      if (immediate) p.el.remove();
      else { p.el.classList.add('iso-pkt--leave'); removeLater(p.el, this.cfg.leaveMs); }
    }
    this.packets = [];
  }
  /** Spawn the next packet(s) of a flow. `fanout` sends one down every route at once. */
  spawn(flow) {
    if (flow.fanout && flow.routes) {
      flow.n += 1;
      for (const r of flow.routes) this.launch(pathOf(r), r.kind || flow.kind || 'req', flow);
      return;
    }
    const { route, kind } = pickRoute(flow, this.random);
    this.launch(route, kind, flow);
  }
  /** Put one packet at the start of a route. Does nothing unless every link of the route exists. */
  launch(route, kind, flow = {}) {
    if (!Array.isArray(route) || !route.length || !route.every((id) => this.link(id))) return null;
    const el = svgEl('g', { class: `iso-pkt iso-pkt--${kind}` });
    el.innerHTML = packetMarkup(kind);
    this.layer.appendChild(el);
    const p = { route, seg: 0, d: 0, kind, el, back: false, bounce: !!flow.bounce, dwell: 0, speed: flow.speed || 1, hold: flow.hold || 0 };
    this.packets.push(p);
    return p;
  }
  /**
   * Advance by `dt` seconds: spawn what is due, then move every packet.
   * @param {number} dt seconds (the stage passes at most 0.05 × timeScale)
   */
  step(dt) {
    const C = this.cfg;
    for (const flow of this.flows) {
      flow.acc += dt * flow.rate;
      while (flow.acc >= 1) { flow.acc -= 1; this.spawn(flow); }
    }
    const alive = [];
    for (const p of this.packets) {
      if (p.dwell > 0) {                                   // hidden between two links, or pulsing while held
        p.dwell -= dt;
        if (p.dwell > 0) { alive.push(p); continue; }
        p.el.style.opacity = 1;
        if (p.back) { p.el.classList.remove('iso-pkt--held'); p.el.classList.add('iso-pkt--back'); }
      }
      const link = this.link(p.route[p.seg]);
      if (!link) { p.el.remove(); continue; }
      p.d += C.speed * p.speed * (C.kindSpeed[p.kind] || 1) * dt;
      const len = link.len || link.el.getTotalLength(), heads = linkHeads(link.spec);
      let start = heads === 'both' ? C.headPad : 0, stop = len - (heads === 'none' ? 0 : C.headPad);   // stay off the arrowheads
      if (stop - start < C.minRun) { start = 0; stop = len; }
      if (p.d >= stop - start) {
        const at = link.el.getPointAtLength(p.back ? start : stop);
        if (!p.back && this.random() < (link.spec.fail || 0)) { this.burst(at.x, at.y, 'fail'); p.el.remove(); continue; }
        if (!p.back && p.seg < p.route.length - 1) { p.seg += 1; this.hop(p); alive.push(p); continue; }
        if (p.bounce && !p.back) {                         // far end reached: it is a response now
          p.back = true;
          p.d = 0;
          if (p.hold) { p.dwell = p.hold; p.el.classList.add('iso-pkt--held'); } else p.el.classList.add('iso-pkt--back');
          alive.push(p);
          continue;
        }
        if (p.back && p.seg > 0) { p.seg -= 1; this.hop(p); alive.push(p); continue; }
        this.burst(at.x, at.y, 'ok');
        p.el.remove();
        continue;
      }
      const pt = link.el.getPointAtLength(p.back ? stop - p.d : start + p.d);
      p.el.setAttribute('transform', `translate(${Math.round(pt.x * 100) / 100} ${Math.round(pt.y * 100) / 100})`);
      alive.push(p);
    }
    this.packets = alive;
  }
  /** Pass through an entity: restart on the next link, invisible for a moment. */
  hop(p) {
    p.d = 0;
    p.dwell = this.cfg.dwell;
    p.el.style.opacity = 0;
  }
}
