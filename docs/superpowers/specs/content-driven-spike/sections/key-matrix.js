// key-matrix: press any key; with motion allowed, the powered row sweeps down the rows.
const ROWS = 4;
const st = { r: 1, c: 2, scan: 1 };
const arts = [...root.querySelectorAll(".km-art")];
const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const pauseBtn = root.querySelector(".km-pause");
let timer = 0;
let paused = false;

const move = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };

function paint() {
  const ans = st.scan === st.r;
  for (const art of arts) {
    let rowY = 0;
    let colX = 0;
    let key = null;
    art.querySelectorAll(".km-row").forEach((g) => {
      const on = +g.dataset.row === st.scan;
      g.classList.toggle("is-on", on);
      if (on) rowY = +g.dataset.y;
    });
    art.querySelectorAll(".km-col").forEach((g) => {
      const me = +g.dataset.col === st.c;
      g.classList.toggle("is-ans", me && ans);
      if (me) colX = +g.dataset.x;
    });
    art.querySelectorAll(".km-key").forEach((u) => {
      const r = +u.dataset.r;
      const me = r === st.r && +u.dataset.c === st.c;
      u.classList.toggle("is-live", r === st.scan);
      u.classList.toggle("is-pressed", me);
      u.classList.toggle("is-ans", me && ans);
      if (me) key = u;
    });
    art.querySelectorAll(".km-hit").forEach((b) => {
      b.setAttribute("aria-pressed", String(+b.dataset.r === st.r && +b.dataset.c === st.c));
    });
    const b1 = art.querySelector(".km-b1.km-mark");
    const b2 = art.querySelector(".km-b2.km-mark");
    const b3 = art.querySelector(".km-b3.km-mark");
    move(b1, +b1.dataset.x, rowY);
    if (key) move(b2, key.x.baseVal.value + +b2.dataset.dx, key.y.baseVal.value + +b2.dataset.dy);
    move(b3, colX, +b3.dataset.y);
    b3.classList.toggle("is-dim", !ans);
    const tr = art.querySelector(".km-trace");
    const top = +tr.dataset.top;
    const bx = +tr.dataset.bx;
    tr.setAttribute("d", colX < bx ? `M${colX} ${top}V${top + +tr.dataset.dy}H${bx}` : `M${colX} ${top}V${tr.dataset.by}`);
    tr.classList.toggle("is-off", !ans);
    const read = art.querySelector(".km-read");
    read.classList.toggle("is-ans", ans);
    read.querySelector(".km-read-t").textContent = ans ? `row ${st.r + 1}, column ${st.c + 1}` : `row ${st.scan + 1}: no answer`;
  }
}

function stop() { clearInterval(timer); timer = 0; }
function start() {
  stop();
  if (motion.matches && !paused) timer = setInterval(() => { st.scan = (st.scan + 1) % ROWS; paint(); }, 1600);
}

// click areas: one real button over each key, placed in percent of the drawing
for (const art of arts) {
  const W = +art.dataset.w;
  const H = +art.dataset.h;
  const kw = +art.dataset.kw;
  const kh = +art.dataset.kh;
  const pad = W < 500 ? 5 : 4;
  for (const u of art.querySelectorAll(".km-key")) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "km-hit";
    b.dataset.r = u.dataset.r;
    b.dataset.c = u.dataset.c;
    b.setAttribute("aria-label", `Press the key at row ${+u.dataset.r + 1}, column ${+u.dataset.c + 1}`);
    const x = u.x.baseVal.value - pad;
    const y = u.y.baseVal.value - pad;
    Object.assign(b.style, { left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${((kw + 2 * pad) / W) * 100}%`, height: `${((kh + 2 * pad) / H) * 100}%` });
    b.addEventListener("click", () => {
      st.r = +b.dataset.r;
      st.c = +b.dataset.c;
      st.scan = st.r;
      paint();
      start();
    });
    art.appendChild(b);
  }
}

function syncMotion() {
  pauseBtn.hidden = !motion.matches;
  if (!motion.matches) st.scan = st.r;
  paint();
  start();
}
pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.setAttribute("aria-pressed", String(paused));
  start();
});
motion.addEventListener("change", syncMotion);
syncMotion();
