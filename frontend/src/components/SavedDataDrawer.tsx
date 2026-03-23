"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Route,
  Leaf,
  Plus,
  Trash2,
  LogOut,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import type { AuthUser } from "./AuthModal";
import type { Station } from "@/types/transit";

interface SavedLocation {
  id: string;
  label: string;
  station_id: string;
  station_name: string;
}

interface SavedRoute {
  id: string;
  label: string;
  origin_name: string;
  destination_name: string;
  algorithm: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onLogout: () => void;
  stations: Station[];
}

const drawerVariants = {
  hidden: { x: 420, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 70, damping: 20 },
  },
  exit: {
    x: 420,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export default function SavedDataDrawer({
  isOpen,
  onClose,
  user,
  onLogout,
  stations,
}: Props) {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [totalCo2Saved, setTotalCo2Saved] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStationId, setNewStationId] = useState("");
  const [stationQuery, setStationQuery] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(`saved_locations_${user.id}`);
    if (stored) setSavedLocations(JSON.parse(stored));

    const routes = localStorage.getItem(`saved_routes_${user.id}`);
    if (routes) setSavedRoutes(JSON.parse(routes));

    const co2 = localStorage.getItem(`total_co2_saved_${user.id}`);
    if (co2) setTotalCo2Saved(parseFloat(co2));

    const trips = localStorage.getItem(`trip_count_${user.id}`);
    if (trips) setTripCount(parseInt(trips));
  }, [user.id]);

  const persistLocations = (locs: SavedLocation[]) => {
    setSavedLocations(locs);
    localStorage.setItem(`saved_locations_${user.id}`, JSON.stringify(locs));
  };

  const addLocation = () => {
    if (!newLabel || !newStationId) return;
    const station = stations.find((s) => s.id === newStationId);
    if (!station) return;

    const loc: SavedLocation = {
      id: crypto.randomUUID(),
      label: newLabel,
      station_id: newStationId,
      station_name: station.name,
    };
    persistLocations([...savedLocations, loc]);
    setNewLabel("");
    setNewStationId("");
    setStationQuery("");
    setShowAddLocation(false);
  };

  const removeLocation = (id: string) => {
    persistLocations(savedLocations.filter((l) => l.id !== id));
  };

  const removeRoute = (id: string) => {
    const updated = savedRoutes.filter((r) => r.id !== id);
    setSavedRoutes(updated);
    localStorage.setItem(`saved_routes_${user.id}`, JSON.stringify(updated));
  };

  const filteredStations = stationQuery.length > 0
    ? stations.filter((s) => s.name.toLowerCase().includes(stationQuery.toLowerCase())).slice(0, 6)
    : [];

  const initials = user.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 w-[380px] z-50 glass-panel rounded-l-2xl rounded-r-none flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 pb-4 border-b border-border-glass flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan/30 to-accent-magenta/30 flex items-center justify-center text-[13px] font-bold text-text-primary border border-white/10">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold truncate">{user.display_name}</div>
                <div className="text-[11px] text-text-muted truncate">{user.email}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={15} className="text-text-muted" />
              </motion.button>
            </div>

            {/* Carbon Stats */}
            <div className="mx-5 mt-4 p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/15">
              <div className="flex items-center gap-2 mb-3">
                <Leaf size={14} className="text-accent-emerald" />
                <span className="text-[11px] text-accent-emerald font-semibold uppercase tracking-wider">
                  Carbon Impact
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[20px] font-bold text-text-primary">
                    {totalCo2Saved >= 1000
                      ? `${(totalCo2Saved / 1000).toFixed(1)}kg`
                      : `${Math.round(totalCo2Saved)}g`}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">CO2 Saved</div>
                </div>
                <div>
                  <div className="text-[20px] font-bold text-text-primary">{tripCount}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Transit Trips</div>
                </div>
              </div>
              {tripCount > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <TrendingDown size={12} className="text-accent-emerald" />
                  <span className="text-[10px] text-accent-emerald">
                    Avg {Math.round(totalCo2Saved / tripCount)}g saved per trip
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Saved Locations */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-accent-cyan" />
                    <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                      Saved Locations
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAddLocation(!showAddLocation)}
                    className="p-1 rounded-md hover:bg-white/5 transition-colors"
                  >
                    <Plus size={14} className="text-text-muted" />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showAddLocation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-3"
                    >
                      <div className="p-3 rounded-xl bg-white/3 border border-white/5 space-y-2">
                        <input
                          type="text"
                          placeholder="Label (e.g. Home, Work)"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-white/15"
                        />
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search station..."
                            value={stationQuery}
                            onChange={(e) => {
                              setStationQuery(e.target.value);
                              setNewStationId("");
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-white/15"
                          />
                          {filteredStations.length > 0 && !newStationId && (
                            <div className="absolute left-0 right-0 mt-1 glass-panel overflow-hidden z-10 max-h-40 overflow-y-auto">
                              {filteredStations.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    setNewStationId(s.id);
                                    setStationQuery(s.name);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-white/5 text-text-primary"
                                >
                                  {s.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={addLocation}
                          disabled={!newLabel || !newStationId}
                          className="w-full py-2 rounded-lg bg-accent-cyan/15 text-accent-cyan text-[12px] font-medium disabled:opacity-30 transition-opacity"
                        >
                          Save Location
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {savedLocations.length === 0 ? (
                  <p className="text-[11px] text-text-muted py-3 text-center">
                    No saved locations yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {savedLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-accent-cyan/10 flex items-center justify-center flex-shrink-0">
                          <MapPin size={13} className="text-accent-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-text-primary truncate">
                            {loc.label}
                          </div>
                          <div className="text-[10px] text-text-muted truncate">
                            {loc.station_name}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeLocation(loc.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved Routes */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Route size={13} className="text-accent-magenta" />
                  <span className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                    Favorite Routes
                  </span>
                </div>

                {savedRoutes.length === 0 ? (
                  <p className="text-[11px] text-text-muted py-3 text-center">
                    No saved routes yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {savedRoutes.map((route) => (
                      <div
                        key={route.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-accent-magenta/10 flex items-center justify-center flex-shrink-0">
                          <Route size={13} className="text-accent-magenta" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-text-primary truncate">
                            {route.label || `${route.origin_name} → ${route.destination_name}`}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {route.algorithm.toUpperCase()}
                          </div>
                        </div>
                        <ChevronRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRoute(route.id);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 pt-3 border-t border-border-glass">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] text-red-400 hover:bg-red-500/8 border border-red-500/10 transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
