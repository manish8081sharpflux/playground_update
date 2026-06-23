import { api } from './client';

/**
 * Create (register) a new machine via POST /api/v1/machines
 * @param {Object} data - { machineId, macAddress, serialNumber, assignedBalagruha }
 * @returns {Promise<Object>} API response data
 */
export const createMachine = async (data) => {
  const response = await api.post('/api/v1/machines', data);
  return response.data;
};

/**
 * Reassign a machine to a different Balagruha via PUT /api/v1/machines/:id/assign
 * @param {string} id - Machine document _id
 * @param {string} newBalagruha - Target Balagruha _id
 * @returns {Promise<Object>} API response data
 */
export const updateMachine = async (id, newBalagruha) => {
  const response = await api.put(`/api/v1/machines/${id}/assign`, { newBalagruha });
  return response.data;
};

/**
 * Deactivate a machine by toggling its status via PUT /api/v1/machines/:id/status
 * @param {string} id - Machine document _id
 * @returns {Promise<Object>} API response data
 */
export const deactivateMachine = async (id) => {
  const response = await api.put(`/api/v1/machines/${id}/status`);
  return response.data;
};

/**
 * Get usage logs for a specific machine via GET /api/v1/machines/:id/logs
 * @param {string} id - Machine document _id
 * @param {Object} [params] - Optional query params { page, limit }
 * @returns {Promise<Object>} API response data with { logs, total, page, totalPages }
 */
export const getMachineLogs = async (id, params = {}) => {
  const response = await api.get(`/api/v1/machines/${id}/logs`, { params });
  return response.data;
};
