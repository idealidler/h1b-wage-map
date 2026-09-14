"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl, MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox"; 
import { ChevronDown, MapPin, Loader2, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const LOCAL_GEOJSON_URL = "/county-geometry-v1.geojson";
const FALLBACK_GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
const MAP_REQUEST_TIMEOUT_MS = 15_000;
const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";

// Synchronized with our global.css tokens for Mapbox Canvas injection
const COLORS = {
  L4: "#10b981",
  L3: "#2563eb",
  L2: "#f59e0b",
  L1: "#ef4444",
  NONE: "#f5f7fa",
};

let cachedGeoJson: GeoJSON.FeatureCollection | null = null;
let geoJsonRequest: Promise<GeoJSON.FeatureCollection> | null = null;
const wageDataCache = new globalThis.Map<string, Record<string, WageData>>();
const wageDataRequests = new globalThis.Map<string, Promise<Record<string, WageData>>>();

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MAP_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJsonWithRetry<T>(url: string, errorMessage: string): Promise<T> {
  const readJson = async (requestUrl: string, cache: RequestCache) => {
    const response = await fetchWithTimeout(requestUrl, { cache });
    if (!response.ok) throw new Error(errorMessage);
    return (await response.json()) as T;
  };

  try {
    return await readJson(url, "no-cache");
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return readJson(`${url}${separator}retry=${Date.now()}`, "reload");
  }
}

function isValidGeoJson(data: GeoJSON.FeatureCollection): boolean {
  return (
    data.type === "FeatureCollection" &&
    Array.isArray(data.features) &&
    data.features.length > 3000 &&
    data.features.some((feature) => feature.id != null)
  );
}

async function loadGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (cachedGeoJson) return cachedGeoJson;
  if (!geoJsonRequest) {
    geoJsonRequest = Promise.resolve().then(async () => {
      try {
        const data = await fetchJsonWithRetry<GeoJSON.FeatureCollection>(
          LOCAL_GEOJSON_URL,
          "Failed to load map geometry"
        );
        if (!isValidGeoJson(data)) throw new Error("Failed to load map geometry");
        cachedGeoJson = data;
        return data;
      } catch (localError) {
        console.warn("Local map geometry failed to load; falling back to remote geometry.", localError);
      }

      const data = await fetchJsonWithRetry<GeoJSON.FeatureCollection>(
        FALLBACK_GEOJSON_URL,
        "Failed to load map geometry"
      );
      if (!isValidGeoJson(data)) throw new Error("Failed to load map geometry");
      cachedGeoJson = data;
      return data;
    }).catch((error) => {
      geoJsonRequest = null;
      throw error;
    });
  }
  return geoJsonRequest;
}

async function loadWageData(baseSocCode: string): Promise<Record<string, WageData>> {
  const cached = wageDataCache.get(baseSocCode);
  if (cached) return cached;
  const pending = wageDataRequests.get(baseSocCode);
  if (pending) return pending;

  const request = fetchJsonWithRetry<Record<string, WageData>>(
    `/jobs-2026-27/${baseSocCode}.json`,
    "No wage data found"
  )
    .then((data) => {
      if (Object.keys(data).length === 0) throw new Error("No wage data found");
      wageDataCache.set(baseSocCode, data);
      return data;
    })
    .finally(() => wageDataRequests.delete(baseSocCode));

  wageDataRequests.set(baseSocCode, request);
  return request;
}

interface WageData { s: string; c: string; l1: number; l2: number; l3: number; l4: number; }
interface WageFeatureProperties extends WageData {
  userLevel: number;
  calculatedColor: string;
}

interface ActivePopupData {
  longitude: number;
  latitude: number;
  properties: WageFeatureProperties;
}

