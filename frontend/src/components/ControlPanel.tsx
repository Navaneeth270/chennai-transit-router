"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  ArrowUpDown,
  Loader2,
  MapPin,
  Search,
  Zap,
  GitBranch,
  Compass,
  Leaf,
  AlertCircle,
  AlertTriangle,
  Plus,
  X,
  LocateFixed,
  Crosshair,
  Route,
} from "lucide-react";
import type { AlgorithmType, Station, CustomLocation, NearestStationResult } from "@/types/transit";
import { ALGORITHM_META } from "@/types/transit";

interface Props {
  onSearch: (
    originId: string,
    destinationId: string,
    algorithm: AlgorithmType,
    viaStations?: string[],
    maxTime?: number,
    originCustom?: CustomLocation,
    destCustom?: CustomLocation,
  ) => void;
  onCompare: (originId: string, destinationId: string) => void;
  isLoading: boolean;
  onStationsLoaded: (stations: Station[]) => void;
  error: string | null;
  disruptionsEnabled: boolean;
  onToggleDisruptions: () => void;
  onClose: () => void;
  mapPickMode: "origin" | "dest" | null;
  onStartMapPick: (target: "origin" | "dest") => void;
}

const ALGO_ICONS: Record<AlgorithmType, React.ReactNode> = {
  astar: <Zap size={15} />,
  bfs: <GitBranch size={15} />,
  dfs: <Compass size={15} />,
  eco: <Leaf size={15} />,
};

