import { MathUtils, Vector3, Vector4 } from "three";

const airDrag = 140;

export function throwDistance(velocity: number, duration: number) {
  return MathUtils.clamp(velocity, -2.8, 2.8) * airDrag * -Math.expm1(-duration / airDrag);
}

export type PaperThrow = { start: number; duration: number; distance: number; applied: number };

export function sampleThrow(glide: PaperThrow, now: number) {
  const elapsed = MathUtils.clamp(now - glide.start, 0, glide.duration);
  const distance = glide.distance * Math.expm1(-elapsed / airDrag) / Math.expm1(-glide.duration / airDrag);
  const delta = distance - glide.applied;
  glide.applied = distance;
  return { delta, done: elapsed === glide.duration };
}

export function createGrip() {
  return { shape: new Vector4(), pivot: new Vector3(), amount: 0, speed: 0, movedAt: 0, frame: 0 };
}

export type PaperGrip = ReturnType<typeof createGrip>;

export function updateGrip(grip: PaperGrip, now: number, pitch: number, immediate = false) {
  const dt = MathUtils.clamp((now - grip.frame) / 1000, 0, 0.085);
  const wind = MathUtils.clamp(grip.speed / 1.35, -1, 1) * Math.exp(-Math.max(0, now - grip.movedAt - 34) / 92);
  const flex = MathUtils.damp(grip.shape.y, wind, 16, dt);
  const flutter = (0.033 + 0.055 * Math.abs(flex)) * grip.amount;
  grip.shape.set(pitch, immediate ? 0 : flex, immediate ? 0 : flutter, now * 0.0068);
  grip.frame = now;
}

// Match the vertex shader so that the pointer follows the moving silhouette.
export function bendHeldPaper(position: Vector3, grip: PaperGrip, right: Vector3, forward: Vector3) {
  const { x: pitch, y: flex, z: flutter, w: phase } = grip.shape;
  if (pitch === 0 && flutter === 0) return position;

  const local = position.sub(grip.pivot);
  const across = local.dot(right);
  const along = local.dot(forward);
  const edge = Math.min((across / 1.45) ** 2, 1.5);
  const flexion = Math.sin(phase + across * 2.9 + along * 2.2) * flutter;
  const angle = pitch + (flex * across * 0.15 + flexion) * 10 * flutter;
  const height = local.y * Math.cos(angle) - along * Math.sin(angle);
  const depth = along * Math.cos(angle) + local.y * Math.sin(angle);

  return position.copy(grip.pivot)
    .addScaledVector(right, across - (flex * 2.7 * flutter + flexion * 0.28) * edge)
    .addScaledVector(forward, depth)
    .setY(grip.pivot.y + height + flexion * (0.5 + edge));
}

export const paperGripShader = `
  uniform vec3 paperRight;
  uniform vec3 paperForward;
  uniform vec3 gripPivot;
  uniform vec4 gripShape;

  vec3 bendHeldPaper(vec3 position) {
    if (gripShape.x == 0.0 && gripShape.z == 0.0) return position;
    vec3 local = position - gripPivot;
    float across = dot(local, paperRight);
    float along = dot(local, paperForward);
    float edge = min(pow(abs(across) / 1.45, 2.0), 1.5);
    float flexion = sin(gripShape.w + across * 2.9 + along * 2.2) * gripShape.z;
    float angle = gripShape.x + (gripShape.y * across * 0.15 + flexion) * 10.0 * gripShape.z;
    float height = local.y * cos(angle) - along * sin(angle);
    float depth = along * cos(angle) + local.y * sin(angle);
    vec3 bent = gripPivot + paperRight * (across - (gripShape.y * 2.7 * gripShape.z + flexion * 0.28) * edge) + paperForward * depth;
    bent.y = gripPivot.y + height + flexion * (0.5 + edge);
    return bent;
  }
`;
