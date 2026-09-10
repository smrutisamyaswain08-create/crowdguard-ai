import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Settings, Sliders, Check, User, Mail, ShieldAlert, Trash2, X } from 'lucide-react';

const AdminPanel = () => {
  const { apiFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New User Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('security_officer');
  const [assignedLocation, setAssignedLocation] = useState('Central Plaza');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [successCreatedUser, setSuccessCreatedUser] = useState(null);

  // Threshold States (Configured inside React / LocalStorage)
  const [lowLimit, setLowLimit] = useState(parseInt(localStorage.getItem('thr_low') || '50'));
  const [mediumLimit, setMediumLimit] = useState(parseInt(localStorage.getItem('thr_medium') || '150'));
  const [highLimit, setHighLimit] = useState(parseInt(localStorage.getItem('thr_high') || '300'));
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [showThresholdConfirm, setShowThresholdConfirm] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/auth/users/');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchThresholds = async () => {
    try {
      const res = await apiFetch('/detection/thresholds/');
      if (res.ok) {
        const data = await res.json();
        setLowLimit(data.low_limit);
        setMediumLimit(data.medium_limit);
        setHighLimit(data.high_limit);
        localStorage.setItem('thr_low', data.low_limit.toString());
        localStorage.setItem('thr_medium', data.medium_limit.toString());
        localStorage.setItem('thr_high', data.high_limit.toString());
      }
    } catch (e) {
      console.error("Failed to fetch risk thresholds from backend", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchThresholds();
  }, []);

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      const res = await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role, assigned_location: assignedLocation })
      });

      if (res.ok) {
        setSuccessCreatedUser({ username, email, role, assigned_location: assignedLocation });
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('security_officer');
        setAssignedLocation('Central Plaza');
        fetchUsers();
      } else {
        const err = await res.json();
        setFormError(err.username?.[0] || err.email?.[0] || 'Registration failed');
      }
    } catch (err) {
      setFormError('Network error registering personnel.');
    }
  };

  const handleDeleteUser = async (userId, targetUsername) => {
    if (userId === currentUser?.id) {
      alert("You cannot delete your own active session account.");
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to permanently delete user account: "${targetUsername}"?`);
    if (!confirmDelete) return;

    try {
      const res = await apiFetch(`/auth/users/${userId}/`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setFormSuccess(`Account "${targetUsername}" has been deleted.`);
        setTimeout(() => setFormSuccess(''), 4000);
        fetchUsers();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to delete account.');
        setTimeout(() => setFormError(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error deleting account.');
      setTimeout(() => setFormError(''), 4000);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/detection/thresholds/', {
        method: 'POST',
        body: JSON.stringify({
          low_limit: lowLimit,
          medium_limit: mediumLimit,
          high_limit: highLimit
        })
      });
      
      if (res.ok) {
        localStorage.setItem('thr_low', lowLimit.toString());
        localStorage.setItem('thr_medium', mediumLimit.toString());
        localStorage.setItem('thr_high', highLimit.toString());
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating thresholds.');
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>Admin Panel & System Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Control user authorization mappings and alert threshold parameters.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px' }}>
        
        {/* Left Side: Forms (User Add & Thresholds) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Create User Form (Admin-Only) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} style={{ color: 'var(--accent-purple)' }} /> Create Account
            </h2>

            {isAdmin ? (
              <form onSubmit={handleRegisterUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {formSuccess && <div style={{ color: 'var(--risk-low)', fontSize: '0.85rem' }}>{formSuccess}</div>}
                {formError && <div style={{ color: 'var(--risk-critical)', fontSize: '0.85rem' }}>{formError}</div>}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '36px', paddingTop: '8px', paddingBottom: '8px' }} 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ paddingLeft: '36px', paddingTop: '8px', paddingBottom: '8px' }} 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    style={{ paddingTop: '8px', paddingBottom: '8px' }} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>System Authorization Role</label>
                  <select 
                    className="form-select" 
                    style={{ paddingTop: '8px', paddingBottom: '8px' }} 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="security_officer">Security Officer</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                {role === 'security_officer' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Assigned Location</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingTop: '8px', paddingBottom: '8px' }} 
                      value={assignedLocation} 
                      onChange={(e) => setAssignedLocation(e.target.value)} 
                      required 
                      placeholder="e.g. Ground Floor Gate"
                    />
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '5px' }}>
                  Register Account
                </button>
              </form>
            ) : (
              <div style={{
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <ShieldAlert size={18} style={{ color: 'var(--risk-critical)', flexShrink: 0 }} />
                <span>Account registration requires System Administrator status.</span>
              </div>
            )}
          </div>

          {/* Threshold Configurations */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: 'var(--accent-cyan)' }} /> Crowd Risk Thresholds
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); setShowThresholdConfirm(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {settingsSuccess && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  color: '#eab308',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '5px'
                }}>
                  <Sliders size={16} />
                  <span>Risk boundaries updated successfully and logged in audit trails.</span>
                </div>
              )}

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Low Risk Upper Boundary</span>
                  <span style={{ color: 'var(--risk-low)' }}>0 - {lowLimit}</span>
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={lowLimit} 
                  onChange={(e) => setLowLimit(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--risk-low)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Medium Risk Upper Boundary</span>
                  <span style={{ color: 'var(--risk-medium)' }}>{lowLimit + 1} - {mediumLimit}</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="250" 
                  value={mediumLimit} 
                  onChange={(e) => setMediumLimit(Math.max(lowLimit + 1, parseInt(e.target.value)))}
                  style={{ width: '100%', accentColor: 'var(--risk-medium)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>High Risk Upper Boundary</span>
                  <span style={{ color: 'var(--risk-high)' }}>{mediumLimit + 1} - {highLimit}</span>
                </label>
                <input 
                  type="range" 
                  min="150" 
                  max="500" 
                  value={highLimit} 
                  onChange={(e) => setHighLimit(Math.max(mediumLimit + 1, parseInt(e.target.value)))}
                  style={{ width: '100%', accentColor: 'var(--risk-high)' }}
                />
              </div>

              <button type="submit" className="btn-secondary" style={{ justifyContent: 'center', marginTop: '5px' }}>
                <Check size={14} /> Update Boundaries
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Users List Table */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--accent-purple)' }} /> Registered Personnel
          </h2>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div>Loading records...</div>
            ) : (
              <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email Address</th>
                    <th>Security Role</th>
                    <th>Assigned Location</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge-status ${u.role === 'admin' ? 'badge-online' : 'badge-offline'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          {u.role === 'admin' ? 'Sys Admin' : 'Officer'}
                        </span>
                      </td>
                      <td>{u.role === 'admin' ? 'All Areas' : (u.assigned_location || 'Central Plaza')}</td>
                      {isAdmin && (
                        <td>
                          {u.id !== currentUser?.id ? (
                            <button 
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--risk-critical)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.2s'
                              }}
                              title="Delete User"
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500 }}>Active Self</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Custom PhonePe-Style Account Success Modal */}
      {successCreatedUser && (
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
          zIndex: 250
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '420px',
            padding: '40px 30px',
            textAlign: 'center',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            background: 'rgba(15, 23, 42, 0.95)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 50px rgba(34, 197, 94, 0.1)',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Green pulsing checkmark */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
              marginBottom: '24px'
            }}>
              <Check size={48} color="#ffffff" style={{ strokeWidth: 3 }} />
            </div>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Account Created Successfully
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px' }}>
              The new personnel has been registered and authorized.
            </p>

            {/* Account receipt card */}
            <div style={{
              width: '100%',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Username</span>
                <strong style={{ color: '#ffffff' }}>{successCreatedUser.username}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email Address</span>
                <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{successCreatedUser.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Role</span>
                <strong style={{ color: 'var(--accent-purple)' }}>
                  {successCreatedUser.role === 'admin' ? 'System Administrator' : 'Security Officer'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>Authorized</span>
              </div>
            </div>

            <button 
              onClick={() => setSuccessCreatedUser(null)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: '#22c55e',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
              }}
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* Yellow Google-Style Risk Thresholds Confirmation Modal */}
      {showThresholdConfirm && (
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
            border: '2px solid rgba(234, 179, 8, 0.3)',
            background: 'rgba(15, 23, 42, 0.98)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 50px rgba(234, 179, 8, 0.1)',
            borderRadius: '16px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowThresholdConfirm(false)}
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
                background: 'rgba(234, 179, 8, 0.1)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sliders size={24} />
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  Update Risk Boundaries?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: 500, marginBottom: '16px' }}>
                  Are You Sure to Update? Once updated the risk thresholds will be changed for all cameras, altering alert triggering levels.
                </p>
                <div style={{
                  background: 'rgba(234, 179, 8, 0.05)',
                  borderLeft: '4px solid #eab308',
                  padding: '12px',
                  borderRadius: '0 8px 8px 0',
                  fontSize: '0.8rem',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: '1.4',
                  marginBottom: '24px'
                }}>
                  <strong>NOTICE:</strong> This setting changes backend classification of Crowd Risk states (Low, Medium, High, Critical) instantly. It will also be recorded in the security audit logs.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowThresholdConfirm(false)}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={(e) => {
                  handleSaveSettings(e);
                  setShowThresholdConfirm(false);
                }}
                className="btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: '#eab308',
                  border: 'none',
                  color: '#000000',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)'
                }}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
