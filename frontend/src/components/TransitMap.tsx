"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import type { RouteResult, Station, Incident, WalkingLeg } from "@/types/transit";
import { ALGORITHM_META } from "@/types/transit";

const CHENNAI_CENTER: L.LatLngExpression = [13.0627, 80.2407];
const DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const LINE_COLORS: Record<string, string> = {
  BL: "#06b6d4",
  GL: "#22c55e",
  MTC21: "#f59e0b",
  MTC27: "#ef4444",
  MTC29C: "#a855f7",
  WALK: "#64748b",
};

const ALGO_DASH_PATTERNS: Record<string, string | undefined> = {
  astar: undefined,
  bfs: "12 6",
  dfs: "4 8",
  eco: "8 4 2 4",
};

interface Props {
  route: RouteResult | null;
  stations: Station[];
  incidents: Incident[];
  walkingLegs: WalkingLeg[];
  mapPickMode: "origin" | "dest" | null;
  onMapClick?: (lat: number, lng: number) => void;
  customMarkers?: { lat: number; lng: number; label: string }[];
  compareRoutes?: Record<string, RouteResult>;
  highlightedAlgo?: string | null;
  visibleAlgos?: Set<string>;
}

export default function TransitMap({ route, stations, incidents, walkingLegs, mapPickMode, onMapClick, customMarkers, compareRoutes, highlightedAlgo, visibleAlgos }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const pulseLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const walkLayerRef = useRef<L.LayerGroup | null>(null);
  const customMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const legendLayerRef = useRef<L.Control | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CHENNAI_CENTER,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
    });

    L.tileLayer(DARK_TILE_URL, {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> · <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomright" }).addTo(map);

    stationLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    pulseLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);
    walkLayerRef.current = L.layerGroup().addTo(map);
    customMarkerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Map click handler for location picking
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (mapPickMode) {
      map.getContainer().style.cursor = "crosshair";

      const clickHandler = (e: L.LeafletMouseEvent) => {
        onMapClick?.(e.latlng.lat, e.latlng.lng);
      };

      map.on("click", clickHandler);
      return () => {
        map.off("click", clickHandler);
        map.getContainer().style.cursor = "";
      };
    } else {
      map.getContainer().style.cursor = "";
    }
  }, [mapPickMode, onMapClick]);

  // Render station dots
  useEffect(() => {
    if (!stationLayerRef.current || stations.length === 0) return;
    stationLayerRef.current.clearLayers();

    stations.forEach((station) => {
      const primaryLine = station.lines[0] || "BL";
      const color = LINE_COLORS[primaryLine] || "#52525b";
      const isInterchange = station.lines.length > 1;
      const radius = isInterchange ? 5 : 3.5;

      const marker = L.circleMarker([station.lat, station.lng], {
        radius,
        fillColor: isInterchange ? "#1e1e2e" : color,
        fillOpacity: isInterchange ? 1 : 0.6,
        color: isInterchange ? "#e4e4e7" : color,
        weight: isInterchange ? 2 : 1,
        opacity: isInterchange ? 0.8 : 0.5,
      });

      const lineLabels = station.lines.join(" · ");
      const zoneStr = station.zone ? `<br/><span style="color:#52525b">${station.zone}</span>` : "";
      marker.bindTooltip(
        `<strong>${station.name}</strong><br/><span style="color:#a1a1aa;font-size:10px">${lineLabels}</span>${zoneStr}`,
        { className: "station-tooltip", direction: "top", offset: [0, -8] }
      );

      stationLayerRef.current!.addLayer(marker);
    });
  }, [stations]);

  // Render incident markers
  useEffect(() => {
    if (!incidentLayerRef.current) return;
    incidentLayerRef.current.clearLayers();

    incidents.forEach((incident) => {
      if (incident.lat == null || incident.lng == null) return;

      const icon = L.divIcon({
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center">
            <div class="pulse-ring" style="position:absolute;width:24px;height:24px;top:6px;left:6px;border:2px solid #ef4444;border-radius:50%;"></div>
            <div class="pulse-ring pulse-ring-delayed" style="position:absolute;width:24px;height:24px;top:6px;left:6px;border:2px solid #ef4444;border-radius:50%;"></div>
            <div style="width:20px;height:20px;background:rgba(239,68,68,0.85);border-radius:50%;border:2px solid #0a0a0f;box-shadow:0 0 12px rgba(239,68,68,0.6);z-index:2;display:flex;align-items:center;justify-content:center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
        `,
      });

      const marker = L.marker([incident.lat, incident.lng], { icon, zIndexOffset: 900 });

      marker.bindTooltip(
        `<strong style="color:#ef4444">${incident.incident_type}</strong><br/><span style="font-size:11px">${incident.title}</span>`,
        { className: "station-tooltip", direction: "top", offset: [0, -20] }
      );

      incidentLayerRef.current!.addLayer(marker);
    });
  }, [incidents]);

  // Render walking legs (dashed lines from custom location to nearest station)
  useEffect(() => {
    if (!walkLayerRef.current) return;
    walkLayerRef.current.clearLayers();

    walkingLegs.forEach((leg) => {
      const walkCoords: L.LatLngExpression[] = [
        [leg.from.lat, leg.from.lng],
        [leg.to.lat, leg.to.lng],
      ];

      const walkLine = L.polyline(walkCoords, {
        color: "#94a3b8",
        weight: 4,
        opacity: 0.85,
        dashArray: "6 8",
        lineCap: "round",
        interactive: false,
      });

      walkLine.bindTooltip(
        `<div style="text-align:center"><strong>Walking</strong><br/>${leg.distance_km.toFixed(2)} km · ~${Math.round(leg.walk_time_min)} min</div>`,
        { className: "station-tooltip", sticky: true }
      );

      walkLayerRef.current!.addLayer(walkLine);
    });
  }, [walkingLegs]);

  // Render custom location markers (GPS pin / map click pin)
  useEffect(() => {
    if (!customMarkerLayerRef.current) return;
    customMarkerLayerRef.current.clearLayers();

    (customMarkers || []).forEach((cm) => {
      const icon = L.divIcon({
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 38],
        html: `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:flex-end;justify-content:center">
            <svg width="28" height="38" viewBox="0 0 28 38" fill="none">
              <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="#3b82f6" stroke="#1e1e2e" stroke-width="2"/>
              <circle cx="14" cy="14" r="6" fill="#1e1e2e" stroke="#60a5fa" stroke-width="1.5"/>
              <circle cx="14" cy="14" r="3" fill="#60a5fa"/>
            </svg>
          </div>
        `,
      });

      const marker = L.marker([cm.lat, cm.lng], { icon, zIndexOffset: 1100 });
      marker.bindTooltip(
        `<strong style="color:#60a5fa">${cm.label}</strong><br/><span style="font-size:10px;color:#a1a1aa">${cm.lat.toFixed(5)}, ${cm.lng.toFixed(5)}</span>`,
        { className: "station-tooltip", direction: "top", offset: [0, -40] }
      );

      customMarkerLayerRef.current!.addLayer(marker);
    });
  }, [customMarkers]);

  // Animated route drawing with algorithm-specific color + dash pattern
  const drawAnimatedRoute = useCallback((routeData: RouteResult) => {
    if (!routeLayerRef.current || !pulseLayerRef.current || !mapRef.current) return;

    routeLayerRef.current.clearLayers();
    pulseLayerRef.current.clearLayers();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (!routeData || routeData.path_coordinates.length < 2) return;

    const meta = ALGORITHM_META[routeData.algorithm];
    const algoColor = meta.color;
    const dashPattern = ALGO_DASH_PATTERNS[routeData.algorithm];
    const coords: L.LatLngExpression[] = routeData.path_coordinates.map(([lat, lng]) => [lat, lng]);

    const bgLine = L.polyline(coords, { color: algoColor, weight: 3, opacity: 0.12, interactive: false });
    routeLayerRef.current.addLayer(bgLine);

    mapRef.current.fitBounds(bgLine.getBounds(), { padding: [100, 420], maxZoom: 15, animate: true, duration: 0.8 });

    const segmentDistances: number[] = [];
    let totalPixelLength = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = mapRef.current.latLngToLayerPoint(coords[i] as L.LatLngExpression);
      const p2 = mapRef.current.latLngToLayerPoint(coords[i + 1] as L.LatLngExpression);
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      segmentDistances.push(dist);
      totalPixelLength += dist;
    }

    const animDuration = Math.min(2500, Math.max(800, totalPixelLength * 3));
    const startTime = performance.now();
    let currentPolyline: L.Polyline | null = null;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      const eased = easeOutCubic(progress);
      const targetLength = eased * totalPixelLength;

      let accumulated = 0;
      const partialCoords: L.LatLngExpression[] = [coords[0]];

      for (let i = 0; i < segmentDistances.length; i++) {
        const segLen = segmentDistances[i];
        if (accumulated + segLen <= targetLength) {
          accumulated += segLen;
          partialCoords.push(coords[i + 1]);
        } else {
          const remaining = targetLength - accumulated;
          const ratio = remaining / segLen;
          const lat1 = (coords[i] as [number, number])[0];
          const lng1 = (coords[i] as [number, number])[1];
          const lat2 = (coords[i + 1] as [number, number])[0];
          const lng2 = (coords[i + 1] as [number, number])[1];
          partialCoords.push([lat1 + (lat2 - lat1) * ratio, lng1 + (lng2 - lng1) * ratio]);
          break;
        }
      }

      if (currentPolyline) routeLayerRef.current!.removeLayer(currentPolyline);

      currentPolyline = L.polyline(partialCoords, {
        color: algoColor, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false, dashArray: dashPattern,
      });
      routeLayerRef.current!.addLayer(currentPolyline);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        finishRouteDrawing(routeData, algoColor, dashPattern, coords, meta);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const finishRouteDrawing = useCallback(
    (routeData: RouteResult, algoColor: string, dashPattern: string | undefined, coords: L.LatLngExpression[], meta: { color: string; glow: string }) => {
      if (!routeLayerRef.current || !mapRef.current) return;

      const glowLine = L.polyline(coords, { color: algoColor, weight: 12, opacity: 0.15, lineCap: "round", lineJoin: "round", interactive: false });
      routeLayerRef.current.addLayer(glowLine);
      glowLine.getElement()?.classList.add("neon-line");

      let coordIdx = 0;
      for (const seg of routeData.segments) {
        const segLineColor = LINE_COLORS[seg.line] || algoColor;
        const stationCount = seg.intermediate_stations.length + 2;
        const segCoords = coords.slice(coordIdx, coordIdx + stationCount);

        if (segCoords.length >= 2) {
          const segLine = L.polyline(segCoords, { color: segLineColor, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round", interactive: false, dashArray: dashPattern });
          routeLayerRef.current!.addLayer(segLine);
        }

        coordIdx += stationCount - 1;
      }

      routeData.path_coordinates.forEach(([lat, lng], idx) => {
        if (idx === 0 || idx === routeData.path_coordinates.length - 1) return;
        const dot = L.circleMarker([lat, lng], { radius: 4, fillColor: algoColor, fillOpacity: 1, color: "#0a0a0f", weight: 2, interactive: false });
        routeLayerRef.current!.addLayer(dot);
      });

      addPulseMarkers(routeData, meta);
      addRouteLegend(routeData);
    },
    [],
  );

  const addPulseMarkers = useCallback(
    (routeData: RouteResult, meta: { color: string; glow: string }) => {
      if (!pulseLayerRef.current) return;

      const startCoord = routeData.path_coordinates[0];
      const endCoord = routeData.path_coordinates[routeData.path_coordinates.length - 1];

      const createPulseIcon = (color: string, label: string) =>
        L.divIcon({
          className: "",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          html: `
            <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
              <div class="pulse-ring" style="position:absolute;width:20px;height:20px;top:12px;left:12px;border:2px solid ${color};border-radius:50%;"></div>
              <div class="pulse-ring pulse-ring-delayed" style="position:absolute;width:20px;height:20px;top:12px;left:12px;border:2px solid ${color};border-radius:50%;"></div>
              <div style="width:18px;height:18px;background:${color};border-radius:50%;border:2px solid #0a0a0f;box-shadow:0 0 14px ${color};z-index:2;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:9px;font-weight:800;color:#0a0a0f;line-height:1">${label}</span>
              </div>
            </div>
          `,
        });

      const startMarker = L.marker([startCoord[0], startCoord[1]], { icon: createPulseIcon(meta.color, "A"), interactive: false, zIndexOffset: 1000 });
      const endMarker = L.marker([endCoord[0], endCoord[1]], { icon: createPulseIcon(meta.color, "B"), interactive: false, zIndexOffset: 1000 });

      pulseLayerRef.current.addLayer(startMarker);
      pulseLayerRef.current.addLayer(endMarker);
    },
    [],
  );

  const addRouteLegend = useCallback((routeData: RouteResult) => {
    if (!mapRef.current) return;

    if (legendLayerRef.current) {
      mapRef.current.removeControl(legendLayerRef.current);
      legendLayerRef.current = null;
    }

    const meta = ALGORITHM_META[routeData.algorithm];
    const dashSvg = ALGO_DASH_PATTERNS[routeData.algorithm] ? `stroke-dasharray="${ALGO_DASH_PATTERNS[routeData.algorithm]}"` : "";

    const uniqueLines = [...new Set(routeData.segments.map((s) => s.line))];
    const lineItems = uniqueLines.map((lineId) => {
      const seg = routeData.segments.find((s) => s.line === lineId);
      const color = LINE_COLORS[lineId] || meta.color;
      const mode = seg?.mode === "metro" ? "Metro" : seg?.mode === "bus" ? "Bus" : "Walk";
      return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0"><svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="${color}" stroke-width="3" stroke-linecap="round" ${dashSvg}/></svg><span style="font-size:10px;color:#a1a1aa">${lineId} · ${mode}</span></div>`;
    }).join("");

    const LegendControl = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create("div", "route-legend");
        div.innerHTML = `
          <div style="background:rgba(18,18,26,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);min-width:120px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="${meta.color}" stroke-width="3" stroke-linecap="round" ${dashSvg}/></svg>
              <span style="font-size:11px;font-weight:600;color:${meta.color}">${meta.label.split(" \u2014 ")[0]}</span>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:5px;margin-top:2px">${lineItems}</div>
          </div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
    });

    legendLayerRef.current = new LegendControl({ position: "bottomleft" });
    legendLayerRef.current.addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (route) {
      drawAnimatedRoute(route);
    } else if (!compareRoutes || Object.keys(compareRoutes).length === 0) {
      routeLayerRef.current?.clearLayers();
      pulseLayerRef.current?.clearLayers();
      walkLayerRef.current?.clearLayers();
      customMarkerLayerRef.current?.clearLayers();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (legendLayerRef.current && mapRef.current) {
        mapRef.current.removeControl(legendLayerRef.current);
        legendLayerRef.current = null;
      }
    }
  }, [route, drawAnimatedRoute, compareRoutes]);

  // Draw all compare routes simultaneously
  useEffect(() => {
    if (!compareRoutes || Object.keys(compareRoutes).length === 0) return;
    if (!routeLayerRef.current || !pulseLayerRef.current || !mapRef.current) return;

    routeLayerRef.current.clearLayers();
    pulseLayerRef.current.clearLayers();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (legendLayerRef.current) {
      mapRef.current.removeControl(legendLayerRef.current);
      legendLayerRef.current = null;
    }

    const visible = visibleAlgos || new Set(Object.keys(compareRoutes));
    const allBounds: L.LatLngBounds[] = [];

    for (const [algo, routeData] of Object.entries(compareRoutes)) {
      if (!visible.has(algo)) continue;
      if (!routeData.path_coordinates || routeData.path_coordinates.length < 2) continue;

      const meta = ALGORITHM_META[routeData.algorithm as keyof typeof ALGORITHM_META];
      const algoColor = meta.color;
      const dashPattern = ALGO_DASH_PATTERNS[algo];
      const coords: L.LatLngExpression[] = routeData.path_coordinates.map(([lat, lng]) => [lat, lng]);

      const isHighlighted = highlightedAlgo === algo;
      const baseOpacity = highlightedAlgo ? (isHighlighted ? 1 : 0.25) : 0.8;
      const baseWeight = isHighlighted ? 7 : (highlightedAlgo ? 3 : 5);

      // Glow for highlighted
      if (isHighlighted) {
        const glow = L.polyline(coords, { color: algoColor, weight: 16, opacity: 0.2, lineCap: "round", lineJoin: "round", interactive: false });
        routeLayerRef.current.addLayer(glow);
        glow.getElement()?.classList.add("neon-line");
      }

      const line = L.polyline(coords, {
        color: algoColor, weight: baseWeight, opacity: baseOpacity,
        lineCap: "round", lineJoin: "round", interactive: true, dashArray: dashPattern,
      });

      line.bindTooltip(
        `<strong style="color:${algoColor}">${meta.label.split(" \u2014 ")[0]}</strong><br/>` +
        `<span style="font-size:10px">${Math.round(routeData.total_time_min)} min · ${routeData.total_distance_km.toFixed(1)} km · ${routeData.total_transfers} transfers</span>`,
        { className: "station-tooltip", sticky: true }
      );

      routeLayerRef.current.addLayer(line);
      allBounds.push(line.getBounds());

      // Station dots for highlighted route
      if (isHighlighted) {
        routeData.path_coordinates.forEach(([lat, lng], idx) => {
          if (idx === 0 || idx === routeData.path_coordinates.length - 1) return;
          const dot = L.circleMarker([lat, lng], { radius: 3, fillColor: algoColor, fillOpacity: 0.9, color: "#0a0a0f", weight: 1.5, interactive: false });
          routeLayerRef.current!.addLayer(dot);
        });
      }
    }

    // Fit map to show all visible routes
    if (allBounds.length > 0) {
      let combinedBounds = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) {
        combinedBounds = combinedBounds.extend(allBounds[i]);
      }
      mapRef.current.fitBounds(combinedBounds, { padding: [100, 420], maxZoom: 15, animate: true, duration: 0.8 });
    }

    // Pulse markers at start/end using the first visible route
    const firstVisible = Object.entries(compareRoutes).find(([a]) => visible.has(a));
    if (firstVisible) {
      const [, rd] = firstVisible;
      const startC = rd.path_coordinates[0];
      const endC = rd.path_coordinates[rd.path_coordinates.length - 1];

      const createPulseIcon = (color: string, label: string) =>
        L.divIcon({
          className: "", iconSize: [44, 44], iconAnchor: [22, 22],
          html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
            <div class="pulse-ring" style="position:absolute;width:20px;height:20px;top:12px;left:12px;border:2px solid ${color};border-radius:50%;"></div>
            <div class="pulse-ring pulse-ring-delayed" style="position:absolute;width:20px;height:20px;top:12px;left:12px;border:2px solid ${color};border-radius:50%;"></div>
            <div style="width:18px;height:18px;background:${color};border-radius:50%;border:2px solid #0a0a0f;box-shadow:0 0 14px ${color};z-index:2;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:9px;font-weight:800;color:#0a0a0f;line-height:1">${label}</span>
            </div></div>`,
        });

      pulseLayerRef.current.addLayer(L.marker([startC[0], startC[1]], { icon: createPulseIcon("#06b6d4", "A"), interactive: false, zIndexOffset: 1000 }));
      pulseLayerRef.current.addLayer(L.marker([endC[0], endC[1]], { icon: createPulseIcon("#d946ef", "B"), interactive: false, zIndexOffset: 1000 }));
    }

    // Compare legend
    const visibleEntries = Object.entries(compareRoutes).filter(([a]) => visible.has(a));
    if (visibleEntries.length > 0) {
      const legendItems = visibleEntries.map(([algo, rd]) => {
        const meta = ALGORITHM_META[algo as keyof typeof ALGORITHM_META];
        const dashSvg = ALGO_DASH_PATTERNS[algo] ? `stroke-dasharray="${ALGO_DASH_PATTERNS[algo]}"` : "";
        return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0">
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="${meta.color}" stroke-width="3" stroke-linecap="round" ${dashSvg}/></svg>
          <span style="font-size:10px;color:${meta.color};font-weight:600">${meta.label.split(" \u2014 ")[0]}</span>
          <span style="font-size:9px;color:#71717a">${Math.round(rd.total_time_min)}m · ${rd.total_distance_km.toFixed(1)}km</span>
        </div>`;
      }).join("");

      const CompareLegend = L.Control.extend({
        onAdd: function () {
          const div = L.DomUtil.create("div", "route-legend");
          div.innerHTML = `<div style="background:rgba(18,18,26,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);min-width:140px">
            <div style="font-size:10px;color:#a1a1aa;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">All Routes</div>
            ${legendItems}
          </div>`;
          L.DomEvent.disableClickPropagation(div);
          return div;
        },
      });

      legendLayerRef.current = new CompareLegend({ position: "bottomleft" });
      legendLayerRef.current.addTo(mapRef.current);
    }
  }, [compareRoutes, highlightedAlgo, visibleAlgos]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
