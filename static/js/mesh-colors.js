import * as THREE from "three";

// Same display transform as gen_figure/scripts/dream_final_mesh_display.py.
// PLYLoader has already converted byte sRGB colors to linear RGB, so restore
// sRGB before applying the figure's transform, then return to linear for Three.js.
export function applyFigureColors(geometry) {
  const colors = geometry.getAttribute("color");
  if (!colors) return;
  const color = new THREE.Color();
  for (let i = 0; i < colors.count; i++) {
    color.fromBufferAttribute(colors, i).convertLinearToSRGB();
    let r = (Math.round(color.r * 255) / 255) * 0.99;
    let g = (Math.round(color.g * 255) / 255) * 1.025;
    let b = (Math.round(color.b * 255) / 255) * 1.08;
    const maximum = Math.max(1, r, g, b);
    r /= maximum;
    g /= maximum;
    b /= maximum;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const target = 1.1 * Math.pow(luminance, 0.94);
    const scale = Math.min(
      luminance > 1e-8 ? target / luminance : 1,
      1 / Math.max(r, g, b, 1e-8),
    );
    const quantize = (value) =>
      Math.round(THREE.MathUtils.clamp(value * scale, 0, 1) * 255) / 255;
    color.setRGB(quantize(r), quantize(g), quantize(b), THREE.SRGBColorSpace);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}
