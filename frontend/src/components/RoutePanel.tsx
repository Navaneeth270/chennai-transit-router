"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Route,
  ArrowRightLeft,
  ChevronDown,
  Cpu,
  TrainFront,
  Bus,
  Footprints,
  MapPin,
  Leaf,
  Map,
} from "lucide-react";
import { useState } from "react";
import type { RouteResult, RouteSegment, WalkingLeg } from "@/types/transit";
import { ALGORITHM_META } from "@/types/transit";

interface Props {
  route: RouteResult;
  onClose: () => void;
  walkingLegs?: WalkingLeg[];
}

const panelVariants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 65, damping: 18, delay: 0.3 },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: { duration: 0.25, ease: "easeIn" as const },
  },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.5 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

export default function RoutePanel({ route, onClose, walkingLegs = [] }: Props) {
  const meta = ALGORITHM_META[route.algorithm];
  const emissions = route.emissions;
  const hasWalking = walkingLegs.length > 0;
  const totalWalkTime = walkingLegs.reduce((s, l) => s + l.walk_time_min, 0);
  const totalWalkDist = walkingLegs.reduce((s, l) => s + l.distance_km, 0);

  const co2SavedBadge = emissions
    ? emissions.co2_saved_percent > 70
      ? { label: "Excellent", color: "#22c55e" }
      : emissions.co2_saved_percent > 40
        ? { label: "Good", color: "#eab308" }
        : { label: "Moderate", color: "#f97316" }
    : null;

  const transitBarPercent = emissions
    ? Math.max(5, (emissions.total_co2_grams / emissions.car_equivalent_co2_grams) * 100)
    : 0;

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute top-4 right-4 bottom-4 w-[360px] z-20 glass-panel flex flex-col overflow-hidden"
    >
      {/* ─── Header with close button ─── */}
      <div className="p-4 pb-3 border-b border-border-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: meta.color + "15",
                boxShadow: `0 0 16px ${meta.glow}`,
              }}
            >
              <Route size={16} style={{ color: meta.color }} />
            </div>
            <div>
              <div
                className="text-[12px] font-semibold uppercase tracking-wider"
                style={{ color: meta.color }}
              >
                {meta.label}
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">
                Route computed successfully
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/6 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 transition-all duration-200"
            title="Close route panel"
          >
            <X size={16} className="text-text-secondary" />
          </motion.button>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-4 divide-x divide-border-glass border-b border-border-glass"
      >
        <StatCell
          icon={<Clock size={13} />}
          value={`${Math.round(route.total_time_min)}`}
          unit="min"
          label="Duration"
          color={meta.color}
        />
        <StatCell
          icon={<Route size={13} />}
          value={route.total_distance_km.toFixed(1)}
          unit="km"
          label="Distance"
          color={meta.color}
        />
        <StatCell
          icon={<ArrowRightLeft size={13} />}
          value={`${route.total_transfers}`}
          unit=""
          label="Transfers"
          color={meta.color}
        />
        <StatCell
          icon={<Leaf size={13} />}
          value={emissions ? `${Math.round(emissions.co2_saved_percent)}` : "\u2014"}
          unit="%"
          label="CO\u2082 Saved"
          color="#22c55e"
        />
      </motion.div>

      {/* ─── Computation badge ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-4 py-2 flex items-center gap-1.5 border-b border-border-glass"
      >
        <Cpu size={10} className="text-text-muted" />
        <span className="text-[10px] text-text-muted">
          Computed in{" "}
          <span className="text-text-secondary font-medium">
            {route.computation_time_ms.toFixed(1)}ms
          </span>
        </span>
      </motion.div>

      {/* ─── Emission Dashboard ─── */}
      {emissions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="px-4 py-3 border-b border-border-glass space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Leaf size={11} className="text-green-400" />
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">
                Carbon Footprint
              </span>
            </div>
            {co2SavedBadge && (
              <span
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: co2SavedBadge.color + "18",
                  color: co2SavedBadge.color,
                }}
              >
                {co2SavedBadge.label}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-secondary">This route</span>
                <span className="text-[10px] text-text-muted">
                  {Math.round(emissions.total_co2_grams)}g CO\u2082
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${transitBarPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" as const }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-text-secondary">Car equivalent</span>
                <span className="text-[10px] text-text-muted">
                  {Math.round(emissions.car_equivalent_co2_grams)}g CO\u2082
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" as const }}
                  className="h-full rounded-full bg-red-500/60"
                />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-text-muted text-center pt-0.5">
            <span className="text-text-secondary font-medium">
              {Math.round(emissions.total_co2_grams)}g
            </span>{" "}
            CO\u2082 vs{" "}
            <span className="text-text-secondary font-medium">
              {Math.round(emissions.car_equivalent_co2_grams)}g
            </span>{" "}
            by car · You save{" "}
            <span className="text-green-400 font-semibold">
              {Math.round(emissions.co2_saved_percent)}%
            </span>{" "}
            carbon
          </div>
        </motion.div>
      )}

      {/* ─── Journey Steps ─── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {/* Walking leg to origin station */}
        {walkingLegs.filter(l => l.to.label === route.segments[0]?.from_station.name).map((leg, i) => (
          <motion.div key={`walk-start-${i}`} variants={staggerItem} className="flex items-start gap-3 pb-1">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-400" />
              <div className="w-px h-8 border-l-2 border-dashed border-slate-500" />
            </div>
            <div>
              <span className="text-[12px] font-medium text-blue-400">{leg.from.label}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Footprints size={10} className="text-slate-400" />
                <span className="text-[10px] text-text-muted">
                  Walk {leg.distance_km.toFixed(2)} km · ~{Math.round(leg.walk_time_min)} min to {leg.to.label}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Origin marker */}
        <motion.div variants={staggerItem} className="flex items-center gap-3 pb-1">
          <div className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: meta.color, backgroundColor: meta.color + "30" }}
            />
            <div className="w-px h-4 bg-border-glass" />
          </div>
          <div>
            <span className="text-[12px] font-medium text-text-primary">
              {route.segments[0]?.from_station.name}
            </span>
            <span className="text-[10px] text-text-muted ml-2">{hasWalking ? "Board here" : "Start"}</span>
          </div>
        </motion.div>

        {route.segments.map((seg, i) => (
          <motion.div key={i} variants={staggerItem}>
            <SegmentAccordion segment={seg} index={i} color={meta.color} />
          </motion.div>
        ))}

        {/* Destination marker */}
        <motion.div variants={staggerItem} className="flex items-center gap-3 pt-1">
          <div className="flex flex-col items-center">
            <div className="w-px h-4 bg-border-glass" />
            <MapPin size={14} style={{ color: meta.color }} />
          </div>
          <div>
            <span className="text-[12px] font-medium text-text-primary">
              {route.segments[route.segments.length - 1]?.to_station.name}
            </span>
            <span className="text-[10px] text-text-muted ml-2">{hasWalking ? "Alight here" : "Destination"}</span>
          </div>
        </motion.div>

        {/* Walking leg from exit station to destination */}
        {walkingLegs.filter(l => l.from.label === route.segments[route.segments.length - 1]?.to_station.name).map((leg, i) => (
          <motion.div key={`walk-end-${i}`} variants={staggerItem} className="flex items-start gap-3 pt-1">
            <div className="flex flex-col items-center">
              <div className="w-px h-8 border-l-2 border-dashed border-slate-500" />
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-400" />
            </div>
            <div className="mt-4">
              <span className="text-[12px] font-medium text-blue-400">{leg.to.label}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Footprints size={10} className="text-slate-400" />
                <span className="text-[10px] text-text-muted">
                  Walk {leg.distance_km.toFixed(2)} km · ~{Math.round(leg.walk_time_min)} min from {leg.from.label}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Total door-to-door summary */}
        {hasWalking && (
          <motion.div variants={staggerItem} className="mt-3 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
            <div className="flex items-center gap-2 mb-1">
              <Footprints size={12} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400">Door-to-Door Summary</span>
            </div>
            <div className="text-[10px] text-text-muted leading-relaxed">
              Total walk: <span className="text-text-secondary font-medium">{totalWalkDist.toFixed(2)} km · ~{Math.round(totalWalkTime)} min</span>
              <br />
              Total journey: <span className="text-text-secondary font-medium">{(route.total_distance_km + totalWalkDist).toFixed(1)} km · ~{Math.round(route.total_time_min + totalWalkTime)} min</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ─── Bottom close button (always visible) ─── */}
      <div className="p-3 border-t border-border-glass">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2
                     bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/15
                     transition-all duration-200 text-[12px] font-medium text-text-secondary"
        >
          <Map size={14} />
          Close & View Map
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Stat Cell ─── */
function StatCell({
  icon,
  value,
  unit,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
  color: string;
}) {
  return (
    <div className="py-3 px-2 flex flex-col items-center gap-0.5">
      <span className="text-text-muted">{icon}</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[15px] font-bold text-text-primary">{value}</span>
        {unit && <span className="text-[10px] text-text-muted">{unit}</span>}
      </div>
      <span className="text-[9px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── Segment Accordion ─── */
function SegmentAccordion({
  segment,
  index,
  color,
}: {
  segment: RouteSegment;
  index: number;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const hasIntermediates = segment.intermediate_stations.length > 0;

  const ModeIcon =
    segment.mode === "metro"
      ? TrainFront
      : segment.mode === "bus"
        ? Bus
        : Footprints;

  const modeLabel =
    segment.mode === "metro"
      ? "Metro"
      : segment.mode === "bus"
        ? "Bus"
        : "Walk";

  const LINE_COLORS: Record<string, string> = {
    BL: "#06b6d4",
    GL: "#22c55e",
    MTC21: "#f59e0b",
    MTC27: "#ef4444",
    MTC29C: "#a855f7",
    WALK: "#64748b",
  };
  const lineColor = LINE_COLORS[segment.line] || color;

  return (
    <div className="relative">
      <div className="absolute left-[5px] top-0 bottom-0 w-px bg-border-glass" />

      <div className="ml-4 rounded-xl border border-white/5 overflow-hidden bg-white/2 hover:bg-white/3 transition-colors">
        <button
          onClick={() => hasIntermediates && setOpen(!open)}
          className="w-full flex items-center gap-2.5 p-3 text-left"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: lineColor + "18" }}
          >
            <ModeIcon size={14} style={{ color: lineColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-text-primary truncate">
              {segment.to_station.name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                style={{ backgroundColor: lineColor + "20", color: lineColor }}
              >
                {segment.line}
              </div>
              <span className="text-[10px] text-text-muted">
                {modeLabel} · {Math.round(segment.travel_time_min)} min ·{" "}
                {segment.distance_km.toFixed(1)} km
              </span>
            </div>
          </div>

          {hasIntermediates && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted">
                {segment.intermediate_stations.length}
              </span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={13} className="text-text-muted" />
              </motion.div>
            </div>
          )}
        </button>

        <AnimatePresence initial={false}>
          {open && hasIntermediates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" as const }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 ml-9 border-t border-white/4 pt-2 space-y-0.5">
                {segment.intermediate_stations.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 py-1">
                    <div
                      className="w-[5px] h-[5px] rounded-full border"
                      style={{ borderColor: lineColor, backgroundColor: lineColor + "40" }}
                    />
                    <span className="text-[11px] text-text-secondary">{st.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
