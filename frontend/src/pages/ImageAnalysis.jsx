import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UploadCloud, Image as ImageIcon, RefreshCw, Users, Activity, 
  ShieldAlert, Sparkles, CheckCircle, AlertTriangle, Eye, Camera, Video, StopCircle, Target, Award, Info, MapPin
} from 'lucide-react';

const ImageAnalysis = () => {
  const { apiFetch } = useAuth();
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const [zones, setZones] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Bada Danda');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);

  const [officers, setOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const [highPrecision, setHighPrecision] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.12');

  // Load active zones and security officers
  useEffect(() => {
    const fetchZonesAndOfficers = async () => {
      try {
        const zRes = await apiFetch('/analytics/zones/');
        if (zRes.ok) {
          const zData = await zRes.json();
          setZones(zData);
          if (zData.length > 0) {
            setSelectedZoneId(zData[0].id.toString());
          }
        }

        const oRes = await apiFetch('/auth/users/');
        if (oRes.ok) {
          const oData = await oRes.json();
          const securityOfficers = oData.filter(u => u.role === 'security_officer');
          setOfficers(securityOfficers);
          if (securityOfficers.length > 0) {
            setSelectedOfficerId(securityOfficers[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching initial metadata:", err);
      }
    };
    fetchZonesAndOfficers();
  }, []);

  const [isSimulatedFeed, setIsSimulatedFeed] = useState(false);
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const startWebcam = async () => {
    setError(null);
    setIsSimulatedFeed(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      startSimulatedFeed("Browser WebCam API unavailable. Activated Simulated Camera Feed.");
      return;
    }

    try {
      // Attempt 1: Ideal HD Resolution
      const stream = await navigator.mediaDevices.getUserMedia({ video: { idealWidth: 1280, idealHeight: 720 } });
      setWebcamStream(stream);
      setIsWebcamActive(true);
    } catch (err1) {
      try {
        // Attempt 2: Basic Video Stream Fallback
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setWebcamStream(stream);
        setIsWebcamActive(true);
      } catch (err2) {
        console.warn("Physical camera unavailable or permission denied. Launching Simulated Camera Feed:", err2);
        startSimulatedFeed("Physical camera permission blocked or device unavailable. Activated Simulated Camera Feed Mode.");
      }
    }
  };

  const startSimulatedFeed = (msg) => {
    setError(msg);
    setIsSimulatedFeed(true);
    setIsWebcamActive(true);
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    setIsSimulatedFeed(false);
    setIsWebcamActive(false);
  };

  useEffect(() => {
    if (isWebcamActive && videoRef.current && webcamStream && !isSimulatedFeed) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [isWebcamActive, webcamStream, isSimulatedFeed]);

  // Animated Simulated Camera Feed Canvas Renderer
  useEffect(() => {
    if (isWebcamActive && isSimulatedFeed && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 450;

      let tick = 0;
      const render = () => {
        tick += 0.05;
        // Background Feed Simulation
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Animated Synthetic Crowd Circles
        for (let i = 0; i < 18; i++) {
          const cx = (canvas.width / 2) + Math.cos(tick + i) * (150 + (i * 10));
          const cy = (canvas.height / 2) + Math.sin(tick * 0.8 + i) * (80 + (i * 5));
          ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(168, 85, 247, 0.7)';
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();
        }

        // Camera HUD Reticle Overlay
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(100, 60, canvas.width - 200, canvas.height - 120);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`REC ● LIVE SIMULATED CCTV FEED [PURI ZONE A] - ${new Date().toLocaleTimeString()}`, 110, 90);
        ctx.fillText(`YOLOv8 SIMULATED INPUT ACTIVE`, 110, 110);

        animFrameIdRef.current = requestAnimationFrame(render);
      };
      render();

      return () => {
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      };
    }
  }, [isWebcamActive, isSimulatedFeed]);

  const captureWebcamSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!isSimulatedFeed && videoRef.current && videoRef.current.videoWidth) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    } else if (canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback synthetic snapshot generator
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Simulated Camera Snapshot', 100, 200);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `simulated_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopWebcam();
        processFile(capturedFile);
        runAnalysisForFile(capturedFile);
      }
    }, 'image/jpeg', 0.95);
  };

  const runAnalysisForFile = async (targetFile, overrideConf = null, overridePrecision = null) => {
    const fileToAnalyze = targetFile || file;
    if (!fileToAnalyze) return;

    const confToUse = overrideConf !== null ? overrideConf : confidenceThreshold;
    const precisionToUse = overridePrecision !== null ? overridePrecision : highPrecision;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', fileToAnalyze);
    formData.append('high_precision', precisionToUse ? 'true' : 'false');
    formData.append('confidence', confToUse);
    if (selectedZoneId) {
      formData.append('zone_id', selectedZoneId);
    }

    try {
      const response = await apiFetch('/detection/detect-image/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error occurred during model analysis.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOfficerEmail = async () => {
    if (!selectedOfficerId) return;
    const officer = officers.find(o => o.id.toString() === selectedOfficerId);
    if (!officer) return;

    setEmailSending(true);
    try {
      const res = await apiFetch('/alerts/send-officer-alert/', {
        method: 'POST',
        body: JSON.stringify({
          email: officer.email,
          username: officer.username,
          location: selectedLocation,
          risk: result.risk,
          count: result.count,
          detection_id: result.id
        })
      });

      if (res.ok) {
        alert(`Alert notification dispatched to ${officer.username} (${officer.email})`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send alert email.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error sending email.');
    } finally {
      setEmailSending(false);
    }
  };

  const getRiskClass = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'low': return 'risk-low';
      case 'medium':
      case 'moderate': return 'risk-medium';
      case 'high': return 'risk-high';
      case 'critical': return 'risk-critical';
      default: return 'risk-low';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) processFile(droppedFile);
      else setError("Invalid file type. Please upload an image (PNG, JPG).");
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
    setResult(null);
  };

  const onButtonClick = () => fileInputRef.current.click();

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="image-analysis-page" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Top Banner - PROTOTYPE MODE Disclaimer */}
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
            MANUAL IMAGE INPUT / SIMULATED CAMERA INPUT • No Live CCTV Connected
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', italic: 'true' }}>
          "Uploaded photo acts as simulated camera input for prototype evaluation."
        </div>
      </div>

      {/* Header Info */}
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} style={{ color: 'var(--accent-purple)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-purple) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            Crowd Image Analysis & Zone Association
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          Upload crowd snapshots, associate metadata with prototype operational monitoring zones, and execute YOLOv8/CSRNet deep learning inference.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-panel" style={{ padding: '14px 20px', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--risk-critical)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Analysis Workflow Panel */}
      {!result ? (
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Metadata Selector Form: Location + Monitoring Zone */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '18px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                📍 Monitoring Location:
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
              >
                <option value="Bada Danda">Bada Danda (Grand Road Corridor)</option>
                <option value="Puri Sea Beach">Puri Sea Beach & Promenade</option>
                <option value="Konark">Konark Temple Sanctuary</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                🏷️ Prototype Monitoring Zone:
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name} (Cap: {z.capacity_limit})
                  </option>
                ))}
              </select>
            </div>

            {/* AI Precision & Sensitivity Settings */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ⚡ Sensitivity & Precision:
              </label>
              <select
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
              >
                <option value="0.10">Ultra-High (0.10 - Dense Crowds)</option>
                <option value="0.12">High Precision (0.12 - Recommended)</option>
                <option value="0.20">Balanced (0.20)</option>
                <option value="0.30">Strict Confidence (0.30)</option>
              </select>
            </div>
          </div>

          {/* File Input */}
          <input type="file" ref={fileInputRef} onChange={handleChange} style={{ display: 'none' }} accept="image/*" />

          {isWebcamActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '800px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--accent-cyan)' }}>
                {isSimulatedFeed ? (
                  <canvas ref={canvasRef} style={{ width: '100%', display: 'block', background: '#000' }} />
                ) : (
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
                )}
                <div style={{ position: 'absolute', top: '15px', left: '15px', background: 'rgba(0, 0, 0, 0.8)', color: '#38bdf8', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                  {isSimulatedFeed ? '📸 SIMULATED CAMERA CANVAS FEED ACTIVE' : '📸 PHYSICAL CAMERA FEED ACTIVE'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={captureWebcamSnapshot} className="btn-primary" style={{ padding: '12px 24px', fontWeight: 700 }}>
                  CAPTURE & ANALYZE SIMULATED SNAPSHOT
                </button>
                <button type="button" onClick={stopWebcam} className="btn-secondary" style={{ padding: '12px 20px' }}>
                  Close Feed
                </button>
              </div>
            </div>
          ) : !file ? (
            /* Drag & Drop Area */
            <div>
              <div className={`drag-zone ${dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={onButtonClick}>
                <div className="upload-icon-container">
                  <UploadCloud size={40} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    Select Crowd Image to Simulate Camera Input
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Supports PNG, JPG, JPEG, and WebP formats
                  </span>
                </div>
                <button className="btn-secondary" style={{ marginTop: '8px', padding: '8px 18px', fontWeight: 600 }}>
                  Browse Local File
                </button>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 800 }}>
                  — OR CONNECT SIMULATED LIVE CAMERA STREAM —
                </div>
                <button type="button" onClick={startWebcam} className="btn-primary" style={{ padding: '12px 22px', fontWeight: 700, background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)', margin: '0 auto' }}>
                  <Video size={18} />
                  <span>📷 Open Simulated Camera Feed</span>
                </button>
              </div>
            </div>
          ) : (
            /* Image Preview & Analyze Button */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="preview-container">
                <img src={previewUrl} alt="Crowd snapshot preview" className={`preview-img ${loading ? 'blur-active' : ''}`} />
                {loading && (
                  <div className="scan-overlay">
                    <div className="scan-line" />
                    <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'rgba(13, 10, 24, 0.9)' }}>
                      <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--accent-cyan)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Executing YOLOv8 / CSRNet Inference...</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={handleReset} className="btn-secondary" disabled={loading}>
                  Change Image
                </button>
                <button onClick={() => runAnalysisForFile(file)} className="btn-primary" disabled={loading} style={{ minWidth: '180px', fontWeight: 800 }}>
                  <Activity size={18} />
                  <span>ANALYZE CROWD</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results Screen */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Controls Bar */}
          <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Selected Zone: {result.zone_name}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  ({result.location_name})
                </span>
              </div>
            </div>

            <button onClick={handleReset} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              Analyze Another Image
            </button>
          </div>

          {/* Stats Bar */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {/* Metric 1: Image Count */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">AI Estimated Crowd in Image</span>
                <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}>
                  <Users size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {result.estimated_image_count}
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>people</span>
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                YOLOv8 Tiled Multi-Scale Inference
              </div>
            </div>

            {/* Metric 2: Estimated Zone Occupancy */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Estimated Zone Occupancy</span>
                <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>
                  <Target size={18} />
                </div>
              </div>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {result.zone_occupancy_pct}%
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                Zone Capacity: {result.zone_capacity} max
              </div>
            </div>

            {/* Metric 3: Crowd Risk */}
            <div className="glass-panel stat-card">
              <div className="stat-header">
                <span className="stat-title">Zone Risk Level</span>
                <div className="stat-icon" style={{ color: result.risk === 'low' ? 'var(--risk-low)' : 'var(--risk-critical)' }}>
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div style={{ marginTop: '5px' }}>
                <span className={`badge-risk ${getRiskClass(result.risk)}`}>
                  {result.risk_level} RISK
                </span>
              </div>
              <div className="stat-trend" style={{ color: 'var(--text-secondary)' }}>
                Evaluated against zone limits
              </div>
            </div>
          </div>

          {/* Side-by-Side Visual overlay & Heatmap */}
          <div className="visuals-grid">
            <div className="glass-panel visual-card">
              <div className="visual-card-title">
                <ImageIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span>YOLOv8 Person Detection Overlay</span>
              </div>
              <div className="visual-img-container">
                <img src={result.overlay_url} alt="Detection Overlay" className="visual-img" />
              </div>
            </div>

            <div className="glass-panel visual-card">
              <div className="visual-card-title">
                <Activity size={18} style={{ color: 'var(--accent-purple)' }} />
                <span>AI Crowd Density Heatmap</span>
              </div>
              <div className="visual-img-container">
                <img src={result.heatmap_url} alt="Density Heatmap" className="visual-img" />
              </div>
            </div>
          </div>

          {/* AI Forecast Card */}
          {result.forecast && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  AI Crowd Forecast Trends (Next 60 Minutes)
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>15-Min Forecast</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {result.forecast.min_15.crowd} people
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{result.forecast.min_15.occupancy_pct}% occupancy</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>30-Min Forecast</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {result.forecast.min_30.crowd} people
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{result.forecast.min_30.occupancy_pct}% occupancy</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>60-Min Forecast</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {result.forecast.min_60.crowd} people
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{result.forecast.min_60.occupancy_pct}% occupancy</div>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Data Provenance Panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={16} style={{ color: 'var(--accent-cyan)' }} /> SYSTEM DATA PROVENANCE PANEL
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>SOURCE:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{result.provenance.source}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>MODEL:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{result.provenance.model}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>LOCATION:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{result.provenance.location}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>MONITORING ZONE:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{result.provenance.monitoring_zone}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>RESULT TYPE:</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{result.provenance.result_type}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>FORECAST TYPE:</span>
                <strong style={{ color: 'var(--accent-purple)' }}>{result.provenance.forecast_type}</strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>LIVE CCTV STREAM:</span>
                <strong style={{ color: 'var(--text-secondary)' }}>{result.provenance.live_cctv}</strong>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default ImageAnalysis;
