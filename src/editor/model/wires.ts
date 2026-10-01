import type { Pt } from '@/shared/geometry'
import { GRID, snap } from '@/shared/geometry'

import { defOf, terminalWorld } from './geometry'
import { routeWire } from './routing'
import type { Doc, Endpoint, Item, Wire, WireStyle } from './types'

/** A routed wire: the corner points to draw, and where a new waypoint on each segment belongs. */
export interface WireGeometry {
  id: string;
  points: Pt[];
  /** For segment i (points[i] to points[i+1]): the index in `via` at which a waypoint dropped on it is inserted. */
  pairs: number[];
}

const DASHES = { dashed: "8 5", dotted: "2 5", dashdot: "10 4 2 4" } as const;

/** Stroke width and dash pattern for a wire style. */
export function wireStroke(style?: WireStyle): {
  width: number;
  dash?: string;
} {
  return {
    width: style?.width ?? 2,
    ...(style?.dash ? { dash: DASHES[style.dash] } : {}),
  };
}

export const JUNCTION_SYMBOL = "junction";
export const JUNCTION_TERMINAL = "1";

const EPS = 0.01;
const same = (a: Pt, b: Pt) =>
  Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const collinear = (a: Pt, b: Pt, c: Pt) =>
  (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) ||
  (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
const dirOf = (a: Pt, b: Pt): [number, number] => [
  Math.sign(b.x - a.x) + 0,
  Math.sign(b.y - a.y) + 0,
];
const dot = (a: [number, number], b: [number, number]) =>
  a[0] * b[0] + a[1] * b[1];
const isZero = (d: [number, number] | null) => !d || (d[0] === 0 && d[1] === 0);

/**
 * Drop zero-length and straight-through points, keeping each surviving segment's tag. A point where the wire
 * turns straight back is kept: the user put a waypoint there, so the wire has to reach it.
 */
function simplifyTagged(
  pts: Pt[],
  tags: number[],
): { points: Pt[]; pairs: number[] } {
  const points: Pt[] = [{ x: pts[0].x, y: pts[0].y }];
  const pairs: number[] = [];
  const forward = (a: Pt, b: Pt, c: Pt) =>
    (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) > 0;
  for (let i = 1; i < pts.length; i++) {
    const p = { x: pts[i].x, y: pts[i].y };
    if (same(points[points.length - 1], p)) continue;
    if (
      points.length >= 2 &&
      collinear(points[points.length - 2], points[points.length - 1], p) &&
      forward(points[points.length - 2], points[points.length - 1], p)
    ) {
      points[points.length - 1] = p; // extend the previous segment; it keeps its tag
    } else {
      points.push(p);
      pairs.push(tags[i - 1]);
    }
  }
  return { points, pairs };
}

/**
 * Route a wire through its waypoints. Between two waypoints that are not in line, one right-angle turn is
 * inserted, choosing the corner that does not double back on the previous leg and, at the very ends, leaves
 * and arrives the way the terminals face. The wire never goes straight back through its own part if a
 * better corner exists.
 */
export function routeThrough(
  p1: Pt,
  d1: [number, number],
  via: Pt[],
  p2: Pt,
  d2: [number, number] | null,
): { points: Pt[]; pairs: number[] } {
  const controls = [p1, ...via, p2];
  const pts: Pt[] = [p1];
  const tags: number[] = [];
  const push = (p: Pt, tag: number) => {
    pts.push(p);
    tags.push(tag);
  };
  for (let j = 0; j < controls.length - 1; j++) {
    const A = controls[j];
    const B = controls[j + 1];
    if (Math.abs(A.x - B.x) > EPS && Math.abs(A.y - B.y) > EPS) {
      const incoming: [number, number] =
        j === 0 ? d1 : dirOf(pts[pts.length - 2] ?? A, A);
      const last = j === controls.length - 2;
      const cands: Pt[] = [
        { x: B.x, y: A.y },
        { x: A.x, y: B.y },
      ];
      let best = cands[0];
      let bestScore = Infinity;
      for (const c of cands) {
        let score = 0;
        const leg = dirOf(A, c);
        if (!isZero(incoming)) {
          const d = dot(leg, incoming);
          if (d < 0) score += 1000;
          else if (d === 0) score += j === 0 ? 1500 : 30;
        }
        if (last && !isZero(d2)) {
          const behind: [number, number] = [c.x - B.x, c.y - B.y];
          const d = dot(behind, d2!);
          if (d < 0) score += 1000;
          else if (d === 0) score += 30;
        }
        if (score < bestScore) {
          best = c;
          bestScore = score;
        }
      }
      push(best, j);
    }
    push(B, j);
  }
  return simplifyTagged(pts, tags);
}

/** Geometry of one wire, or null when an endpoint no longer exists. */
export function wireGeometry(
  doc: Doc,
  w: Wire,
  items = new Map(doc.items.map((i) => [i.id, i])),
): WireGeometry | null {
  const ia = items.get(w.a.item);
  const ib = items.get(w.b.item);
  if (!ia || !ib) return null;
  const a = terminalWorld(ia, defOf(ia), w.a.term);
  const b = terminalWorld(ib, defOf(ib), w.b.term);
  if (!a || !b) return null;
  if (!w.via?.length) {
    const points = routeWire(a, [a.dx, a.dy], b, [b.dx, b.dy]).map((p) => ({
      x: p.x,
      y: p.y,
    }));
    return { id: w.id, points, pairs: points.slice(1).map((_, i) => i) };
  }
  return { id: w.id, ...routeThrough(a, [a.dx, a.dy], w.via, b, [b.dx, b.dy]) };
}

/** Route every wire from the current item positions. Wires with a missing endpoint are skipped. */
export function wireGeometries(doc: Doc): WireGeometry[] {
  const items = new Map(doc.items.map((i) => [i.id, i]));
  return doc.wires.flatMap((w) => {
    const g = wireGeometry(doc, w, items);
    return g ? [g] : [];
  });
}

const isJunction = (i: Item | undefined) => i?.symbolId === JUNCTION_SYMBOL;

/** Terminals with two or more wires get a dot. Junction parts draw their own dot. */
export function junctions(doc: Doc): Pt[] {
  const counts = new Map<string, number>();
  for (const w of doc.wires) {
    for (const e of [w.a, w.b])
      counts.set(
        `${e.item}|${e.term}`,
        (counts.get(`${e.item}|${e.term}`) ?? 0) + 1,
      );
  }
  const items = new Map(doc.items.map((i) => [i.id, i]));
  const pts: Pt[] = [];
  for (const [key, n] of counts) {
    if (n < 2) continue;
    const [itemId, termId] = key.split("|");
    const item = items.get(itemId);
    if (!item || isJunction(item)) continue;
    const p = terminalWorld(item, defOf(item), termId);
    if (p) pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

/** Move the waypoints of every wire whose two ends are both on moving parts, so its shape travels with them. */
export function shiftWires(
  wires: Wire[],
  ids: string[],
  dx: number,
  dy: number,
): Wire[] {
  if (dx === 0 && dy === 0) return wires;
  return wires.map((w) =>
    w.via && ids.includes(w.a.item) && ids.includes(w.b.item)
      ? { ...w, via: w.via.map((v) => ({ x: v.x + dx, y: v.y + dy })) }
      : w,
  );
}

/**
 * Waypoints that move one segment of a wire sideways by `offset` (dragging its handle). Both ends of a
 * segment that runs between two corners just slide along the neighbouring segments. An end that sits on a
 * terminal cannot move, so a short stub is kept there and the wire jogs across, which is how a straight
 * wire becomes a bump. The result replaces the wire's waypoints and is meant for routeThrough.
 */
export function shiftSegment(pts: Pt[], k: number, offset: number): Pt[] {
  const m = pts.length;
  const A = pts[k];
  const B = pts[k + 1];
  const horizontal = Math.abs(A.y - B.y) < EPS;
  const n = horizontal ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const u = horizontal
    ? { x: Math.sign(B.x - A.x), y: 0 }
    : { x: 0, y: Math.sign(B.y - A.y) };
  const len = Math.abs(horizontal ? B.x - A.x : B.y - A.y);
  const off = (p: Pt): Pt => ({ x: p.x + n.x * offset, y: p.y + n.y * offset });
  const stub = Math.max(10, Math.min(GRID, Math.floor(len / 3 / 10) * 10));

  const out: Pt[] = pts.slice(1, k); // corners before this segment stay as they are
  if (k === 0) {
    const a1 = { x: A.x + u.x * stub, y: A.y + u.y * stub };
    out.push(a1, off(a1));
  } else out.push(off(A));
  if (k + 1 === m - 1) {
    const b1 = { x: B.x - u.x * stub, y: B.y - u.y * stub };
    out.push(off(b1), b1);
  } else out.push(off(B));
  out.push(...pts.slice(k + 2, m - 1)); // corners after it
  return out;
}

/* ------------------------------------------------------------------ */
/* Finding a point on a wire, and splitting a wire there               */
/* ------------------------------------------------------------------ */

export interface WireHit {
  wireId: string;
  /** Closest point on the wire (not snapped). */
  point: Pt;
  /** Index of the segment it lies on: points[segment] to points[segment + 1]. */
  segment: number;
  distance: number;
}

function closestOnSegment(a: Pt, b: Pt, p: Pt): Pt {
  return {
    x: Math.min(Math.max(p.x, Math.min(a.x, b.x)), Math.max(a.x, b.x)),
    y: Math.min(Math.max(p.y, Math.min(a.y, b.y)), Math.max(a.y, b.y)),
  };
}

/** The closest point on any wire (skipping `exclude`) within `maxDist` of p. Wires are all right-angled, so segments are axis-aligned. */
export function nearestWirePoint(
  geoms: WireGeometry[],
  p: Pt,
  maxDist: number,
  exclude: Set<string> = new Set(),
): WireHit | null {
  let best: WireHit | null = null;
  for (const g of geoms) {
    if (exclude.has(g.id)) continue;
    for (let i = 0; i < g.points.length - 1; i++) {
      const q = closestOnSegment(g.points[i], g.points[i + 1], p);
      const distance = Math.hypot(q.x - p.x, q.y - p.y);
      if (distance <= maxDist && (!best || distance < best.distance))
        best = { wireId: g.id, point: q, segment: i, distance };
    }
  }
  return best;
}

/** Where a junction dropped near `point` on a segment would sit: on the segment, snapped to the grid along it. */
export function snapOnSegment(a: Pt, b: Pt, point: Pt): Pt {
  if (Math.abs(a.y - b.y) < EPS) {
    return {
      x: Math.min(
        Math.max(snap(point.x), Math.min(a.x, b.x)),
        Math.max(a.x, b.x),
      ),
      y: a.y,
    };
  }
  return {
    x: a.x,
    y: Math.min(
      Math.max(snap(point.y), Math.min(a.y, b.y)),
      Math.max(a.y, b.y),
    ),
  };
}

/** The snapped junction spot for a hit on a wire, or null when it would land on one of the wire's ends. */
export function tapPoint(g: WireGeometry, hit: WireHit): Pt | null {
  const q = snapOnSegment(
    g.points[hit.segment],
    g.points[hit.segment + 1],
    hit.point,
  );
  return same(q, g.points[0]) || same(q, g.points[g.points.length - 1])
    ? null
    : q;
}

export interface SplitResult {
  doc: Doc;
  /** Where the junction went (on the grid, on the wire). */
  point: Pt;
}

/**
 * Split a wire in two at a new junction part. The junction sits on the wire, nudged to the 20 px grid
 * along it. Each half keeps the wire's style and the shape it had: the corners on either side of the cut
 * become the halves' waypoints. Returns null if the spot is a wire end (nothing to split).
 */
export function splitWire(
  doc: Doc,
  wireId: string,
  at: Pt,
  junctionId: string,
  secondId: string,
): SplitResult | null {
  const w = doc.wires.find((x) => x.id === wireId);
  const g = w && wireGeometry(doc, w);
  if (!w || !g) return null;
  const hit = nearestWirePoint([g], at, Infinity);
  if (!hit) return null;
  const pts = g.points;
  const n = pts.length;
  const seg = { a: pts[hit.segment], b: pts[hit.segment + 1] };

  const q = tapPoint(g, hit);
  if (!q) return null;

  // Which corners lie before and after the cut?
  let firstVia: Pt[];
  let secondVia: Pt[];
  if (same(q, seg.b)) {
    firstVia = pts.slice(1, hit.segment + 1);
    secondVia = pts.slice(hit.segment + 2, n - 1);
  } else if (same(q, seg.a)) {
    firstVia = pts.slice(1, hit.segment);
    secondVia = pts.slice(hit.segment + 1, n - 1);
  } else {
    firstVia = pts.slice(1, hit.segment + 1);
    secondVia = pts.slice(hit.segment + 1, n - 1);
  }

  const junction: Item = {
    id: junctionId,
    symbolId: JUNCTION_SYMBOL,
    x: q.x,
    y: q.y,
    rot: 0,
    label: "",
  };
  const joint: Endpoint = { item: junctionId, term: JUNCTION_TERMINAL };
  const { via: _via, ...rest } = w;
  void _via;
  const first: Wire = {
    ...rest,
    b: joint,
    ...(firstVia.length ? { via: firstVia } : {}),
  };
  const second: Wire = {
    ...rest,
    id: secondId,
    a: joint,
    b: w.b,
    ...(secondVia.length ? { via: secondVia } : {}),
  };
  return {
    doc: {
      ...doc,
      items: [...doc.items, junction],
      wires: doc.wires.flatMap((x) =>
        x.id === wireId ? [first, second] : [x],
      ),
    },
    point: q,
  };
}

export interface TapRequest {
  wireId: string;
  at: Pt;
  from: Endpoint;
  junctionId: string;
  secondId: string;
  newId: string;
}

/** Connect `from` to the middle of an existing wire: split the wire at a junction, then wire `from` to it. */
export function tapWire(doc: Doc, r: TapRequest): Doc | null {
  const split = splitWire(doc, r.wireId, r.at, r.junctionId, r.secondId);
  if (!split) return null;
  const wire: Wire = {
    id: r.newId,
    a: r.from,
    b: { item: r.junctionId, term: JUNCTION_TERMINAL },
  };
  return { ...split.doc, wires: [...split.doc.wires, wire] };
}

export { GRID };
