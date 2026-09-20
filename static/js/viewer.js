import * as THREE from "three";
import { OrbitControls } from "../vendor/three/OrbitControls.js";
import { PLYLoader } from "../vendor/three/PLYLoader.js";

import { LineSegments2 } from "../vendor/three/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../vendor/three/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "../vendor/three/lines/LineMaterial.js";

// The main figure's camera-frustum geometry (meters) and agent colors.
function makePoseGroup({ poses, stride }) {
  const group = new THREE.Group();
  const colors = [0xd64fa8, 0x2b7fe0, 0xffbe0b];
  const corners = [
    [0, 0, 0],
    [-0.0735, -0.0553, 0.126],
    [0.0735, -0.0553, 0.126],
    [0.0735, 0.0553, 0.126],
    [-0.0735, 0.0553, 0.126],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ];
  colors.forEach((color, agent) => {
    const vertices = [];
    const selected = poses
      .filter((pose) => pose.agent === agent)
      .filter((_, index) => index % stride === 0);
    selected.forEach((pose) => {
      // JSON matrices are row-major camera-to-world transforms, already aligned with the mesh.
      const matrix = new THREE.Matrix4().set(...pose.c2w);
      const points = corners.map((point) =>
        new THREE.Vector3(...point).applyMatrix4(matrix),
      );
      edges.forEach(([a, b]) =>
        vertices.push(...points[a].toArray(), ...points[b].toArray()),
      );
    });
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(vertices);
    const material = new LineMaterial({
      color,
      linewidth: 2,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lines = new LineSegments2(geometry, material);
    lines.renderOrder = 2;
    lines.userData.poseCount = selected.length;
    group.add(lines);
  });
  return group;
}

function disposePoses(group) {
  group?.children.forEach((lines) => {
    lines.geometry.dispose();
    lines.material.dispose();
  });
}

export function initViewer() {
  const container = document.querySelector("#viewer-canvas");
  const viewer = document.querySelector("#mesh-viewer");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xf8fafc);
  container.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  // Common orientation from the four-method main-figure export.
  const up = new THREE.Vector3(
    0.204367749654566,
    -0.9777584694357424,
    -0.047140198851965215,
  ).normalize();
  const direction = new THREE.Vector3(
    -16.69453822625518,
    -1.1383775710691624,
    -48.76447179427853,
  ).normalize();
  const center = new THREE.Vector3();
  camera.up.copy(up);
  camera.position.copy(direction).multiplyScalar(20);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minZoom = 0.4;
  controls.maxZoom = 12;
  controls.zoomSpeed = 0.8;
  controls.enabled = false;
  const reset = document.querySelector("#reset-view");
  const top = document.querySelector("#top-view");
  const wire = document.querySelector("#wireframe");
  const posesButton = document.querySelector("#toggle-poses");
  const agentButtons = [...document.querySelectorAll(".pose-legend button")];
  let poseGroup;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let mesh,
    radius = 1,
    request,
    disposed = false;
  const render = () => {
    if (!disposed && mesh && !container.hidden) renderer.render(scene, camera);
  };
  controls.addEventListener("change", render);
  const setEnabled = (enabled) => {
    controls.enabled = enabled;
    [reset, top, wire, posesButton].forEach((button) => {
      button.disabled = !enabled;
    });
  };
  function resize() {
    if (!mesh || disposed) return;
    const width = viewer.clientWidth,
      height = viewer.clientHeight;
    const aspect = width / height;
    const right = new THREE.Vector3().crossVectors(up, direction).normalize();
    const vertical = new THREE.Vector3()
      .crossVectors(direction, right)
      .normalize();
    const size = mesh.geometry.boundingBox.getSize(new THREE.Vector3());
    const projected = (axis) =>
      Math.abs(axis.x * size.x) +
      Math.abs(axis.y * size.y) +
      Math.abs(axis.z * size.z);
    const halfHeight =
      Math.max(projected(vertical), projected(right) / aspect) * 0.53;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewer);
  reset.addEventListener(
    "click",
    () => {
      controls.reset();
      render();
    },
    options,
  );
  top.addEventListener(
    "click",
    () => {
      camera.position
        .copy(center)
        .addScaledVector(up, radius * 4)
        .addScaledVector(direction, radius * 0.001);
      controls.target.copy(center);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
      render();
    },
    options,
  );
  wire.addEventListener(
    "click",
    () => {
      material.wireframe = !material.wireframe;
      wire.setAttribute("aria-pressed", String(material.wireframe));
      render();
    },
    options,
  );
  function updatePoseVisibility() {
    if (!poseGroup) return;
    poseGroup.visible = posesButton.getAttribute("aria-pressed") === "true";
    agentButtons.forEach((button, agent) => {
      poseGroup.children[agent].visible =
        button.getAttribute("aria-pressed") === "true";
    });
    render();
  }
  posesButton.addEventListener(
    "click",
    () => {
      posesButton.setAttribute(
        "aria-pressed",
        String(posesButton.getAttribute("aria-pressed") !== "true"),
      );
      updatePoseVisibility();
    },
    options,
  );
  agentButtons.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        button.setAttribute(
          "aria-pressed",
          String(button.getAttribute("aria-pressed") !== "true"),
        );
        updatePoseVisibility();
      },
      options,
    ),
  );
  container.addEventListener(
    "keydown",
    (event) => {
      if (
        !controls.enabled ||
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "r",
          "R",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key.toLowerCase() === "r") {
        controls.reset();
        return;
      }
      if (["+", "=", "-"].includes(event.key)) {
        camera.zoom = THREE.MathUtils.clamp(
          camera.zoom * (event.key === "-" ? 0.85 : 1.15),
          controls.minZoom,
          controls.maxZoom,
        );
        camera.updateProjectionMatrix();
      } else {
        const offset = camera.position.clone().sub(controls.target);
        const axis =
          event.key === "ArrowLeft" || event.key === "ArrowRight"
            ? up
            : new THREE.Vector3().crossVectors(up, offset).normalize();
        offset.applyAxisAngle(
          axis,
          ["ArrowLeft", "ArrowUp"].includes(event.key) ? 0.1 : -0.1,
        );
        camera.position.copy(controls.target).add(offset);
      }
      controls.update();
      render();
    },
    options,
  );
  function dispose() {
    disposed = true;
    request?.abort();
    listeners.abort();
    resizeObserver.disconnect();
    setEnabled(false);
    controls.dispose();
    mesh?.geometry.dispose();
    disposePoses(poseGroup);
    material.dispose();
    renderer.dispose();
    container.hidden = true;
    container.replaceChildren();
  }
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      dispose();
      viewer.dispatchEvent(new Event("viewer-context-lost"));
    },
    options,
  );
  return {
    async load(url, posesUrl) {
      request?.abort();
      request = new AbortController();
      const current = request;
      setEnabled(false);
      container.hidden = true;
      const [buffer, poseData] = await Promise.all([
        fetch(url, { signal: current.signal }).then((response) => {
          if (!response.ok)
            throw new Error(`Mesh request failed: ${response.status}`);
          return response.arrayBuffer();
        }),
        fetch(posesUrl, { signal: current.signal }).then((response) => {
          if (!response.ok)
            throw new Error(`Pose request failed: ${response.status}`);
          return response.json();
        }),
      ]);
      if (current.signal.aborted || disposed) return false;
      const geometry = new PLYLoader().parse(buffer);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      if (poseGroup) {
        scene.remove(poseGroup);
        disposePoses(poseGroup);
      }
      poseGroup = makePoseGroup(poseData);
      scene.add(poseGroup);
      viewer.dataset.poseCounts = poseGroup.children
        .map((lines) => lines.userData.poseCount)
        .join(",");
      updatePoseVisibility();
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      geometry.boundingBox.getCenter(center);
      radius = geometry.boundingSphere.radius;
      camera.near = radius / 100;
      camera.far = radius * 20;
      camera.position.copy(center).addScaledVector(direction, radius * 4);
      camera.zoom = 1;
      controls.target.copy(center);
      controls.update();
      controls.saveState();
      material.wireframe = false;
      wire.setAttribute("aria-pressed", "false");
      container.hidden = false;
      resize();
      setEnabled(true);
      return true;
    },
    dispose,
  };
}
