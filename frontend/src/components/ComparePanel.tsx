"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Route,
  ArrowRightLeft,
  Leaf,
  Cpu,
  Zap,
  GitBranch,
  Compass,
  Trophy,
  Map,
  Eye,
  EyeOff,
} from "lucide-react";
import type { RouteResult, AlgorithmType } from "@/types/transit";
import { ALGORITHM_META } from "@/types/transit";

interface Props {
  results: Record<string, RouteResult>;
  onClose: () => void;
  highlightedAlgo: AlgorithmType | null;
  onHighlight: (algo: AlgorithmType | null) => void;
  visibleAlgos: Set<AlgorithmType>;
  onToggleVisibility: (algo: AlgorithmType) => void;
}

const ALGO_ICONS: Record<string, React.ReactNode> = {
  astar: <Zap size={14} />,
  bfs: <GitBranch size={14} />,
  dfs: <Compass size={14} />,
  eco: <Leaf size={14} />,
};

const ALGO_ORDER: AlgorithmType[] = ["astar", "bfs", "dfs", "eco"];

function getBestIn(results: Record<string, RouteResult>) {
  const entries = Object.entries(results);
  if (entries.length === 0) return { fastest: null, shortest: null, greenest: null, fewestTransfers: null };

  let fastest = entries[0], shortest = entries[0], greenest = entries[0], fewestTransfers = entries[0];
  for (const e of entries) {
    if (e[1].total_time_min < fastest[1].total_time_min) fastest = e;
    if (e[1].total_distance_km < shortest[1].total_distance_km) shortest = e;
    if (e[1].emissions.total_co2_grams < greenest[1].emissions.total_co2_grams) greenest = e;
    if (e[1].total_transfers < fewestTransfers[1].total_transfers) fewestTransfers = e;
  }
  return {
    fastest: fastest[0],
    shortest: shortest[0],
    greenest: greenest[0],
    fewestTransfers: fewestTransfers[0],
  };
}

