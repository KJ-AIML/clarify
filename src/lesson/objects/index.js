// clarify/src/lesson/objects/index.js
// The drawing of every object kind. Each is `{ top, draw(pen) }`: `top` is the object's height
// above the floor (for fitting the stage and placing the failure badge), `draw` returns its SVG
// centred on the world origin, standing on the pad top (z 3).
// Reach: each stays within ±30 of the origin in x and y (stage.js REACH); only a mechanism may overhang in +y (the cabinet's open drawer, to 39.4).

import laptop from "./laptop.js";
import phone from "./phone.js";
import monitor from "./monitor.js";
import server from "./server.js";
import database from "./database.js";
import cabinet from "./cabinet.js";
import tray from "./tray.js";
import queue from "./queue.js";
import cache from "./cache.js";
import gate from "./gate.js";
import router from "./router.js";
import mailbox from "./mailbox.js";
import folder from "./folder.js";
import cloud from "./cloud.js";
import box from "./box.js";

/** @typedef {{ top: number, draw: (pen: import("../pen.js").Pen) => string }} LessonObject */

/** @type {Record<string, LessonObject>} One per kind in OBJECT_KINDS (kinds.js), in its order. */
export const OBJECTS = { laptop, phone, monitor, server, database, cabinet, tray, queue, cache, gate, router, mailbox, folder, cloud, box };