export default function WageMap({ socCode, jobTitle, userSalary }: { socCode: string; jobTitle?: string; userSalary: number; }) {
  const mapRef = useRef<MapRef>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wageMapData, setWageMapData] = useState<Record<string, WageData>>({});
  const [hoverInfo, setHoverInfo] = useState<ActivePopupData | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<ActivePopupData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCountyFips, setSelectedCountyFips] = useState<string>("");
  const [loadError, setLoadError] = useState<"geometry" | "wage" | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const [debouncedSalary, setDebouncedSalary] = useState(userSalary);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSalary(userSalary); }, 150);
    return () => clearTimeout(handler);
  }, [userSalary]);

  useEffect(() => {
    if (!socCode) return;
    let isMounted = true;
    const baseSocCode = socCode.split('.')[0];
    const cachedWageData = wageDataCache.get(baseSocCode);
    const statusTimer = setTimeout(() => {
      setLoadError(null);
      setStatus(cachedWageData && cachedGeoJson ? "ready" : "loading");
    }, 0);

    const fetchData = async () => {
      try {
        const [mapGeometry, wageData] = await Promise.all([
          loadGeoJson(),
          loadWageData(baseSocCode),
        ]);

        if (isMounted) {
          setGeoJson(mapGeometry);
          setWageMapData(wageData);
          setStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error && error.message.includes("geometry") ? "geometry" : "wage");
          setStatus("error");
        }
      }
    };

    fetchData();
    return () => {
      clearTimeout(statusTimer);
      isMounted = false;
    };
  }, [retryNonce, socCode]);

  const mergedData = useMemo(() => {
    if (!geoJson || Object.keys(wageMapData).length === 0) return null;

    const processedFeatures = geoJson.features.map((feature) => {
      const featureId = feature.id != null ? String(feature.id) : "";
      const fipsId = Number.parseInt(featureId, 10);
      const countyWages =
        wageMapData[featureId] ||
        (!Number.isNaN(fipsId) ? wageMapData[String(fipsId)] : undefined) ||
        (!Number.isNaN(fipsId) ? wageMapData[String(fipsId).padStart(5, "0")] : undefined);

      const newProps = { ...(feature.properties || {}) } as Partial<WageFeatureProperties>;
      let color = COLORS.NONE; 
      let userLevel = 0;

      if (countyWages) {
          Object.assign(newProps, countyWages);
          if (debouncedSalary >= countyWages.l4) { color = COLORS.L4; userLevel = 4; }
          else if (debouncedSalary >= countyWages.l3) { color = COLORS.L3; userLevel = 3; }
          else if (debouncedSalary >= countyWages.l2) { color = COLORS.L2; userLevel = 2; }
          else if (debouncedSalary >= countyWages.l1) { color = COLORS.L1; userLevel = 1; }
          newProps.userLevel = userLevel;
      }
      
      newProps.calculatedColor = color;
      return { ...feature, properties: newProps };
    });

    return { type: "FeatureCollection", features: processedFeatures };
  }, [geoJson, wageMapData, debouncedSalary]);

  const locationList = useMemo(() => {
    if (Object.keys(wageMapData).length === 0) return [];
    const stateMap: Record<string, { name: string; fips: number }[]> = {};
    Object.entries(wageMapData).forEach(([fips, data]) => {
        if (!data.s || !data.c) return;
        if (!stateMap[data.s]) stateMap[data.s] = [];
        stateMap[data.s].push({ name: data.c, fips: Number(fips) });
    });
    return Object.keys(stateMap).sort().map(state => ({
        state, counties: stateMap[state].sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, [wageMapData]);

  const handleJumpToState = (stateCode: string) => {
      if (!mergedData || !mapRef.current) return;
      const stateFeatures = mergedData.features.filter((f) => (f.properties as Partial<WageFeatureProperties>).s === stateCode);
      if (stateFeatures.length > 0) {
          const [minLng, minLat, maxLng, maxLat] = bbox({ type: "FeatureCollection", features: stateFeatures });
          mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1500 });
          setSelectedInfo(null);
      }
  };

  const handleJumpToCounty = (fips: string) => {
      if (!mergedData || !mapRef.current) return;
      const targetFips = Number.parseInt(fips, 10);
      const feature = mergedData.features.find((f) => {
        const featureId = f.id != null ? String(f.id) : "";
        const numericId = Number.parseInt(featureId, 10);
        return numericId === targetFips || featureId === fips;
      });
      if (feature) {
          const [minLng, minLat, maxLng, maxLat] = bbox(feature);
          const isMobile = window.matchMedia("(max-width: 639px)").matches;
          mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: isMobile ? 32 : { top: 320, bottom: 50, left: 50, right: 50 }, maxZoom: 9.5, duration: 2000 });
          setSelectedInfo({ longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2, properties: feature.properties as WageFeatureProperties });
          setHoverInfo(null);
      }
  };

  const activePopup = selectedInfo || hoverInfo;
  const mapStatusMessage = status === "loading"
    ? "Updating wage data."
    : status === "error"
      ? "Wage data is unavailable for this occupation."
      : status === "ready"
        ? `Wage data loaded for ${jobTitle || "the selected occupation"}.`
        : "Select an occupation to load wage data.";

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* Top Control Bar */}
      <div className="bg-[var(--surface-raised)] rounded-[var(--radius-surface)] border border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10 relative shadow-[var(--shadow-surface)]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-[var(--surface-muted)] p-2.5 rounded-xl hidden sm:block border border-[var(--border-subtle)]">
                  <MapPin className="w-5 h-5 text-[var(--foreground-muted)]" />
               </div>
               <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">02 / Explore wage levels</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-[var(--foreground)] leading-tight">Explore regions</h2>
              <p className="text-xs text-[var(--foreground-muted)] font-medium">Zoom to a state or county to compare thresholds</p>
               </div>
          </div>

            <div className="flex w-full flex-col items-center gap-3 sm:flex-row md:w-auto">
              <div className="relative group w-full sm:flex-1 md:w-48 md:flex-none">
                  <select
                    aria-label="Select state"
                    value={selectedState}
                    disabled={status !== "ready"}
                    onChange={(e) => { setSelectedState(e.target.value); setSelectedCountyFips(""); if(e.target.value) handleJumpToState(e.target.value); }}
                    className="block min-h-12 w-full appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--background-alt)] p-3 pr-8 text-sm font-medium text-[var(--foreground)] outline-none transition-all focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--ring-subtle)] disabled:opacity-50"
                  >
                      <option value="">Select State</option>
                      {locationList.map((loc) => (<option key={loc.state} value={loc.state}>{loc.state}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
              </div>
              <div className="relative group w-full sm:flex-1 md:w-56 md:flex-none">
                  <select
                    aria-label="Select county"
                    value={selectedCountyFips}
                    disabled={!selectedState || status !== "ready"}
                    onChange={(e) => { setSelectedCountyFips(e.target.value); if(e.target.value) handleJumpToCounty(e.target.value); }}
                    className="block min-h-12 w-full appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--background-alt)] p-3 pr-8 text-sm font-medium text-[var(--foreground)] outline-none transition-all focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--ring-subtle)] disabled:opacity-50"
                  >
                      <option value="">Select County</option>
                      {selectedState && locationList.find(l => l.state === selectedState)?.counties.map((c) => (<option key={c.fips} value={c.fips}>{c.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
              </div>
          </div>
      </div>

      {/* Map Container */}
      <div aria-busy={status === "loading"} aria-label="Interactive county wage map" role="region" className="h-[420px] sm:h-[500px] md:h-[650px] w-full rounded-[var(--radius-surface)] overflow-hidden relative bg-[var(--background-alt)] border border-[var(--border-subtle)] shadow-[var(--shadow-surface)]">
        <p className="sr-only" aria-live="polite">{mapStatusMessage}</p>
        {!TOKEN && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-50"><AlertCircle className="w-10 h-10 text-[var(--brand-warning)] mb-3" /><p className="text-[var(--foreground)] font-bold text-lg">Missing Mapbox Token</p></div>)}
        {status === "loading" && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/55 z-40 backdrop-blur-[2px]"><Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin mb-3" /><span className="text-sm font-bold text-[var(--foreground)] tracking-wide">Updating wage data...</span><span className="mt-1 text-xs font-medium text-[var(--foreground-muted)]">Your map stays visible while the new role loads.</span></div>)}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-40 px-4 text-center backdrop-blur-md">
            <AlertCircle className="w-12 h-12 text-[var(--brand-accent)] mb-3" />
            <p className="text-[var(--foreground)] font-bold text-lg">
              {loadError === "geometry" ? "Map boundary data could not load" : "No wage data found"}
            </p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1.5 max-w-sm">
              {loadError === "geometry"
                ? "Check your connection and try loading the map again."
                : "Try selecting a broader role title or choose a nearby SOC option from the list."}
            </p>
            <button type="button" onClick={() => setRetryNonce((current) => current + 1)} className="btn-secondary mt-4 !min-h-10 !px-4 !py-2 text-sm">
              Try again
            </button>
          </div>
        )}


        {/* Re-designed Probability Legend */}
        {status === "ready" && (
          <div role="group" aria-label="Estimated registration odds legend" className="absolute bottom-6 left-4 right-auto z-10 hidden w-64 max-w-64 rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-[var(--surface-floating)] p-4 shadow-[var(--shadow-floating)] backdrop-blur-xl sm:block">
              <h4 className="mb-1 text-xs font-bold text-[var(--foreground)] sm:text-[13px]">Estimated Registration Odds</h4>
              <p className="mb-2 text-[10px] leading-relaxed text-[var(--foreground-muted)] sm:mb-3 sm:text-[11px]">
                Estimates based on the H-1B registration rule&apos;s weighted entries, not a guarantee of selection.
              </p>
              
              
              <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-2.5">
                  <div className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-alt)] p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-md bg-[var(--brand-success)] shadow-sm"></span>
                      <span className="text-xs font-bold text-[var(--foreground)] sm:text-[13px]">L4 <span className="ml-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-xs">4x</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-success)]">~61%</span>
                  </div>
                  
                  <div className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-alt)] p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-md bg-[var(--brand-primary)] shadow-sm"></span>
                      <span className="text-xs font-bold text-[var(--foreground)] sm:text-[13px]">L3 <span className="ml-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-xs">3x</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-primary)]">~46%</span>
                  </div>
                  
                  <div className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-alt)] p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-md bg-[var(--brand-accent)] shadow-sm"></span>
                      <span className="text-xs font-bold text-[var(--foreground)] sm:text-[13px]">L2 <span className="ml-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-xs">2x</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-accent)]">~30%</span>
                  </div>
                  
                  <div className="group flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-alt)] p-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 shrink-0 rounded-md bg-[var(--brand-warning)] shadow-sm"></span>
                      <span className="text-xs font-bold text-[var(--foreground)] sm:text-[13px]">L1 <span className="ml-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-xs">1x</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-warning)]">~15%</span>
                  </div>
              </div>
              <a
                href={FR_RULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-primary)] hover:underline sm:mt-3 sm:text-[11px]"
              >
                Read the registration rule <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
          </div>
        )}

        <Map
            ref={mapRef}
            initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3.5 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            mapboxAccessToken={TOKEN}
            interactiveLayerIds={['county-fill']}
            onMove={(evt) => { if (evt.originalEvent && selectedInfo) setSelectedInfo(null); }}
            onMouseMove={(event) => {
                if (selectedInfo) return; 
                const { features, lngLat } = event;
                const f = features && features[0];
                if (f && f.properties?.l1) setHoverInfo({ longitude: lngLat.lng, latitude: lngLat.lat, properties: f.properties as WageFeatureProperties });
                else setHoverInfo(null);
            }}
            onMouseLeave={() => !selectedInfo && setHoverInfo(null)}
            onClick={(event) => {
                const { features, lngLat } = event;
                const f = features && features[0];
                if (f && f.properties?.l1) {
                    setSelectedInfo({ longitude: lngLat.lng, latitude: lngLat.lat, properties: f.properties as WageFeatureProperties });
                    setHoverInfo(null); 
                } else setSelectedInfo(null);
            }}
        >
            <GeolocateControl position="top-right" />
            <NavigationControl position="top-right" showCompass={false} />

            <Source id="county-wage-source" type="geojson" data={mergedData || { type: "FeatureCollection", features: [] }}>
                <Layer id="county-fill" type="fill" paint={{ "fill-color": ["get", "calculatedColor"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.85] }} /> 
                <Layer id="county-outline" type="line" paint={{ "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.3 }} />
                <Layer id="county-label" type="symbol" minzoom={5.5} layout={{ "text-field": ["get", "c"], "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-size": 11, "text-anchor": "center", "text-max-width": 6 }} paint={{ "text-color": "#0f172a", "text-halo-color": "#ffffff", "text-halo-width": 2 }} />
            </Source>

            {/* Premium Data Popup */}
            {activePopup && (
                <Popup 
                  longitude={activePopup.longitude} 
                  latitude={activePopup.latitude} 
                  offset={15} 
                  closeButton={false} 
                  closeOnClick={false} 
                  className="z-50 !rounded-2xl overflow-hidden" 
                  maxWidth="calc(100vw - 24px)"
                >
                    <div className="p-2 font-sans bg-white">
                        <div className="mb-4 border-b border-[var(--border-subtle)] pb-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Selected geography</p>
                            <h3 className="font-bold text-[var(--foreground)] text-[17px] leading-tight">{activePopup.properties.c}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[13px] font-medium text-[var(--foreground-muted)]">{activePopup.properties.s}</span>
                                <span className="text-[11px] bg-[var(--surface-muted)] px-2.5 py-1 rounded-md text-[var(--foreground)] font-mono font-bold border border-[var(--border-subtle)]">
                                  Your Salary: ${debouncedSalary.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <LevelRow level={4} amount={activePopup.properties.l4} activeLevel={activePopup.properties.userLevel} tone="success" />
                            <LevelRow level={3} amount={activePopup.properties.l3} activeLevel={activePopup.properties.userLevel} tone="primary" />
                            <LevelRow level={2} amount={activePopup.properties.l2} activeLevel={activePopup.properties.userLevel} tone="accent" />
                            <LevelRow level={1} amount={activePopup.properties.l1} activeLevel={activePopup.properties.userLevel} tone="warning" />
                        </div>
                        <p className="sr-only">
                          {activePopup.properties.c}, {activePopup.properties.s}. Level 1 ${activePopup.properties.l1.toLocaleString()}, Level 2 ${activePopup.properties.l2.toLocaleString()}, Level 3 ${activePopup.properties.l3.toLocaleString()}, Level 4 ${activePopup.properties.l4.toLocaleString()}.
                        </p>

                    </div>
                </Popup>
            )}
        </Map>
      </div>

      {status === "ready" && (
        <section role="group" aria-label="Estimated registration odds legend" className="rounded-[var(--radius-surface)] border border-[var(--border-subtle)] bg-[var(--surface-floating)] p-3 shadow-[var(--shadow-surface)] sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-[var(--foreground)]">Estimated registration odds</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--foreground-muted)]">Weighted-entry estimates, not a guarantee of selection.</p>
            </div>
            <a href={FR_RULE_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] font-bold text-[var(--brand-primary)] underline underline-offset-2">Rule source</a>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[
              { level: "L4", entries: "4x", odds: "61%", color: "var(--brand-success)" },
              { level: "L3", entries: "3x", odds: "46%", color: "var(--brand-primary)" },
              { level: "L2", entries: "2x", odds: "30%", color: "var(--brand-accent)" },
              { level: "L1", entries: "1x", odds: "15%", color: "var(--brand-warning)" },
            ].map((item) => (
              <div key={item.level} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-alt)] px-1.5 py-2 text-center">
                <span className="block text-[11px] font-bold text-[var(--foreground)]">{item.level}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-[var(--foreground-muted)]">{item.entries}</span>
                <span className="mt-1 block font-mono text-[11px] font-bold" style={{ color: item.color }}>{item.odds}</span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function LevelRow({
  level,
  amount,
  activeLevel,
  tone,
}: {
  level: 1 | 2 | 3 | 4;
  amount: number;
  activeLevel: number;
  tone: "success" | "primary" | "accent" | "warning";
}) {
  const isActive = activeLevel === level;
  const isLower = activeLevel < level && activeLevel !== 0;

  // We map the tones directly to our CSS variables for consistent theming
  const activeClasses = {
    success: "border-[var(--brand-success)] bg-emerald-50/50",
    primary: "border-[var(--brand-primary)] bg-[var(--brand-primary-muted)]",
    accent: "border-[var(--brand-accent)] bg-amber-50/50",
    warning: "border-[var(--brand-warning)] bg-red-50/50",
  };

  const badgeClasses = {
    success: "bg-[var(--brand-success)] text-white shadow-sm",
    primary: "bg-[var(--brand-primary)] text-white shadow-sm",
    accent: "bg-[var(--brand-accent)] text-white shadow-sm",
    warning: "bg-[var(--brand-warning)] text-white shadow-sm",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-all duration-200 ${
        isActive 
          ? `${activeClasses[tone]} ring-1 ring-[var(--border-subtle)] shadow-sm scale-[1.02] my-2` 
          : "border-transparent bg-[var(--background-alt)]"
      } ${isLower ? "opacity-60 grayscale-[50%]" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-md text-[11px] font-bold ${isActive ? badgeClasses[tone] : "bg-white text-[var(--foreground-muted)] border border-[var(--border-subtle)]"}`}>
            L{level}
          </span>
          <span className={`text-[13px] font-bold ${isActive ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
            Level {level}
          </span>
          {isActive && <CheckCircle2 className={`w-4 h-4 ${tone === 'success' ? 'text-[var(--brand-success)]' : tone === 'primary' ? 'text-[var(--brand-primary)]' : tone === 'accent' ? 'text-[var(--brand-accent)]' : 'text-[var(--brand-warning)]'}`} aria-hidden="true" />}
        </div>
        <span className={`text-[13px] font-mono font-bold ${isActive ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
          ${amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
