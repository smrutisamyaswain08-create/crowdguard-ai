import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Globe, Radar, Search, UploadCloud, Layers, ShieldAlert, Users, 
  MapPin, Activity, CheckCircle, RefreshCw, AlertTriangle, Sparkles, Sliders
} from 'lucide-react';

const SATELLITE_PRESETS = [
  { id: 'konark_sanctuary', name: 'Konark Sun Temple & Sanctuary (Konark, Odisha, India)', lat: 19.8876, lng: 86.0945, area: 4500, desc: 'World heritage sanctuary & eco-tourism corridor' },
  { id: 'jagannath_temple', name: 'Shree Jagannath Temple Bada Danda (Puri, Odisha, India)', lat: 19.8135, lng: 85.8312, area: 6000, desc: 'Historic pilgrimage Grand Road & shrine concourse' },
  { id: 'puri_sea_beach', name: 'Puri Golden Sea Beach & Promenade (Puri, Odisha, India)', lat: 19.7960, lng: 85.8200, area: 5000, desc: 'High density coastal sea beach & tourist hub' },
  { id: 'swargadwar_beach', name: 'Swargadwar Beach Promenade & Market (Puri, Odisha, India)', lat: 19.7983, lng: 85.8249, area: 4000, desc: 'Sea beach market & evening gathering promenade' },
  { id: 'puri_lighthouse', name: 'Puri Light House Beach & Marine Drive (Puri, Odisha, India)', lat: 19.7915, lng: 85.8115, area: 3500, desc: 'Coastal lighthouse beach & marine drive stretch' },
];




