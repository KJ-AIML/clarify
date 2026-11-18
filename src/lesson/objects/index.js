// clarify/src/lesson/objects/index.js
// The drawing of every object kind. Each is `{ top, draw(pen) }`: `top` is the object's height
// above the floor (for fitting the stage and placing the failure badge), `draw` returns its SVG
// centred on the world origin, standing on the pad top (z 3). Kinds without a drawing of their
// own yet stand as a box.

import { OBJECT_KINDS } from "../kinds.js";
import laptop from "./laptop.js";
import tray from "./tray.js";
import cabinet from "./cabinet.js";
import server from "./server.js";
import box from "./box.js";

/** @typedef {{ top: number, draw: (pen: import("../pen.js").Pen) => string }} LessonObject */

const DRAWN = { laptop, tray, cabinet, server, box };

/** @type {Record<string, LessonObject>} */
export const OBJECTS = Object.fromEntries(OBJECT_KINDS.map((kind) => [kind, DRAWN[kind] ?? box]));
