import { TransitGraph } from "@/lib/transit-graph";
import { LINE_LOOKUP } from "@/lib/transit-graph";
import { type RouteSearchResult, type PathEntry, makeSegment } from "./types";

export function bfsSearch(
  graph: TransitGraph,
  originId: string,
  destId: string,
): RouteSearchResult | null {
  if (graph.isNodeBlocked(originId) || graph.isNodeBlocked(destId)) return null;

  type QueueEntry = {
    station: string;
    line: string;
    transfers: number;
    path: PathEntry[];
    timeAcc: number;
    distAcc: number;
  };

  const queue: QueueEntry[] = [];
  const visited = new Set<string>();

  for (const edge of graph.getTraversableNeighbors(originId)) {
    const stateKey = `${originId}|${edge.line_id}`;
    if (!visited.has(stateKey)) {
      visited.add(stateKey);
      const effTime = graph.getEffectiveTravelTime(originId, edge);
      const destKey = `${edge.to_node_id}|${edge.line_id}`;
      visited.add(destKey);
      queue.push({
        station: edge.to_node_id,
        line: edge.line_id,
        transfers: 0,
        path: [
          [originId, "START"],
          [edge.to_node_id, edge.line_id],
        ],
        timeAcc: effTime,
        distAcc: edge.distance_km,
      });
    }
  }

  let bestResult: RouteSearchResult | null = null;

  let head = 0;
  while (head < queue.length) {
    const { station, line, transfers, path, timeAcc, distAcc } = queue[head++];

    if (station === destId) {
      const candidate = buildResult(graph, path, timeAcc, distAcc, transfers);
      if (bestResult === null || transfers < bestResult.total_transfers) {
        bestResult = candidate;
      } else if (
        transfers === bestResult.total_transfers &&
        timeAcc < bestResult.total_time_min
      ) {
        bestResult = candidate;
      }
      continue;
    }

    for (const edge of graph.getTraversableNeighbors(station)) {
      const newLine = edge.line_id;
      const isTransfer = newLine !== line;
      const newTransfers = transfers + (isTransfer ? 1 : 0);

      if (bestResult && newTransfers > bestResult.total_transfers) continue;

      const stateKey = `${edge.to_node_id}|${newLine}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      const effTime = graph.getEffectiveTravelTime(station, edge);
      queue.push({
        station: edge.to_node_id,
        line: newLine,
        transfers: newTransfers,
        path: [...path, [edge.to_node_id, newLine]],
        timeAcc: timeAcc + effTime,
        distAcc: distAcc + edge.distance_km,
      });
    }
  }

  return bestResult;
}

function buildResult(
  graph: TransitGraph,
  path: PathEntry[],
  totalTime: number,
  totalDist: number,
  transfers: number,
): RouteSearchResult {
  const segments = [];
  let segStart = 0;

  for (let i = 1; i < path.length; i++) {
    if (path[i][1] !== path[segStart][1] && path[segStart][1] !== "START") {
      segments.push(makeSegmentBfs(graph, path, segStart, i - 1));
      segStart = i - 1;
    } else if (path[segStart][1] === "START" && i > 0) {
      const segStartLine = path.length > 1 ? path[1][1] : "";
      if (i > 1 && path[i][1] !== segStartLine) {
        segments.push(makeSegmentBfs(graph, path, 0, i - 1));
        segStart = i - 1;
      }
    }
  }

  segments.push(makeSegmentBfs(graph, path, segStart, path.length - 1));

  const totalCo2 = segments.reduce((s, seg) => s + seg.co2_grams, 0);

  return {
    segments,
    total_time_min: Math.round(totalTime * 10) / 10,
    total_distance_km: Math.round(totalDist * 100) / 100,
    total_transfers: transfers,
    total_co2_grams: Math.round(totalCo2 * 10) / 10,
    visited_ids: path.map((p) => p[0]),
  };
}

function makeSegmentBfs(
  graph: TransitGraph,
  path: PathEntry[],
  start: number,
  end: number,
) {
  let lineId = path[end][1];
  if (lineId === "START" && end > start) {
    lineId = path[start + 1][1];
  }
  return makeSegment(graph, path, start, end, lineId);
}
