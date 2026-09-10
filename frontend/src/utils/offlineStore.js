// Utility for offline queuing and connectivity tracking
const OFFLINE_SOS_KEY = 'crowdguard_offline_sos_queue';

export const isOnline = () => {
  return navigator.onLine;
};

export const saveOfflineSOS = (sosData) => {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_SOS_KEY) || '[]');
    const newItem = {
      ...sosData,
      id: 'local_' + Date.now(),
      created_at: new Date().toISOString(),
      is_queued_offline: true
    };
    existing.push(newItem);
    localStorage.setItem(OFFLINE_SOS_KEY, JSON.stringify(existing));
    return newItem;
  } catch (err) {
    console.error('Error saving offline SOS:', err);
    return null;
  }
};

export const getOfflineSOSQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_SOS_KEY) || '[]');
  } catch (err) {
    return [];
  }
};

export const syncOfflineSOSQueue = async (token) => {
  const queue = getOfflineSOSQueue();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const url = `http://${window.location.hostname}:8000/api/alerts/sos/trigger/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          location_name: item.location_name,
          category: item.category,
          urgency: item.urgency,
          sender_name: item.sender_name,
          contact_number: item.contact_number,
          latitude: item.latitude,
          longitude: item.longitude,
          notes: `[OFFLINE SYNCED] ${item.notes || ''}`
        })
      });

      if (response.ok) {
        syncedCount++;
      } else {
        remaining.push(item);
        failedCount++;
      }
    } catch (err) {
      remaining.push(item);
      failedCount++;
    }
  }

  localStorage.setItem(OFFLINE_SOS_KEY, JSON.stringify(remaining));
  return { syncedCount, failedCount };
};
