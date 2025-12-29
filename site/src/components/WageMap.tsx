"use client";

import { useEffect, useState, useMemo } from "react";
import Map, { Source, Layer, FillLayer, LineLayer, Popup, NavigationControl, ScaleControl } from "react-map-gl";
import * as topojson from "topojson-client"; 
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

export default function WageMap({ socCode, userSalary }: { socCode: string, userSalary: number }) {
  const [geoData, setGeoData] = useState<any>(null); 
  const [wageData, setWageData] = useState<Record<string, any> | null>(null);
  const [hoverInfo, setHoverInfo] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");

  useEffect(() => {
    if (!socCode) return;
    setLoadingMsg("Updating Map...");

    const fetchData = async () => {
      try {
        const [topologyRes, wagesRes] = await Promise.all([
          fetch(TOPOJSON_URL),
          fetch(`/jobs/${socCode}.json`)
        ]);

        const topology = await topologyRes.json();
        const wages = await wagesRes.json();
        const geojson = topojson.feature(topology, topology.objects.counties);
        
        setGeoData(geojson);
        setWageData(wages);
        setLoadingMsg(""); 
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [socCode]);

  const mergedGeoJSON = useMemo(() => {
    if (!geoData || !wageData) return null;

    const features = geoData.features.map((feature: any) => {
      const fipsId = parseInt(feature.id, 10);
      const data = wageData[fipsId] || wageData[feature.id] || wageData[String(fipsId).padStart(5, '0')];

      let color = "#E5E7EB"; 
      let level = 0; // 0 = Fail

      if (data) {
        if (userSalary >= data.l4) { color = "#059669"; level = 4; }      
        else if (userSalary >= data.l3) { color = "#3B82F6"; level = 3; } 
        else if (userSalary >= data.l2) { color = "#F59E0B"; level = 2; } 
        else if (userSalary >= data.l1) { color = "#EF4444"; level = 1; } 
      }

      return {
        ...feature,
        properties: { ...feature.properties, ...data, level, color }
      };
    });

    return { type: "FeatureCollection", features };
  }, [geoData, wageData, userSalary]);

  const fillLayer: FillLayer = {
    id: "county-fill",
    type: "fill",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.8],
      "fill-outline-color": "rgba(255,255,255,0.1)"
    }
  };

  const lineLayer: LineLayer = {
    id: "county-line",
    type: "line",
    paint: { "line-color": "#ffffff", "line-width": 0.5, "line-opacity": 0.3 }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden rounded-xl border border-gray-200 shadow-inner">
      {!TOKEN && <div className="absolute z-50 bg-red-500 text-white p-2">Missing Token</div>}
      
      {loadingMsg && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <span className="text-sm font-medium text-gray-600 animate-pulse">{loadingMsg}</span>
        </div>
      )}

      <Map
        initialViewState={{ longitude: -96, latitude: 37.8, zoom: 3.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={TOKEN}
        interactiveLayerIds={['county-fill']}
        onMouseMove={(e) => {
          const feature = e.features?.[0];
          if (feature) {
             setHoverInfo({
               lng: e.lngLat.lng,
               lat: e.lngLat.lat,
               props: feature.properties
             });
          } else {
            setHoverInfo(null);
          }
        }}
        onMouseLeave={() => setHoverInfo(null)}
      >
        {mergedGeoJSON && (
          <Source type="geojson" data={mergedGeoJSON}>
            <Layer {...fillLayer} />
            <Layer {...lineLayer} />
          </Source>
        )}
        
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* --- SIMPLIFIED TOOLTIP --- */}
        {hoverInfo && hoverInfo.props.l1 && (
            <Popup
                longitude={hoverInfo.lng}
                latitude={hoverInfo.lat}
                offset={15}
                closeButton={false}
                closeOnClick={false}
                maxWidth="220px"
                className="z-50"
            >
                <div className="p-1 text-center font-sans">
                    {/* Header */}
                    <div className="border-b border-gray-100 pb-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-sm">{hoverInfo.props.c}, {hoverInfo.props.s}</h3>
                        
                    </div>
                    
                    {/* The Big Result Badge */}
                    <div className="flex justify-center mb-3">
                        <ResultBadge level={hoverInfo.props.level} />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-50 pt-2">
                        <div className="flex flex-col items-center p-1.5 bg-gray-50 rounded">
                            <span className="text-[10px] text-gray-400 uppercase">Entries</span>
                            <span className="font-bold text-gray-800 text-sm">
                                {hoverInfo.props.level === 0 ? "0" : hoverInfo.props.level}x
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-1.5 bg-gray-50 rounded">
                            <span className="text-[10px] text-gray-400 uppercase">Win Prob</span>
                            <span className={`font-bold text-sm ${getProbColor(hoverInfo.props.level)}`}>
                                {getProbText(hoverInfo.props.level)}
                            </span>
                        </div>
                    </div>
                </div>
            </Popup>
        )}
      </Map>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function ResultBadge({ level }: { level: number }) {
    if (level === 4) return <Badge bg="bg-emerald-100" text="text-emerald-700" label="Level 4 (Best)" />;
    if (level === 3) return <Badge bg="bg-blue-100" text="text-blue-700" label="Level 3 (High)" />;
    if (level === 2) return <Badge bg="bg-amber-100" text="text-amber-700" label="Level 2 (Fair)" />;
    if (level === 1) return <Badge bg="bg-red-100" text="text-red-700" label="Level 1 (Risky)" />;
    return <Badge bg="bg-gray-100" text="text-gray-500" label="Not Qualified" />;
}

function Badge({ bg, text, label }: any) {
    return <span className={`${bg} ${text} px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-white`}>{label}</span>;
}

function getProbText(level: number) {
    if (level === 4) return "~61%";
    if (level === 3) return "~46%";
    if (level === 2) return "~30%";
    if (level === 1) return "~15%";
    return "0%";
}

function getProbColor(level: number) {
    if (level >= 3) return "text-emerald-600";
    if (level === 2) return "text-amber-600";
    return "text-red-600";
}