export default function ControlPanel({
  onSearch,
  onCompare,
  isLoading,
  onStationsLoaded,
  error,
  disruptionsEnabled,
  onToggleDisruptions,
  onClose,
  mapPickMode,
  onStartMapPick,
}: Props) {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("astar");
  const [viaStations, setViaStations] = useState<{ id: string; name: string }[]>([]);
  const [viaQuery, setViaQuery] = useState("");
  const [showViaDropdown, setShowViaDropdown] = useState(false);

  const [originCustom, setOriginCustom] = useState<CustomLocation | null>(null);
  const [destCustom, setDestCustom] = useState<CustomLocation | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    setStationsLoading(true);
    fetch("/api/stations")
      .then((res) => res.json())
      .then((data: Station[]) => {
        setStations(data);
        onStationsLoaded(data);
      })
      .catch(() => {})
      .finally(() => setStationsLoading(false));
  }, [onStationsLoaded]);

  const filterStations = useCallback(
    (query: string, exclude?: string[]) => {
      const excl = new Set(exclude || []);
      return stations
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) &&
            !excl.has(s.id),
        )
        .slice(0, 8);
    },
    [stations],
  );

  const findNearestStation = async (lat: number, lng: number): Promise<NearestStationResult | null> => {
    try {
      const res = await fetch(`/api/nearest-station?lat=${lat}&lng=${lng}&count=1`);
      if (!res.ok) return null;
      const data: NearestStationResult[] = await res.json();
      return data[0] || null;
    } catch {
      return null;
    }
  };

  const useMyLocation = async (target: "origin" | "dest") => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = await findNearestStation(latitude, longitude);

        if (nearest) {
          const custom: CustomLocation = {
            lat: latitude,
            lng: longitude,
            label: "My Location",
          };

          if (target === "origin") {
            setOriginCustom(custom);
            setOriginQuery(`My Location (walk to ${nearest.station.name})`);
            setOriginId(nearest.station.id);
          } else {
            setDestCustom(custom);
            setDestQuery(`My Location (walk from ${nearest.station.name})`);
            setDestId(nearest.station.id);
          }
        }
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Called from parent when map is clicked in pick mode
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lng: number; target: "origin" | "dest" }>) => {
      const { lat, lng, target } = e.detail;
      (async () => {
        const nearest = await findNearestStation(lat, lng);
        if (!nearest) return;

        const custom: CustomLocation = { lat, lng, label: "Picked Location" };

        if (target === "origin") {
          setOriginCustom(custom);
          setOriginQuery(`Map pin (walk to ${nearest.station.name})`);
          setOriginId(nearest.station.id);
        } else {
          setDestCustom(custom);
          setDestQuery(`Map pin (walk from ${nearest.station.name})`);
          setDestId(nearest.station.id);
        }
      })();
    };

    window.addEventListener("map-location-picked" as any, handler as any);
    return () => window.removeEventListener("map-location-picked" as any, handler as any);
  }, []);

  const handleSwap = () => {
    setOriginQuery(destQuery);
    setDestQuery(originQuery);
    setOriginId(destId);
    setDestId(originId);
    const tmpCustom = originCustom;
    setOriginCustom(destCustom);
    setDestCustom(tmpCustom);
  };

  const handleSubmit = () => {
    if (!originId || !destId || originId === destId) return;
    const viaIds = algorithm === "dfs" ? viaStations.map((v) => v.id) : undefined;
    onSearch(
      originId,
      destId,
      algorithm,
      viaIds,
      algorithm === "dfs" ? 120 : undefined,
      originCustom || undefined,
      destCustom || undefined,
    );
  };

  const addViaStation = (station: Station) => {
    if (viaStations.length >= 3) return;
    setViaStations((prev) => [...prev, { id: station.id, name: station.name }]);
    setViaQuery("");
    setShowViaDropdown(false);
  };

  const removeViaStation = (id: string) => {
    setViaStations((prev) => prev.filter((v) => v.id !== id));
  };

  const clearOriginCustom = () => {
    setOriginCustom(null);
    setOriginQuery("");
    setOriginId("");
  };

  const clearDestCustom = () => {
    setDestCustom(null);
    setDestQuery("");
    setDestId("");
  };

  const canSubmit = originId && destId && originId !== destId && !isLoading;

  return (
    <motion.div
      initial={{ x: -420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -420, opacity: 0, transition: { duration: 0.25, ease: "easeIn" as const } }}
      transition={{ type: "spring" as const, stiffness: 70, damping: 18, delay: 0.1 }}
      className="absolute top-4 left-4 bottom-4 w-[380px] z-20 glass-panel flex flex-col"
    >
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border-glass">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-cyan/5 flex items-center justify-center border border-accent-cyan/20">
            <Train size={20} className="text-accent-cyan" />
          </div>
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold tracking-tight">Chennai Transit</h1>
            <p className="text-[11px] text-text-muted mt-0.5">Door-to-door route planner</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            title="Close panel"
          >
            <X size={16} className="text-text-muted" />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Station Inputs */}
        <div className="p-5 pb-3 space-y-2.5">
          {/* Origin */}
          <div>
            {originCustom ? (
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-accent-emerald/8 border border-accent-emerald/20">
                <LocateFixed size={15} className="text-accent-emerald flex-shrink-0" />
                <span className="flex-1 text-[13px] text-text-primary truncate">{originQuery}</span>
                <button onClick={clearOriginCustom} className="p-0.5 hover:bg-white/10 rounded">
                  <X size={12} className="text-text-muted" />
                </button>
              </div>
            ) : (
              <StationInput
                label="Origin"
                icon={<MapPin size={15} className="text-accent-emerald" />}
                query={originQuery}
                onQueryChange={(q) => { setOriginQuery(q); setOriginId(""); }}
                stations={stations}
                filterStations={filterStations}
                onSelect={(s) => { setOriginQuery(s.name); setOriginId(s.id); }}
                selectedId={originId}
                loading={stationsLoading}
              />
            )}
            <div className="flex gap-1 mt-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => useMyLocation("origin")}
                disabled={geoLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-accent-cyan hover:bg-accent-cyan/8 transition-colors"
              >
                {geoLoading ? <Loader2 size={10} className="animate-spin" /> : <LocateFixed size={10} />}
                Use GPS
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onStartMapPick("origin")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                  mapPickMode === "origin"
                    ? "text-accent-emerald bg-accent-emerald/10"
                    : "text-text-muted hover:bg-white/5"
                }`}
              >
                <Crosshair size={10} />
                {mapPickMode === "origin" ? "Click map..." : "Pick on map"}
              </motion.button>
            </div>
          </div>

          <div className="flex justify-center -my-0.5">
            <motion.button
              whileHover={{ scale: 1.15, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSwap}
              className="p-1.5 rounded-full bg-white/3 hover:bg-white/6 border border-white/5 transition-colors"
            >
              <ArrowUpDown size={13} className="text-text-muted" />
            </motion.button>
          </div>

          {/* Destination */}
          <div>
            {destCustom ? (
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-accent-magenta/8 border border-accent-magenta/20">
                <LocateFixed size={15} className="text-accent-magenta flex-shrink-0" />
                <span className="flex-1 text-[13px] text-text-primary truncate">{destQuery}</span>
                <button onClick={clearDestCustom} className="p-0.5 hover:bg-white/10 rounded">
                  <X size={12} className="text-text-muted" />
                </button>
              </div>
            ) : (
              <StationInput
                label="Destination"
                icon={<MapPin size={15} className="text-accent-magenta" />}
                query={destQuery}
                onQueryChange={(q) => { setDestQuery(q); setDestId(""); }}
                stations={stations}
                filterStations={filterStations}
                onSelect={(s) => { setDestQuery(s.name); setDestId(s.id); }}
                selectedId={destId}
                loading={stationsLoading}
              />
            )}
            <div className="flex gap-1 mt-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => useMyLocation("dest")}
                disabled={geoLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-accent-cyan hover:bg-accent-cyan/8 transition-colors"
              >
                {geoLoading ? <Loader2 size={10} className="animate-spin" /> : <LocateFixed size={10} />}
                Use GPS
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onStartMapPick("dest")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                  mapPickMode === "dest"
                    ? "text-accent-magenta bg-accent-magenta/10"
                    : "text-text-muted hover:bg-white/5"
                }`}
              >
                <Crosshair size={10} />
                {mapPickMode === "dest" ? "Click map..." : "Pick on map"}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Algorithm Selector */}
        <div className="px-5 pb-4">
          <p className="text-[10px] text-text-muted mb-2 uppercase tracking-widest font-medium">Route Strategy</p>
          <div className="space-y-1">
            {(Object.keys(ALGORITHM_META) as AlgorithmType[]).map((algo) => {
              const isActive = algorithm === algo;
              const meta = ALGORITHM_META[algo];
              return (
                <motion.button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    isActive ? "bg-white/6 border border-white/10 shadow-sm" : "hover:bg-white/3 border border-transparent"
                  }`}
                >
                  <span className="flex-shrink-0 transition-transform duration-200" style={{ color: meta.color, transform: isActive ? "scale(1.15)" : "scale(1)" }}>
                    {ALGO_ICONS[algo]}
                  </span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-[13px] transition-colors" style={{ color: isActive ? meta.color : "var(--color-text-primary)" }}>
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-text-muted leading-relaxed">{meta.description}</div>
                  </div>
                  {isActive && (
                    <motion.div layoutId="algo-indicator" className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Disruption Toggle */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={15} className={disruptionsEnabled ? "text-amber-400" : "text-text-muted"} />
              <div>
                <div className="text-[12px] font-medium text-text-primary">Simulate Disruptions</div>
                <div className="text-[10px] text-text-muted">Route around active incidents</div>
              </div>
            </div>
            <button
              onClick={onToggleDisruptions}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-300 ${disruptionsEnabled ? "bg-amber-500/80" : "bg-white/10"}`}
            >
              <motion.div animate={{ x: disruptionsEnabled ? 20 : 2 }} transition={{ type: "spring" as const, stiffness: 500, damping: 30 }} className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>

        {/* DFS Waypoints */}
        <AnimatePresence>
          {algorithm === "dfs" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="px-5 pb-4">
                <p className="text-[10px] text-text-muted mb-2 uppercase tracking-widest font-medium">Via Landmarks (optional)</p>
                {viaStations.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 mb-1.5 rounded-lg bg-accent-emerald/8 border border-accent-emerald/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
                    <span className="text-[12px] text-text-primary flex-1">{v.name}</span>
                    <button onClick={() => removeViaStation(v.id)} className="p-0.5 hover:bg-white/5 rounded"><X size={12} className="text-text-muted" /></button>
                  </div>
                ))}
                {viaStations.length < 3 && (
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
                      <Plus size={13} className="text-text-muted" />
                      <input type="text" value={viaQuery} onChange={(e) => { setViaQuery(e.target.value); setShowViaDropdown(true); }} onFocus={() => viaQuery.length > 0 && setShowViaDropdown(true)} placeholder="Add landmark stop..." className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted outline-none" />
                    </div>
                    {showViaDropdown && viaQuery.length > 0 && (
                      <DropdownList items={filterStations(viaQuery, [originId, destId, ...viaStations.map((v) => v.id)])} onSelect={(s) => addViaStation(s)} onClose={() => setShowViaDropdown(false)} />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-5 mb-3 p-3 rounded-xl bg-red-500/8 border border-red-500/15 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-[12px] text-red-300 leading-relaxed">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Buttons */}
      <div className="p-5 pt-3 border-t border-border-glass space-y-2">
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.01 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          className="w-full py-3 rounded-xl font-semibold text-[13px] bg-gradient-to-r from-accent-cyan to-accent-cyan/80 text-bg-primary shadow-lg shadow-accent-cyan/20 hover:shadow-accent-cyan/30 disabled:opacity-25 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (<><Loader2 size={15} className="animate-spin" />Computing...</>) : (<><Search size={15} />Find Route</>)}
        </motion.button>
        <motion.button
          onClick={() => { if (originId && destId && originId !== destId) onCompare(originId, destId); }}
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.01 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          className="w-full py-2.5 rounded-xl font-semibold text-[12px] bg-gradient-to-r from-accent-magenta/20 to-accent-cyan/20 text-text-primary border border-white/10 hover:border-white/20 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Route size={14} className="text-accent-magenta" />
          Compare All Algorithms
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Station Autocomplete Input ─── */
function StationInput({ label, icon, query, onQueryChange, stations, filterStations, onSelect, selectedId, loading }: {
  label: string; icon: React.ReactNode; query: string; onQueryChange: (q: string) => void;
  stations: Station[]; filterStations: (query: string, exclude?: string[]) => Station[];
  onSelect: (s: Station) => void; selectedId: string; loading: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = query.length > 0 && !selectedId ? filterStations(query) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setHighlightIdx(-1); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && highlightIdx >= 0) { e.preventDefault(); onSelect(suggestions[highlightIdx]); setShowDropdown(false); }
    else if (e.key === "Escape") setShowDropdown(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 border ${selectedId ? "bg-white/5 border-white/10" : "bg-white/3 border-white/5 focus-within:border-white/15 focus-within:bg-white/5"}`}>
        {icon}
        <input ref={inputRef} type="text" value={query} onChange={(e) => { onQueryChange(e.target.value); setShowDropdown(true); }} onFocus={() => { if (query.length > 0 && !selectedId) setShowDropdown(true); }} onKeyDown={handleKeyDown} placeholder={`${label} station...`} className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted outline-none" />
        {loading && <Loader2 size={13} className="text-text-muted animate-spin" />}
        {!!selectedId && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />}
      </div>
      <AnimatePresence>
        {showDropdown && suggestions.length > 0 && (
          <DropdownList items={suggestions} onSelect={(s) => { onSelect(s); setShowDropdown(false); }} onClose={() => setShowDropdown(false)} highlightIdx={highlightIdx} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Dropdown List ─── */
function DropdownList({ items, onSelect, onClose, highlightIdx = -1 }: { items: Station[]; onSelect: (s: Station) => void; onClose: () => void; highlightIdx?: number; }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }} className="absolute left-0 right-0 mt-1.5 glass-panel overflow-hidden z-40 max-h-52 overflow-y-auto">
      {items.map((s, idx) => {
        const lineColor = LINE_COLOR_MAP[s.lines[0]] || "#52525b";
        return (
          <button key={s.id} onClick={() => onSelect(s)} className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors flex items-center gap-2.5 ${idx === highlightIdx ? "bg-white/8" : "hover:bg-white/5"}`}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lineColor }} />
            <span className="text-text-primary flex-1 truncate">{s.name}</span>
            <span className="text-[10px] text-text-muted flex-shrink-0">{s.lines.join(" · ")}</span>
          </button>
        );
      })}
    </motion.div>
  );
}

const LINE_COLOR_MAP: Record<string, string> = { BL: "#06b6d4", GL: "#22c55e", MTC21: "#f59e0b", MTC27: "#ef4444", MTC29C: "#a855f7", WALK: "#64748b" };
