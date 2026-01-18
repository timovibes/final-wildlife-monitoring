import api from '../services/api';
import offlineService from '../services/offline';

/**
 * Sync Manager
 * 
 * Handles synchronization of offline data when connection is restored
 * Part of PWA offline-first capability
 */

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncCallbacks = [];
  }

  // Register callback for sync events
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  // Notify all registered callbacks
  notifySync(data) {
    this.syncCallbacks.forEach((callback) => callback(data));
  }

  // Sync all pending data
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot sync: offline');
      return;
    }

    this.isSyncing = true;
    const results = {
      sightings: { success: 0, failed: 0 },
      incidents: { success: 0, failed: 0 },
    };

    try {
      // Sync pending sightings
      const pendingSightings = await offlineService.getPendingSightings();
      for (const sighting of pendingSightings) {
        try {
          await api.post('/sightings', sighting);
          await offlineService.removePendingSighting(sighting.id);
          results.sightings.success++;
        } catch (error) {
          console.error('Failed to sync sighting:', error);
          results.sightings.failed++;
        }
      }

      // Sync pending incidents
      const pendingIncidents = await offlineService.getPendingIncidents();
      for (const incident of pendingIncidents) {
        try {
          await api.post('/incidents', incident);
          await offlineService.removePendingIncident(incident.id);
          results.incidents.success++;
        } catch (error) {
          console.error('Failed to sync incident:', error);
          results.incidents.failed++;
        }
      }

      this.notifySync(results);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    return results;
  }

  // Check if there's pending data
  async hasPendingData() {
    const [sightings, incidents] = await Promise.all([
      offlineService.getPendingSightings(),
      offlineService.getPendingIncidents(),
    ]);
    return sightings.length > 0 || incidents.length > 0;
  }
}

export default new SyncManager();