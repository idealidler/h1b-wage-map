"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl, MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox"; 
import { ChevronDown, MapPin, Loader2, AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";
const FR_RULE_URL =
  "https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b";
const DOL_WAGE_URL = "https://www.flcdatacenter.com/";

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
      let color = "#F8F9FA"; // Light gray for no data
      let userLevel = 0;

      if (countyWages) {
          Object.assign(newProps, countyWages);
          if (debouncedSalary >= countyWages.l4) { color = "#10B981"; userLevel = 4; } // brand-success
          else if (debouncedSalary >= countyWages.l3) { color = "#4285F4"; userLevel = 3; } // brand-primary
          else if (debouncedSalary >= countyWages.l2) { color = "#FBBC04"; userLevel = 2; } // brand-accent
          else if (debouncedSalary >= countyWages.l1) { color = "#EA4335"; userLevel = 1; } // brand-warning
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
      if (current === 0) return { diff: props.l1 - debouncedSalary, next: "Level 1" };
      if (current === 1) return { diff: props.l2 - debouncedSalary, next: "Level 2" };
      if (current === 2) return { diff: props.l3 - debouncedSalary, next: "Level 3" };
      if (current === 3) return { diff: props.l4 - debouncedSalary, next: "Level 4" };
      return null; 
  };

  const activePopup = selectedInfo || hoverInfo;
  const gapInfo = activePopup ? getNextLevelInfo(activePopup.properties) : null;

  return (
    <div className="flex flex-col gap-1.5 h-full">

      <div className="bg-white rounded-t-lg border-b border-[var(--border-subtle)] p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative">
          <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="bg-blue-50 p-2 rounded-lg hidden sm:block">
                  <MapPin className="w-5 h-5 text-[var(--brand-primary)]" />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">Zoom to location</h2>
                  <p className="text-xs text-gray-500 font-medium">Find specific county data</p>
               </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative group w-full md:w-48">
                  <select
                    aria-label="Select state"
                    value={selectedState}
                    disabled={status !== "ready"}
                    onChange={(e) => { setSelectedState(e.target.value); setSelectedCountyFips(""); if(e.target.value) handleJumpToState(e.target.value); }}
                    className="appearance-none bg-white border border-[var(--border-subtle)] text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] block w-full p-2.5 pr-8 cursor-pointer font-medium disabled:opacity-50 transition-all"
                  >
                      <option value="">Select State</option>
                      {locationList.map((loc) => (<option key={loc.state} value={loc.state}>{loc.state}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative group w-full md:w-56">
                  <select
                    aria-label="Select county"
                    value={selectedCountyFips}
                    disabled={!selectedState || status !== "ready"}
                    onChange={(e) => { setSelectedCountyFips(e.target.value); if(e.target.value) handleJumpToCounty(e.target.value); }}
                    className="appearance-none bg-white border border-[var(--border-subtle)] text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] block w-full p-2.5 pr-8 cursor-pointer font-medium disabled:opacity-50 transition-all"
                  >
                      <option value="">Select County</option>
                      {selectedState && locationList.find(l => l.state === selectedState)?.counties.map((c) => (<option key={c.fips} value={c.fips}>{c.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
          </div>
      </div>

      <div className="h-[500px] md:h-[650px] w-full rounded-b-lg overflow-hidden relative bg-gray-100">
        {!TOKEN && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-50"><AlertCircle className="w-10 h-10 text-[var(--brand-warning)] mb-2" /><p className="text-gray-900 font-bold">Missing Mapbox Token</p></div>)}
        {status === "loading" && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-40 backdrop-blur-sm"><Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin mb-2" /><span className="text-sm font-bold text-gray-700">Loading county wage map...</span></div>)}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-40 px-4 text-center">
            <AlertCircle className="w-10 h-10 text-[var(--brand-accent)] mb-2" />
            <p className="text-gray-900 font-bold">No wage data found for this SOC code</p>
            <p className="text-sm text-gray-600 mt-1">Try selecting a broader role title or choose a nearby SOC option.</p>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute top-3 left-3 z-10 rounded-lg border border-[var(--border-subtle)] bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm">
            <div className="font-semibold text-gray-900">Source Links</div>
            <div className="mt-1 flex flex-col gap-1">
              <a href={FR_RULE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline">
                FY2027 DHS Rule <ExternalLink className="w-3 h-3" />
              </a>
              <a href={DOL_WAGE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline">
                DOL FLC Data Center <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute bottom-6 left-2 md:left-4 z-10 bg-white/95 backdrop-blur shadow-sm rounded-lg border border-[var(--border-subtle)] p-3 w-56">
              <h4 className="text-xs font-bold text-gray-900 mb-2">Weighted Entry Guide</h4>
              <div className="space-y-2">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--brand-success)]"></span><span className="text-xs font-medium text-gray-700">L4</span></div><span className="text-[11px] font-semibold text-gray-600">4 entries • ~61%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--brand-primary)]"></span><span className="text-xs font-medium text-gray-700">L3</span></div><span className="text-[11px] font-semibold text-gray-600">3 entries • ~46%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--brand-accent)]"></span><span className="text-xs font-medium text-gray-700">L2</span></div><span className="text-[11px] font-semibold text-gray-600">2 entries • ~30%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[var(--brand-warning)]"></span><span className="text-xs font-medium text-gray-700">L1</span></div><span className="text-[11px] font-semibold text-gray-600">1 entry • ~15%</span></div>
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
                <Layer id="county-fill" type="fill" paint={{ "fill-color": ["get", "calculatedColor"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.8] }} /> 
                <Layer id="county-outline" type="line" paint={{ "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.5 }} />
                <Layer id="county-label" type="symbol" minzoom={5.5} layout={{ "text-field": ["get", "c"], "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-size": 11, "text-anchor": "center", "text-max-width": 6 }} paint={{ "text-color": "#202124", "text-halo-color": "#ffffff", "text-halo-width": 2 }} />
            </Source>

            {activePopup && (
                <Popup longitude={activePopup.longitude} latitude={activePopup.latitude} offset={15} closeButton={!!selectedInfo} closeOnClick={false} onClose={() => setSelectedInfo(null)} className="z-50" maxWidth="340px">
                    <div className="p-1 font-sans">
                        <div className="mb-3">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{activePopup.properties.c}</h3>
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-xs font-medium text-gray-500">{activePopup.properties.s}</span>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono font-bold">Base Pay: ${debouncedSalary.toLocaleString()}</span>
                            </div>
                        </div>

                        

                        <div className="mt-3 space-y-1.5">
                            <LevelRow level={4} amount={activePopup.properties.l4} activeLevel={activePopup.properties.userLevel} tone="success" />
                            <LevelRow level={3} amount={activePopup.properties.l3} activeLevel={activePopup.properties.userLevel} tone="primary" />
                            <LevelRow level={2} amount={activePopup.properties.l2} activeLevel={activePopup.properties.userLevel} tone="accent" />
                            <LevelRow level={1} amount={activePopup.properties.l1} activeLevel={activePopup.properties.userLevel} tone="warning" />
                        </div>

                        {gapInfo && (
                            <p className="mt-3 text-xs text-gray-700">
                                To reach {gapInfo.next}, increase base pay by <span className="font-semibold">${gapInfo.diff.toLocaleString()}</span>.
                            </p>
                        )}
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

  const toneClasses = {
    success: "border-[var(--brand-success)] bg-emerald-50",
    primary: "border-[var(--brand-primary)] bg-blue-50",
    accent: "border-[var(--brand-accent)] bg-amber-50",
    warning: "border-[var(--brand-warning)] bg-red-50",
  };

  const badgeClasses = {
    success: "bg-[var(--brand-success)] text-white",
    primary: "bg-[var(--brand-primary)] text-white",
    accent: "bg-[var(--brand-accent)] text-gray-900",
    warning: "bg-[var(--brand-warning)] text-white",
  };

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-all ${
        isActive ? `${toneClasses[tone]} shadow-sm ring-1 ring-offset-0 ${toneClasses[tone]}` : "border-gray-100 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-md text-xs font-bold ${isActive ? badgeClasses[tone] : "bg-white text-gray-600 border border-gray-200"}`}>
            L{level}
          </span>
          <span className={`text-xs font-semibold ${isActive ? "text-gray-900" : "text-gray-500"}`}>
            Level {level}
          </span>
          {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />}
        </div>
        <span className={`text-sm font-semibold ${isActive ? "text-gray-900" : "text-gray-700"}`}>
          ${amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
