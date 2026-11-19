// Rows of reports appear one by one when the section scrolls into view (motion allowed only).
if (window.matchMedia("(prefers-reduced-motion: no-preference)").matches && "IntersectionObserver" in window) {
  root.classList.add("is-armed");
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      root.classList.add("is-live");
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(root);
}
