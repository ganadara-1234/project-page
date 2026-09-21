# Co-GS SLAM project page

A self-contained static site for GitHub Pages. No build step, external fonts, or CDN is needed.

## Preview

```sh
cd project-page
python3 -m http.server 8000
```

Open http://localhost:8000. Use HTTP rather than opening `index.html` directly: ES modules and mesh/data fetches require a web server.

## Content and provenance

- Title and abstract: `../paper_ws/icra2027_thsim/root.tex` and `0.abstract.tex`.
- Main figure and pipeline: WebP exports of the PDFs in `figure/figure1` and `figure/figure2` (2600 px on the long edge).
- Dream 01 comparison and PD ablation: WebP exports of `figure/figure4` and `figure/figure6`.
- Interactive results: `static/js/results.json`, transcribed from the ATE and PSNR tables in `5.result.tex`. The static tables in `index.html` contain the same values and work without JavaScript. Update both when the manuscript changes. PSNR uses keyframe rendering, not novel-view evaluation. All five baselines and the map-only variant are included. N/A denotes a failed run.
- Mesh: unchanged `../gen_figure/main/dream_final_r035_lr12e3_30k/full_merged_mesh.ply`, copied to `static/models/dream03.ply` (102,644 vertices / 180,000 triangles). The initial direction and up vector come from this figure's `map/selected_view_manifest.json`. The poster is its `map/selected_view_clean_cropped.png`, exported to WebP. The viewer applies the same display-only color transform as the figure export (white balance 0.99/1.025/1.08, luminance gamma 0.94, gain 1.10) to every method, while preserving the source PLY files. This transform is applied in sRGB, with explicit conversion to/from Three.js linear vertex colors. Pose colors are unaffected. The viewer renders a triangle mesh, not Gaussians.
- Baseline meshes: unchanged `full_merged_mesh.ply` files from `magic_native_reg/` (MAGiC-SLAM), `coko/`, and `coma/` under the same figure directory. These are the rigidly aligned exports used by the main figure. Their `map/selected_view_clean_cropped.png` files supply the method thumbnails and loading previews. All methods share the exported initial viewing direction; each mesh is fitted independently to the viewport.
- Camera poses: `static/models/dream03-*-poses.json` retains the exact aligned `c2w` transforms and agent IDs from each mesh directory’s `poses.json`; unrelated paths and metadata are omitted. Frusta use the main figure’s sampling (every fourth keyframe for ours, every second for baselines), dimensions, and agent colors: #D64FA8 / #2B7FE0 / #FFBE0B. They are drawn as an overlay, visible through surfaces. The Poses button toggles all frusta; legend buttons toggle individual agents and preserve their visibility when changing methods.
- Bar reveal interaction inspired by https://sparolab.github.io/research/radloc/; implementation and styling are original.
- Three.js **0.180.0** and its OrbitControls / PLYLoader / LineSegments2 helpers are vendored in `static/vendor/three/`, with their MIT license. `three.module.js` is the upstream minified module and imports `three.core.min.js` locally.

## Editing

- The video placeholder is in `#video`. Replace `.video-placeholder` with an embed or a `<video controls>` once the video is ready.
- Paper and code resources remain explicit “Coming soon” labels. Replace each with a real link when available.
- The in-house dataset (`#dataset`) is described from `5.result.tex` (Dream 01–03, RealSense D455f, NOKOV motion capture). Each sequence card has a disabled `.download-button` span; replace it with `<a class="download-button" href="...">Download</a>` once the files are hosted.
- Authors remain anonymous, matching the current manuscript and original page.
- Charts animate once when scrolled into view and replay on sequence selection. Reduced-motion preferences disable the animation. Raw values always remain readable.
- The 3D viewer loads Co-GS SLAM automatically on page load, without scrolling or clicking. The side panel switches between Co-GS SLAM, MAGiC-SLAM, CoKo-SLAM, and CoMA-SLAM. Each selected method shows its preview while its mesh loads (7.3–8.7 MB per mesh). Obsolete requests are aborted and the previous GPU geometry is disposed on replacement. Failed loads preserve the selected preview and offer retry; a WebGL context loss can also be retried. The canvas supports mouse/touch and keyboard (arrows, +/−, R). Loading does not move keyboard focus or scroll the page. Rendering occurs on interaction or resize instead of continuously.
