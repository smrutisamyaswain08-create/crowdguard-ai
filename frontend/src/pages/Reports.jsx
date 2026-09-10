import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { FileText, Download, Calendar, RefreshCw, FileSpreadsheet, CheckCircle, Mail } from 'lucide-react';

const Reports = () => {
  const { apiFetch, user } = useAuth();
  const [reportsHistory, setReportsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  
  // Sharing states
  const [sharingReport, setSharingReport] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [successSharedEmail, setSuccessSharedEmail] = useState(null);
  
  // Selection states
  const [reportType, setReportType] = useState('daily');
  const [fileFormat, setFileFormat] = useState('pdf');

  const fetchReportsHistory = async () => {
    try {
      const res = await apiFetch('/reports/');
      if (res.ok) {
        const data = await res.json();
        setReportsHistory(data);
      }
    } catch (e) {
      console.error("Failed to load reports history", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsHistory();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    const actionKey = `${reportType}_${fileFormat}`;
    setGenerating(actionKey);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/reports/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ report_type: reportType, format: fileFormat })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crowd_report_${reportType}_${new Date().toISOString().slice(0, 10)}.${fileFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        // Refresh local history list
        fetchReportsHistory();
      } else {
        alert('Could not compile report. Ensure backend server is responsive.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error compiling document.');
    } finally {
      setGenerating(null);
    }
  };

  const handleShareReport = async (e) => {
    e.preventDefault();
    if (!shareEmail || !sharingReport) return;
    
    setSharingLoading(true);
    try {
      const res = await apiFetch(`/reports/${sharingReport.id}/share/`, {
        method: 'POST',
        body: JSON.stringify({ email: shareEmail })
      });
      
      if (res.ok) {
        setSuccessSharedEmail(shareEmail);
        setShareEmail('');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to share report.');
      }
    } catch (err) {
      console.error(err);
      alert('Error sharing report.');
    } finally {
      setSharingLoading(false);
    }
  };

  // Helper to trigger redownloading historic files stored in media
  const handleDownloadHistoric = (filePath, reportId, type, format) => {
    // If files are saved under absolute paths, we load them
    const fileUrl = filePath.startsWith('http') ? filePath : `http://${window.location.hostname}:8000${filePath}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = `crowd_report_archived_${type}_${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div>
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0 }}>Analytical Reports</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Compile and export crowd counts, safety compliance indices, and alert audits.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '30px' }}>
        
        {/* Report configuration and compiler form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--accent-purple)' }} /> Compile Document
          </h2>

          <form onSubmit={handleGenerateReport} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Reporting Cycle Period
              </label>
              <select 
                className="form-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="daily">Daily Summary (Past 24 Hours)</option>
                <option value="weekly">Weekly Analysis (Past 7 Days)</option>
                <option value="monthly">Monthly Audit (Past 30 Days)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Document Format
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div 
                  onClick={() => setFileFormat('pdf')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: fileFormat === 'pdf' ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                    background: fileFormat === 'pdf' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.01)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FileText size={24} style={{ color: fileFormat === 'pdf' ? 'var(--accent-purple)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>PDF Report</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Executive Layout</span>
                </div>

                <div 
                  onClick={() => setFileFormat('csv')}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: fileFormat === 'csv' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    background: fileFormat === 'csv' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.01)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FileSpreadsheet size={24} style={{ color: fileFormat === 'csv' ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>CSV Sheets</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Structured Ledger</span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={generating !== null}
              style={{ justifyContent: 'center', padding: '12px' }}
            >
              {generating ? 'COMPILING DOCUMENT...' : 'COMPILE & DOWNLOAD'}
            </button>
          </form>
        </div>

        {/* Historical report registry log */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} /> Archive Logs
            </h2>
            <button className="btn-secondary" onClick={fetchReportsHistory} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <RefreshCw size={12} /> Sync Archives
            </button>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loading ? (
              <div>Loading archived registries...</div>
            ) : (
              <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Report Type</th>
                    <th>Generated Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsHistory.length > 0 ? (
                    reportsHistory.map(rep => {
                      const fileExt = rep.file ? rep.file.split('.').pop() : 'pdf';
                      return (
                        <tr key={rep.id}>
                          <td style={{ fontWeight: 600 }}>
                            {rep.report_type === 'daily' ? 'Daily Summary' : 
                             rep.report_type === 'weekly' ? 'Weekly Analysis' : 
                             'Monthly Audit'}
                          </td>
                          <td style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{new Date(rep.generated_on).toLocaleString()}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                              {rep.file ? (
                                <button 
                                  onClick={() => handleDownloadHistoric(rep.file, rep.id, rep.report_type, fileExt)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: fileExt === 'pdf' ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600
                                  }}
                                >
                                  <Download size={14} /> Download {fileExt.toUpperCase()}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Direct Stream</span>
                              )}

                              {rep.file && user?.role === 'admin' && (
                                <button 
                                  onClick={() => setSharingReport(rep)}
                                  style={{
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    border: '1px solid rgba(6, 182, 212, 0.2)',
                                    color: 'var(--accent-cyan)',
                                    cursor: 'pointer',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  <Mail size={12} /> Share
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        No compiled documents registered in archived files ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Share Report Modal */}
      {sharingReport && !successSharedEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '450px',
            padding: '24px',
            position: 'relative',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Share Report via Email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Send the archived {sharingReport.report_type === 'daily' ? 'Daily Summary' : sharingReport.report_type === 'weekly' ? 'Weekly Analysis' : 'Monthly Audit'} report directly as an attachment.
            </p>
            
            <form onSubmit={handleShareReport} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Recipient Email Address
                </label>
                <input 
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={() => { setSharingReport(null); setShareEmail(''); }}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={sharingLoading}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  {sharingLoading ? 'SENDING...' : 'SEND EMAIL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom PhonePe-Style Success Modal */}
      {successSharedEmail && (
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
              <CheckCircle size={48} color="#ffffff" style={{ strokeWidth: 3 }} />
            </div>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Email Sent Successfully
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px' }}>
              The crowd analytics report has been dispatched.
            </p>

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
                <span style={{ color: 'var(--text-muted)' }}>Sent To</span>
                <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{successSharedEmail}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Report Type</span>
                <strong style={{ color: 'var(--accent-purple)', textTransform: 'capitalize' }}>
                  {sharingReport?.report_type} Summary
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>Dispatched</span>
              </div>
            </div>

            <button 
              onClick={() => { setSuccessSharedEmail(null); setSharingReport(null); }}
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
    </div>
  );
};

export default Reports;
