import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveOfflineSOS } from '../utils/offlineStore';
import {
  Siren, ShieldCheck, ShieldAlert, Ambulance, Flame, Compass,
  PhoneCall, CheckCircle, AlertTriangle, Send, Navigation, PlusCircle, RefreshCw
} from 'lucide-react';

export default function EmergencyServices() {
  const { apiFetch, user } = useAuth();
  const [sosList, setSosList] = useState([]);
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedSos, setSelectedSos] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [etaMinutes, setEtaMinutes] = useState(5);

  // New SOS Form State
  const [formData, setFormData] = useState({
    location_name: 'Central Shrine Corridor',
    category: 'medical',
    urgency: 'high',
    sender_name: 'Visitor / Officer',
    contact_number: '+1-800-555-9999',
    notes: 'Medical oxygen support requested'
  });

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [sosRes, respRes] = await Promise.all([
        apiFetch('/alerts/sos/'),
        apiFetch('/alerts/responders/')
      ]);

      if (sosRes.ok) setSosList(await sosRes.json());
      if (respRes.ok) setResponders(await respRes.json());
    } catch (err) {
      console.error("Emergency data fetch error:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!navigator.onLine) {
        saveOfflineSOS(formData);
        alert("Network is offline. SOS saved locally in queue and will auto-sync when online!");
        setShowTriggerModal(false);
        return;
      }

      const res = await apiFetch('/alerts/sos/trigger/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("Emergency SOS triggered successfully!");
        setShowTriggerModal(false);
        fetchData();
      } else {
        alert("Error triggering SOS alert.");
      }
    } catch (err) {
      saveOfflineSOS(formData);
      alert("Connectivity issue. SOS stored in local offline queue!");
      setShowTriggerModal(false);
    }
  };

  const handleVerify = async (sosId, status) => {
    try {
      const res = await apiFetch(`/alerts/sos/${sosId}/verify/`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes: `Verified by ${user?.username || 'Security Officer'}`
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Verification error:", err);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedSos || !selectedUnitId) return;

    try {
      const res = await apiFetch('/alerts/dispatch/', {
        method: 'POST',
        body: JSON.stringify({
          sos_id: selectedSos.id,
          unit_id: selectedUnitId,
          eta_minutes: etaMinutes
        })
      });

      if (res.ok) {
        alert(`Unit dispatched to SOS [${selectedSos.sos_code}]! Route waypoints calculated.`);
        setShowDispatchModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Dispatch error:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="page-header-box" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 25px',
        marginBottom: 0
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Siren style={{ color: '#ef4444' }} />
            Verified Emergency SOS & First Responder Service Coordination
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Security Officer verification board, emergency alert dispatches, & first responder unit route assignments.
          </p>
        </div>

        {user?.role !== 'admin' && (
          <button
            className="btn btn-primary"
            style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowTriggerModal(true)}
          >
            <PlusCircle size={16} />
            Trigger Emergency SOS
          </button>
        )}
      </div>

      {/* First Responders Status Cards */}
      <div>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} style={{ color: 'var(--accent-purple)' }} />
          On-Duty Emergency Responder Units
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {responders.map(unit => (
            <div key={unit.id} className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{unit.unit_name}</h4>
                <span className={`badge ${unit.status === 'available' ? 'badge-online' : 'badge-offline'}`} style={{ fontSize: '0.75rem' }}>
                  {unit.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Category:</strong> {unit.unit_type_display}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Helpline:</strong> {unit.contact_phone}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified SOS Alert Queue */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
          <ShieldCheck style={{ color: 'var(--accent-cyan)' }} size={20} />
          Emergency SOS Incident Verification & Dispatch Queue
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sosList.length > 0 ? (
            sosList.map(sos => (
              <div 
                key={sos.id} 
                style={{
                  padding: '20px 24px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444' }}>
                      [{sos.sos_code}] {sos.category_display}
                    </span>
                    <span className={`badge risk-${sos.urgency === 'critical' ? 'critical' : 'high'}`}>
                      {sos.urgency_display}
                    </span>
                    <span className={`badge ${sos.status === 'verified' ? 'badge-online' : 'badge-secondary'}`}>
                      {sos.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span>📍 <strong>Location:</strong> {sos.location_name}</span>
                    <span>👤 <strong>Reporter:</strong> {sos.sender_name} ({sos.contact_number || 'N/A'})</span>
                  </p>
                  
                  {sos.notes && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', borderRadius: '6px', borderLeft: '3px solid var(--accent-purple)' }}>
                      <em>Note: {sos.notes}</em>
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {sos.status === 'pending' && (
                    <>
                      <button 
                        className="btn-secondary" 
                        style={{ color: '#059669', borderColor: 'rgba(5, 150, 105, 0.4)', padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => handleVerify(sos.id, 'verified')}
                      >
                        Verify Incident
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.4)', padding: '8px 14px', fontSize: '0.85rem' }}
                        onClick={() => handleVerify(sos.id, 'false_alarm')}
                      >
                        False Alarm
                      </button>
                    </>
                  )}

                  {(sos.status === 'verified' || sos.status === 'pending') && (
                    <button 
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => {
                        setSelectedSos(sos);
                        setShowDispatchModal(true);
                      }}
                    >
                      Dispatch First Responder
                    </button>
                  )}

                  {sos.status === 'dispatched' && (
                    <button 
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => handleVerify(sos.id, 'resolved')}
                    >
                      Mark Resolved & Safe
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '35px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              No active Emergency SOS alerts queued.
            </div>
          )}
        </div>
      </div>

      {/* Trigger Modal */}
      {showTriggerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🚨 Trigger Emergency SOS
            </h3>
            <form onSubmit={handleTriggerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Location Name</label>
                <input className="form-input" value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Emergency Category</label>
                <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="medical">Medical Emergency</option>
                  <option value="stampede">Stampede / Overcrowding Hazard</option>
                  <option value="fire">Fire / Smoke Hazard</option>
                  <option value="lost_person">Lost Person / Child</option>
                  <option value="landslide">Landslide / Barrier</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Urgency Level</label>
                <select className="form-select" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                  <option value="high">High Urgency</option>
                  <option value="critical">Critical Life-Threatening</option>
                  <option value="medium">Medium Urgency</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Details / Notes</label>
                <textarea className="form-input" rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowTriggerModal(false)}>Cancel</button>
                <button type="submit" className="btn-danger">Submit Emergency SOS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && selectedSos && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Dispatch Responder to [{selectedSos.sos_code}]
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Target: <strong>{selectedSos.location_name}</strong> ({selectedSos.category_display})
            </p>

            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Select Available Unit</label>
                <select 
                  className="form-select" 
                  value={selectedUnitId} 
                  onChange={e => setSelectedUnitId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Emergency Responder Unit --</option>
                  {responders.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name} ({u.unit_type_display})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Estimated Response Time (ETA Mins)</label>
                <input type="number" className="form-input" value={etaMinutes} onChange={e => setEtaMinutes(e.target.value)} min="1" max="60" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Dispatch Unit & Calculate Route</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
