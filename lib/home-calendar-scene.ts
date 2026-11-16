import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  MathUtils,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { bendHeldPaper, createGrip, paperGripShader, sampleThrow, throwDistance, updateGrip, type PaperGrip, type PaperThrow } from "./home-calendar-physics";

export type CalendarDate = {
  year: number;
  month: string;
  day: number;
  weekday: string;
  full: string;
};

export type SheetTarget = {
  id: number;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  clipPath: string;
  layer: number;
};

const width = 2.46;
const paperHeight = 3.06;
const paperTop = 1.41;
const tearInset = 0.092;
const depth = 0.93;
const step = 0.016;
const floorHeight = -1.94;
const detailedLayers = 5;
const detachProgress = 0.30;
const paperThickness = 0.04;
const handLift = 0.66;
const handPitch = 0.61;
const dropTime = 320;
const landingOffsets = [
  [-0.12, 0.02, 0.08],
  [-0.59, 0.13, -0.26],
  [0.14, -0.07, 0.23],
  [-0.78, 0.01, -0.17],
  [-0.34, -0.19, 0.29],
  [-0.46, 0.22, -0.28],
];

const cream = new Color("#f9e3b0");
const gold = new Color("#bd874c");
const ink = new Color("#30251e");
const navy = new Color("#24333a");
const steel = new Color("#5e777a");

function dateMask(date: CalendarDate) {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 600;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = "700 29px Georgia, serif";
  context.fillText(String(date.year), 240, 106);
  context.font = "700 35px Georgia, serif";
  context.letterSpacing = "4px";
  context.fillText(date.month, 240, 152, 386);
  context.fillRect(59, 183, 362, 3);
  context.letterSpacing = "0px";
  context.font = `700 ${date.day < 10 ? 263 : 230}px Georgia, serif`;
  context.fillText(String(date.day), 240, 327);
  context.fillRect(59, 448, 362, 3);
  context.font = "700 34px Georgia, serif";
  context.letterSpacing = "4px";
  context.fillText(date.weekday, 240, 497, 386);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function createCloud() {
  const positions: number[] = [];
  const colors: number[] = [];
  const particles: number[] = [];
  const color = new Color();
  // A fixed seed keeps the paper grain and edges stable when the date changes.
  let seed = 711;

  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function point(x: number, y: number, z: number, inkCoverage = 0, tearHeight = 0) {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    particles.push(random(), random(), inkCoverage, tearHeight);
  }

  function surface(columns: number, rows: number, sample: (u: number, v: number) => void) {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        sample((column + 0.15 + random() * 0.7) / columns,
          (row + 0.15 + random() * 0.7) / rows);
      }
    }
  }

  function build() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geometry.setAttribute("particle", new Float32BufferAttribute(particles, 4));
    return geometry;
  }

  return { build, color, point, random, surface };
}

function lowerEdge(u: number) {
  return -0.085 * (2 * u - 1) ** 2 + 0.026 * Math.sin(u * 13);
}

function tearLine(u: number) {
  const teeth = Math.asin(Math.sin(u * 63 + 0.36 * Math.sin(u * 20))) / (Math.PI / 2);
  return tearInset + 0.021 * teeth + 0.009 * Math.cos(u * 117);
}

function paperX(u: number, v: number) {
  return (u - 0.5) * width * (1 + 0.025 * v ** 5);
}

function paperY(u: number, v: number) {
  return paperTop - v * paperHeight + lowerEdge(u) * v ** 7;
}

// Both surfaces meet along the same jagged edge. Only the printed part can detach.
function addFrontPaper({ color, point, random, surface }: ReturnType<typeof createCloud>, date?: CalendarDate, columns = 154, rows = date ? 175 : 19, paperRows?: number[]) {
  const mask = date ? dateMask(date) : null;
  surface(columns, rows, (u, row) => {
    const grain = random();
    const tear = tearLine(u);
    const v = date ? tear + row * (1 - tear) : row * tear;
    paperRows?.push(v);
    const crease = Math.exp(-Math.abs(v - tear) * 100);
    const x = paperX(u, v);
    const y = paperY(u, v);
    const z = depth / 2 + 0.035 * Math.sin(u * Math.PI) + 0.15 * v ** 6 + crease * 0.035;
    const age = 0.10 + 0.15 * (2 * u - 1) ** 4 + 0.12 * v ** 4;
    color.copy(cream).lerp(gold, age + 0.18 * grain + 0.42 * crease + (v < tear ? 0.20 : 0));

    const pixel = mask ? Math.floor(v * mask.height) * mask.width + Math.floor(u * mask.width) : 0;
    const inkCoverage = mask ? mask.data[pixel * 4 + 3] / 255 : 0;
    color.lerp(ink, inkCoverage * (0.95 + 0.05 * grain));
    point(x, y, z, inkCoverage, paperTop - tear * paperHeight);
  });
}

