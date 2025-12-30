"use client";

import { useEffect, useState } from "react";
import Map, { Source, Layer, Popup, NavigationControl, GeolocateControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

export default function WageMap({ socCode, jobTitle, userSalary }: { socCode: string, jobTitle: string, userSalary: number }) {
  const [mergedData, setMergedData] = useState<any>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [selectedInfo, setSelectedInfo] = useState<any>(null);
  const [status, setStatus] = useState("Initializing...");

  // 1. Load & Merge Data
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
      setStatus(`✅ Ready`);
    }).catch(err => {
      console.error(err);
      setStatus("❌ Error loading data");
    });

  }, [socCode, userSalary]);

  const fillLayer = {
    id: "county-fill",
    type: "fill" as const,
    paint: {
      "fill-color": ["get", "calculatedColor"], 
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.8]
    }
  };

  const borderLayer = {
    id: "county-outline",
    type: "line" as const,
    paint: { "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.5 }
  };

  const activePopup = selectedInfo || hoverInfo;

  return (
    <div className="h-[650px] w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 relative">
      {!TOKEN && <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-red-50 z-50">Missing Mapbox Token</div>}
      
      {/* 1. TOP LEFT: Context Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-sm pointer-events-none">
        <div className="bg-white/95 backdrop-blur shadow-md px-4 py-3 rounded-lg border-l-4 border-blue-600">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Current Role</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{jobTitle}</h2>
            <p className="text-xs text-gray-400 mt-1 font-mono">{socCode}</p>
        </div>

        <div className="bg-blue-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm inline-block self-start">
           ⚖️ FY2027 Rule: Weighted Selection
        </div>
      </div>

      {/* 2. BOTTOM LEFT: Status */}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-[10px] font-mono z-10 pointer-events-none">
        {status}
      </div>

      {/* 3. NEW: LEGEND (Bottom Right) */}
      <div className="absolute bottom-8 right-2 md:right-4 z-10 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-3 w-40">
          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Wage Level Legend</h4>
          <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                  <span className="text-xs font-semibold text-gray-800">Level 4 (Safe)</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span>
                  <span className="text-xs font-semibold text-gray-800">Level 3 (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
                  <span className="text-xs font-semibold text-gray-800">Level 2 (Fair)</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                  <span className="text-xs font-semibold text-gray-800">Level 1 (Risky)</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#e5e7eb] border border-gray-300"></span>
                  <span className="text-xs text-gray-400">No Data / Low</span>
              </div>
          </div>
      </div>

      <Map
        initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={TOKEN}
        interactiveLayerIds={['county-fill']}
        
        onMouseMove={(event) => {
            if (selectedInfo) return; 
            const { features, lngLat } = event;
            const hoveredFeature = features && features[0];
            if (hoveredFeature && hoveredFeature.properties?.l1) {
                setHoverInfo({
                    longitude: lngLat.lng,
                    latitude: lngLat.lat,
                    properties: hoveredFeature.properties
                });
            } else {
                setHoverInfo(null);
            }
        }}
        onMouseLeave={() => !selectedInfo && setHoverInfo(null)}
        onClick={(event) => {
            const { features, lngLat } = event;
            const clickedFeature = features && features[0];
            if (clickedFeature && clickedFeature.properties?.l1) {
                setSelectedInfo({
                    longitude: lngLat.lng,
                    latitude: lngLat.lat,
                    properties: clickedFeature.properties
                });
                setHoverInfo(null); 
            } else {
                setSelectedInfo(null);
            }
        }}
      >
        <GeolocateControl position="top-right" />
        <NavigationControl position="top-right" showCompass={false} />

        {mergedData && (
          <Source type="geojson" data={mergedData as any}>
             <Layer {...fillLayer as any} /> 
             <Layer {...borderLayer as any} />
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
                    
                    <div className="space-y-2">
                        <WageRow level={4} amount={activePopup.properties.l4} userSalary={userSalary} 
                            odds="4 Entries" prob="~61%" impact="+107% Chance" />
                        <WageRow level={3} amount={activePopup.properties.l3} userSalary={userSalary} 
                            odds="3 Entries" prob="~46%" impact="+55% Chance" />
                        <WageRow level={2} amount={activePopup.properties.l2} userSalary={userSalary} 
                            odds="2 Entries" prob="~30%" impact="+3% Chance" />
                        <WageRow level={1} amount={activePopup.properties.l1} userSalary={userSalary} 
                            odds="1 Entry" prob="~15%" impact="-48% Chance" />
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 text-[9px] text-gray-400 leading-tight">
                        *Probabilities based on DHS Docket No. USCIS-2025-0040.
                    </div>
                </div>
            </Popup>
        )}
      </Map>
    </div>
  );
}

function WageRow({ level, amount, userSalary, odds, prob, impact }: any) {
    const isCovered = userSalary >= amount;
    const rowClass = isCovered ? "opacity-100" : "opacity-40 grayscale";
    const badgeColor = isCovered 
        ? (level >= 3 ? "bg-green-50 text-green-700 border-green-200" : (level === 2 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-red-50 text-red-700 border-red-100"))
        : "bg-gray-50 text-gray-500 border-gray-100";

    return (
        <div className={`flex justify-between items-center ${rowClass} transition-all duration-200`}>
            <div className="flex flex-col w-20">
                <span className="font-bold text-gray-800 text-xs">Level {level}</span>
                <span className="text-[10px] text-gray-500">${amount?.toLocaleString()}</span>
            </div>
            <div className={`flex-1 mx-2 text-[10px] font-medium text-center ${isCovered ? "text-gray-700" : "text-gray-400"}`}>
                {odds}
            </div>
            <div className={`w-24 px-1.5 py-1 rounded border text-[10px] font-medium flex flex-col items-end ${badgeColor}`}>
                <span className="font-bold">{prob} Win Rate</span>
                <span className="text-[9px] opacity-80">{impact}</span>
            </div>
        </div>
    );
}