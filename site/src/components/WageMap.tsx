"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl, MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox"; 
import { ChevronDown, MapPin, Loader2, AlertCircle, ExternalLink, CheckCircle2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";
const DOL_WAGE_URL = "https://www.flcdatacenter.com/";

// Synchronized with our global.css tokens for Mapbox Canvas injection
const COLORS = {
  L4: "#10b981", // var(--brand-success)
  L3: "#2563eb", // var(--brand-primary)
  L2: "#f59e0b", // var(--brand-accent)
  L1: "#ef4444", // var(--brand-warning)
  NONE: "#f8fafc", // var(--background-alt)
};

let cachedGeoJson: GeoJSON.FeatureCollection | null = null;

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

interface NextLevelInfo {
  diff: number;
  next: string;
  nextOdds: string;
}

export default function WageMap({ socCode, jobTitle, userSalary }: { socCode: string; jobTitle: string; userSalary: number; }) {
  const mapRef = useRef<MapRef>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [wageMapData, setWageMapData] = useState<Record<string, WageData>>({});
  const [hoverInfo, setHoverInfo] = useState<ActivePopupData | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<ActivePopupData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCountyFips, setSelectedCountyFips] = useState<string>("");

  const [debouncedSalary, setDebouncedSalary] = useState(userSalary);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSalary(userSalary); }, 150);
    return () => clearTimeout(handler);
  }, [userSalary]);

  useEffect(() => {
    if (!socCode) return;
    let isMounted = true;
    setStatus("loading");
    setWageMapData({}); 

    const fetchData = async () => {
      try {
        if (!cachedGeoJson) {
          const geoRes = await fetch(GEOJSON_URL);
          if (!geoRes.ok) throw new Error("Failed to load map geometry");
          cachedGeoJson = await geoRes.json();
        }

        const baseSocCode = socCode.split('.')[0];
        const wageRes = await fetch(`/jobs/${baseSocCode}.json`);
        
        if (!wageRes.ok) throw new Error("No wage data found");
        const wageData: Record<string, WageData> = await wageRes.json();

        if (isMounted) {
          setGeoJson(cachedGeoJson);
          setWageMapData(wageData);
          setStatus("ready");
        }
      } catch (err) {
        if (isMounted) setStatus("error");
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [socCode]);

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
          mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: { top: 320, bottom: 50, left: 50, right: 50 }, maxZoom: 9.5, duration: 2000 });
          setSelectedInfo({ longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2, properties: feature.properties as WageFeatureProperties });
          setHoverInfo(null);
      }
  };

  const getNextLevelInfo = (props: WageFeatureProperties | undefined): NextLevelInfo | null => {
      if (!props) return null;
      const current = props.userLevel;
      if (current === 0) return { diff: props.l1 - debouncedSalary, next: "Level 1", nextOdds: "~15%" };
      if (current === 1) return { diff: props.l2 - debouncedSalary, next: "Level 2", nextOdds: "~30%" };
      if (current === 2) return { diff: props.l3 - debouncedSalary, next: "Level 3", nextOdds: "~46%" };
      if (current === 3) return { diff: props.l4 - debouncedSalary, next: "Level 4", nextOdds: "~61%" };
      return null; 
  };

  const activePopup = selectedInfo || hoverInfo;
  const gapInfo = activePopup ? getNextLevelInfo(activePopup.properties) : null;

  return (
    <div className="flex flex-col gap-2 h-full">

      {/* Top Control Bar */}
      <div className="bg-white rounded-2xl border border-[var(--border-subtle)] p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="bg-[var(--surface-muted)] p-2.5 rounded-xl hidden sm:block border border-[var(--border-subtle)]">
                  <MapPin className="w-5 h-5 text-[var(--foreground-muted)]" />
               </div>
               <div>
                  <h2 className="text-[15px] font-bold text-[var(--foreground)] leading-tight">Explore Regions</h2>
                  <p className="text-xs text-[var(--foreground-muted)] font-medium">Zoom to a specific state or county</p>
               </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-48">
                  <select
                    aria-label="Select state"
                    value={selectedState}
                    disabled={status !== "ready"}
                    onChange={(e) => { setSelectedState(e.target.value); setSelectedCountyFips(""); if(e.target.value) handleJumpToState(e.target.value); }}
                    className="appearance-none bg-[var(--background-alt)] border border-[var(--border-subtle)] text-[var(--foreground)] text-sm rounded-xl focus:bg-white focus:ring-4 focus:ring-[var(--ring-subtle)] focus:border-[var(--brand-primary)] block w-full p-3 pr-8 cursor-pointer font-medium disabled:opacity-50 transition-all outline-none"
                  >
                      <option value="">Select State</option>
                      {locationList.map((loc) => (<option key={loc.state} value={loc.state}>{loc.state}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
              </div>
              <div className="relative group w-full md:w-56">
                  <select
                    aria-label="Select county"
                    value={selectedCountyFips}
                    disabled={!selectedState || status !== "ready"}
                    onChange={(e) => { setSelectedCountyFips(e.target.value); if(e.target.value) handleJumpToCounty(e.target.value); }}
                    className="appearance-none bg-[var(--background-alt)] border border-[var(--border-subtle)] text-[var(--foreground)] text-sm rounded-xl focus:bg-white focus:ring-4 focus:ring-[var(--ring-subtle)] focus:border-[var(--brand-primary)] block w-full p-3 pr-8 cursor-pointer font-medium disabled:opacity-50 transition-all outline-none"
                  >
                      <option value="">Select County</option>
                      {selectedState && locationList.find(l => l.state === selectedState)?.counties.map((c) => (<option key={c.fips} value={c.fips}>{c.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-[var(--foreground-muted)] pointer-events-none" />
              </div>
          </div>
      </div>

      {/* Map Container */}
      <div className="h-[500px] md:h-[650px] w-full rounded-2xl overflow-hidden relative bg-[var(--background-alt)] border border-[var(--border-subtle)] shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
        {!TOKEN && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-50"><AlertCircle className="w-10 h-10 text-[var(--brand-warning)] mb-3" /><p className="text-[var(--foreground)] font-bold text-lg">Missing Mapbox Token</p></div>)}
        {status === "loading" && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-40 backdrop-blur-md"><Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin mb-3" /><span className="text-sm font-bold text-[var(--foreground)] tracking-wide">Loading prevailing wage data...</span></div>)}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-40 px-4 text-center backdrop-blur-md">
            <AlertCircle className="w-12 h-12 text-[var(--brand-accent)] mb-3" />
            <p className="text-[var(--foreground)] font-bold text-lg">No wage data found</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-1.5 max-w-sm">Try selecting a broader role title or choose a nearby SOC option from the list.</p>
          </div>
        )}


        {/* Re-designed Probability Legend */}
        {status === "ready" && (
          <div className="absolute bottom-6 left-4 z-10 bg-white/95 backdrop-blur-xl shadow-lg rounded-2xl border border-[var(--border-subtle)] p-4 w-64">
              <h4 className="text-[13px] font-bold text-[var(--foreground)] mb-1">Estimated Selection Odds</h4>
              
              
              <div className="space-y-2.5">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[var(--brand-success)] shadow-sm"></span>
                      <span className="text-[13px] font-bold text-[var(--foreground)]">L4 <span className="text-[var(--foreground-muted)] font-medium text-xs ml-1">4x Entries</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-success)]">~61%</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[var(--brand-primary)] shadow-sm"></span>
                      <span className="text-[13px] font-bold text-[var(--foreground)]">L3 <span className="text-[var(--foreground-muted)] font-medium text-xs ml-1">3x Entries</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-primary)]">~46%</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[var(--brand-accent)] shadow-sm"></span>
                      <span className="text-[13px] font-bold text-[var(--foreground)]">L2 <span className="text-[var(--foreground-muted)] font-medium text-xs ml-1">2x Entries</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-accent)]">~30%</span>
                  </div>
                  
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-md bg-[var(--brand-warning)] shadow-sm"></span>
                      <span className="text-[13px] font-bold text-[var(--foreground)]">L1 <span className="text-[var(--foreground-muted)] font-medium text-xs ml-1">1x Entry</span></span>
                    </div>
                    <span className="text-[12px] font-bold text-[var(--brand-warning)]">~15%</span>
                  </div>
              </div>
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

            <Source id="county-wage-source" type="geojson" data={(mergedData as any) || { type: "FeatureCollection", features: [] }}>
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
                  maxWidth="360px"
                >
                    <div className="p-2 font-sans bg-white">
                        <div className="mb-4">
                            <h3 className="font-bold text-[var(--foreground)] text-[17px] leading-tight">{activePopup.properties.c}</h3>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[13px] font-medium text-[var(--foreground-muted)]">{activePopup.properties.s}</span>
                                <span className="text-[11px] bg-[var(--surface-muted)] px-2.5 py-1 rounded-md text-[var(--foreground)] font-mono font-bold border border-[var(--border-subtle)]">
                                  Base: ${debouncedSalary.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <LevelRow level={4} amount={activePopup.properties.l4} activeLevel={activePopup.properties.userLevel} tone="success" />
                            <LevelRow level={3} amount={activePopup.properties.l3} activeLevel={activePopup.properties.userLevel} tone="primary" />
                            <LevelRow level={2} amount={activePopup.properties.l2} activeLevel={activePopup.properties.userLevel} tone="accent" />
                            <LevelRow level={1} amount={activePopup.properties.l1} activeLevel={activePopup.properties.userLevel} tone="warning" />
                        </div>

                        {/* Actionable Gap Analysis */}
                        <AnimatePresence>
                          {gapInfo && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-3.5 pt-3 border-t border-[var(--border-subtle)]"
                              >
                                  <div className="flex items-start gap-2.5 bg-[var(--surface-muted)] p-3 rounded-xl border border-[var(--border-subtle)]">
                                    <TrendingUp className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-[12px] text-[var(--foreground)] font-medium leading-snug">
                                          A <span className="font-bold text-[var(--foreground)]">${gapInfo.diff.toLocaleString()}</span> bump reaches <span className="font-bold">{gapInfo.next}</span>.
                                      </p>
                                      <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                          This increases selection odds to <span className="font-bold text-[var(--foreground)]">{gapInfo.nextOdds}</span>.
                                      </p>
                                    </div>
                                  </div>
                              </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                </Popup>
            )}
        </Map>
      </div>
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