function createPage(date: CalendarDate, compact = false) {
  const cloud = createCloud();
  const paperRows: number[] = [];
  addFrontPaper(cloud, date, compact ? 98 : 154, compact ? 61 : 175, paperRows);
  const geometry = cloud.build();
  geometry.setAttribute("paperRow", new Float32BufferAttribute(paperRows, 1));
  return geometry;
}

function landingPose(index: number) {
  const [x, z, angle] = landingOffsets[index % landingOffsets.length];
  return {
    x: 0.42 + x,
    z: 1.70 + z,
    plane: floorHeight + 0.24 * (1 - Math.exp(-index / 4.6)),
    sin: Math.sin(angle),
    cos: Math.cos(angle),
  };
}

function restingPoint(pose: ReturnType<typeof landingPose>, x: number, distance: number): [number, number, number] {
  const along = distance / paperHeight;
  const across = x + (along - 0.45) * 0.58;
  const forward = distance * 0.91 - 0.13 * x - 1.27;
  const edgeCurl = (Math.abs(x) / 1.3) ** 4 * 0.045 * (1 - MathUtils.smoothstep(along, 0.65, 0.9));
  return [
    pose.x + pose.cos * across - pose.sin * forward,
    pose.plane + 0.012 + edgeCurl,
    pose.z + pose.sin * across + pose.cos * forward,
  ];
}

function createRestingPosition(geometry: BufferGeometry, pose: ReturnType<typeof landingPose>) {
  const positions = geometry.getAttribute("position");
  const rows = geometry.getAttribute("paperRow");
  const resting = new Float32BufferAttribute(new Float32Array(positions.count * 3), 3);

  for (let index = 0; index < positions.count; index++) {
    // A common reference preserves the torn top instead of leveling each column to its own hinge.
    const distance = (rows.getX(index) - tearInset) * paperHeight;
    resting.setXYZ(index, ...restingPoint(pose, positions.getX(index), distance));
  }

  return resting;
}

function restingCorners(pose: ReturnType<typeof landingPose>) {
  return [[0, tearLine(0)], [1, tearLine(1)], [1, 1], [0, 1]].map(([u, v]) => {
    const distance = (v - tearInset) * paperHeight;
    return new Vector3(...restingPoint(pose, paperX(u, v), distance));
  });
}

type ScreenPoint = { x: number; y: number };

function convexOutline(points: ScreenPoint[]) {
  const sorted = points.toSorted((a, b) => a.x - b.x || a.y - b.y);
  function chain(edge: ScreenPoint[]) {
    const result: ScreenPoint[] = [];
    for (const point of edge) {
      while (result.length > 1) {
        const [a, b] = result.slice(-2);
        if ((b.x - a.x) * (point.y - a.y) > (b.y - a.y) * (point.x - a.x)) break;
        result.pop();
      }
      result.push(point);
    }
    return result.slice(0, -1);
  }
  return [...chain(sorted), ...chain(sorted.reverse())];
}

function flightSamples(geometry: BufferGeometry) {
  const positions = geometry.getAttribute("position");
  const particles = geometry.getAttribute("particle");
  const resting = geometry.getAttribute("restingPosition");
  const samples = [];
  for (const row of [0, 22, 44, 66, 88, 110, 132, 154, 174]) {
    for (const column of [0, 38, 77, 115, 153]) {
      const index = row * 154 + column;
      samples.push({
        position: new Vector3().fromBufferAttribute(positions, index),
        resting: new Vector3().fromBufferAttribute(resting, index),
        hinge: particles.getW(index),
        grain: particles.getX(index),
      });
    }
  }
  return samples;
}

