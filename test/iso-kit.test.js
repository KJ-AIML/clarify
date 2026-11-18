import test from "node:test";
import assert from "node:assert/strict";
import * as k from "../src/iso/kit.js";

test("the vendored kit projects, orders and draws solids", () => {
  const P = k.fitProjection([[0, 0, 0], [100, 0, 0], [0, 100, 0], [0, 0, 50]], 400, 300, { pad: 10, azimuth: 45 });
  const [x, y] = k.iso([0, 0, 0], P);
  assert.ok(x >= 0 && x <= 400 && y >= 0 && y <= 300);
  assert.ok(k.depthOf([10, 10, 0], P) > k.depthOf([0, 0, 0], P));
  assert.match(k.solidSvg(k.slabOf({ x: 0, y: 0, w: 10, d: 10, r: 1 }, 0, 5, P), { tone: "mid" }), /class="iso-solid"/);
});
