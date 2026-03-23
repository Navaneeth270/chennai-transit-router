import { TransitGraph } from "@/lib/transit-graph";
import { LINE_LOOKUP } from "@/lib/transit-graph";
import { type RouteSearchResult, type PathEntry, makeSegment } from "./types";

export function dfsSearch(
  graph: TransitGraph,
  originId: string,
  destId: string,
  viaStations?: string[],
  maxTimeMin: number = 120.0,
): RouteSearchResult | null {
  if (graph.isNodeBlocked(originId) || graph.isNodeBlocked(destId)) return null;

  if (viaStations && viaStations.length > 0) {
    const waypoints = [originId, ...viaStations, destId];
    return multiWaypointDfs(graph, waypoints, maxTimeMin);
  }

  return singleDfs(graph, originId, destId, maxTimeMin);
}

function singleDfs(
  graph: TransitGraph,
  originId: string,
  destId: string,
  maxTimeMin: number,
): RouteSearchResult | null {
  let best: RouteSearchResult | null = null;

  type StackEntry = {
    current: string;
    path: PathEntry[];
    timeAcc: number;
    distAcc: number;
    visited: Set<string>;
  };

  const stack: StackEntry[] = [
    {
      current: originId,
      path: [[originId, ""]],
      timeAcc: 0,
      distAcc: 0,
      visited: new Set([originId]),
    },
  ];

  while (stack.length > 0) {
    const { current, path, timeAcc, distAcc, visited } = stack.pop()!;

    if (current === destId) {
      const candidate = buildResult(graph, path, timeAcc, distAcc);
      if (best === null || timeAcc < best.total_time_min) {
        best = candidate;
      }
      continue;
    }

    if (timeAcc > maxTimeMin) continue;

    for (const edge of graph.getTraversableNeighbors(current)) {
      if (!visited.has(edge.to_node_id)) {
        const effTime = graph.getEffectiveTravelTime(current, edge);
        const newTime = timeAcc + effTime;
        if (newTime <= maxTimeMin) {
          const newVisited = new Set(visited);
          newVisited.add(edge.to_node_id);
          stack.push({
            current: edge.to_node_id,
            path: [...path, [edge.to_node_id, edge.line_id]],
            timeAcc: newTime,
            distAcc: distAcc + edge.distance_km,
            visited: newVisited,
          });
        }
      }
    }
  }

  return best;
}

function multiWaypointDfs(
  graph: TransitGraph,
  waypoints: string[],
  maxTimeMin: number,
): RouteSearchResult | null {
  let fullPath: PathEntry[] = [];
  let totalTime = 0;
  let totalDist = 0;
  const globalVisited = new Set<string>();

  for (let i = 0; i < waypoints.length - 1; i++) {
    const sub = singleDfsVisited(
      graph,
      waypoints[i],
      waypoints[i + 1],
      maxTimeMin - totalTime,
      globalVisited,
    );
    if (!sub) return null;

    const subPath = fullPath.length > 0 ? sub.path.slice(1) : sub.path;
    fullPath = fullPath.concat(subPath);
    totalTime += sub.time;
    totalDist += sub.dist;
    for (const p of subPath) globalVisited.add(p[0]);
  }

  return buildResult(graph, fullPath, totalTime, totalDist);
}

function singleDfsVisited(
  graph: TransitGraph,
  originId: string,
  destId: string,
  maxTimeMin: number,
  alreadyVisited: Set<string>,
): { path: PathEntry[]; time: number; dist: number } | null {
  let best: { path: PathEntry[]; time: number; dist: number } | null = null;

  type StackEntry = {
    current: string;
    path: PathEntry[];
    timeAcc: number;
    distAcc: number;
    visited: Set<string>;
  };

  const initVisited = new Set(alreadyVisited);
  initVisited.add(originId);

  const stack: StackEntry[] = [
    {
      current: originId,
      path: [[originId, ""]],
      timeAcc: 0,
      distAcc: 0,
      visited: initVisited,
    },
  ];

  while (stack.length > 0) {
    const { current, path, timeAcc, distAcc, visited } = stack.pop()!;

    if (current === destId) {
      if (best === null || timeAcc < best.time) {
        best = { path, time: timeAcc, dist: distAcc };
      }
      continue;
    }

    if (timeAcc > maxTimeMin) continue;

    for (const edge of graph.getTraversableNeighbors(current)) {
      const nid = edge.to_node_id;
      if (!visited.has(nid) || nid === destId) {
        const effTime = graph.getEffectiveTravelTime(current, edge);
        const newTime = timeAcc + effTime;
        if (newTime <= maxTimeMin) {
          const newVisited = new Set(visited);
          newVisited.add(nid);
          stack.push({
            current: nid,
            path: [...path, [nid, edge.line_id]],
            timeAcc: newTime,
            distAcc: distAcc + edge.distance_km,
            visited: newVisited,
          });
        }
      }
    }
  }

  return best;
}

function buildResult(
  graph: TransitGraph,
  path: PathEntry[],
  totalTime: number,
  totalDist: number,
): RouteSearchResult {
  const segments = [];
  let segStart = 0;

  for (let i = 2; i < path.length; i++) {
    if (path[i][1] !== path[i - 1][1] && path[i - 1][1] !== "") {
      const lineId =
        path[i - 1][1] ||
        (segStart + 1 < path.length ? path[segStart + 1][1] : "WALK");
      segments.push(makeSegment(graph, path, segStart, i - 1, lineId));
      segStart = i - 1;
    }
  }

  if (segStart < path.length - 1) {
    const lineId =
      path[path.length - 1][1] ||
      (segStart + 1 < path.length ? path[segStart + 1][1] : "WALK");
    segments.push(makeSegment(graph, path, segStart, path.length - 1, lineId));
  }

  const totalCo2 = segments.reduce((s, seg) => s + seg.co2_grams, 0);
  let transfers = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].line !== segments[i - 1].line) transfers++;
  }

  return {
    segments,
    total_time_min: Math.round(totalTime * 10) / 10,
    total_distance_km: Math.round(totalDist * 100) / 100,
    total_transfers: transfers,
    total_co2_grams: Math.round(totalCo2 * 10) / 10,
    visited_ids: path.map((p) => p[0]),
  };
}
