"use client";

import { useEffect, useState } from "react";
import Map, { Source, Layer, FillLayer, LineLayer, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json";

export default function WageMap({ socCode, userSalary }: { socCode: string, userSalary: number }) {
  // We use <any> here to prevent TypeScript from complaining about the complex GeoJSON shape
  const [mergedData, setMergedData] = useState<any>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
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
        // Robust ID Lookup
        const countyWages = wageData[fipsId] || wageData[feature.id] || wageData[String(fipsId).padStart(5, '0')];

        let color = "#e5e7eb"; 
        
        // Inject Wage Data + Calculate Level
        if (countyWages) {
            feature.properties = { ...feature.properties, ...countyWages };
            
            // Determine User's Level
            if (userSalary >= countyWages.l4) { color = "#10b981"; feature.properties.userLevel = 4; }
            else if (userSalary >= countyWages.l3) { color = "#3b82f6"; feature.properties.userLevel = 3; }
            else if (userSalary >= countyWages.l2) { color = "#f59e0b"; feature.properties.userLevel = 2; }
            else if (userSalary >= countyWages.l1) { color = "#ef4444"; feature.properties.userLevel = 1; }
            else { color = "#9ca3af"; feature.properties.userLevel = 0; }
        }
        
        feature.properties.calculatedColor = color;
        return feature;
      });

      // We explicitly create the object structure
      setMergedData({ 
        type: "FeatureCollection", 
        features: processedFeatures 
      });

      setStatus(`✅ Ready! Displaying ${socCode}`);
    }).catch(err => {
      console.error(err);
      setStatus("❌ Error loading data");
    });

  }, [socCode, userSalary]);

  // 2. Map Style
  const fillLayer: FillLayer = {
    id: "county-fill",
    type: "fill",
    paint: {
      "fill-color": ["get", "calculatedColor"], 
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.8]
    }
  };

  const borderLayer: LineLayer = {
    id: "county-outline",
    type: "line",
    paint: { "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.5 }
  };

  return (
    <div className="h-[650px] w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 relative">
      {!TOKEN && <div className="absolute inset-0 flex items-center justify-center text-red-600 bg-red-50 z-50">Missing Mapbox Token</div>}
      
      <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-xs font-mono z-20 pointer-events-none">
        {status}
      </div>

      <div className="absolute top-2 right-2 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold z-20 shadow-sm backdrop-blur">
         ⚖️ FY2027 Rule: Weighted Selection Active
      </div>

      <Map
        initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={TOKEN}
        interactiveLayerIds={['county-fill']}
        onMouseMove={(event) => {
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
        onMouseLeave={() => setHoverInfo(null)}
      >
        {/* THE FIX: We add 'as any' to force TypeScript to accept our data */}
        {mergedData && (
          <Source type="geojson" data={mergedData as any}>
             <Layer {...fillLayer} />
             <Layer {...borderLayer} />
          </Source>
        )}

        {hoverInfo && (
            <Popup
                longitude={hoverInfo.longitude}
                latitude={hoverInfo.latitude}
                offset={15}
                closeButton={false}
                closeOnClick={false}
                className="z-50"
                maxWidth="320px"
            >
                <div className="text-sm p-1 font-sans">
                    <div className="mb-2 border-b pb-2">
                        <h3 className="font-bold text-gray-900 text-base">{hoverInfo.properties.c}, {hoverInfo.properties.s}</h3>
                        <p className="text-xs text-gray-500">
                             Based on offer: <span className="font-semibold text-gray-700">${userSalary.toLocaleString()}</span>
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <WageRow level={4} amount={hoverInfo.properties.l4} userSalary={userSalary} 
                            odds="4 Entries" prob="~61%" impact="+107% Chance" />
                        <WageRow level={3} amount={hoverInfo.properties.l3} userSalary={userSalary} 
                            odds="3 Entries" prob="~46%" impact="+55% Chance" />
                        <WageRow level={2} amount={hoverInfo.properties.l2} userSalary={userSalary} 
                            odds="2 Entries" prob="~30%" impact="+3% Chance" />
                        <WageRow level={1} amount={hoverInfo.properties.l1} userSalary={userSalary} 
                            odds="1 Entry" prob="~15%" impact="-48% Chance" />
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 text-[9px] text-gray-400 leading-tight">
                        *Probabilities based on DHS Docket No. USCIS-2025-0040 Projections.
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