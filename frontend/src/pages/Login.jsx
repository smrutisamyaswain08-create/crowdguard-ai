import React, { useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import {
  Shield, Lock, User, AlertTriangle, Mail, KeyRound,
  ArrowLeft, CheckCircle2, Building2, MapPin, Siren, Compass, Sparkles,
  Zap, ShieldCheck, FileText, Activity, Volume2, Radio, Navigation
} from 'lucide-react';

const Login = () => {
  const { login } = useAuth();

  // Mode: 'login' | 'forgot_request' | 'forgot_confirm'
  const [viewMode, setViewMode] = useState('login');

  // Selected persona portal: 'admin' | 'site_manager' | 'emergency' | 'visitor'
  const [selectedPortal, setSelectedPortal] = useState('admin');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Password reset form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const portals = {
    admin: {
      id: 'admin',
      title: 'Gov & Event Admin Portal',
      roleName: 'Government / Event Admin',
      icon: Building2,
      user: 'admin',
      pass: 'admin123',
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.25)',
      badge: 'GOVERNANCE & AUDIT',
      description: 'Multi-site governance, users, reports & audit logs',
      features: [
        { icon: Building2, text: 'Multi-Site Tourism & Pilgrimage Governance' },
        { icon: ShieldCheck, text: 'System User & Role Access Management' },
        { icon: FileText, text: 'Executive Safety Reports & Historical Audit Logs' }
      ]
    },
    site_manager: {
      id: 'site_manager',
      title: 'Tourism Site Manager Portal',
      roleName: 'Site Manager / Tourism Authority',
      icon: MapPin,
      user: 'sitemanager',
      pass: 'manager123',
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.25)',
      badge: 'LIVE MONITORING & AI',
      description: 'Live heatmaps, AI forecasts, geofences & alerts',
      features: [
        { icon: Activity, text: 'Live AI Crowd Density Heatmaps & Stream Feeds' },
        { icon: Zap, text: '24h Predictive Crowd Surge Forecasting (+1h, +6h, +24h)' },
        { icon: MapPin, text: 'Geofenced Safety Zone Controls & Risk Scoring' }
      ]
    },
    emergency: {
      id: 'emergency',
      title: 'Emergency Services & Responder Portal',
      roleName: 'Emergency Services / Responders',
      icon: Siren,
      user: 'emergency',
      pass: 'emergency123',
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.25)',
      badge: 'SOS DISPATCH & ROUTES',
      description: 'Verified incidents, responder dispatch & routes',
      features: [
        { icon: Siren, text: 'Security Officer SOS Verification Queue' },
        { icon: Radio, text: 'Police, Ambulance & Fire Rescue Unit Dispatch' },
        { icon: Navigation, text: 'Live Emergency Route Calculation & Waypoints' }
      ]
    },
    visitor: {
      id: 'visitor',
      title: 'Pilgrim & Visitor Guidance Portal',
      roleName: 'Visitor / Tourist / Pilgrim',
      icon: Compass,
      user: 'visitor',
      pass: 'visitor123',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.25)',
      badge: 'VISITOR GUIDANCE & SOS',
      description: 'Safe routes, weather alerts, TTS guidance & SOS',
      features: [
        { icon: Navigation, text: 'Safe Crowd-Aware Walking Routes & Crowd Levels' },
        { icon: Volume2, text: 'Multilingual Guidance & Audio Reader (TTS)' },
        { icon: AlertTriangle, text: 'Instant Verified Emergency SOS & Offline Queue' }
      ]
    }
  };

  const currentPortal = portals[selectedPortal];
  const PortalIcon = currentPortal.icon;

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handlePortalSwitch = (portalId) => {
    resetMessages();
    setSelectedPortal(portalId);
    const target = portals[portalId];
    setUsername(target.user);
    setPassword(target.pass);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    if (!username || !password) {
      setError('Please enter username and password');
      setLoading(false);
      return;
    }

    const res = await login(username, password);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
    }
  };

  const handleQuickDemoLogin = async () => {
    resetMessages();
    setUsername(currentPortal.user);
    setPassword(currentPortal.pass);
    setLoading(true);

    const res = await login(currentPortal.user, currentPortal.pass);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
    }
  };

  const handleResetRequestSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setSuccessMessage(data.message || 'Verification code sent to your email.');
        setViewMode('forgot_confirm');
      } else {
        setError(data.error || data.detail || 'Failed to request password reset code.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network error connecting to backend server');
    }
  };

  const handleResetConfirmSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!resetEmail || !resetOtp || !newPassword || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          new_password: newPassword
        })
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setSuccessMessage(data.message || 'Password reset successfully!');
        setTimeout(() => {
          setViewMode('login');
          resetMessages();
          setPassword('');
        }, 2000);
      } else {
        setError(data.error || data.detail || 'Invalid reset code or request.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network error connecting to backend server');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '30px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient radial glow overlays */}
      <div style={{
        position: 'absolute',
        width: '650px',
        height: '650px',
        background: `radial-gradient(circle, ${currentPortal.glow} 0%, transparent 70%)`,
        top: '5%',
        left: '10%',
        zIndex: -1,
        filter: 'blur(90px)',
        transition: 'all 0.5s ease',
        pointerEvents: 'none'
      }} />

      {/* Main Brand Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Shield size={28} style={{ color: currentPortal.color, transition: 'all 0.3s ease' }} />
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            CROWDGUARD AI
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Pilgrimage & Eco-Tourism Safety Platform
        </p>
      </div>

      {/* 4 Dedicated Persona Portal Switcher Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px',
        width: '100%',
        maxWidth: '1050px',
        marginBottom: '25px'
      }}>
        {Object.values(portals).map(p => {
          const Icon = p.icon;
          const isActive = selectedPortal === p.id;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePortalSwitch(p.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '16px 18px',
                background: isActive ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.03)',
                border: `2px solid ${isActive ? p.color : 'var(--border-color)'}`,
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? `0 8px 25px ${p.glow}` : 'none',
                transform: isActive ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '6px' }}>
                <span style={{
                  padding: '6px',
                  borderRadius: '10px',
                  background: `${p.color}15`,
                  color: p.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={20} />
                </span>
                {isActive && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: p.color, background: `${p.color}18`, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>
                    Active Portal
                  </span>
                )}
              </div>

              <h3 style={{ margin: '4px 0 2px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {p.roleName}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                {p.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Portal Split Container */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1050px',
        minHeight: '480px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-surface)'
      }}>
        
        {/* LEFT COLUMN: Selected Persona Portal Features */}
        <div style={{
          flex: '1',
          padding: '40px 35px',
          background: `linear-gradient(135deg, ${currentPortal.color}12 0%, rgba(0,0,0,0) 100%)`,
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: `${currentPortal.color}18`, border: `1px solid ${currentPortal.color}35`, color: currentPortal.color, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
              <PortalIcon size={16} />
              {currentPortal.badge}
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
              {currentPortal.title}
            </h2>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '25px' }}>
              {currentPortal.description}
            </p>

            {/* Portal Dedicated Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {currentPortal.features.map((feat, idx) => {
                const FeatIcon = feat.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <FeatIcon size={18} style={{ color: currentPortal.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {feat.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Access Button */}
          <div style={{ marginTop: '30px' }}>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: currentPortal.color,
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: `0 4px 20px ${currentPortal.glow}`,
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={18} />
              {loading ? 'AUTHENTICATING DEMO SESSION...' : `1-Click Demo Login as ${currentPortal.roleName}`}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentication Form */}
        <div style={{
          flex: '1.1',
          padding: '40px 35px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              {viewMode === 'login' ? `Sign In (${currentPortal.roleName})` : 'Account Recovery'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter account credentials or use the 1-click demo button
            </p>
          </div>

          {/* Error Notification */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '12px 16px',
              borderRadius: '10px',
              color: 'var(--risk-critical)',
              fontSize: '0.85rem',
              marginBottom: '18px'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '12px 16px',
              borderRadius: '10px',
              color: '#10b981',
              fontSize: '0.85rem',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW MODE 1: LOGIN FORM */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`e.g. ${currentPortal.user}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { resetMessages(); setViewMode('forgot_request'); }}
                    style={{ background: 'none', border: 'none', color: currentPortal.color, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-secondary"
                disabled={loading}
                style={{ marginTop: '6px', justifyContent: 'center', width: '100%', padding: '13px', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {loading ? 'AUTHENTICATING...' : `SIGN IN WITH CREDENTIALS`}
              </button>
            </form>
          )}

          {/* VIEW MODE 2: REQUEST RESET CODE */}
          {viewMode === 'forgot_request' && (
            <form onSubmit={handleResetRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Reset Your Password</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Enter your registered email address below for a 6-digit verification code.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Registered Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@organization.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', justifyContent: 'center' }}>
                {loading ? 'SENDING CODE...' : 'SEND RESET CODE'}
              </button>

              <button type="button" onClick={() => { resetMessages(); setViewMode('login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </form>
          )}

          {/* VIEW MODE 3: CONFIRM CODE & NEW PASSWORD */}
          {viewMode === 'forgot_confirm' && (
            <form onSubmit={handleResetConfirmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Set New Password</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Enter code sent to <strong style={{ color: currentPortal.color }}>{resetEmail}</strong>.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>6-Digit Code</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" maxLength={6} className="form-input" placeholder="123456" value={resetOtp} onChange={(e) => setResetOtp(e.target.value.trim())} style={{ paddingLeft: '44px', letterSpacing: '4px', fontWeight: 700 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="password" className="form-input" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ paddingLeft: '44px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="password" className="form-input" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ paddingLeft: '44px' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', justifyContent: 'center' }}>
                {loading ? 'UPDATING...' : 'RESET PASSWORD'}
              </button>

              <button type="button" onClick={() => { resetMessages(); setViewMode('login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            Multi-Persona Telemetry &bull; Secured with JWT Authentication
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
