import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, Activity, MapPin, TrendingUp, CloudRain, Bus, Users, Cpu, Clock, CheckCircle2, ChevronRight, Zap, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Colored Leaflet Markers for Risk Levels
const createCustomMarkerIcon = (colorHex, badgeIcon) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${colorHex};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #ffffff;
      ">
        ${badgeIcon}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export default function PilgrimSafeAI() {
  const { apiFetch } = useAuth();
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('grand_road');
  const [loading, setLoading] = useState(true);
  const [simResult, setSimResult] = useState(null);
  const [prevRisk, setPrevRisk] = useState(null);
  const [mlMetrics, setMlMetrics] = useState({
    mae_15m: 18.4,
    rmse_15m: 24.2,
    mae_30m: 32.1,
    rmse_30m: 41.5,
    mae_60m: 54.2,
    rmse_60m: 68.9,
    model_name: 'RandomForestRegressor (Multi-Output Output)'
  });

  // Hackathon Interactive Simulation Parameters State
  const [simParams, setSimParams] = useState({
    current_crowd: 2850,
    growth_rate: 0.15, // +15%
    rain_probability: 35, // 35%
    transport_intensity: 7.0, // 1-10
    road_congestion: 6.0, // 1-10
    festival_intensity: 6.0, // 1-10
    active_incidents: 0,
    capacity: 5000
  });

  // Fetch all zones prediction status
  const fetchZonesData = async () => {
    try {
      const res = await apiFetch('/analytics/pilgrim-safe-zones/');
      if (res.ok) {
        const data = await res.json();
        setZones(data.zones || []);
        if (data.ml_model_info) {
          setMlMetrics(data.ml_model_info);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pilgrim safe zones:", err);
    }
  };

  // Run ML Prediction for Selected Zone / Simulation Parameters
  const runMLPrediction = async (paramsToUse) => {
    setLoading(true);
    try {
      const res = await apiFetch('/analytics/pilgrim-safe-predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramsToUse)
      });
      if (res.ok) {
        const data = await res.json();
        if (simResult && simResult.risk) {
          setPrevRisk({
            score: simResult.risk.score,
            level: simResult.risk.level,
            color: simResult.risk.color
          });
        }
        setSimResult(data);
      }
    } catch (err) {
      console.error("ML Prediction Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZonesData();
  }, []);

  // When zone changes or simParams change, update prediction
  useEffect(() => {
    const selected = zones.find(z => z.zone_id === selectedZoneId);
    if (selected) {
      const updatedParams = {
        ...simParams,
        zone_id: selected.zone_id,
        zone_name: selected.zone_name,
        capacity: selected.capacity,
        current_crowd: selected.current_crowd
      };
      setSimParams(updatedParams);
      runMLPrediction(updatedParams);
    } else {
      runMLPrediction({ ...simParams, zone_id: selectedZoneId });
    }
  }, [selectedZoneId]);

  // Handle Simulation Slider Change
  const handleSliderChange = (key, value) => {
    const newParams = { ...simParams, [key]: value };
    setSimParams(newParams);
    runMLPrediction(newParams);
  };

  const activeZone = zones.find(z => z.zone_id === selectedZoneId) || simResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', padding: '10px 0' }}>
      
      {/* 1. Header Banner */}
      <div className="page-header-box" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 26px',
        marginBottom: 0,
        flexWrap: 'wrap',
        gap: '15px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '18px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', borderRadius: '12px', background: '#10b981', color: '#000', fontSize: '11px', fontWeight: 900 }}>
              SOAIDEATHON-S19 HACKATHON PROJECT
            </span>
            <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontSize: '11px', fontWeight: 700 }}>
              🛡️ Privacy-Preserving (Zero PII)
            </span>
          </div>

          <h2 style={{ margin: '8px 0 0 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
            <Shield style={{ color: '#10b981' }} size={28} />
            PILGRIM SAFE AI — Crowd Prediction & Risk Detection System
          </h2>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '850px' }}>
            Real-time Machine Learning prediction model (XGBoost / RandomForest) forecasting crowd density for 15m, 30m, and 60m windows with explainable risk scoring (0–100) across Puri, Odisha pilgrimage corridors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchZonesData}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '10px',
              border: '1px solid var(--accent-cyan)',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Sync Real-Time ML Model
          </button>
        </div>
      </div>

      {/* 2. Puri Pilgrimage Corridor Zone Grid Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {zones.map(z => (
          <div
            key={z.zone_id}
            onClick={() => setSelectedZoneId(z.zone_id)}
            style={{
              background: 'var(--card-bg)',
              padding: '16px',
              borderRadius: '14px',
              border: selectedZoneId === z.zone_id ? `2px solid ${z.risk.color}` : '1px solid var(--border-color)',
              boxShadow: selectedZoneId === z.zone_id ? `0 4px 20px ${z.risk.color}33` : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                {z.category}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: `${z.risk.color}22`, color: z.risk.color, fontSize: '11px', fontWeight: 900 }}>
                {z.risk.badge_icon} {z.risk.level} ({z.risk.score}/100)
              </span>
            </div>

            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-primary)' }}>{z.zone_name}</h4>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <span>Current Crowd: <strong>{z.current_crowd.toLocaleString()}</strong></span>
              <span>Cap: <strong>{z.capacity.toLocaleString()}</strong></span>
            </div>

            {/* Capacity Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, z.current_occupancy_pct)}%`, height: '100%', background: z.risk.color, transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>15m: <strong style={{ color: 'var(--text-primary)' }}>{z.predictions.min_15.crowd}</strong></span>
              <span>30m: <strong style={{ color: 'var(--text-primary)' }}>{z.predictions.min_30.crowd}</strong></span>
              <span>60m: <strong style={{ color: 'var(--text-primary)' }}>{z.predictions.min_60.crowd}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Split View: Interactive Leaflet Map + Live Risk Prediction & Explanation Engine */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Leaflet Interactive OpenStreetMap Map */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <MapPin style={{ color: 'var(--accent-cyan)' }} size={20} />
              Puri Pilgrimage Corridor Interactive Risk Map
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              OpenStreetMap Telemetry • Aggregated Zone Density
            </span>
          </div>

          <div style={{ width: '100%', height: '440px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <MapContainer
              center={[19.8080, 85.8320]}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {zones.map(z => (
                <React.Fragment key={z.zone_id}>
                  <Marker
                    position={[z.coordinates.lat, z.coordinates.lng]}
                    icon={createCustomMarkerIcon(z.risk.color, z.risk.badge_icon)}
                    eventHandlers={{
                      click: () => setSelectedZoneId(z.zone_id)
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '6px', minWidth: '180px' }}>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>{z.zone_name}</strong>
                        <div style={{ margin: '4px 0', fontSize: '11px', color: '#475569' }}>
                          Risk: <strong style={{ color: z.risk.color }}>{z.risk.level} ({z.risk.score}/100)</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569' }}>
                          Current Crowd: <strong>{z.current_crowd}</strong> / {z.capacity}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                          Predict 30m: <strong>{z.predictions.min_30.crowd}</strong> ({z.predictions.min_30.occupancy_pct}%)
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[z.coordinates.lat, z.coordinates.lng]}
                    radius={z.capacity * 0.12}
                    pathOptions={{
                      color: z.risk.color,
                      fillColor: z.risk.color,
                      fillOpacity: 0.25
                    }}
                  />
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          {/* Map Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🟢 Low (0-30)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🟡 Moderate (31-60)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🟠 High (61-80)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🔴 Critical (81-100)</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Explainable Risk Prediction Engine Output */}
        {simResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Risk Score Highlight Card */}
            <div style={{
              background: 'var(--card-bg)',
              padding: '20px',
              borderRadius: '18px',
              border: `2px solid ${simResult.risk.color}`,
              boxShadow: `0 8px 30px ${simResult.risk.color}25`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>
                    AI Risk Assessment Engine
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: 'var(--text-primary)' }}>{simResult.zone_name}</h3>
                </div>
                <span style={{ padding: '6px 14px', borderRadius: '20px', background: simResult.risk.color, color: '#000', fontSize: '14px', fontWeight: 900 }}>
                  {simResult.risk.badge_icon} {simResult.risk.level}
                </span>
              </div>

              {/* Large Score Circle / Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '14px 0' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: `6px solid ${simResult.risk.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${simResult.risk.color}15`
                }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: simResult.risk.color, lineHeight: 1 }}>{simResult.risk.score}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '2px' }}>/ 100 Risk</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Occupancy Load: <strong>{simResult.current_occupancy_pct}%</strong> (Max Capacity: {simResult.capacity.toLocaleString()})
                  </div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> AI Model Confidence: <strong>{simResult.confidence.percentage}%</strong> ({simResult.confidence.margin_of_error})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                    {simResult.confidence.note}
                  </div>
                </div>
              </div>

              {/* Dynamic Risk Shift Callout */}
              {prevRisk && prevRisk.score !== simResult.risk.score && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                  <strong style={{ fontSize: '12px', color: simResult.risk.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} /> Risk Dynamic Shift:
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>
                    Shifted from <strong>{prevRisk.score} ({prevRisk.level})</strong> &rarr; <strong style={{ color: simResult.risk.color }}>{simResult.risk.score} ({simResult.risk.level})</strong> based on slider adjustments.
                  </span>
                </div>
              )}

              {/* Explainable Why Risk Score Is High Reasons */}
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  🔍 Explainable Risk Factors (Why Risk is {simResult.risk.level}):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {simResult.risk.explainable_reasons.map((reason, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ color: simResult.risk.color }}>•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 15m, 30m, 60m Future ML Prediction Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+15 Mins</span>
                <h4 style={{ margin: '4px 0', fontSize: '18px', color: 'var(--accent-cyan)' }}>{simResult.predictions.min_15.crowd}</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{simResult.predictions.min_15.occupancy_pct}% Capacity</span>
              </div>

              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+30 Mins</span>
                <h4 style={{ margin: '4px 0', fontSize: '18px', color: '#f59e0b' }}>{simResult.predictions.min_30.crowd}</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{simResult.predictions.min_30.occupancy_pct}% Capacity</span>
              </div>

              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+60 Mins</span>
                <h4 style={{ margin: '4px 0', fontSize: '18px', color: '#ef4444' }}>{simResult.predictions.min_60.crowd}</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{simResult.predictions.min_60.occupancy_pct}% Capacity</span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. HACKATHON DEMO SIMULATION PANEL */}
      <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Zap style={{ color: '#f59e0b' }} />
              Hackathon Live Demo Simulation Control Panel
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Dynamically adjust parameters to test real-time AI ML predictions & explainable risk score calculation.
            </span>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontSize: '11px', fontWeight: 800 }}>
            🧪 Interactive AI Testbench
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          
          {/* Current Crowd Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Current Crowd Density:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{simParams.current_crowd} persons</strong>
            </div>
            <input
              type="range"
              min="200"
              max="5000"
              step="50"
              value={simParams.current_crowd}
              onChange={(e) => handleSliderChange('current_crowd', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
          </div>

          {/* Crowd Growth Rate Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Crowd Growth Rate:</span>
              <strong style={{ color: simParams.growth_rate >= 0.2 ? '#ef4444' : '#10b981' }}>
                {simParams.growth_rate >= 0 ? `+${intPct(simParams.growth_rate)}% surge` : `${intPct(simParams.growth_rate)}% dispersing`}
              </strong>
            </div>
            <input
              type="range"
              min="-0.30"
              max="0.55"
              step="0.05"
              value={simParams.growth_rate}
              onChange={(e) => handleSliderChange('growth_rate', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>

          {/* Rain Probability Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Rainfall Probability:</span>
              <strong style={{ color: '#38bdf8' }}>{simParams.rain_probability}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={simParams.rain_probability}
              onChange={(e) => handleSliderChange('rain_probability', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          {/* Transport Arrival Intensity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Transport Arrival Intensity:</span>
              <strong style={{ color: '#f59e0b' }}>{simParams.transport_intensity} / 10</strong>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={simParams.transport_intensity}
              onChange={(e) => handleSliderChange('transport_intensity', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
          </div>

          {/* Road Congestion Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Road Congestion Index:</span>
              <strong style={{ color: '#a855f7' }}>{simParams.road_congestion} / 10</strong>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={simParams.road_congestion}
              onChange={(e) => handleSliderChange('road_congestion', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
            />
          </div>

          {/* Festival Intensity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Festival / Event Intensity:</span>
              <strong style={{ color: '#ec4899' }}>{simParams.festival_intensity} / 10</strong>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={simParams.festival_intensity}
              onChange={(e) => handleSliderChange('festival_intensity', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }}
            />
          </div>

        </div>
      </div>

      {/* 5. ML Model Performance Evaluation Metrics & Privacy Safeguards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* ML Evaluation Metrics Box */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} /> ML Model Evaluation Metrics (Scikit-Learn RandomForest)
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Model trained on simulated historical Puri crowd telemetry datasets for SOAIDEATHON-S19 hackathon evaluation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>15m Forecast</span>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>MAE: {mlMetrics.mae_15m}</div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>RMSE: {mlMetrics.rmse_15m}</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>30m Forecast</span>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>MAE: {mlMetrics.mae_30m}</div>
              <div style={{ fontSize: '11px', color: '#f59e0b' }}>RMSE: {mlMetrics.rmse_30m}</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>60m Forecast</span>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>MAE: {mlMetrics.mae_60m}</div>
              <div style={{ fontSize: '11px', color: '#ef4444' }}>RMSE: {mlMetrics.rmse_60m}</div>
            </div>
          </div>
        </div>

        {/* Privacy Safeguards Box */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} /> Privacy-Preserving Architecture Guarantee
          </h4>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            PILGRIM SAFE AI operates strictly on <strong>aggregated zone-level count telemetry</strong>.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ <strong>Zero Facial Recognition:</strong> No biometric, facial, or optical scanning performed.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ <strong>Zero PII Tracking:</strong> No personal identity, MAC addresses, or individual GPS paths recorded.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✓ <strong>Modular Integration:</strong> Ready to swap simulated data with IoT density sensors & weather APIs.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function intPct(val) {
  return Math.round(val * 100);
}
