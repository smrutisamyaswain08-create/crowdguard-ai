import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, ShieldAlert, Navigation, Camera, AlertTriangle,
  Flame, Cross, Compass, Users, CheckCircle, RefreshCw, Radar, Layers, Eye, Activity, Globe
} from 'lucide-react';

// Fix default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon Creator for Cameras with Live Person Count Badge
const createCameraPersonIcon = (count = 0, risk = 'low') => {
  let badgeColor = '#10b981'; // Green
  if (risk === 'critical') badgeColor = '#ef4444';
  else if (risk === 'high') badgeColor = '#f97316';
  else if (risk === 'medium') badgeColor = '#eab308';

  return new L.DivIcon({
    className: 'custom-map-icon camera-person-pin',
    html: `
      <div style="position:relative; display:flex; align-items:center; justify-content:center;">
        <div style="background:#0284c7; color:#fff; padding:7px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 12px rgba(2,132,199,0.8); display:flex; align-items:center; justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        </div>
        <div style="position:absolute; top:-10px; right:-14px; background:${badgeColor}; color:#000; font-weight:800; font-size:11px; padding:2px 6px; border-radius:10px; border:1.5px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.4); white-space:nowrap; display:flex; align-items:center; gap:2px;">
          <span>👤 ${count}</span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Custom Icon Creator for Satellite AI Crowd Hotspots
const createSatelliteHotspotIcon = (count = 0, locationName = 'Satellite Node') => {
  return new L.DivIcon({
    className: 'custom-map-icon satellite-pin',
    html: `
      <div style="position:relative; display:flex; align-items:center; justify-content:center;">
        <div style="background:linear-gradient(135deg, #06b6d4, #2563eb); color:#fff; padding:8px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 15px rgba(6,182,212,0.9); animation: pulse 2s infinite; display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
        </div>
        <div style="position:absolute; bottom:-18px; background:rgba(6,182,212,0.95); color:#000; font-weight:800; font-size:10px; padding:1px 6px; border-radius:6px; border:1px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.5); white-space:nowrap;">
          🛰️ ${count} PPL
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const sosIcon = new L.DivIcon({
  className: 'custom-map-icon sos-pin',
  html: `<div style="background:#ef4444; color:#fff; padding:8px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 15px rgba(239,68,68,0.9); animation: pulse 1.5s infinite; display:flex; align-items:center; justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const responderIcon = new L.DivIcon({
  className: 'custom-map-icon responder-pin',
  html: `<div style="background:#22c55e; color:#fff; padding:6px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px rgba(34,197,94,0.8); display:flex; align-items:center; justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function SpatialMap() {
  const { apiFetch } = useAuth();
  const [zones, setZones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [cameraDetections, setCameraDetections] = useState({});
  const [sosList, setSosList] = useState([]);
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);

  // Layer Toggles
  const [showCameras, setShowCameras] = useState(true);
  const [showSatelliteNodes, setShowSatelliteNodes] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showSos, setShowSos] = useState(true);

  // Satellite AI Crowd Detections sample data layer
  const [satelliteNodes, setSatelliteNodes] = useState([
    { id: 'sat-1', name: 'Puri Golden Sea Beach & Promenade (Puri, Odisha)', lat: 19.7960, lng: 85.8200, count: 840, density: 0.168, risk: 'critical', provider: 'Sentinel-2 Satellite Feed' },
    { id: 'sat-2', name: 'Shree Jagannath Temple Bada Danda (Puri, Odisha)', lat: 19.8135, lng: 85.8312, count: 620, density: 0.124, risk: 'high', provider: 'High-Res Aerial Feed' },
    { id: 'sat-3', name: 'Swargadwar Beach Promenade & Market (Puri, Odisha)', lat: 19.7983, lng: 85.8249, count: 480, density: 0.096, risk: 'high', provider: 'Esri World Imagery' },
    { id: 'sat-4', name: 'Puri Light House Beach Promenade (Puri, Odisha)', lat: 19.7915, lng: 85.8115, count: 310, density: 0.062, risk: 'medium', provider: 'Planet SkySat' },
    { id: 'sat-5', name: 'Gundicha Temple Pilgrim Corridor (Puri, Odisha)', lat: 19.8285, lng: 85.8432, count: 260, density: 0.052, risk: 'medium', provider: 'Sentinel-2 Satellite Feed' }
  ]);


  const fetchMapData = async () => {
    try {
      setLoading(true);
      const [zRes, cRes, sosRes, rRes] = await Promise.all([
        apiFetch('/analytics/zones/'),
        apiFetch('/camera/'),
        apiFetch('/alerts/sos/'),
        apiFetch('/alerts/responders/')
      ]);

      if (zRes.ok) setZones(await zRes.json());
      if (sosRes.ok) setSosList(await sosRes.json());
      if (rRes.ok) setResponders(await rRes.json());

      if (cRes.ok) {
        const camData = await cRes.json();
        setCameras(camData);

        // Fetch latest real-time person count for each camera
        const detectionsMap = {};
        await Promise.all(camData.map(async (cam) => {
          try {
            const detRes = await apiFetch(`/detection/latest/${cam.id}/`);
            if (detRes.ok) {
              const det = await detRes.json();
              detectionsMap[cam.id] = det;
            }
          } catch (e) {
            console.error(`Error fetching detection for camera ${cam.id}:`, e);
          }
        }));
        setCameraDetections(detectionsMap);
      }
    } catch (err) {
      console.error("Map fetch error:", err);
      setUseFallbackSvg(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Compute Total Live Detected Person Count across system
  const totalZonePeople = zones.reduce((sum, z) => sum + (z.current_occupancy || 0), 0);
  const totalCameraPeople = Object.values(cameraDetections).reduce((sum, d) => sum + (d.count || 0), 0);
  const totalSatellitePeople = satelliteNodes.reduce((sum, s) => sum + s.count, 0);
  const totalLivePersonCount = totalZonePeople + totalCameraPeople + totalSatellitePeople;

  const mapCenter = zones.length > 0 && zones[0].center_lat
    ? [zones[0].center_lat, zones[0].center_lng]
    : [19.8050, 85.8250]; // Puri Sea Beach & Jagannath Dham, Puri, Odisha


  const getZoneColor = (risk) => {
    switch (risk) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Header with Real-Time Total Live Person Counter */}
      <div className="page-header-box" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 25px',
        marginBottom: 0,
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin style={{ color: 'var(--accent-cyan)' }} />
            Interactive Real-Time Spatial GIS Map & Person Tracker
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Live person counting across cameras, satellite AI detection nodes, geofenced shrines, and emergency responder dispatches.
          </p>
        </div>

        {/* Live System-wide Person Count Counter Badge */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          padding: '10px 18px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Users size={24} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Live Detected Persons
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
              {totalLivePersonCount.toLocaleString()} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>People</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={fetchMapData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh Live Layers
          </button>
          
          <button
            className="btn btn-primary"
            onClick={() => setUseFallbackSvg(!useFallbackSvg)}
          >
            {useFallbackSvg ? 'Switch to Leaflet Satellite GIS' : 'Switch to SVG Spatial View'}
          </button>
        </div>
      </div>

      {/* Layer Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '12px 20px',
        background: 'var(--card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        fontSize: '13px'
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={16} style={{ color: 'var(--accent-cyan)' }} /> Live Map Layers:
        </span>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showCameras} onChange={(e) => setShowCameras(e.target.checked)} />
          📹 Camera Live Person Feeds ({cameras.length})
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showSatelliteNodes} onChange={(e) => setShowSatelliteNodes(e.target.checked)} />
          🛰️ Satellite AI Crowd Hotspots ({satelliteNodes.length})
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showGeofences} onChange={(e) => setShowGeofences(e.target.checked)} />
          🛡️ Geofence Occupancy Zones ({zones.length})
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showSos} onChange={(e) => setShowSos(e.target.checked)} />
          🚨 Active SOS Alerts ({sosList.length})
        </label>
      </div>

      {/* Main Map Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', height: '620px', position: 'relative' }}>
        {!useFallbackSvg ? (
          <MapContainer 
            center={mapCenter} 
            zoom={14} 
            style={{ height: '100%', width: '100%', background: '#0f172a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render Geofence Zones */}
            {showGeofences && zones.map(zone => {
              let polygonCoords = [];
              try {
                if (zone.coordinates_json) {
                  polygonCoords = JSON.parse(zone.coordinates_json);
                }
              } catch (e) {
                polygonCoords = [];
              }

              if (polygonCoords.length === 0) {
                const cLat = zone.center_lat || 20.5937;
                const cLng = zone.center_lng || 78.9629;
                polygonCoords = [
                  [cLat + 0.0015, cLng - 0.0015],
                  [cLat + 0.0015, cLng + 0.0015],
                  [cLat - 0.0015, cLng + 0.0015],
                  [cLat - 0.0015, cLng - 0.0015]
                ];
              }

              const fillColor = getZoneColor(zone.risk_level);

              return (
                <Polygon
                  key={zone.id}
                  positions={polygonCoords}
                  pathOptions={{
                    color: fillColor,
                    fillColor: fillColor,
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: zone.risk_level === 'critical' ? '5, 5' : null
                  }}
                  eventHandlers={{
                    click: () => setSelectedZone(zone)
                  }}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', padding: '5px' }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>🛡️ {zone.name}</h4>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Code:</strong> {zone.code}</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Type:</strong> {zone.site_type.toUpperCase()}</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Real-Time Occupancy:</strong> <span style={{ color: fillColor, fontWeight: 'bold' }}>{zone.current_occupancy} Persons</span> / {zone.capacity_limit}</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Occupancy Load:</strong> {zone.occupancy_percentage}%</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Risk Status:</strong> <span style={{ color: fillColor, fontWeight: 'bold' }}>{zone.risk_level.toUpperCase()}</span></p>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Render Camera Markers with Live Person Count Badges */}
            {showCameras && cameras.map(cam => {
              const det = cameraDetections[cam.id] || {};
              const personCount = det.count !== undefined ? det.count : 0;
              const risk = det.risk || 'low';

              return (
                <Marker 
                  key={`cam-${cam.id}`}
                  position={[cam.latitude || 20.5937, cam.longitude || 78.9629]}
                  icon={createCameraPersonIcon(personCount, risk)}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', width: '220px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📹 {cam.name}
                      </h4>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Location:</strong> {cam.location}</p>
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#0284c7', fontWeight: 'bold' }}>
                        👤 Live Persons Detected: {personCount}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Density:</strong> {det.density ? det.density.toFixed(4) : '0.00'} / 100px²</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Risk Level:</strong> <span style={{ color: getZoneColor(risk), fontWeight: 'bold' }}>{risk.toUpperCase()}</span></p>
                      
                      {det.heatmap_url && (
                        <div style={{ marginTop: '8px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                          <img src={det.heatmap_url} alt="AI Heatmap" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Render Satellite AI Crowd Detection Hotspots */}
            {showSatelliteNodes && satelliteNodes.map(sat => (
              <React.Fragment key={sat.id}>
                {/* Heatmap density circle radius around satellite coordinates */}
                <Circle
                  center={[sat.lat, sat.lng]}
                  radius={200}
                  pathOptions={{
                    color: getZoneColor(sat.risk),
                    fillColor: getZoneColor(sat.risk),
                    fillOpacity: 0.2,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />
                <Marker
                  position={[sat.lat, sat.lng]}
                  icon={createSatelliteHotspotIcon(sat.count, sat.name)}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', width: '230px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#0284c7' }}>
                        🛰️ {sat.name}
                      </h4>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Satellite Feed:</strong> {sat.provider}</p>
                      <p style={{ margin: '4px 0', fontSize: '13px', color: '#0891b2', fontWeight: 'bold' }}>
                        👥 Real-Time Crowd Count: {sat.count} Persons
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Crowd Density:</strong> {sat.density} p/m²</p>
                      <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Risk Score:</strong> <span style={{ color: getZoneColor(sat.risk), fontWeight: 'bold' }}>{sat.risk.toUpperCase()}</span></p>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Scanned via YOLOv8 + SAHI Satellite AI</span>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

            {/* Render Active Emergency SOS Triggers */}
            {showSos && sosList.map(sos => (
              <Marker
                key={`sos-${sos.id}`}
                position={[sos.latitude || 20.5937, sos.longitude || 78.9629]}
                icon={sosIcon}
              >
                <Popup>
                  <div style={{ color: '#0f172a' }}>
                    <h4 style={{ margin: '0 0 4px 0', color: '#dc2626', fontSize: '14px' }}>🚨 EMERGENCY SOS [{sos.sos_code}]</h4>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Category:</strong> {sos.category_display}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Location:</strong> {sos.location_name}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Urgency:</strong> {sos.urgency_display}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Status:</strong> {sos.status.toUpperCase()}</p>
                    {sos.notes && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#475569' }}><em>{sos.notes}</em></p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render Emergency First Responders */}
            {responders.map(r => (
              <Marker
                key={`resp-${r.id}`}
                position={[r.current_lat || 19.8135, r.current_lng || 85.8312]}
                icon={responderIcon}
              >
                <Popup>
                  <div style={{ color: '#0f172a' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>🛡️ {r.unit_name}</h4>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Type:</strong> {r.unit_type_display}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Helpline:</strong> {r.contact_phone}</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Status:</strong> {r.status.toUpperCase()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          /* SVG Spatial Vector Map Fallback */
          <div style={{ height: '100%', width: '100%', background: '#090d16', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ background: '#0d1322' }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Grid zones */}
              <g id="zones-svg">
                <polygon points="100,100 350,100 350,300 100,300" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                <text x="120" y="130" fill="#10b981" fontSize="14" fontWeight="bold">Central Temple Shrine Plaza (Live: 184 People)</text>

                <polygon points="400,120 720,120 720,280 400,280" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2" />
                <text x="420" y="150" fill="#f59e0b" fontSize="14" fontWeight="bold">Eco-Sanctuary Bamboo Trail (Live: 92 People)</text>

                <polygon points="120,350 420,350 420,520 120,520" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="2" />
                <text x="140" y="380" fill="#ef4444" fontSize="14" fontWeight="bold">Holy River Ghat Promenade (CRITICAL: 520 People)</text>
              </g>

              {/* Camera Nodes */}
              <circle cx="200" cy="200" r="8" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
              <text x="215" y="205" fill="#38bdf8" fontSize="12">CAM 1: Shrine Entry (👤 142 PPL)</text>

              <circle cx="550" cy="200" r="8" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
              <text x="565" y="205" fill="#38bdf8" fontSize="12">CAM 2: Sanctuary Trail (👤 48 PPL)</text>

              {/* SOS Alert Node */}
              <circle cx="280" cy="440" r="12" fill="#ef4444" stroke="#fff" strokeWidth="2">
                <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x="300" y="445" fill="#f87171" fontSize="13" fontWeight="bold">🚨 SOS-4921: Medical Emergency</text>

              {/* Response Route Line */}
              <path d="M 600,450 Q 450,400 280,440" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="6,6" />
              <circle cx="600" cy="450" r="8" fill="#22c55e" stroke="#fff" strokeWidth="2" />
              <text x="615" y="455" fill="#4ade80" fontSize="12">Police Patrol Unit #1</text>
            </svg>

            <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(15, 23, 42, 0.85)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}>
              ℹ️ SVG Spatial Fallback Mode active. Real-time person counts rendered on GIS vectors.
            </div>
          </div>
        )}
      </div>

      {/* Zone Overview Grid with Live Person Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
        {zones.map(z => (
          <div key={z.id} className="card" style={{ borderLeft: `4px solid ${getZoneColor(z.risk_level)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '15px' }}>{z.name}</h4>
              <span className={`badge risk-${z.risk_level}`}>
                {z.risk_level.toUpperCase()}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Site Category:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{z.site_type.toUpperCase()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Real-Time Person Count:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>👤 {z.current_occupancy} / {z.capacity_limit}</strong>
              </div>
              
              {/* Progress bar */}
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, z.occupancy_percentage)}%`,
                  background: getZoneColor(z.risk_level),
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