const SatelliteAnalytics = () => {
  const { apiFetch } = useAuth();

  const [selectedPreset, setSelectedPreset] = useState(SATELLITE_PRESETS[0]);
  const [lat, setLat] = useState(SATELLITE_PRESETS[0].lat);
  const [lng, setLng] = useState(SATELLITE_PRESETS[0].lng);
  const [locationName, setLocationName] = useState(SATELLITE_PRESETS[0].name);
  const [areaSqMeters, setAreaSqMeters] = useState(SATELLITE_PRESETS[0].area);
  const [zoom, setZoom] = useState(16);

  
  const [inputMode, setInputMode] = useState('coords'); // 'coords' or 'upload'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'heatmap', 'optical'
  const [isroInfo, setIsroInfo] = useState(null);

  const fetchIsroData = async (presetId) => {
    try {
      const res = await apiFetch(`/isro/geospatial/?site_id=${presetId || selectedPreset.id}`);
      if (res.ok) {
        setIsroInfo(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch ISRO geospatial data", e);
    }
  };

  React.useEffect(() => {
    fetchIsroData(selectedPreset.id);
  }, [selectedPreset]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setLat(preset.lat);
    setLng(preset.lng);
    setLocationName(preset.name);
    setAreaSqMeters(preset.area);
    setResult(null);
    setError(null);
    fetchIsroData(preset.id);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setUploadedPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const runSatelliteAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      if (inputMode === 'upload' && uploadedFile) {
        const formData = new FormData();
        formData.append('image', uploadedFile);
        formData.append('location_name', locationName || 'Custom Satellite Tile');
        formData.append('area_sq_meters', areaSqMeters);
        formData.append('latitude', lat);
        formData.append('longitude', lng);
        formData.append('zoom', zoom);

        response = await apiFetch('/detection/satellite-analyze/', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await apiFetch('/detection/satellite-analyze/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            location_name: locationName,
            area_sq_meters: parseInt(areaSqMeters),
            zoom: parseInt(zoom)
          }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze satellite area data');
      }
      setResult(data);
    } catch (err) {
      console.error("Satellite Analysis Error:", err);
      setError(err.message || 'An error occurred during AI satellite scanning.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'critical':
        return { label: 'CRITICAL SURGE', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
      case 'high':
        return { label: 'HIGH DENSITY', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
      case 'medium':
        return { label: 'MODERATE CROWD', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' };
      default:
        return { label: 'NORMAL DENSITY', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
    }
  };

  return (
    <div style={{ padding: '25px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header Banner */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '25px',
        padding: '20px',
        background: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <Globe size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              Real-Time Satellite Area AI Detector
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                ISRO / NRSC Bhuvan WMS Sync
              </span>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                YOLOv8 Aerial Sliced Kernel
              </span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Official ISRO Bhuvan Earth Observation Service layer sync & high-resolution optical density estimation.
            </p>
          </div>
        </div>

        <button
          onClick={runSatelliteAnalysis}
          disabled={loading}
          className="btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="spin" />
              <span>Scanning Satellite AI Feed...</span>
            </>
          ) : (
            <>
              <Radar size={18} />
              <span>Run Satellite Area AI Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        
        {/* Preset Locations Box */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: 'var(--accent-cyan)' }} />
            High-Density Location Presets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SATELLITE_PRESETS.map((preset) => (
              <div 
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: selectedPreset.id === preset.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: selectedPreset.id === preset.id ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{preset.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Lat: {preset.lat.toFixed(4)} | Lng: {preset.lng.toFixed(4)} ({preset.area} m²)
                  </div>
                </div>
                {selectedPreset.id === preset.id && (
                  <CheckCircle size={16} style={{ color: 'var(--accent-cyan)' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Coordinate & Input Controls */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: 'var(--accent-cyan)' }} />
              Satellite Area Parameters
            </h3>
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px' }}>
              <button 
                onClick={() => setInputMode('coords')}
                style={{
                  border: 'none',
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  background: inputMode === 'coords' ? 'var(--accent-cyan)' : 'transparent',
                  color: inputMode === 'coords' ? '#000' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Geospatial Lat/Lng
              </button>
              <button 
                onClick={() => setInputMode('upload')}
                style={{
                  border: 'none',
                  padding: '5px 10px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  background: inputMode === 'upload' ? 'var(--accent-cyan)' : 'transparent',
                  color: inputMode === 'upload' ? '#000' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Upload Tile Image
              </button>
            </div>
          </div>

          {inputMode === 'coords' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Location Name</label>
                <input 
                  type="text" 
                  value={locationName} 
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input-field" 
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Latitude</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={lat} 
                    onChange={(e) => setLat(e.target.value)}
                    className="input-field" 
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Longitude</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    value={lng} 
                    onChange={(e) => setLng(e.target.value)}
                    className="input-field" 
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Area (sq. meters)</label>
                  <input 
                    type="number" 
                    value={areaSqMeters} 
                    onChange={(e) => setAreaSqMeters(e.target.value)}
                    className="input-field" 
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Zoom Level</label>
                  <input 
                    type="number" 
                    min="14" max="19"
                    value={zoom} 
                    onChange={(e) => setZoom(e.target.value)}
                    className="input-field" 
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div 
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)'
                }}
                onClick={() => document.getElementById('sat-file-input').click()}
              >
                <UploadCloud size={32} style={{ color: 'var(--accent-cyan)', marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {uploadedFile ? uploadedFile.name : "Click to Upload High-Res Satellite/Drone Tile"}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Supports JPG, PNG aerial image tiles</span>
                <input 
                  id="sat-file-input"
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {uploadedPreview && (
                <div style={{ height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={uploadedPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          marginBottom: '25px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* AI Results Section */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            
            {/* Person Count Card */}
            <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Users size={16} style={{ color: 'var(--accent-cyan)' }} />
                Estimated Person Count
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {result.person_count.toLocaleString()}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Detected in area patch</span>
            </div>

            {/* Crowd Density Card */}
            <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Activity size={16} style={{ color: '#3b82f6' }} />
                Area Crowd Density
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {result.density_per_sqm} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>p/m²</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total area: {result.area_sq_meters} m²</span>
            </div>

            {/* Risk Assessment Card */}
            {(() => {
              const badge = getRiskBadge(result.risk_level);
              return (
                <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '14px', border: `1px solid ${badge.border}` }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ShieldAlert size={16} style={{ color: badge.color }} />
                    AI Risk Level Assessment
                  </div>
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '6px 14px', 
                    borderRadius: '20px', 
                    fontSize: '13px', 
                    fontWeight: 700, 
                    background: badge.bg, 
                    color: badge.color,
                    border: `1px solid ${badge.border}`
                  }}>
                    {badge.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Triggered by spatial density thresholds
                  </div>
                </div>
              );
            })()}

            {/* Satellite Metadata Card */}
            <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Globe size={16} style={{ color: 'var(--accent-cyan)' }} />
                Satellite Constellation
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {result.satellite_provider}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>GSD Resolution: {result.resolution_gsd}</span>
            </div>

          </div>

          {/* Image & Heatmap View Controls */}
          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
                Satellite Imagery & AI Heatmap Overlay
              </h3>

              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setViewMode('split')}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: viewMode === 'split' ? 'var(--accent-cyan)' : 'transparent',
                    color: viewMode === 'split' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Side-by-Side Split View
                </button>
                <button 
                  onClick={() => setViewMode('heatmap')}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: viewMode === 'heatmap' ? 'var(--accent-cyan)' : 'transparent',
                    color: viewMode === 'heatmap' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  AI Heatmap Overlay Only
                </button>
                <button 
                  onClick={() => setViewMode('optical')}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    background: viewMode === 'optical' ? 'var(--accent-cyan)' : 'transparent',
                    color: viewMode === 'optical' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Raw Satellite Optical View
                </button>
              </div>
            </div>

            {/* Visualizer Display */}
            {viewMode === 'split' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '15px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    1. Raw Optical Satellite View
                  </span>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '420px', background: '#000' }}>
                    <img src={result.optical_image_url} alt="Satellite Optical" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', display: 'block', marginBottom: '8px' }}>
                    2. AI Crowd Density Heatmap & Detections
                  </span>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--accent-cyan)', height: '420px', background: '#000' }}>
                    <img src={result.heatmap_overlay_url} alt="AI Crowd Heatmap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'heatmap' && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--accent-cyan)', height: '520px', background: '#000' }}>
                <img src={result.heatmap_overlay_url} alt="AI Heatmap" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}

            {viewMode === 'optical' && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', height: '520px', background: '#000' }}>
                <img src={result.optical_image_url} alt="Satellite Optical" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default SatelliteAnalytics;
