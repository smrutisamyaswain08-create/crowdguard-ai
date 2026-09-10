import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, Globe, MapPin, TrendingUp, AlertTriangle, Compass, 
  CheckCircle, RefreshCw, ArrowRight, Shield, Heart, Info
} from 'lucide-react';

const SafeVisit = () => {
  const { apiFetch } = useAuth();

  const [zones, setZones] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Bada Danda');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedLang, setSelectedLang] = useState('en');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [safetyData, setSafetyData] = useState(null);

  // Fetch active zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await apiFetch('/analytics/zones/');
        if (res.ok) {
          const data = await res.json();
          setZones(data);
          if (data.length > 0) {
            setSelectedZoneId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching visitor zones:", err);
      }
    };
    fetchZones();
  }, []);

  // Fetch visitor safety guidance from backend API
  const fetchSafetyGuidance = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/analytics/visitor/safety/?location=${encodeURIComponent(selectedLocation)}&lang=${selectedLang}`;
      if (selectedZoneId) {
        url += `&zone_id=${selectedZoneId}`;
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error('Failed to retrieve visitor safety guidance.');
      }

      const data = await res.json();
      setSafetyData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to fetch safety guidance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafetyGuidance();
  }, [selectedZoneId, selectedLocation, selectedLang]);

  const getRiskBadgeClass = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'low': return 'risk-low';
      case 'medium':
      case 'moderate': return 'risk-medium';
      case 'high': return 'risk-high';
      case 'critical': return 'risk-critical';
      default: return 'risk-low';
    }
  };

  return (
    <div className="safe-visit-page" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Top Header - Prototype Disclaimer */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulsing-dot" /> PROTOTYPE MODE
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Visitor Safe Visit • Multilingual AI Guidance (English / Odia / Hindi)
          </span>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Language:</span>
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 14px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            <option value="en">English (English)</option>
            <option value="or">ଓଡ଼ିଆ (Odia)</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Main Title Box */}
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={26} style={{ color: 'var(--accent-cyan)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            SAFE VISIT — Pilgrim & Tourist Guidance
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          Check real-time estimated crowd levels, upcoming AI forecast surges, and receive localized safety advice to plan a comfortable pilgrimage or visit.
        </p>
      </div>

      {/* Destination Selection Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Select Destination:</span>
          </div>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: '10px', fontWeight: 600 }}
          >
            <option value="Bada Danda">Bada Danda (Grand Road Corridor)</option>
            <option value="Puri Sea Beach">Puri Sea Beach & Promenade</option>
            <option value="Konark">Konark Sun Temple</option>
          </select>

          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: '10px', fontWeight: 600 }}
          >
            {zones.map(z => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchSafetyGuidance}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {loading ? <RefreshCw size={14} className="spin-animation" /> : <RefreshCw size={14} />}
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Main Guidance Display */}
      {safetyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Status Metrics Row */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {/* Metric 1: Risk Level */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Current Crowd Risk</span>
                <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>
                  <Shield size={18} />
                </div>
              </div>
              <div style={{ marginTop: '6px' }}>
                <span className={`badge-risk ${getRiskBadgeClass(safetyData.risk_level)}`} style={{ fontSize: '1rem', padding: '6px 14px' }}>
                  {safetyData.risk_level} RISK
                </span>
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                Based on operational area metrics
              </div>
            </div>

            {/* Metric 2: Estimated Occupancy */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Area Occupancy Load</span>
                <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                {safetyData.occupancy_percentage}%
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                Capacity limit: {safetyData.capacity} persons
              </div>
            </div>

            {/* Metric 3: Emergency Route */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Emergency Route Status</span>
                <div className="stat-icon" style={{ color: '#22c55e' }}>
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 800 }}>
                {safetyData.emergency_route_available ? "OPEN & CLEAR" : "RESTRICTED"}
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                Auxiliary egress paths monitored
              </div>
            </div>
          </div>

          {/* Localized Safety Guidance Card */}
          <div className="glass-panel" style={{ padding: '28px', borderColor: 'rgba(56, 189, 248, 0.4)', background: 'rgba(15, 23, 42, 0.85)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <Globe size={22} style={{ color: 'var(--accent-cyan)' }} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {safetyData.guidance.title}
              </h2>
            </div>

            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.7', background: 'rgba(255, 255, 255, 0.02)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <strong>Status:</strong> {safetyData.guidance.status}
              <br />
              <strong>Forecast:</strong> {safetyData.guidance.forecast}
            </div>

            <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
                💡 SAFETY ADVICE & RECOMMENDED ROUTE
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                {safetyData.guidance.recommendation}
              </div>
            </div>

            {/* Safer Alternate Route Indicator if available */}
            {safetyData.alternate_zone ? (
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Compass size={24} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#22c55e' }}>
                    SUGGESTED LESS-CROWDED ALTERNATE SECTION:
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                    {safetyData.alternate_zone.name} (Current Occupancy: {safetyData.alternate_zone.occupancy_pct}%)
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', italic: 'true' }}>
                Alternative route information is not available in the current prototype.
              </div>
            )}

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', italic: 'true', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
              {safetyData.guidance.disclaimer}
            </div>
          </div>

          {/* Provenance Panel */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <div>
              Source: <strong style={{ color: 'var(--text-primary)' }}>{safetyData.provenance.source}</strong>
            </div>
            <div>
              Type: <strong style={{ color: 'var(--accent-cyan)' }}>{safetyData.provenance.type}</strong>
            </div>
            <div>
              Live CCTV: <strong style={{ color: 'var(--text-secondary)' }}>Not Connected (Simulated Input)</strong>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default SafeVisit;
