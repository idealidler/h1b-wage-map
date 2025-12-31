"use client";

import { useEffect, useState, useRef } from "react";
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl, MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import bbox from "@turf/bbox"; 
import { ChevronDown, MapPin, Briefcase, TrendingUp, CheckCircle2 } from "lucide-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

interface LocationData {
  state: string;
  counties: { name: string; fips: number }[];
}

export default function WageMap({ socCode, jobTitle, userSalary }: { socCode: string, jobTitle: string, userSalary: number }) {
  const mapRef = useRef<MapRef>(null);
  
  const [mergedData, setMergedData] = useState<any>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [selectedInfo, setSelectedInfo] = useState<any>(null);
  const [status, setStatus] = useState("Initializing...");
  
  // LOCATION SEARCH STATE
  const [locationList, setLocationList] = useState<LocationData[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCountyFips, setSelectedCountyFips] = useState<string>("");

  useEffect(() => {
    if (!socCode) return;
    setStatus("Loading Map & Data...");

    Promise.all([
      fetch(GEOJSON_URL).then(res => res.json()),
      fetch(`/jobs/${socCode}.json`).then(res => res.json())
    ]).then(([geoJson, wageData]) => {
      
      const processedFeatures = geoJson.features.map((feature: any) => {
        const fipsId = parseInt(feature.id, 10);
        const countyWages = wageData[fipsId] || wageData[feature.id] || wageData[String(fipsId).padStart(5, '0')];

        let color = "#e5e7eb"; 
        if (countyWages) {
            feature.properties = { ...feature.properties, ...countyWages };
            // Calculate User Level logic
            if (userSalary >= countyWages.l4) { color = "#10b981"; feature.properties.userLevel = 4; }
            else if (userSalary >= countyWages.l3) { color = "#3b82f6"; feature.properties.userLevel = 3; }
            else if (userSalary >= countyWages.l2) { color = "#f59e0b"; feature.properties.userLevel = 2; }
            else if (userSalary >= countyWages.l1) { color = "#ef4444"; feature.properties.userLevel = 1; }
            else { color = "#9ca3af"; feature.properties.userLevel = 0; }
        }
        
        feature.properties.calculatedColor = color;
        return feature;
      });

      setMergedData({ type: "FeatureCollection", features: processedFeatures });

      const stateMap: Record<string, { name: string; fips: number }[]> = {};
      Object.entries(wageData).forEach(([fips, data]: [string, any]) => {
          if (!data.s || !data.c) return;
          const state = data.s;
          const county = data.c;
          if (!stateMap[state]) stateMap[state] = [];
          stateMap[state].push({ name: county, fips: Number(fips) });
      });

      const sortedLocations = Object.keys(stateMap).sort().map(state => ({
          state,
          counties: stateMap[state].sort((a, b) => a.name.localeCompare(b.name))
      }));

      setLocationList(sortedLocations);
      setStatus(`✅ Ready`);

    }).catch(err => {
      console.error(err);
      setStatus("❌ Error loading data");
    });

  }, [socCode, userSalary]);

  // --- HELPER: Handle Zoom Logic ---
  const handleJumpToState = (stateCode: string) => {
      if (!mergedData || !mapRef.current) return;
      const stateFeatures = mergedData.features.filter((f: any) => f.properties.s === stateCode);
      if (stateFeatures.length > 0) {
          try {
              const [minLng, minLat, maxLng, maxLat] = bbox({ type: "FeatureCollection", features: stateFeatures });
              mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1500 });
              setSelectedInfo(null);
          } catch (e) { console.error("State zoom error", e); }
      }
  };

  const handleJumpToCounty = (fips: string) => {
      if (!mergedData || !mapRef.current) return;
      const feature = mergedData.features.find((f: any) => parseInt(f.id, 10) === parseInt(fips, 10) || f.id === fips);
      if (feature) {
          try {
             const [minLng, minLat, maxLng, maxLat] = bbox(feature);
             mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], { 
                 padding: { top: 320, bottom: 50, left: 50, right: 50 }, maxZoom: 9.5, duration: 2000 
             });
             setSelectedInfo({ longitude: (minLng + maxLng) / 2, latitude: (minLat + maxLat) / 2, properties: feature.properties });
             setHoverInfo(null);
          } catch (e) { console.error("Zoom error", e); }
      }
  };

  // --- HELPER: CALCULATE GAP ---
  const getNextLevelInfo = (props: any) => {
      if (!props) return null;
      const current = props.userLevel;
      
      // If below Level 1
      if (current === 0) return { diff: props.l1 - userSalary, next: "Level 1" };
      // If Level 1 -> 2
      if (current === 1) return { diff: props.l2 - userSalary, next: "Level 2" };
      // If Level 2 -> 3
      if (current === 2) return { diff: props.l3 - userSalary, next: "Level 3" };
      // If Level 3 -> 4
      if (current === 3) return { diff: props.l4 - userSalary, next: "Level 4" };
      
      return null; // Already Max Level 4
  };

  const activePopup = selectedInfo || hoverInfo;
  const gapInfo = activePopup ? getNextLevelInfo(activePopup.properties) : null;

  return (
    <div className="flex flex-col gap-4">
      
      {/* DASHBOARD HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
             <div className="bg-blue-100 p-2 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-700" />
             </div>
             <div className="overflow-hidden">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Target Role</p>
                <h2 className="text-sm font-bold text-gray-900 leading-tight truncate" title={jobTitle}>{jobTitle}</h2>
                <p className="text-[10px] text-gray-400 font-mono">{socCode}</p>
             </div>
        </div>

        <div className="md:col-span-8 flex flex-col md:flex-row items-center gap-3">
             <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase whitespace-nowrap md:ml-auto">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Locate County:</span>
            </div>
            
            <div className="relative group w-full md:w-48">
                <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedCountyFips(""); if(e.target.value) handleJumpToState(e.target.value); }}
                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 block w-full p-2.5 pr-8 cursor-pointer font-medium">
                    <option value="">Select State</option>
                    {locationList.map((loc) => (<option key={loc.state} value={loc.state}>{loc.state}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative group w-full md:w-56">
                <select value={selectedCountyFips} onChange={(e) => { setSelectedCountyFips(e.target.value); if(e.target.value) handleJumpToCounty(e.target.value); }} disabled={!selectedState}
                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 block w-full p-2.5 pr-8 cursor-pointer disabled:opacity-50 font-medium">
                    <option value="">Select County</option>
                    {selectedState && locationList.find(l => l.state === selectedState)?.counties.map((c) => (<option key={c.fips} value={c.fips}>{c.name}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="h-[650px] w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 relative">
        {!TOKEN && <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-red-50 z-50">Missing Mapbox Token</div>}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-[10px] font-mono z-10 pointer-events-none">{status}</div>

        {/* LEGEND */}
        <div className="absolute bottom-8 right-2 md:right-4 z-10 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-3 w-40">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Wage Level Legend</h4>
            <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span><span className="text-xs font-semibold text-gray-800">Level 4 (Safe)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span><span className="text-xs font-semibold text-gray-800">Level 3 (Good)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span><span className="text-xs font-semibold text-gray-800">Level 2 (Fair)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span><span className="text-xs font-semibold text-gray-800">Level 1 (Risky)</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#e5e7eb] border border-gray-300"></span><span className="text-xs text-gray-400">Low / No Data</span></div>
            </div>
        </div>

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
                if (f && f.properties?.l1) setHoverInfo({ longitude: lngLat.lng, latitude: lngLat.lat, properties: f.properties });
                else setHoverInfo(null);
            }}
            onMouseLeave={() => !selectedInfo && setHoverInfo(null)}
            onClick={(event) => {
                const { features, lngLat } = event;
                const f = features && features[0];
                if (f && f.properties?.l1) {
                    setSelectedInfo({ longitude: lngLat.lng, latitude: lngLat.lat, properties: f.properties });
                    setHoverInfo(null); 
                } else setSelectedInfo(null);
            }}
        >
            <GeolocateControl position="top-right" />
            <NavigationControl position="top-right" showCompass={false} />

            {mergedData && (
            <Source type="geojson" data={mergedData as any}>
                <Layer id="county-fill" type="fill" paint={{ "fill-color": ["get", "calculatedColor"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.8] }} /> 
                <Layer id="county-outline" type="line" paint={{ "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.5 }} />
                <Layer id="county-label" type="symbol" minzoom={5.5} layout={{ "text-field": ["get", "c"], "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-size": 11, "text-anchor": "center", "text-max-width": 6 }} paint={{ "text-color": "#111827", "text-halo-color": "#ffffff", "text-halo-width": 2 }} />
            </Source>
            )}

            {activePopup && (
                <Popup
                    longitude={activePopup.longitude}
                    latitude={activePopup.latitude}
                    offset={15}
                    closeButton={!!selectedInfo}
                    closeOnClick={false}
                    onClose={() => setSelectedInfo(null)}
                    className="z-50"
                    maxWidth="320px"
                >
                    <div className="text-sm p-1 font-sans">
                        <div className="mb-2 border-b pb-2">
                            <h3 className="font-bold text-gray-900 text-base">{activePopup.properties.c}, {activePopup.properties.s}</h3>
                            <p className="text-xs text-gray-500">
                                Based on offer: <span className="font-semibold text-gray-700">${userSalary.toLocaleString()}</span>
                            </p>
                        </div>
                        
                        {/* WAGE ROWS - Only active level is highlighted */}
                        <div className="space-y-1">
                            <WageRow level={4} amount={activePopup.properties.l4} userLevel={activePopup.properties.userLevel} 
                                odds="+107% Boost" prob="~61%" impact="Safe" />
                            <WageRow level={3} amount={activePopup.properties.l3} userLevel={activePopup.properties.userLevel} 
                                odds="+55% Boost" prob="~46%" impact="Good" />
                            <WageRow level={2} amount={activePopup.properties.l2} userLevel={activePopup.properties.userLevel} 
                                odds="+3% Boost" prob="~30%" impact="Fair" />
                            <WageRow level={1} amount={activePopup.properties.l1} userLevel={activePopup.properties.userLevel} 
                                odds="-48% Drop" prob="~15%" impact="Risky" />
                        </div>

                        {/* --- SMART ACTION TOOLTIP --- */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            {gapInfo ? (
                                <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-start gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Negotiation Tip</div>
                                        <div className="text-xs font-semibold text-blue-900 leading-tight">
                                            Raise offer by <span className="text-blue-700 bg-blue-100 px-1 rounded">${gapInfo.diff.toLocaleString()}</span> to reach {gapInfo.next}!
                                        </div>
                                    </div>
                                </div>
                            ) : activePopup.properties.userLevel === 4 ? (
                                <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-800">Top Tier! Max Odds Achieved.</span>
                                </div>
                            ) : null}
                        </div>
                        
                        <div className="mt-2 text-[9px] text-gray-400 leading-tight text-center">
                            *Projections via DHS Docket No. USCIS-2025-0040.
                        </div>
                    </div>
                </Popup>
            )}
        </Map>
      </div>
    </div>
  );
}

// Updated WageRow with Stacked Badges
function WageRow({ level, amount, userLevel, odds, prob, impact }: any) {
    const isMatch = userLevel === level;
    // Lower opacity for non-matching rows to make the active one pop
    const rowClass = isMatch ? "opacity-100 bg-gray-50 rounded shadow-sm scale-[1.02] border border-gray-200" : "opacity-40 grayscale blur-[0.2px]";
    
    let badgeStyle = "bg-gray-100 text-gray-500 border-gray-200";
    if (isMatch) {
        if (level === 4) badgeStyle = "bg-green-100 text-green-800 border-green-200";
        else if (level === 3) badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
        else if (level === 2) badgeStyle = "bg-yellow-50 text-yellow-700 border-yellow-200";
        else if (level === 1) badgeStyle = "bg-red-50 text-red-700 border-red-200";
    }

    return (
        <div className={`flex justify-between items-center ${rowClass} transition-all duration-300 py-1.5 px-2`}>
            <div className="flex flex-col w-20">
                <span className="font-bold text-gray-800 text-xs">Level {level}</span>
                <span className="text-[10px] text-gray-500">${amount?.toLocaleString()}</span>
            </div>
            
            <div className="flex-1 mx-2 text-[10px] font-medium text-center text-gray-500">
                {odds}
            </div>

            <div className={`w-20 py-0.5 rounded border text-center flex flex-col justify-center ${badgeStyle}`}>
                <span className="font-bold text-[10px] leading-none mb-0.5">{prob}</span>
                <span className="text-[8px] uppercase font-bold opacity-80 leading-none">{impact}</span>
            </div>
        </div>
    );
}