function createBinding() {
  const cloud = createCloud();
  const { build, color, point, random, surface } = cloud;
  addFrontPaper(cloud);

  // Layers along the sides of the paper block. Each sheet has a slightly different edge.
  for (const side of [-1, 1]) {
    surface(62, 192, (u, v) => {
      const sheet = (u * 34) % 1;
      const layer = Math.sin(Math.floor(u * 34) * 1.6);
      const y = paperTop - v * paperHeight + lowerEdge(side === 1 ? 1 : 0) * v ** 7;
      color.copy(cream).lerp(gold, 0.42 + (sheet < 0.22 ? 0.24 : 0.05) + 0.06 * layer);
      color.multiplyScalar(0.73 + u * 0.19 + random() * 0.09);
      point(side * (width / 2 + 0.012 * layer), y, depth * (u - 0.5) + 0.15 * u ** 12 * v ** 6);
    });
  }

  surface(128, 160, (u, v) => {
    color.copy(cream).lerp(gold, 0.48 + random() * 0.30);
    point(width * (u - 0.5), paperTop - v * paperHeight + lowerEdge(u) * v ** 7, -depth / 2);
  });

  surface(128, 48, (u, v) => {
    color.copy(cream).lerp(gold, 0.54 + random() * 0.26);
    point(width * (u - 0.5), paperTop - paperHeight + lowerEdge(u), depth * (v - 0.5));
  });

  const capBottom = paperTop - 0.035;
  const capHeight = 0.34;
  const capWidth = width + 0.12;
  const capDepth = depth + 0.1;

  surface(160, 23, (u, v) => {
    const upperRim = v > 0.84;
    const clasp = Math.abs(u - 0.5) < 0.152 - 0.025 * Math.abs(0.66 - v) && v > 0.52 && v < 0.80;
    color.copy(navy).lerp(steel, (upperRim ? 0.30 : 0.07) + random() * 0.13);
    if (clasp) color.multiplyScalar(v > 0.73 ? 1.7 : 0.52);
    point((u - 0.5) * capWidth, capBottom + v * capHeight, capDepth / 2 + (clasp ? 0.025 : 0));
  });

  surface(160, 23, (u, v) => {
    color.copy(navy).lerp(steel, 0.16 + v * 0.14 + random() * 0.12);
    point((u - 0.5) * capWidth, capBottom + v * capHeight, -capDepth / 2);
  });

  surface(160, 63, (u, v) => {
    color.copy(navy).lerp(steel, 0.38 + random() * 0.21);
    point((u - 0.5) * capWidth, capBottom + capHeight, (v - 0.5) * capDepth);
  });

  for (const side of [-1, 1]) {
    surface(62, 23, (u, v) => {
      color.copy(navy).lerp(steel, 0.08 + v * 0.17 + random() * 0.12);
      point(side * capWidth / 2, capBottom + v * capHeight, (u - 0.5) * capDepth);
    });
  }

  return build();
}