export default function ComparePanel({ results, onClose, highlightedAlgo, onHighlight, visibleAlgos, onToggleVisibility }: Props) {
  const best = getBestIn(results);
  const availableAlgos = ALGO_ORDER.filter((a) => a in results);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 65, damping: 18, delay: 0.15 } }}
      exit={{ x: 400, opacity: 0, transition: { duration: 0.25, ease: "easeIn" as const } }}
      className="absolute top-4 right-4 bottom-4 w-[400px] z-20 glass-panel flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 pb-3 border-b border-border-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/15 to-accent-magenta/15 flex items-center justify-center border border-white/10">
              <Route size={16} className="text-accent-cyan" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-text-primary">Algorithm Comparison</div>
              <p className="text-[10px] text-text-muted mt-0.5">{availableAlgos.length} algorithms computed</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/6 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 transition-all">
            <X size={16} className="text-text-secondary" />
          </motion.button>
        </div>
      </div>

      {/* Winner badges */}
      <div className="px-4 py-3 border-b border-border-glass">
        <div className="grid grid-cols-2 gap-2">
          <WinnerBadge label="Fastest" algo={best.fastest} icon={<Clock size={10} />} />
          <WinnerBadge label="Shortest" algo={best.shortest} icon={<Route size={10} />} />
          <WinnerBadge label="Greenest" algo={best.greenest} icon={<Leaf size={10} />} />
          <WinnerBadge label="Min Transfers" algo={best.fewestTransfers} icon={<ArrowRightLeft size={10} />} />
        </div>
      </div>

      {/* Results cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {availableAlgos.map((algo, idx) => {
          const r = results[algo];
          const meta = ALGORITHM_META[algo];
          const isHighlighted = highlightedAlgo === algo;
          const isVisible = visibleAlgos.has(algo);

          const badges: string[] = [];
          if (best.fastest === algo) badges.push("Fastest");
          if (best.shortest === algo) badges.push("Shortest");
          if (best.greenest === algo) badges.push("Greenest");
          if (best.fewestTransfers === algo) badges.push("Fewest Transfers");

          return (
            <motion.div
              key={algo}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.08 }}
              onMouseEnter={() => onHighlight(algo)}
              onMouseLeave={() => onHighlight(null)}
              className={`rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                isHighlighted
                  ? "border-white/20 bg-white/6 shadow-lg"
                  : "border-white/5 bg-white/2 hover:bg-white/4"
              }`}
              style={isHighlighted ? { boxShadow: `0 0 20px ${meta.glow}` } : {}}
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: meta.color + "18" }}>
                  <span style={{ color: meta.color }}>{ALGO_ICONS[algo]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: meta.color }}>
                      {meta.label.split(" \u2014 ")[0]}
                    </span>
                    {badges.map((b) => (
                      <span key={b} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-400/15 text-amber-400">
                        <Trophy size={7} />{b}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted">{meta.description}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(algo); }}
                  className={`p-1.5 rounded-lg transition-colors ${isVisible ? "hover:bg-white/5" : "bg-white/3 opacity-50"}`}
                  title={isVisible ? "Hide from map" : "Show on map"}
                >
                  {isVisible ? <Eye size={13} style={{ color: meta.color }} /> : <EyeOff size={13} className="text-text-muted" />}
                </motion.button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 divide-x divide-border-glass border-t border-border-glass">
                <MiniStat
                  value={`${Math.round(r.total_time_min)}`} unit="min" label="Time"
                  highlight={best.fastest === algo} color={meta.color}
                />
                <MiniStat
                  value={r.total_distance_km.toFixed(1)} unit="km" label="Dist"
                  highlight={best.shortest === algo} color={meta.color}
                />
                <MiniStat
                  value={`${r.total_transfers}`} unit="" label="Transfers"
                  highlight={best.fewestTransfers === algo} color={meta.color}
                />
                <MiniStat
                  value={`${Math.round(r.emissions.total_co2_grams)}`} unit="g" label="CO2"
                  highlight={best.greenest === algo} color={meta.color}
                />
              </div>

              {/* Emission bar */}
              <div className="px-4 py-2 border-t border-white/3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-text-muted">Carbon savings vs car</span>
                  <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                    {Math.round(r.emissions.co2_saved_percent)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.emissions.co2_saved_percent}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                </div>
              </div>

              {/* Computation time */}
              <div className="px-4 py-1.5 border-t border-white/3 flex items-center gap-1">
                <Cpu size={9} className="text-text-muted" />
                <span className="text-[9px] text-text-muted">
                  Computed in <span className="text-text-secondary font-medium">{r.computation_time_ms.toFixed(1)}ms</span>
                  {" · "}{r.segments.length} segment{r.segments.length !== 1 ? "s" : ""}
                  {" · "}{r.path_coordinates.length} stops
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Summary comparison table */}
        {availableAlgos.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-white/5 bg-white/2 overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-white/5">
              <span className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Quick Comparison</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-2 text-text-muted font-medium">Metric</th>
                    {availableAlgos.map((algo) => (
                      <th key={algo} className="px-3 py-2 text-center font-semibold" style={{ color: ALGORITHM_META[algo].color }}>
                        {ALGORITHM_META[algo].label.split(" \u2014 ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Time" values={availableAlgos.map((a) => `${Math.round(results[a].total_time_min)} min`)} bestIdx={availableAlgos.indexOf(best.fastest as AlgorithmType)} algos={availableAlgos} />
                  <CompareRow label="Distance" values={availableAlgos.map((a) => `${results[a].total_distance_km.toFixed(1)} km`)} bestIdx={availableAlgos.indexOf(best.shortest as AlgorithmType)} algos={availableAlgos} />
                  <CompareRow label="Transfers" values={availableAlgos.map((a) => `${results[a].total_transfers}`)} bestIdx={availableAlgos.indexOf(best.fewestTransfers as AlgorithmType)} algos={availableAlgos} />
                  <CompareRow label="CO2" values={availableAlgos.map((a) => `${Math.round(results[a].emissions.total_co2_grams)}g`)} bestIdx={availableAlgos.indexOf(best.greenest as AlgorithmType)} algos={availableAlgos} />
                  <CompareRow label="CO2 Saved" values={availableAlgos.map((a) => `${Math.round(results[a].emissions.co2_saved_percent)}%`)} bestIdx={availableAlgos.indexOf(best.greenest as AlgorithmType)} algos={availableAlgos} />
                  <CompareRow label="Speed" values={availableAlgos.map((a) => `${results[a].computation_time_ms.toFixed(1)}ms`)} bestIdx={-1} algos={availableAlgos} />
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom close */}
      <div className="p-3 border-t border-border-glass">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onClose}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all text-[12px] font-medium text-text-secondary">
          <Map size={14} />Close & View Map
        </motion.button>
      </div>
    </motion.div>
  );
}

function WinnerBadge({ label, algo, icon }: { label: string; algo: string | null; icon: React.ReactNode }) {
  if (!algo) return null;
  const meta = ALGORITHM_META[algo as AlgorithmType];
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/3 border border-white/5">
      <span className="text-text-muted">{icon}</span>
      <div>
        <div className="text-[9px] text-text-muted uppercase tracking-wider">{label}</div>
        <div className="text-[10px] font-semibold" style={{ color: meta.color }}>
          {meta.label.split(" \u2014 ")[0]}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, unit, label, highlight, color }: { value: string; unit: string; label: string; highlight: boolean; color: string }) {
  return (
    <div className={`py-2 px-2 flex flex-col items-center gap-0.5 ${highlight ? "bg-white/3" : ""}`}>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-[13px] font-bold ${highlight ? "" : "text-text-primary"}`} style={highlight ? { color } : {}}>
          {value}
        </span>
        {unit && <span className="text-[8px] text-text-muted">{unit}</span>}
      </div>
      <span className="text-[8px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function CompareRow({ label, values, bestIdx, algos }: { label: string; values: string[]; bestIdx: number; algos: AlgorithmType[] }) {
  return (
    <tr className="border-b border-white/3 last:border-0">
      <td className="px-3 py-1.5 text-text-muted font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-3 py-1.5 text-center ${i === bestIdx ? "font-bold" : "text-text-secondary"}`}
          style={i === bestIdx ? { color: ALGORITHM_META[algos[i]].color } : {}}>
          {v}
        </td>
      ))}
    </tr>
  );
}
