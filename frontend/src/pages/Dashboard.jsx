import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, Users, AlertOctagon, TrendingUp, RefreshCw, CheckCircle, 
  MapPin, ShieldAlert, Activity, ChevronRight, Compass, Radio, Signal, Globe,
  Hospital, Siren, PhoneCall
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend);

const Dashboard = ({ setActiveTab }) => {
  const { apiFetch } = useAuth();
  
  const getRiskClass = (risk) => {
    switch (risk) {
      case 'low': return 'risk-low';
      case 'medium': return 'risk-medium';
      case 'high': return 'risk-high';
      case 'critical': return 'risk-critical';
      default: return 'risk-low';
    }
  };
  
  // Dashboard states
  const [summary, setSummary] = useState({
    total_cameras: 0,
    active_cameras: 0,
    current_crowd_count: 0,
    average_crowd_density: 0.0,
    unresolved_alerts: 0,
    today_alerts: 0
  });
  
  const [liveCrowdApiData, setLiveCrowdApiData] = useState(null);
  const [zoneCrowdData, setZoneCrowdData] = useState([]);
  const [realIncidents, setRealIncidents] = useState([]);
  const [isroData, setIsroData] = useState(null);
  const [cameraStatusData, setCameraStatusData] = useState(null);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [latestDetection, setLatestDetection] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState('konark_sun_temple');
  const [simulationStatus, setSimulationStatus] = useState('');
  const [satelliteData, setSatelliteData] = useState(null);
  const [refreshingSat, setRefreshingSat] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [apiLastUpdated, setApiLastUpdated] = useState('');

  const sites = [
    { id: 'konark_sun_temple', name: 'Konark Sun Temple & Sanctuary (Konark)', kw: 'konark' },
    { id: 'jagannath_puri', name: 'Shree Jagannath Temple & Bada Danda (Puri)', kw: 'jagannath' },
    { id: 'puri_sea_beach', name: 'Puri Golden Sea Beach & Swargadwar Promenade', kw: 'beach' },
    { id: 'lingaraj_bhubaneswar', name: 'Lingaraj Temple Old Town (Bhubaneswar)', kw: 'lingaraj' }
  ];

  const fetchSatelliteData = async (siteId) => {
    try {
      setRefreshingSat(true);
      const targetId = siteId || selectedSiteId;
      const res = await apiFetch(`/analytics/satellite-telemetry/?site_id=${targetId}`);
      if (res.ok) {
        setSatelliteData(await res.json());
      }
    } catch (err) {
      console.error("Satellite fetch error:", err);
    } finally {
      setRefreshingSat(false);
    }
  };

  // Fetch all real API data
  const fetchData = async (siteIdOverride) => {
    try {
      const activeSiteId = siteIdOverride || selectedSiteId;
      fetchSatelliteData(activeSiteId);
      const currentSiteObj = sites.find(s => s.id === activeSiteId) || sites[0];

      // 1. Fetch live crowd counts from YOLO CCTV AI endpoint
      const liveRes = await apiFetch('/crowd/live/');
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        setLiveCrowdApiData(liveData);
        setApiLastUpdated(new Date(liveData.timestamp).toLocaleTimeString());
      }

      // 2. Fetch live camera statuses
      const camStatusRes = await apiFetch('/cameras/status/');
      if (camStatusRes.ok) {
        setCameraStatusData(await camStatusRes.json());
      }

      // 3. Fetch zone-wise dynamic crowd density
      const zoneRes = await apiFetch('/crowd/zones/');
      if (zoneRes.ok) {
        const zData = await zoneRes.json();
        setZoneCrowdData(zData.zones || []);
      }

      // 4. Fetch real AI incidents from database
      const incRes = await apiFetch('/incidents/');
      if (incRes.ok) {
        const incData = await incRes.json();
        setRealIncidents(incData.incidents || []);
      }

      // 5. Fetch official ISRO Bhuvan geospatial capabilities & weather telemetry
      const isroRes = await apiFetch(`/isro/geospatial/?site_id=${activeSiteId}`);
      if (isroRes.ok) {
        setIsroData(await isroRes.json());
      }

      // 6. Fetch general dashboard summary
      const summaryRes = await apiFetch('/analytics/summary/');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
      
      let currentCam = selectedCamera;
      // 7. Fetch cameras
      const camerasRes = await apiFetch('/camera/');
      if (camerasRes.ok) {
        const camerasData = await camerasRes.json();
        setCameras(camerasData);
        if (camerasData.length > 0) {
          const matchedCam = camerasData.find(c => 
            c.location.toLowerCase().includes(currentSiteObj.kw) || 
            c.name.toLowerCase().includes(currentSiteObj.kw)
          );
          const targetCam = matchedCam || (camerasData.find(c => c.status === 'online') || camerasData[0]);
          if (!selectedCamera || siteIdOverride) {
            setSelectedCamera(targetCam);
            currentCam = targetCam;
          }
        }
      }

      // Fetch latest detection details for selected camera
      if (currentCam) {
        const latestRes = await apiFetch(`/detection/latest/${currentCam.id}/`);
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          setLatestDetection(latestData);
        } else {
          setLatestDetection(null);
        }
      }
      
      // Fetch medium to high risk detections for safety alerts panel
      try {
        const alertsRes = await apiFetch('/detection/history/?alerts=true');
        if (alertsRes && alertsRes.ok) {
          const alertsData = await alertsRes.json();
          if (Array.isArray(alertsData)) {
            setActiveAlerts(alertsData.slice(0, 10));
          }
        }
      } catch (err) {
        console.warn("Detection alerts fetch warning:", err);
      }
      
      // Fetch crowd trend chart data
      let trendsUrl = '/analytics/trends/';
      if (currentCam) {
        trendsUrl += `?camera_id=${currentCam.id}`;
      }
      const trendsRes = await apiFetch(trendsUrl);
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        const detections = trendsData.detections || [];
        
        const sortedDetections = [...detections].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const displayDetections = sortedDetections.slice(-15);
        
        const labels = displayDetections.map(det => {
          const date = new Date(det.timestamp);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        });
        
        const data = displayDetections.map(det => det.count);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Crowd Count (People)',
              data,
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#fff',
              pointHoverRadius: 6
            }
          ]
        });
      }
    } catch (e) {
      console.error("Error fetching dashboard real API data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = (newSiteId) => {
    setSelectedSiteId(newSiteId);
    fetchData(newSiteId);
  };

  useEffect(() => {
    fetchData(selectedSiteId);
    
    // Connect to Server-Sent Events (SSE) stream for real-time live crowd updates
    let eventSource = null;
    try {
      const token = localStorage.getItem('access_token');
      eventSource = new EventSource(`http://${window.location.hostname}:8000/api/crowd/stream/`);
      
      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.current_crowd_count !== undefined) {
            setSummary(prev => ({
              ...prev,
              current_crowd_count: data.current_crowd_count,
              average_crowd_density: data.average_crowd_density,
              active_cameras: data.active_cameras
            }));
            setApiLastUpdated(new Date().toLocaleTimeString());
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
        eventSource.close();
      };
    } catch (err) {
      setSseConnected(false);
    }

    // Interval polling fallback every 5s
    const interval = setInterval(() => {
      fetchData(selectedSiteId);
    }, 5000);
    
    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [selectedCamera, selectedSiteId]);


  const handleResolveAlert = async (alertId) => {
    setActionLoading(alertId);
    try {
      const res = await apiFetch(`/alerts/${alertId}/resolve/`, { method: 'POST' });
      if (res.ok) {
        // Refresh alert list and summary
        fetchData();
      }
    } catch (err) {
      console.error("Failed to resolve alert", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !selectedCamera) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '15px' }}>
        <RefreshCw size={24} className="pulsing-dot" style={{ animation: 'spin 1.5s infinite linear' }} />
        <span>Loading Command Center...</span>
      </div>
    );
  }

  // Chart configuration options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(13, 10, 24, 0.95)',
        titleColor: '#fff',
        bodyColor: '#a39eb2',
        borderColor: 'rgba(168, 85, 247, 0.2)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)'
        },
        ticks: {
          color: '#6e6782',
          font: { family: 'Outfit' }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)'
        },
        ticks: {
          color: '#6e6782',
          font: { family: 'Outfit' }
        }
      }
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://${window.location.hostname}:8000${url}`;
  };

  const handleSimulateEvent = async (eventType) => {
    try {
      setSimulationStatus('Triggering dynamic simulation...');
      const res = await apiFetch('/analytics/simulate/', {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationStatus(data.message || 'Simulation completed');
        fetchData();
      } else {
        setSimulationStatus('Failed to trigger simulation');
      }
    } catch (e) {
      setSimulationStatus('Network error executing simulation');
    } finally {
      setTimeout(() => setSimulationStatus(''), 5000);
    }
  };

  return (
    <div>
      {/* Header Panel with Dynamic Multi-Site Selector */}
      <div className="page-header-box" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '2.0rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            Smart Tourism & Safety Command Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Real-time crowd intelligence, GIS safety geofencing & AI risk prediction engine.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dynamic Site Location Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} style={{ color: 'var(--accent-cyan)' }} />
            <select
              value={selectedSiteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="form-input"
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}
            >
              {sites.map(s => <option key={s.id} value={s.id} style={{ background: '#1e293b' }}>{s.name}</option>)}
            </select>

          </div>

          {setActiveTab && (
            <button 
              className="btn-primary" 
              onClick={() => setActiveTab('whatif-simulator')} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #0284c7 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
              }}
            >
              🌐 3D Digital Twin & What-If
            </button>
          )}

          <button className="btn-secondary" onClick={fetchData} style={{ padding: '8px 14px' }}>
            <RefreshCw size={16} /> Sync Feeds
          </button>
        </div>
      </div>

      {/* Live Interactive Simulation Bar */}
      <div className="glass-panel" style={{
        padding: '12px 18px',
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ Real-Time Demo Simulation Controls:
          </span>
          {simulationStatus && (
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, marginLeft: '10px' }}>
              {simulationStatus}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleSimulateEvent('surge')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ⚡ Spike Crowd Surge
          </button>

          <button
            onClick={() => handleSimulateEvent('weather')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#06b6d4',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🌧️ Shift Weather Hazard
          </button>

          <button
            onClick={() => handleSimulateEvent('sos')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🚨 Trigger Visitor SOS
          </button>

          <button
            onClick={() => handleSimulateEvent('reset')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🔄 Reset Baseline
          </button>
        </div>
      </div>

      {/* Weather & Transport Condition Ticker */}
      {summary.environment && (
        <div className="glass-panel" style={{
          padding: '12px 20px',
          marginBottom: '25px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px',
          background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(14, 165, 233, 0.2)',
          borderRadius: '12px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              🌡️ Site Weather: {summary.environment.temperature_c}°C ({summary.environment.weather_condition})
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              💧 Humidity: {summary.environment.humidity}% | Rain Risk: {summary.environment.precipitation_risk}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <span style={{ color: '#4ade80' }}>
              🚌 Shuttles: <strong>{summary.environment.shuttle_availability_pct}% Available</strong>
            </span>
            <span style={{ color: '#fbbf24' }}>
              🅿️ Parking: <strong>{summary.environment.parking_occupancy_pct}% Occupied</strong>
            </span>
            <span className="badge badge-secondary">
              🚦 Traffic: {summary.environment.traffic_congestion_level}
            </span>
          </div>
        </div>
      )}

      {/* REAL-TIME SATELLITE & GPS PILGRIM TELEMETRY BOARD */}
      {satelliteData && satelliteData.primary_site && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.06) 0%, rgba(6, 182, 212, 0.06) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          padding: '22px 26px',
          marginBottom: '25px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 15px var(--accent-purple-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Compass size={24} />
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    📹 Real-Time AI Crowd Count — {satelliteData.primary_site.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 9px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', textTransform: 'uppercase' }}>
                    YOLOv8 & CSRNet AI CCTV Stream
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Real-time YOLOv8 multi-camera object detection + CSRNet spatial crowd density estimation
                </p>
              </div>
            </div>

            <button
              onClick={fetchSatelliteData}
              className="btn-secondary"
              disabled={refreshingSat}
              style={{ fontSize: '0.82rem', padding: '8px 14px', gap: '6px' }}
            >
              <RefreshCw size={14} className={refreshingSat ? 'spin' : ''} />
              Re-Scan Camera Feeds & AI Telemetry
            </button>
          </div>

          {/* Big Number KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Total People Currently Present
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--accent-purple)' }}>
                {satelliteData.primary_site.total_pilgrims.toLocaleString()}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>People</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                ✓ Dual AI Model Fusion
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                📷 YOLOv8 Camera Vision Count
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>
                {(satelliteData.primary_site.camera_vision_count || satelliteData.primary_site.gps_ping_count || 0).toLocaleString()}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>Detections</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Multi-Scale Tiled Box Detector
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                🧠 CSRNet Spatial Density Count
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#f59e0b' }}>
                {(satelliteData.primary_site.csrnet_density_count || satelliteData.primary_site.satellite_optical_count || 0).toLocaleString()}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>Density Units</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Dense Crowd Integral Tensor
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                🏛️ Site Occupancy Capacity
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {satelliteData.primary_site.occupancy_percentage}%
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '6px' }}>of 30,000</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 700 }}>
                Status: {satelliteData.primary_site.status}
              </div>
            </div>
          </div>

          {/* Zone Distribution Breakdown */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📍 {satelliteData.primary_site.name} Zone-Wise Live Distribution:
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
              {satelliteData.primary_site.zones.map((zone, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{zone.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cap: {zone.capacity.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{zone.count.toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pilgrims</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NEAREST TOURIST PLACES & EMERGENCY CENTERS PANEL (PURI, ODISHA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        {/* Nearest Tourist Places */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: 'var(--accent-cyan)' }} />
            Nearest Tourist Places in Puri (Real-Time Crowd)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Puri Golden Sea Beach & Promenade</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Beach Drive • 0.4 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>👥 840 Present</span>
                <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>HIGH CROWD</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Shree Jagannath Temple & Bada Danda</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Grand Road • 0.8 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-purple)' }}>👥 1,140 Present</span>
                <div style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>HIGH CROWD</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Swargadwar Beach Promenade & Market</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Swargadwar • 1.2 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#eab308' }}>👥 620 Present</span>
                <div style={{ fontSize: '0.7rem', color: '#eab308', fontWeight: 700 }}>MODERATE</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Konark Sun Temple & Marine Drive</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 Konark • 32 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>👥 680 Present</span>
                <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>NORMAL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Nearest Emergency Centers */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Siren size={18} />
            Nearest Emergency Centers & First Responders
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Puri District Headquarter Hospital</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🏥 Grand Road • 1.1 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PhoneCall size={12} /> 102 / 06752-222000
                </span>
                <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>24/7 EMERGENCY</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Swargadwar Beach Lifeguard Post</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🛟 Swargadwar Beach • 0.4 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PhoneCall size={12} /> 108 / +91 94370 12345
                </span>
                <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>BEACH RESCUE ON</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Puri Sea Beach Tourist Police Outpost</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🚓 Beach Drive • 0.6 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PhoneCall size={12} /> 112 / 100
                </span>
                <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>PATROL ACTIVE</div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Jagannath Shrine Medical Assistance Camp</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🚑 Singhadwara • 0.8 km away</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PhoneCall size={12} /> 06752-223000
                </span>
                <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>24/7 FIRST AID</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Active SOS Warning Bar */}
      {summary.unresolved_sos > 0 && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '25px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#f87171',
          fontWeight: '600'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon size={20} />
            <span>CRITICAL NOTICE: {summary.unresolved_sos} Emergency SOS alert(s) pending responder verification!</span>
          </div>
          <span style={{ fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>
            Open Emergency Dispatch Board &rarr;
          </span>
        </div>
      )}


      {/* API Telemetry & Connection Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700 }}>
            <span className="pulsing-dot" style={{ background: '#10b981' }} />
            {sseConnected ? "SSE Real-Time Stream Connected" : "Polling Live Backend APIs (/api/crowd/live/)"}
          </span>
          <span>• Source: <strong>CCTV / RTSP YOLOv8 AI Engine</strong></span>
        </div>
        <div>
          <span>Last Updated: <strong style={{ color: 'var(--accent-cyan)' }}>{apiLastUpdated || 'Just Now'}</strong></span>
        </div>
      </div>

      {/* 1. Stats KPI Cards Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Feeds</span>
            <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}><Camera size={20} /></div>
          </div>
          <div className="stat-value">
            {summary.active_cameras} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {summary.total_cameras}</span>
          </div>
          <div className="stat-trend" style={{ color: 'var(--risk-low)' }}>
            <div className="pulsing-dot" /> Online • /api/cameras/status/
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span className="stat-title">Live Crowd Count</span>
            <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}><Users size={20} /></div>
          </div>
          <div className="stat-value">{summary.current_crowd_count}</div>
          <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
            <Activity size={12} /> Real YOLO detection count
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span className="stat-title">Avg Crowd Density</span>
            <div className="stat-icon" style={{ color: 'var(--risk-medium)' }}><TrendingUp size={20} /></div>
          </div>
          <div className="stat-value">{summary.average_crowd_density}</div>
          <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
            Score / m² (YOLO AI)
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: summary.unresolved_alerts > 0 ? '3px solid var(--risk-critical)' : '1px solid var(--border-color)' }}>
          <div className="stat-header">
            <span className="stat-title">Active Alerts</span>
            <div className="stat-icon" style={{ color: 'var(--risk-critical)' }}><AlertOctagon size={20} /></div>
          </div>
          <div className="stat-value" style={{ color: summary.unresolved_alerts > 0 ? 'var(--risk-critical)' : 'var(--text-primary)' }}>
            {summary.unresolved_alerts}
          </div>
          <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
            {summary.today_alerts} alerts logged today
          </div>
        </div>
      </div>

      {/* 2. Main Monitoring Panel (Stream + Alerts) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '30px', marginBottom: '30px' }}>
        {/* Live Camera Feed Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} /> Live Intelligence Feed
            </h2>
            
            {/* Camera Switcher Dropdown */}
            {cameras.length > 0 && (
              <select 
                className="form-select"
                style={{ width: 'auto', padding: '6px 36px 6px 12px', fontSize: '0.85rem' }}
                value={selectedCamera ? selectedCamera.id : ''}
                onChange={(e) => {
                  const cam = cameras.find(c => c.id === parseInt(e.target.value));
                  setSelectedCamera(cam);
                }}
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.location})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCamera ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Image View / MJPEG Stream view from Django */}
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#000',
                aspectRatio: '852 / 320', // fits side-by-side perfectly
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                display: 'flex'
              }}>
                {selectedCamera.name === 'Manual Image Uploads' && latestDetection ? (
                  <>
                    <div style={{ width: '50%', height: '100%', position: 'relative', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <img 
                        src={getImageUrl(latestDetection.image)} 
                        alt="AI Detection Overlay"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)'
                      }}>
                        AI DETECTION OVERLAY
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#fff',
                        letterSpacing: '0.5px'
                      }}>
                        CAM: {selectedCamera.name} | COUNT: {latestDetection.count} | DENSITY: {typeof latestDetection.density === 'number' ? latestDetection.density.toFixed(3) : latestDetection.density} | RISK: {latestDetection.risk.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ width: '50%', height: '100%', position: 'relative' }}>
                      <img 
                        src={getImageUrl(latestDetection.heatmap)} 
                        alt="AI Density Heatmap"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--accent-purple)'
                      }}>
                        AI DENSITY HEATMAP
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={`http://${window.location.hostname}:8000/api/detection/stream/${selectedCamera.id}/?t=${new Date().getTime()}`} 
                      alt={`Real-time Stream for ${selectedCamera.name}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        // fallbacks if server offline
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback box when backend offline */}
                    <div style={{
                      display: 'none',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      width: '100%',
                      color: 'var(--text-muted)',
                      gap: '12px'
                    }}>
                      <ShieldAlert size={40} />
                      <span>Stream Offline. Ensure Django Backend is running on port 8000.</span>
                    </div>
                  </>
                )}
              </div>

              {/* Camera Details bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Position</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} style={{ color: 'var(--accent-cyan)' }} /> {selectedCamera.location}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Feed Source</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-muted)' }}>
                      {selectedCamera.name === 'Manual Image Uploads' ? 'Static Image Analysis' : (selectedCamera.video_file ? 'Sample MP4 Loop' : selectedCamera.stream_url ? selectedCamera.stream_url : 'No Feed Assigned')}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Average Density</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '2px', color: 'var(--accent-cyan)' }}>
                      {latestDetection && typeof latestDetection.density === 'number' ? latestDetection.density.toFixed(3) : summary.average_crowd_density}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={`badge-status ${selectedCamera.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                    <span className={selectedCamera.status === 'online' ? 'pulsing-dot' : 'pulsing-dot-offline'} /> {selectedCamera.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              gap: '15px'
            }}>
              <Camera size={48} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No active cameras registered</p>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Please configure a new CCTV camera to begin monitoring.</p>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Alerts Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '490px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--risk-critical)' }} /> Critical Safety Alerts
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            flexGrow: 1,
            paddingRight: '4px'
          }}>
            {activeAlerts.length > 0 ? (
              activeAlerts.map(det => (
                <div 
                  key={det.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: det.risk === 'critical' ? 'var(--risk-critical)' : det.risk === 'high' ? 'var(--risk-high)' : '#eab308',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {det.camera_details?.name || 'Manual Image Uploads'}
                      </span>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                        {det.camera_details?.location || 'Standalone Web Portal'}
                      </h4>
                    </div>
                    <span className={`badge-risk ${getRiskClass(det.risk)}`} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      {det.risk.toUpperCase()}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '10px'
                  }}>
                    <span>Count: <strong style={{ color: 'var(--text-primary)' }}>{det.count}</strong> | Density: <strong style={{ color: 'var(--accent-cyan)' }}>{typeof det.density === 'number' ? det.density.toFixed(3) : det.density}</strong></span>
                    <span>{det.timestamp ? new Date(det.timestamp).toLocaleTimeString() : ''}</span>
                    
                    {det.email_sent ? (
                      <span className="badge-status badge-online" style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={10} /> Dispatched
                      </span>
                    ) : (
                      <span className="badge-status badge-offline" style={{ fontSize: '0.7rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(234, 179, 8, 0.08)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.15)' }}>
                        <AlertOctagon size={10} /> Pending Email
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '240px',
                color: 'var(--text-muted)',
                gap: '12px'
              }}>
                <CheckCircle size={36} style={{ color: 'var(--risk-low)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All zones secure</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>No active safety hazards detected.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-purple)' }} /> {selectedCamera?.name === 'Manual Image Uploads' ? 'Manual Upload Analytics History' : 'Crowd Ingestion Trends'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
              {selectedCamera?.name === 'Manual Image Uploads' ? 'Chronological ledger of crowd counts from manual image uploads.' : 'Facilitating congestion load analysis and resource planning.'}
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} style={{ color: 'var(--accent-cyan)' }} /> Updating live
          </span>
        </div>

        <div style={{ height: '300px', width: '100%' }}>
          {chartData && chartData.labels.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: '10px' }}>
              <TrendingUp size={24} style={{ color: 'var(--text-muted)' }} />
              <span>No detection logs found for this camera node.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
