import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Eye, X, Calendar, AlertTriangle, HelpCircle } from 'lucide-react';

const EventHistory = () => {
  const { apiFetch } = useAuth();
  const [detections, setDetections] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  
  // Modal viewer
  const [viewingDetection, setViewingDetection] = useState(null);

  const fetchFiltersAndData = async () => {
    try {
      // Fetch cameras
      const camRes = await apiFetch('/camera/');
      if (camRes.ok) {
        const camData = await camRes.json();
        setCameras(camData);
      }
      
      // Fetch detection history with filters
      let endpoint = '/detection/history/';
      const params = [];
      if (selectedCamera) params.push(`camera_id=${selectedCamera}`);
      if (selectedRisk) params.push(`risk=${selectedRisk}`);
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }
      
      const detRes = await apiFetch(endpoint);
      if (detRes.ok) {
        const detData = await detRes.json();
        setDetections(detData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndData();
  }, [selectedCamera, selectedRisk]);

  return (
    <div>
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>Event Logs & History</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Chronological ledger of AI crowd evaluations and safety flags.</p>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        marginBottom: '30px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <Filter size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Filter Logs</span>
        </div>

        {/* Camera Filter */}
        <div style={{ minWidth: '200px' }}>
          <select 
            className="form-select"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="">All Cameras</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Risk Filter */}
        <div style={{ minWidth: '150px' }}>
          <select 
            className="form-select"
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            style={{ padding: '8px 12px' }}
          >
            <option value="">All Risks</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>

        <button 
          className="btn-secondary" 
          onClick={() => { setSelectedCamera(''); setSelectedRisk(''); }}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          Reset Filters
        </button>
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Synchronizing events logs...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Camera Node</th>
                  <th>Location</th>
                  <th>Crowd Count</th>
                  <th>Avg Density</th>
                  <th>Risk Category</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {detections.length > 0 ? (
                  detections.map(det => (
                    <tr key={det.id}>
                      <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{new Date(det.timestamp).toLocaleString()}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{det.camera_details?.name || 'Ingestion Feed'}</td>
                      <td>{det.camera_details?.location || 'Zone A'}</td>
                      <td style={{ fontWeight: 700 }}>{det.count}</td>
                      <td>{det.density.toFixed(4)}</td>
                      <td>
                        <span className={`badge-risk risk-${det.risk}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                          {det.risk}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => setViewingDetection(det)}
                          style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            color: 'var(--accent-purple)',
                            cursor: 'pointer',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Eye size={12} /> View Proof
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 20px' }}>
                      No analytical logs match your selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal overlay to view frame and heatmap side-by-side */}
      {viewingDetection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '1000px',
            padding: '30px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setViewingDetection(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
              Inference Event Proof: {viewingDetection.camera_details?.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '25px' }}>
              Recorded on {new Date(viewingDetection.timestamp).toLocaleString()} at {viewingDetection.camera_details?.location}
            </p>

            {/* Images layout side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Captured Raw Frame
                </span>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <img 
                    src={viewingDetection.image && (viewingDetection.image.startsWith('http') ? viewingDetection.image : `http://${window.location.hostname}:8000${viewingDetection.image}`)} 
                    alt="Original Frame" 
                    style={{ width: '100%', display: 'block', height: '320px', objectFit: 'contain' }}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  AI Density Heatmap (YOLOv8 Output)
                </span>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <img 
                    src={viewingDetection.heatmap && (viewingDetection.heatmap.startsWith('http') ? viewingDetection.heatmap : `http://${window.location.hostname}:8000${viewingDetection.heatmap}`)} 
                    alt="YOLOv8 Density Map" 
                    style={{ width: '100%', display: 'block', height: '320px', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>

            {/* Summary details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
              background: 'rgba(255,255,255,0.03)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Calculated Count</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: 'var(--accent-purple)' }}>
                  {viewingDetection.count} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>people</span>
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Density Index</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', color: 'var(--accent-cyan)' }}>
                  {viewingDetection.density.toFixed(5)}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assessed Risk</span>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge-risk risk-${viewingDetection.risk}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {viewingDetection.risk}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Security Status</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '6px', color: viewingDetection.risk === 'critical' ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                  {viewingDetection.risk === 'critical' ? 'Evacuation Initiated' : viewingDetection.risk === 'high' ? 'Entry Restricted' : 'Secure'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventHistory;
