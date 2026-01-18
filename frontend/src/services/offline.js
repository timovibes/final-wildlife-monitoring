/**
 * Offline Data Management Service
 * 
 * Handles IndexedDB operations for offline data persistence
 * Stores pending submissions when network is unavailable
 */

const DB_NAME = 'wildlife_monitoring_db';
const DB_VERSION = 1;
const STORES = {
  PENDING_SIGHTINGS: 'pending_sightings',
  PENDING_INCIDENTS: 'pending_incidents',
};

class OfflineService {
  constructor() {
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.PENDING_SIGHTINGS)) {
          db.createObjectStore(STORES.PENDING_SIGHTINGS, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_INCIDENTS)) {
          db.createObjectStore(STORES.PENDING_INCIDENTS, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };
    });
  }

  // Add pending sighting
  async addPendingSighting(sighting) {
    if (!this.db) await this.init();
    return this._addItem(STORES.PENDING_SIGHTINGS, {
      ...sighting,
      timestamp: new Date().toISOString(),
    });
  }

  // Add pending incident
  async addPendingIncident(incident) {
    if (!this.db) await this.init();
    return this._addItem(STORES.PENDING_INCIDENTS, {
      ...incident,
      timestamp: new Date().toISOString(),
    });
  }

  // Get all pending sightings
  async getPendingSightings() {
    if (!this.db) await this.init();
    return this._getAllItems(STORES.PENDING_SIGHTINGS);
  }

  // Get all pending incidents
  async getPendingIncidents() {
    if (!this.db) await this.init();
    return this._getAllItems(STORES.PENDING_INCIDENTS);
  }

  // Remove pending sighting
  async removePendingSighting(id) {
    if (!this.db) await this.init();
    return this._removeItem(STORES.PENDING_SIGHTINGS, id);
  }

  // Remove pending incident
  async removePendingIncident(id) {
    if (!this.db) await this.init();
    return this._removeItem(STORES.PENDING_INCIDENTS, id);
  }

  // Clear all pending data
  async clearAllPending() {
    if (!this.db) await this.init();
    await this._clearStore(STORES.PENDING_SIGHTINGS);
    await this._clearStore(STORES.PENDING_INCIDENTS);
  }

  // Private helper methods
  _addItem(storeName, item) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _getAllItems(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  _removeItem(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  _clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export default new OfflineService();