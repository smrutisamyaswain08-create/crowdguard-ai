import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { isOnline, getOfflineSOSQueue, syncOfflineSOSQueue } from '../utils/offlineStore';
import { useAuth } from '../context/AuthContext';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [queuedCount, setQueuedCount] = useState(getOfflineSOSQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      handleSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setQueuedCount(getOfflineSOSQueue().length);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [token]);

  const handleSync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    setSyncMessage('Syncing offline data...');
    const result = await syncOfflineSOSQueue(token);
    setQueuedCount(getOfflineSOSQueue().length);
    setSyncing(false);
    if (result.syncedCount > 0) {
      setSyncMessage(`Synced ${result.syncedCount} item(s)!`);
      setTimeout(() => setSyncMessage(''), 4000);
    } else {
      setSyncMessage('');
    }
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      background: online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.15)',
      border: `1px solid ${online ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`,
      color: online ? '#4ade80' : '#f87171',
      transition: 'all 0.3s ease'
    }}>
      {online ? (
        <>
          <Wifi size={14} />
          <span>LIVE NETWORK ONLINE</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>OFFLINE MODE (LOCAL CACHE)</span>
        </>
      )}

      {queuedCount > 0 && (
        <button
          onClick={handleSync}
          disabled={!online || syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--accent-cyan)',
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: '700',
            cursor: online ? 'pointer' : 'not-allowed',
            marginLeft: '4px'
          }}
          title="Click to sync offline queued alerts"
        >
          <RefreshCw size={12} className={syncing ? 'spin' : ''} />
          <span>{queuedCount} Queued Sync</span>
        </button>
      )}

      {syncMessage && (
        <span style={{ fontSize: '11px', color: '#60a5fa', marginLeft: '4px' }}>
          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '2px' }} />
          {syncMessage}
        </span>
      )}
    </div>
  );
}
