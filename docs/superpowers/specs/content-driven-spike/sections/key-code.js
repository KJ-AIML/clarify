// key-code: flip the layout; only the letters in band 3 change.
const LETTERS = { en: ["a", "s", "d", "f"], th: ["ฟ", "ห", "ก", "ด"] };
const NAMES = { en: "English", th: "Thai" };
const rows = [...root.querySelectorAll(".kc-lay")];
const letters = [...root.querySelectorAll(".kc-letter")];
const name = root.querySelector(".kc-out-name");

function setLayout(lay) {
  for (const row of rows) {
    const on = row.dataset.lay === lay;
    row.classList.toggle("is-on", on);
    row.querySelector(".fx-btn").setAttribute("aria-pressed", String(on));
  }
  letters.forEach((el, i) => {
    el.textContent = LETTERS[lay][i];
    el.lang = lay === "th" ? "th" : "en";
    el.classList.remove("is-new");
    void el.offsetWidth; // restart the flip
    el.classList.add("is-new");
  });
  name.textContent = NAMES[lay];
}

for (const row of rows) {
  row.querySelector(".fx-btn").addEventListener("click", () => setLayout(row.dataset.lay));
}
