"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bookmark, Train, X as XIcon, Route } from "lucide-react";
import type { RouteResult, AlgorithmType, Station, Incident, CustomLocation, WalkingLeg, NearestStationResult } from "@/types/transit";
import TransitMap from "./TransitMap";
import ControlPanel from "./ControlPanel";
import RoutePanel from "./RoutePanel";
import ComparePanel from "./ComparePanel";
import AuthModal from "./AuthModal";
import type { AuthUser, TokenPair } from "./AuthModal";
import SavedDataDrawer from "./SavedDataDrawer";

export default function TransitApp() {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [disruptionsEnabled, setDisruptionsEnabled] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [showRoutePanel, setShowRoutePanel] = useState(false);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<TokenPair | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  const [walkingLegs, setWalkingLegs] = useState<WalkingLeg[]>([]);
  const [customMarkers, setCustomMarkers] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [mapPickMode, setMapPickMode] = useState<"origin" | "dest" | null>(null);

  // Compare mode state
  const [compareResults, setCompareResults] = useState<Record<string, RouteResult> | null>(null);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [highlightedAlgo, setHighlightedAlgo] = useState<AlgorithmType | null>(null);
  const [visibleAlgos, setVisibleAlgos] = useState<Set<AlgorithmType>>(new Set(["astar", "bfs", "dfs", "eco"]));

  useEffect(() => {
    const stored = localStorage.getItem("transit_auth");
    if (stored) {
      try {
        const { user, tokens: t } = JSON.parse(stored);
        setAuthUser(user);
        setTokens(t);
      } catch { /* ignore corrupted data */ }
    }
  }, []);

  const handleStationsLoaded = useCallback((s: Station[]) => {
    setStations(s);
  }, []);

  useEffect(() => {
    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data: Incident[]) => setIncidents(data))
      .catch(() => {});
  }, []);

  const handleAuthSuccess = (user: AuthUser, t: TokenPair) => {
    setAuthUser(user);
    setTokens(t);
    localStorage.setItem("transit_auth", JSON.stringify({ user, tokens: t }));
  };

  const handleLogout = () => {
    setAuthUser(null);
    setTokens(null);
    localStorage.removeItem("transit_auth");
    setShowSavedDrawer(false);
  };

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!mapPickMode) return;
    const target = mapPickMode;
    setMapPickMode(null);
    window.dispatchEvent(new CustomEvent("map-location-picked", { detail: { lat, lng, target } }));
  }, [mapPickMode]);

  const clearAll = () => {
    setRoute(null);
    setShowRoutePanel(false);
    setCompareResults(null);
    setShowComparePanel(false);
    setWalkingLegs([]);
    setCustomMarkers([]);
    setHighlightedAlgo(null);
  };

  const handleRouteSearch = async (
    originId: string,
    destinationId: string,
    algorithm: AlgorithmType,
    viaStations?: string[],
    maxTime?: number,
    originCustom?: CustomLocation,
    destCustom?: CustomLocation,
  ) => {
    setIsLoading(true);
    clearAll();
    setError(null);

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_id: originId,
          destination_id: destinationId,
          algorithm,
          via_stations: viaStations,
          max_time_min: maxTime,
          apply_incidents: disruptionsEnabled,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Server error (${res.status})`);
      }

      const data: RouteResult = await res.json();
      setRoute(data);
      setShowRoutePanel(true);

      const newWalkingLegs: WalkingLeg[] = [];
      const newCustomMarkers: { lat: number; lng: number; label: string }[] = [];

      if (originCustom) {
        const originStation = data.segments[0]?.from_station;
        if (originStation) {
          const nearestRes = await fetch(`/api/nearest-station?lat=${originCustom.lat}&lng=${originCustom.lng}&count=1`);
          if (nearestRes.ok) {
            const nearestData: NearestStationResult[] = await nearestRes.json();
            if (nearestData.length > 0) {
              newWalkingLegs.push({
                from: { lat: originCustom.lat, lng: originCustom.lng, label: originCustom.label },
                to: { lat: originStation.lat, lng: originStation.lng, label: originStation.name },
                distance_km: nearestData[0].distance_km,
                walk_time_min: nearestData[0].walk_time_min,
              });
            }
          }
          newCustomMarkers.push({ lat: originCustom.lat, lng: originCustom.lng, label: originCustom.label });
        }
      }

      if (destCustom) {
        const lastSeg = data.segments[data.segments.length - 1];
        const destStation = lastSeg?.to_station;
        if (destStation) {
          const nearestRes = await fetch(`/api/nearest-station?lat=${destCustom.lat}&lng=${destCustom.lng}&count=1`);
          if (nearestRes.ok) {
            const nearestData: NearestStationResult[] = await nearestRes.json();
            if (nearestData.length > 0) {
              newWalkingLegs.push({
                from: { lat: destStation.lat, lng: destStation.lng, label: destStation.name },
                to: { lat: destCustom.lat, lng: destCustom.lng, label: destCustom.label },
                distance_km: nearestData[0].distance_km,
                walk_time_min: nearestData[0].walk_time_min,
              });
            }
          }
          newCustomMarkers.push({ lat: destCustom.lat, lng: destCustom.lng, label: destCustom.label });
        }
      }

      setWalkingLegs(newWalkingLegs);
      setCustomMarkers(newCustomMarkers);

      if (authUser && data.emissions) {
        const prevCo2 = parseFloat(localStorage.getItem(`total_co2_saved_${authUser.id}`) || "0");
        const prevTrips = parseInt(localStorage.getItem(`trip_count_${authUser.id}`) || "0");
        localStorage.setItem(`total_co2_saved_${authUser.id}`, String(prevCo2 + data.emissions.co2_saved_grams));
        localStorage.setItem(`trip_count_${authUser.id}`, String(prevTrips + 1));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Route search failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async (originId: string, destinationId: string) => {
    setIsLoading(true);
    clearAll();
    setError(null);

    try {
      const res = await fetch("/api/route/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_id: originId,
          destination_id: destinationId,
          apply_incidents: disruptionsEnabled,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Server error (${res.status})`);
      }

      const data: Record<string, RouteResult> = await res.json();
      setCompareResults(data);
      setShowComparePanel(true);
      setVisibleAlgos(new Set(Object.keys(data) as AlgorithmType[]));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Comparison failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAlgoVisibility = (algo: AlgorithmType) => {
    setVisibleAlgos((prev) => {
      const next = new Set(prev);
      if (next.has(algo)) {
        if (next.size > 1) next.delete(algo);
      } else {
        next.add(algo);
      }
      return next;
    });
  };

  const isCompareMode = !!compareResults && Object.keys(compareResults).length > 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <TransitMap
        route={isCompareMode ? null : route}
        stations={stations}
        incidents={disruptionsEnabled ? incidents : []}
        walkingLegs={walkingLegs}
        mapPickMode={mapPickMode}
        onMapClick={handleMapClick}
        customMarkers={customMarkers}
        compareRoutes={isCompareMode ? compareResults : undefined}
        highlightedAlgo={highlightedAlgo}
        visibleAlgos={visibleAlgos}
      />

      {/* Map pick mode overlay banner */}
      <AnimatePresence>
        {mapPickMode && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl glass-panel flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[13px] text-text-primary font-medium">
              Click anywhere on the map to set your {mapPickMode === "origin" ? "starting point" : "destination"}
            </span>
            <button onClick={() => setMapPickMode(null)} className="p-1 rounded-lg hover:bg-white/10"><XIcon size={14} className="text-text-muted" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed control panel toggle */}
      <AnimatePresence>
        {!showControlPanel && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowControlPanel(true)}
            className="absolute top-4 left-4 z-20 w-12 h-12 rounded-xl glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Open search panel"
          >
            <Train size={20} className="text-accent-cyan" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControlPanel && (
          <ControlPanel
            onSearch={handleRouteSearch}
            onCompare={handleCompare}
            isLoading={isLoading}
            onStationsLoaded={handleStationsLoaded}
            error={error}
            disruptionsEnabled={disruptionsEnabled}
            onToggleDisruptions={() => setDisruptionsEnabled(!disruptionsEnabled)}
            onClose={() => setShowControlPanel(false)}
            mapPickMode={mapPickMode}
            onStartMapPick={(target) => setMapPickMode(target)}
          />
        )}
      </AnimatePresence>

      {/* Top-right user controls */}
      <div className={`absolute top-4 right-4 z-30 flex items-center gap-2 transition-opacity duration-200 ${(showRoutePanel || showComparePanel) ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {authUser && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSavedDrawer(true)}
            className="p-2.5 rounded-xl glass-panel hover:bg-white/5 transition-colors"
            title="Saved data"
          >
            <Bookmark size={16} className="text-accent-cyan" />
          </motion.button>
        )}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => (authUser ? setShowSavedDrawer(true) : setShowAuthModal(true))}
          className="p-2.5 rounded-xl glass-panel hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          {authUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-cyan/30 to-accent-magenta/30 flex items-center justify-center text-[9px] font-bold">
                {authUser.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <span className="text-[12px] text-text-primary font-medium hidden sm:inline">{authUser.display_name}</span>
            </>
          ) : (
            <>
              <User size={16} className="text-text-muted" />
              <span className="text-[12px] text-text-muted font-medium">Sign In</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Single route panel */}
      <AnimatePresence mode="wait">
        {showRoutePanel && route && !isCompareMode && (
          <RoutePanel
            route={route}
            onClose={() => setShowRoutePanel(false)}
            walkingLegs={walkingLegs}
          />
        )}
      </AnimatePresence>

      {/* Compare panel */}
      <AnimatePresence mode="wait">
        {showComparePanel && isCompareMode && (
          <ComparePanel
            results={compareResults!}
            onClose={() => setShowComparePanel(false)}
            highlightedAlgo={highlightedAlgo}
            onHighlight={setHighlightedAlgo}
            visibleAlgos={visibleAlgos}
            onToggleVisibility={toggleAlgoVisibility}
          />
        )}
      </AnimatePresence>

      {/* Floating controls when route/compare on map but panel closed */}
      <AnimatePresence>
        {!showRoutePanel && !showComparePanel && (route || isCompareMode) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => isCompareMode ? setShowComparePanel(true) : setShowRoutePanel(true)}
              className="px-4 py-2.5 rounded-xl glass-panel text-[12px] font-medium text-text-primary hover:bg-white/8 transition-colors flex items-center gap-2"
            >
              <Route size={14} className="text-accent-cyan" />
              {isCompareMode ? "Show Comparison" : "Show Route Details"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={clearAll}
              className="px-3 py-2.5 rounded-xl glass-panel text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
            >
              <XIcon size={14} />Clear
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />

      <AnimatePresence>
        {showSavedDrawer && authUser && (
          <SavedDataDrawer isOpen={showSavedDrawer} onClose={() => setShowSavedDrawer(false)} user={authUser} onLogout={handleLogout} stations={stations} />
        )}
      </AnimatePresence>
    </div>
  );
}
