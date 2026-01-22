import api from './api';

const sightingService = {
  // Get all sightings with optional filters
  getAllSightings: async (params = {}) => {
    const response = await api.get('/sightings', { params });
    return response.data;
  },

  // The specific call for your Admin to verify a sighting
  verifySighting: async (id) => {
    const response = await api.put(`/sightings/${id}/verify`);
    return response.data;
  }
};

export default sightingService;