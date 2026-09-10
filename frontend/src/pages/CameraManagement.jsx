import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, MapPin, Video, Trash2, Edit, Plus, X, Power, ToggleLeft, AlertTriangle } from 'lucide-react';

const CameraManagement = () => {
  const { apiFetch } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [deletingCameraId, setDeletingCameraId] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [status, setStatus] = useState('online');

  const fetchCameras = async () => {
    try {
      const res = await apiFetch('/camera/');
      if (res.ok) {
        const data = await res.json();
        setCameras(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const resetForm = () => {
    setName('');
    setLocation('');
    setStreamUrl('');
    setVideoFile(null);
    setStatus('online');
    setEditingCamera(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (cam) => {
    setEditingCamera(cam);
    setName(cam.name);
    setLocation(cam.location);
    setStreamUrl(cam.stream_url || '');
    setStatus(cam.status);
    setVideoFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    formData.append('status', status);
    if (streamUrl) formData.append('stream_url', streamUrl);
    if (videoFile) formData.append('video_file', videoFile);

    try {
      let res;
      if (editingCamera) {
        // Edit Camera
        res = await apiFetch(`/camera/${editingCamera.id}/`, {
          method: 'PATCH', // patch to keep existing video file if new not provided
          body: formData
        });
      } else {
        // Add Camera
        res = await apiFetch('/camera/', {
          method: 'POST',
          body: formData
        });
      }

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchCameras();
      } else {
        const err = await res.json();
        alert(JSON.stringify(err));
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/camera/${id}/`, { method: 'DELETE' });
      if (res.ok) {
        fetchCameras();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await apiFetch(`/camera/${id}/toggle-status/`, { method: 'POST' });
      if (res.ok) {
        fetchCameras();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header-box">
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>Camera Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Configure and monitor surveillance camera ingestion nodes.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAddModal}>
          <Plus size={16} /> Add Camera
        </button>
      </div>

      {loading ? (
        <div>Syncing ingestion channels...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
          {cameras.map(cam => (
            <div key={cam.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: cam.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: cam.status === 'online' ? 'var(--risk-low)' : 'var(--risk-critical)'
                  }}>
                    <Video size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{cam.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <MapPin size={12} /> {cam.location}
                    </p>
                  </div>
                </div>
                
                <span className={`badge-status ${cam.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                  <span className={cam.status === 'online' ? 'pulsing-dot' : 'pulsing-dot-offline'} /> {cam.status}
                </span>
              </div>

              {/* Feed specifications info */}
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                wordBreak: 'break-all'
              }}>
                <strong>Source:</strong> {cam.video_file ? `File: ${cam.video_file.split('/').pop()}` : cam.stream_url ? cam.stream_url : 'No source configured'}
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '15px',
                marginTop: '5px'
              }}>
                <button 
                  onClick={() => handleToggleStatus(cam.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cam.status === 'online' ? 'var(--risk-critical)' : 'var(--risk-low)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  <Power size={14} /> {cam.status === 'online' ? 'Disable' : 'Enable'}
                </button>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button 
                    onClick={() => handleOpenEditModal(cam)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => setDeletingCameraId(cam.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--risk-critical)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal dialog for Adding / Editing Camera */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowModal(false)}
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

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '25px' }}>
              {editingCamera ? 'Modify Ingestion Node' : 'Register Ingestion Node'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Camera Name
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="e.g. South Lobby Gate"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Deployment Location
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  required 
                  placeholder="e.g. Ground Floor Main Hall"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  RTSP Ingestion URL (Live Streams)
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={streamUrl} 
                  onChange={(e) => setStreamUrl(e.target.value)} 
                  placeholder="rtsp://admin:pass@ip:port/h264"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Demo Video Upload (Pre-recorded mp4 for evaluations)
                </label>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '10px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    width: '100%'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Allows testing AI detection counts and heatmaps locally.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Ingestion Status
                </label>
                <select 
                  className="form-select"
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="online">Online / Active</option>
                  <option value="offline">Offline / Standby</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {editingCamera ? 'Save Changes' : 'Register Ingestion'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google-Style Delete Camera Warning Modal */}
      {deletingCameraId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 250
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '480px',
            padding: '30px',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(15, 23, 42, 0.98)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 50px rgba(239, 68, 68, 0.1)',
            borderRadius: '16px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setDeletingCameraId(null)}
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

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                padding: '12px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--risk-critical)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={24} />
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  Are You Sure to Delete?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500, marginBottom: '16px' }}>
                  Once deleted all the Events related to it will be erased.
                </p>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderLeft: '4px solid var(--risk-critical)',
                  padding: '12px',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: '1.4',
                  marginBottom: '24px'
                }}>
                  <strong>WARNING:</strong> This action is permanent and cannot be undone. All database records, historical statistics, heatmaps, and security logs for this camera feed will be lost forever.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setDeletingCameraId(null)}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleDelete(deletingCameraId);
                  setDeletingCameraId(null);
                }}
                className="btn-danger"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: 'var(--risk-critical)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManagement;