export function createHomeCalendarScene(canvas: HTMLCanvasElement, context: WebGL2RenderingContext, date: CalendarDate) {
  const renderer = new WebGLRenderer({ canvas, context, alpha: true });
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 40);
  camera.position.set(4.5, 1.82, 10);
  camera.lookAt(0, -0.29, 0);
  camera.updateMatrixWorld();
  const screenRight = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const screenForward = new Vector3(-screenRight.z, 0, screenRight.x);
  let viewportWidth = 1;
  let viewportHeight = 1;
  let unitsPerPixel = 1;

  const scene = new Scene();
  const phase = { value: 0 };
  const pointSize = { value: 1 };
  const formationEdges = new Vector2();
  const fallPhases = new Vector4();
  const airShift = new Vector3();
  const airGrip = createGrip();
  let airHeld = false;
  let airThrow: PaperThrow | undefined;
  const material = new ShaderMaterial({
    uniforms: {
      phase, pointSize, tear: { value: 0 }, surfaceHeight: { value: floorHeight }, flutter: { value: 1 }, shade: { value: 1 }, densityScale: { value: 1 },
      formationProgress: { value: 1 }, formationEdges: { value: formationEdges },
      paperRight: { value: screenRight }, paperForward: { value: screenForward },
      gripShape: { value: new Vector4() }, gripPivot: { value: new Vector3() },
    },
    vertexColors: true,
    transparent: true,
    vertexShader: `
      attribute vec4 particle;
      uniform float phase;
      uniform float pointSize;
      uniform float flutter;
      uniform float shade;
      uniform float densityScale;
      uniform float formationProgress;
      uniform vec2 formationEdges;
      #ifdef TEARING_SHEET
      attribute vec3 restingPosition;
      uniform float tear;
      uniform float surfaceHeight;
      uniform vec4 fallPhases;
      uniform vec3 airShift;
      #endif
      varying vec3 vInk;
      varying float vOpacity;
      ${paperGripShader}

      void main() {
        vec3 positionInMotion = position;
        float wave = sin(phase * 2.0 + position.y * 1.8 + position.x * 2.4);
        positionInMotion.z += flutter * wave * (0.018 + particle.x * 0.017);
        vInk = color * shade * (0.88 + particle.y * 0.18);
        vOpacity = 1.0;
        float pointScale = 1.0;

        vec3 worldPosition = (modelMatrix * vec4(positionInMotion, 1.0)).xyz;

        #ifdef TEARING_SHEET
        if (tear > 0.0) {
          float fromEdge = max(particle.w - position.y, 0.0);
          float along = fromEdge / ${paperHeight};
          float peel = fallPhases.x;
          float flatten = fallPhases.y;

          // Each vertical strip curves along an arc, so the paper keeps its length as it bends.
          float arc = fromEdge * peel * mix(0.38, 0.03, flatten);
          float chord = fromEdge * (arc < 0.001 ? 1.0 : sin(arc) / arc);
          float direction = peel * (0.10 + 0.11 * position.x) + arc + flatten * 1.32;
          float forward = chord * sin(direction);
          positionInMotion.y = particle.w - chord * cos(direction);
          positionInMotion.z += forward;
          positionInMotion.x += forward * 0.25;

          // Contact is resolved in world space, independently of the calendar's yaw and float.
          vec3 falling = (modelMatrix * vec4(positionInMotion, 1.0)).xyz;
          float drop = fallPhases.z;
          falling.y = max(surfaceHeight, falling.y - 3.56 * drop * drop);
          falling.z += drop * 0.17;

          float settle = fallPhases.w;
          worldPosition = mix(falling, restingPosition, settle) + airShift;
          float ripple = sin(32.0 * (tear - 0.68) - along * 5.0);
          worldPosition.y += max(ripple, 0.0) * (1.0 - settle) * settle * 0.18;
          vInk *= mix(1.0, 0.87, flatten);
          pointScale += 0.20 * smoothstep(0.06, 0.22, tear) * (1.0 - smoothstep(0.58, 0.80, tear));
        }
        #endif

        vec4 viewPosition = viewMatrix * vec4(bendHeldPaper(worldPosition), 1.0);
        if (formationProgress < 1.0) {
          // Two streams start at the actual viewport edges and turn in the same direction.
          bool fromLeft = particle.x < 0.5;
          float side = fromLeft ? -1.0 : 1.0;
          float seed = fract(particle.x * 2.0);
          float depth = fract(seed * 17.13 + particle.y * 37.91) - 0.5;
          float delay = 0.33 * seed + 0.075 * particle.y + 0.045 * (depth + 0.5);
          float travel = clamp((formationProgress - delay) / (1.0 - delay), 0.0, 1.0);
          float approach = smoothstep(0.0, 0.57, travel);
          float edge = fromLeft ? -formationEdges.x : formationEdges.y;
          float radius = mix(edge + (particle.y - 0.22) * 0.52, 1.43 + particle.y * 0.69 + depth * 0.39, approach);
          float turn = (4.8 + 0.7 * (particle.y - 0.5)) * smoothstep(0.11, 0.94, travel);
          float angle = (fromLeft ? 3.141593 : 0.0) + turn + depth * 0.48 * approach;
          float opening = (side * 0.48 + depth * 0.91 + (particle.y - 0.5) * 0.27) * (1.0 - approach);
          float drift = sin(seed * 71.0 + particle.y * 29.0 + travel * 6.0) * (0.075 + abs(depth) * 0.13) * approach;
          vec3 stream = vec3(cos(angle) * (radius + drift), sin(angle) * min(radius, 2.0) * 0.88 + opening + drift,
            viewPosition.z + depth * 1.9);

          float settle = smoothstep(0.56, 1.0, travel);
          viewPosition.xyz = mix(stream, viewPosition.xyz, settle);
          pointScale = mix(0.62, 1.0, settle);
          float trail = smoothstep(0.0, 0.19, seed) * (1.0 - smoothstep(0.81, 1.0, seed));
          vOpacity = mix(0.12 + trail * 0.27, 1.0, settle);
        }

        gl_PointSize = max(1.0, pointSize * pointScale * densityScale * (0.75 + particle.x * 0.59 + particle.z * 0.13));
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vInk;
      varying float vOpacity;

      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        if (distanceToCenter >= 0.5) discard;
        float opacity = (1.0 - smoothstep(0.30, 0.50, distanceToCenter)) * vOpacity;
        if (opacity < 0.035) discard;
        gl_FragColor = vec4(vInk, opacity);
        #include <colorspace_fragment>
      }
    `,
  });
  const tornMaterial = material.clone();
  tornMaterial.defines.TEARING_SHEET = 1;
  tornMaterial.uniforms.pointSize = pointSize;
  tornMaterial.uniforms.fallPhases = { value: fallPhases };
  tornMaterial.uniforms.airShift = { value: airShift };
  tornMaterial.uniforms.gripShape.value = airGrip.shape;
  tornMaterial.uniforms.gripPivot.value = airGrip.pivot;
  const landedMaterial = material.clone();
  landedMaterial.uniforms.pointSize = pointSize;
  landedMaterial.uniforms.flutter.value = 0;
  landedMaterial.uniforms.shade.value = 0.87;
  const compactMaterial = landedMaterial.clone();
  compactMaterial.uniforms.pointSize = pointSize;
  compactMaterial.uniforms.densityScale.value = 1.54;

  const binding = new Points(createBinding(), material);
  const page = new Points(createPage(date), material);
  page.renderOrder = 2;
  const calendar = new Group();
  calendar.add(binding, page);
  calendar.rotation.z = 0.087;
  const mount = new Group();
  mount.add(calendar);
  scene.add(mount);

  let tornPage: Points<BufferGeometry, ShaderMaterial> | undefined;
  let currentDate = date;
  let leavingDate = date;
  let flightPose = landingPose(0);
  let samples: ReturnType<typeof flightSamples> = [];
  type Lift = { started: number; from: number; to: number; fromGrip: number; rising: boolean; glide?: PaperThrow };
  type LandedPage = {
    points: Points<BufferGeometry, ShaderMaterial>;
    corners: Vector3[];
    date: CalendarDate;
    pose: ReturnType<typeof landingPose>;
    restY: number;
    held: boolean;
    grip: PaperGrip;
    lift?: Lift;
  };
  const landedPages: LandedPage[] = [];
  const movingSheets = new Set<LandedPage>();

  function projectTarget(points: Vector3[], id: number, label: string, layer: number): SheetTarget {
    const projected = points.map(point => {
      const ndc = point.project(camera);
      return { x: (1 + ndc.x) * viewportWidth / 2, y: (1 - ndc.y) * viewportHeight / 2 };
    });
    const outline = id < 0 ? convexOutline(projected) : projected;
    const xs = outline.map(point => point.x);
    const ys = outline.map(point => point.y);
    const left = Math.min(...xs) - 2;
    const top = Math.min(...ys) - 2;
    const width = Math.max(...xs) + 2 - left;
    const height = Math.max(...ys) + 2 - top;
    const clipPath = `polygon(${xs.map((x, i) => `${x - left}px ${ys[i] - top}px`).join(", ")})`;
    return { id, label, left, top, width, height, clipPath, layer };
  }

  function projectSheet(sheet: LandedPage, id: number, flat = false): SheetTarget {
    const { y } = sheet.points.position;
    const layer = sheet.held ? 2000 : Math.round((sheet.pose.plane + y - floorHeight) * 1000);
    const corners = sheet.corners.map(corner => {
      const position = corner.clone().add(sheet.points.position);
      return flat ? position : bendHeldPaper(position, sheet.grip, screenRight, screenForward);
    });
    return projectTarget(corners, id, sheet.date.full, layer);
  }

  function clampHorizontal(deltaX: number, targets: SheetTarget[]) {
    const max = viewportWidth - 8 - Math.max(...targets.map(target => target.left + target.width));
    const min = 8 - Math.min(...targets.map(target => target.left));
    const pixels = max < min ? (min + max) / 2 : Math.min(max, Math.max(min, deltaX));
    return pixels * unitsPerPixel;
  }

  function moveSheet(id: number, deltaX: number) {
    const sheet = landedPages[id];
    if (!sheet) return null;
    sheet.points.position.addScaledVector(screenRight, clampHorizontal(deltaX, [projectSheet(sheet, id)]));
    placeGrip(sheet);
    return projectSheet(sheet, id);
  }

  function fallingPoint({ position, resting, hinge, grain }: ReturnType<typeof flightSamples>[number], matrix: Points["matrixWorld"], progress: number) {
    const { x: peel, y: flatten, z: drop, w: settle } = fallPhases;
      const distance = Math.max(hinge - position.y, 0);
      const along = distance / paperHeight;
      const arc = distance * peel * MathUtils.lerp(0.38, 0.03, flatten);
      const chord = distance * (arc < 0.001 ? 1 : Math.sin(arc) / arc);
      const direction = peel * (0.10 + 0.11 * position.x) + arc + flatten * 1.32;
      const forward = chord * Math.sin(direction);
      const wave = Math.sin(tornMaterial.uniforms.phase.value * 2 + position.y * 1.8 + position.x * 2.4);
      const falling = new Vector3(position.x + forward * 0.25, hinge - chord * Math.cos(direction),
        position.z + forward + wave * (0.018 + grain * 0.017)).applyMatrix4(matrix);
      falling.y = Math.max(flightPose.plane, falling.y - 3.56 * drop * drop);
      falling.z += drop * 0.17;
      falling.lerp(resting, settle).add(airShift);
      falling.y += Math.max(Math.sin(32 * (progress - 0.68) - along * 5), 0) * (1 - settle) * settle * 0.18;
      return falling;
  }

  function airborneTarget() {
    const progress = tornMaterial.uniforms.tear.value;
    const current = tornPage;
    if (!current || progress < detachProgress) return null;
    // Project samples of the same deformed surface drawn by the vertex shader.
    const points = samples.map(sample => bendHeldPaper(fallingPoint(sample, current.matrixWorld, progress), airGrip, screenRight, screenForward));
    return projectTarget(points, -1, leavingDate.full, 2100);
  }

  function projectAirLanding() {
    return projectTarget(restingCorners(flightPose).map(corner => corner.add(airShift)), -1, leavingDate.full, 2100);
  }

  function applyThrow(glide: PaperThrow, now: number, position: Vector3) {
    const sample = sampleThrow(glide, now);
    position.addScaledVector(screenRight, sample.delta);
    return sample.done;
  }

  function supportHeight(pose: ReturnType<typeof landingPose>, offset: Vector3, ignore?: LandedPage) {
    const center = new Vector3(pose.x + offset.x, 0, pose.z + offset.z).dot(screenRight);
    let height = floorHeight;
    for (const sheet of landedPages) {
      if (sheet === ignore || sheet.held) continue;
      const otherX = sheet.pose.x + sheet.points.position.x;
      const otherZ = sheet.pose.z + sheet.points.position.z;
      if (Math.abs(center - (otherX * screenRight.x + otherZ * screenRight.z)) < width * 0.68) {
        height = Math.max(height, sheet.pose.plane + sheet.restY + paperThickness);
      }
    }
    return Math.min(height, floorHeight + 0.24);
  }

  function placeGrip(sheet: LandedPage) {
    sheet.grip.pivot.set(sheet.pose.x, sheet.pose.plane, sheet.pose.z).add(sheet.points.position)
      .addScaledVector(screenForward, 0.53);
  }

  function updateLandedGrip(sheet: LandedPage, now: number, immediate = false) {
    placeGrip(sheet);
    updateGrip(sheet.grip, now, sheet.grip.amount * handPitch, immediate);
  }

  function sampleLift(sheet: LandedPage, now: number) {
    const lift = sheet.lift;
    if (!lift) return;
    const progress = MathUtils.clamp((now - lift.started) / (lift.rising ? 155 : dropTime), 0, 1);
    const eased = lift.rising ? 1 - (1 - progress) ** 3 : progress ** 2;
    sheet.points.position.y = MathUtils.lerp(lift.from, lift.to, eased);
    sheet.grip.amount = MathUtils.lerp(lift.fromGrip, lift.rising ? 1 : 0, eased);
    if (lift.glide) applyThrow(lift.glide, now, sheet.points.position);
    if (progress === 1) {
      sheet.lift = undefined;
      if (!sheet.held) {
        movingSheets.delete(sheet);
        sheet.points.renderOrder = -Math.round((sheet.pose.plane + sheet.restY - floorHeight) * 1000) - 1;
      }
    }
  }

  function liftTo(sheet: LandedPage, to: number, now: number, immediate: boolean, rising: boolean, glide?: PaperThrow) {
    sampleLift(sheet, now);
    if (immediate || (!glide && !rising && sheet.grip.amount === 0 && Math.abs(sheet.points.position.y - to) < 0.001)) {
      sheet.points.position.y = to;
      sheet.grip.amount = rising ? 1 : 0;
      sheet.lift = undefined;
      movingSheets.delete(sheet);
      updateLandedGrip(sheet, now, immediate);
    } else {
      sheet.lift = { started: now, from: sheet.points.position.y, to, rising, fromGrip: sheet.grip.amount, glide };
      movingSheets.add(sheet);
    }
  }

  function lowerSheet(sheet: LandedPage, now: number, immediate: boolean, velocity = 0) {
    sampleLift(sheet, now);
    sheet.lift = undefined;
    sheet.held = false;
    const distance = immediate || !velocity ? 0 : clampHorizontal(throwDistance(velocity, dropTime),
      [projectSheet(sheet, -2), projectSheet(sheet, -2, true)]);
    const destination = sheet.points.position.clone().addScaledVector(screenRight, distance);
    sheet.restY = supportHeight(sheet.pose, destination, sheet) - sheet.pose.plane;
    const glide = distance ? { start: now, duration: dropTime, distance, applied: 0 } : undefined;
    liftTo(sheet, sheet.restY, now, immediate, false, glide);
    if (!sheet.lift) sheet.points.renderOrder = -Math.round((sheet.pose.plane + sheet.restY - floorHeight) * 1000) - 1;
  }

  function removePage(sheet: Points<BufferGeometry, ShaderMaterial> | undefined) {
    sheet?.removeFromParent();
    sheet?.geometry.dispose();
  }

  function clearPile() {
    removePage(tornPage);
    landedPages.forEach(sheet => removePage(sheet.points));
    landedPages.length = 0;
    movingSheets.clear();
    samples = [];
    airHeld = false;
    airThrow = undefined;
    tornPage = undefined;
  }

  return {
    resize(width: number, height: number, centerX: number, centerY: number, stageHeight: number) {
      const ratio = Math.min(window.devicePixelRatio, 1.6);
      viewportWidth = width;
      viewportHeight = height;
      unitsPerPixel = 4.9 / stageHeight;
      camera.left = -centerX * unitsPerPixel;
      camera.right = (width - centerX) * unitsPerPixel;
      camera.top = centerY * unitsPerPixel;
      camera.bottom = (centerY - height) * unitsPerPixel;
      formationEdges.set(camera.left, camera.right);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      pointSize.value = step / unitsPerPixel * ratio * 1.57;
      landedPages.forEach((_, id) => moveSheet(id, 0));
    },
    sheetTargets: () => landedPages.map((sheet, id) => projectSheet(sheet, id)),
    moveSheet,
    airborneTarget,
    moveAirborne(deltaX: number) {
      const target = airborneTarget();
      if (!target) return;
      const offset = clampHorizontal(deltaX, [target, projectAirLanding()]);
      airShift.addScaledVector(screenRight, offset);
      airGrip.pivot.addScaledVector(screenRight, offset);
    },
    holdAirborne() {
      airHeld = true;
      airThrow = undefined;
      airGrip.speed = 0;
    },
    releaseAirborne(now: number, duration: number, velocity: number) {
      airHeld = false;
      const target = airborneTarget();
      if (!target || duration <= 0 || !velocity) return;
      const distance = clampHorizontal(throwDistance(velocity, duration), [target, projectAirLanding()]);
      if (distance) airThrow = { start: now, duration, distance, applied: 0 };
    },
    setDragSpeed(id: number, speed: number, now: number) {
      const grip = id < 0 ? airGrip : landedPages[id]?.grip;
      if (!grip) return;
      grip.speed = speed;
      grip.movedAt = now;
    },
    liftSheet(id: number, now: number, immediate: boolean) {
      const sheet = landedPages[id];
      if (!sheet) return;
      sampleLift(sheet, now);
      sheet.lift = undefined;
      sheet.held = true;
      sheet.grip.speed = 0;
      sheet.points.renderOrder = -1000;
      liftTo(sheet, sheet.restY + handLift, now, immediate, true);
    },
    lowerSheet(id: number, now: number, immediate: boolean, velocity = 0) {
      const sheet = landedPages[id];
      if (sheet) lowerSheet(sheet, now, immediate, velocity);
    },
    setDate(date: CalendarDate) {
      clearPile();
      currentDate = date;
      page.geometry.dispose();
      page.geometry = createPage(date);
    },
    beginTear(nextDate: CalendarDate) {
      airShift.set(0, 0, 0);
      airHeld = false;
      airThrow = undefined;
      airGrip.amount = 0;
      airGrip.speed = 0;
      airGrip.shape.set(0, 0, 0, 0);
      flightPose = landingPose(landedPages.length);
      flightPose.plane = supportHeight(flightPose, airShift);
      page.geometry.setAttribute("restingPosition", createRestingPosition(page.geometry, flightPose));
      samples = flightSamples(page.geometry);
      tornMaterial.uniforms.surfaceHeight.value = flightPose.plane;
      tornMaterial.uniforms.tear.value = 0;
      tornPage = new Points(page.geometry, tornMaterial);
      tornPage.renderOrder = -landedPages.length - 1;
      tornPage.frustumCulled = false;
      page.geometry = createPage(nextDate);
      leavingDate = currentDate;
      currentDate = nextDate;
      calendar.add(tornPage);
    },
    finishTear(now: number, immediate: boolean) {
      if (!tornPage) return;
      if (airThrow) applyThrow(airThrow, now, airShift);
      airThrow = undefined;
      airHeld = false;
      const moving = tornPage.geometry;
      tornPage.geometry = new BufferGeometry();
      tornPage.geometry.setAttribute("position", moving.getAttribute("restingPosition"));
      tornPage.geometry.setAttribute("color", moving.getAttribute("color"));
      tornPage.geometry.setAttribute("particle", moving.getAttribute("particle"));
      moving.dispose();
      tornPage.material = landedMaterial;
      tornPage.frustumCulled = true;
      tornPage.position.copy(airShift);
      tornPage.rotation.set(0, 0, 0);
      scene.add(tornPage);
      const id = landedPages.length;
      const landed = { points: tornPage, corners: restingCorners(flightPose), date: leavingDate, pose: flightPose, restY: 0, held: false, grip: createGrip() };
      tornPage.onBeforeRender = (_renderer, _scene, _camera, _geometry, usedMaterial) => {
        const shader = usedMaterial as ShaderMaterial;
        shader.uniforms.gripShape.value = landed.grip.shape;
        shader.uniforms.gripPivot.value = landed.grip.pivot;
        shader.uniformsNeedUpdate = true;
      };
      landedPages.push(landed);
      tornPage = undefined;
      samples = [];
      moveSheet(id, 0);
      lowerSheet(landed, now, immediate);

      const olderId = id - detailedLayers;
      const older = landedPages[olderId];
      if (older) {
        const compact = createPage(older.date, true);
        compact.setAttribute("position", createRestingPosition(compact, older.pose));
        older.points.geometry.dispose();
        older.points.geometry = compact;
        older.points.material = compactMaterial;
      }
    },
    draw(time: number, yaw: number, progress: number, now: number, formation: number) {
      phase.value = time * (2 * Math.PI / 12000);
      material.uniforms.formationProgress.value = formation;
      mount.rotation.y = yaw;
      mount.position.y = Math.sin(phase.value) * 0.068;
      if (tornPage?.parent === calendar) {
        tornMaterial.uniforms.phase.value = phase.value;
        if (progress >= detachProgress) scene.attach(tornPage);
      }
      tornMaterial.uniforms.tear.value = progress;
      fallPhases.set(
        MathUtils.smoothstep(progress, 0, 0.36), MathUtils.smoothstep(progress, 0.37, 0.74),
        MathUtils.clamp((progress - 0.31) / 0.46, 0, 1), MathUtils.smoothstep(progress, 0.65, 0.94),
      );
      page.visible = !tornPage || progress > 0.13;
      if (tornPage && progress >= detachProgress) {
        if (airThrow && applyThrow(airThrow, now, airShift)) airThrow = undefined;
        const dt = MathUtils.clamp((now - airGrip.frame) / 1000, 0, 0.085);
        const target = airHeld ? 1 : 0;
        airGrip.amount = MathUtils.damp(airGrip.amount, target, 13, dt);
        if (!airHeld) airGrip.amount *= 1 - MathUtils.smoothstep(progress, 0.88, 0.995);
        const middle = samples[Math.floor(samples.length / 2)];
        airGrip.pivot.copy(fallingPoint(middle, tornPage.matrixWorld, progress));
        updateGrip(airGrip, now, 0);
      }
      const movedSheets = movingSheets.size > 0;
      movingSheets.forEach(sheet => {
        sampleLift(sheet, now);
        updateLandedGrip(sheet, now);
      });
      renderer.render(scene, camera);
      return movedSheets;
    },
    dispose() {
      clearPile();
      page.geometry.dispose();
      binding.geometry.dispose();
      material.dispose();
      tornMaterial.dispose();
      landedMaterial.dispose();
      compactMaterial.dispose();
      renderer.dispose();
    },
  };
}
