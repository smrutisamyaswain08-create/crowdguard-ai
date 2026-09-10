import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, RefreshCw, Search, LogIn, LogOut, ShieldAlert, ShieldCheck, Sliders } from 'lucide-react';

const AuditLogs = () => {
  const { apiFetch, user } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/auth/audit-logs/');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Filter logs based on search and action filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ip_address && log.ip_address.includes(searchQuery)) ||
      (log.user_agent && log.user_agent.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = 
      actionFilter === 'all' || 
      log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  const getBrowserName = (userAgent) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Apple Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    return userAgent.split(' ')[0] || 'Unknown Browser';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.4s ease-out' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .action-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-login {
          background: rgba(16, 185, 129, 0.12);
          color: var(--risk-low);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge-logout {
          background: rgba(239, 68, 68, 0.12);
          color: var(--risk-critical);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .badge-config {
          background: rgba(234, 179, 8, 0.12);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-letter {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: white;
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-cyan) 100%);
        }
      `}</style>

      {/* Header */}
      <div className="page-header-box">
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Security Audit Logs</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            {user?.role === 'admin' 
              ? 'Comprehensive security tracking of user authentication sessions.' 
              : 'Track your personal login and logout session history.'}
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchAuditLogs} disabled={loading} style={{ padding: '8px 14px' }}>
          <RefreshCw size={16} className={loading ? "spin-animation" : ""} /> Sync Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search user, IP, or browser..." 
              className="form-input" 
              style={{ paddingLeft: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Action:</span>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '8px 36px 8px 12px', fontSize: '0.85rem' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="login">Logins Only</option>
            <option value="logout">Logouts Only</option>
            <option value="threshold_update">Boundaries Config</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Retrieving authentication trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={32} style={{ color: 'var(--text-muted)' }} />
            <span>No audit logs matching filters found.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>IP Address</th>
                  <th>Browser Client</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-letter">{log.username.charAt(0).toUpperCase()}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.username}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${log.role === 'admin' ? 'badge-online' : 'badge-offline'}`} style={{ fontSize: '0.7rem' }}>
                        {log.role === 'admin' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {log.role === 'admin' ? 'Sys Admin' : 'Security Officer'}
                      </span>
                    </td>
                    <td>
                      {log.action === 'login' ? (
                        <span className="action-badge badge-login">
                          <LogIn size={12} /> Login
                        </span>
                      ) : log.action === 'threshold_update' ? (
                        <span className="action-badge badge-config">
                          <Sliders size={12} /> Thresholds
                        </span>
                      ) : (
                        <span className="action-badge badge-logout">
                          <LogOut size={12} /> Logout
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>
                      {getBrowserName(log.user_agent)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
