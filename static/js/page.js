const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

async function setupResults() {
  const host = document.querySelector("#results-charts");
  try {
    const response = await fetch("./static/js/results.json");
    if (!response.ok) throw new Error("Results unavailable");
    const { methods, scenes } = await response.json();
    const select = document.querySelector("#scene-select");
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  observer.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.2 },
          )
        : null;
    function render() {
      observer?.disconnect();
      const scene = scenes.find((item) => item.id === select.value);
      host.replaceChildren();
      for (const [key, name, subtitle, max, unit] of [
        ["psnr", "Rendering quality", "PSNR · Higher is better ↑", 40, "dB"],
        ["ate", "Trajectory error", "ATE RMSE · Lower is better ↓", 500, "cm"],
      ]) {
        const card = document.createElement("article");
        card.className = "metric-chart";
        card.setAttribute("aria-label", `${scene.label}: ${name}`);
        card.innerHTML = `<span class="chart-kicker">${scene.label} / ${scene.agents} agents</span><h3>${name}</h3><p>${subtitle}</p>`;
        methods.forEach((method, i) => {
          const value = scene[key][i];
          const label =
            i === 6 ? "Co-GS SLAM" : i === 5 ? "Ours · map only" : method;
          const row = document.createElement("div");
          row.className = `metric-row ${i === 6 ? "ours" : i === 5 ? "variant" : ""}`;
          row.style.setProperty(
            "--bar-target",
            `${value === null ? 0 : (value / max) * 100}%`,
          );
          row.style.setProperty("--delay", `${i * 65}ms`);
          row.innerHTML = `<span class="metric-label">${label}</span><span class="bar-track" aria-hidden="true"><span class="bar-fill"></span></span><span class="metric-value">${value === null ? "N/A" : value.toFixed(2)}</span>`;
          row.setAttribute(
            "aria-label",
            `${label}: ${value === null ? "Failed run" : value.toFixed(2) + " " + unit}`,
          );
          card.append(row);
        });
        card.insertAdjacentHTML(
          "beforeend",
          `<div class="chart-scale" aria-hidden="true"><span>0</span><span>${max / 2}</span><span>${max} ${unit}</span></div>`,
        );
        host.append(card);
        if (observer && !reducedMotion.matches) observer.observe(card);
        else card.classList.add("is-visible");
      }
    }
    render();
    select.addEventListener("change", render);
    document.querySelector(".results-controls").hidden = false;
    document.querySelector(".chart-note").hidden = false;
    document.querySelector(".results-table").open = false;
  } catch (error) {
    // The full static tables remain visible even if fetching or scripting fails.
    console.warn(
      "Interactive charts unavailable; exact result tables remain available.",
      error,
    );
  }
}
setupResults();

// Load automatically; method thumbnails also serve as useful loading/error previews.
const loadButton = document.querySelector("#load-mesh");
const meshViewer = document.querySelector("#mesh-viewer");
const methodButtons = [...document.querySelectorAll(".mesh-method")];
const poster = document.querySelector(".mesh-poster");
const cover = document.querySelector(".viewer-cover");
const status = document.querySelector("#viewer-status");
let selected = methodButtons[0];
let viewerPromise;
let selectionVersion = 0;

async function selectMethod(button) {
  selected = button;
  const version = ++selectionVersion;
  const { method, label, mesh, poses, poster: preview } = button.dataset;
  methodButtons.forEach((item) =>
    item.setAttribute("aria-pressed", String(item === button)),
  );
  document.querySelector("#viewer-method").textContent = label;
  poster.src = preview;
  poster.alt = `${label}: Dream 03 reconstruction preview`;
  poster.hidden = false;
  cover.hidden = false;
  document.querySelector("#viewer-canvas").hidden = true;
  meshViewer.dataset.loaded = "false";
  meshViewer.dataset.method = method;
  meshViewer.setAttribute("aria-busy", "true");
  loadButton.hidden = true;
  status.textContent = `Loading ${label}…`;
  try {
    if (!viewerPromise) {
      viewerPromise = import("./viewer.js").then(({ initViewer }) =>
        initViewer(),
      );
      viewerPromise.catch(() => {
        viewerPromise = undefined;
      });
    }
    const viewer = await viewerPromise;
    if (version !== selectionVersion) return;
    const loaded = await viewer.load(mesh, poses);
    if (!loaded || version !== selectionVersion) return;
    cover.hidden = true;
    poster.hidden = true;
    meshViewer.dataset.loaded = "true";
    meshViewer.setAttribute("aria-busy", "false");
    document
      .querySelector("#viewer-canvas")
      .setAttribute(
        "aria-label",
        `${label}, Dream 03. Drag to rotate, scroll to zoom, right-drag to pan. Arrow keys rotate, plus and minus zoom, R resets.`,
      );
  } catch (error) {
    if (version !== selectionVersion || error.name === "AbortError") return;
    meshViewer.setAttribute("aria-busy", "false");
    status.textContent = `${label} could not load in 3D. Its preview is shown; try again or select another method.`;
    loadButton.hidden = false;
    console.warn("Mesh viewer unavailable:", error);
  }
}
methodButtons.forEach((button) =>
  button.addEventListener("click", () => selectMethod(button)),
);
loadButton.addEventListener("click", () => selectMethod(selected));
meshViewer.addEventListener("viewer-context-lost", () => {
  ++selectionVersion;
  viewerPromise = undefined;
  meshViewer.dataset.loaded = "false";
  meshViewer.setAttribute("aria-busy", "false");
  poster.hidden = false;
  cover.hidden = false;
  loadButton.hidden = false;
  status.textContent =
    "The graphics context was interrupted. Retry to reload the map.";
});
selectMethod(selected);
