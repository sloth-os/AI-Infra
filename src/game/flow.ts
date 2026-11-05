export interface FlowPoint {
  x: number
  y: number
  z: number
}
export function handoffProgress(remaining: number, total: number) {
  return Math.max(0, Math.min(1, 1 - remaining / Math.max(1, total)))
}
export function handoffPoint(
  a: { x: number; z: number },
  b: { x: number; z: number },
  t: number,
): FlowPoint {
  const p = Math.max(0, Math.min(1, t))
  return {
    x: a.x + (b.x - a.x) * p,
    y: 1.4 + Math.sin(p * Math.PI) * 3,
    z: a.z + (b.z - a.z) * p,
  }
}
// Each teaching bead represents eight output tokens, not an HTTP packet.
export function outputChunks(generated: number, output: number) {
  return Math.floor(Math.max(0, Math.min(generated, output)) / 8)
}
