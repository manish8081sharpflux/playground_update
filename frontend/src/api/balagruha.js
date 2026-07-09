import { api, headers } from './client';

export const getBalagruha = async () => {
  const response = await api.get(`/api/v1/balagruha/`);
  return response.data;
};

// Sprint5-Story-21: Get Balagruhas with STOCK option
export const getBalagruhaWithStock = async () => {
  const response = await api.get(`/api/v1/balagruha/with-stock`);
  return response.data;
};

// Sprint5-Story-24: Get current user's assigned Balagruhas (with STOCK option)
export const getUserBalagruhas = async () => {
  const response = await api.get(`/api/users/me/balagruhas`);
  return response.data;
};

export const addMachines = async (data) => {
  const response = await api.post("/api/v1/machines", data);
  return response.data;
};

export const toggleMachineStatus = async (id) => {
  const response = await api.put(`/api/v1/machines/${id}/status`);
  return response.data;
};

export const assignMachineToAnotherBalagruha = async (id, data) => {
  const response = await api.put(`/api/v1/machines/${id}/assign`, data);
  return response.data;
};

export const getMachines = async () => {
  const response = await api.get(`/api/v1/machines`, { headers });
  return response.data;
};

export const addBalagruha = async (data) => {
  const response = await api.post(`/api/v1/balagruha/`, data);
  return response.data;
};

export const updateBalagruha = async (id, data) => {
  const response = await api.put(`/api/v1/balagruha/${id}`, data);
  return response.data;
};

export const getBalagruhaById = async (id) => {
  const response = await api.get(`/api/v1/balagruha/user/${id}`);
  return response.data;
};

export const deleteBalagruha = async (id) => {
  const response = await api.delete(`/api/v1/balagruha/${id}`);
  return response.data;
};

export const deleteMachineById = async (id) => {
  const response = await api.delete(`/api/v1/machines/${id}`);
  return response.data;
};

export const getUnAssigned = async () => {
  try {
    const response = await api.get(`/api/v1/machines/unassigned`);
    return response.data;
  } catch (error) {
    console.error("Error fetching unassigned machines:", error);
    throw error;
  }
};
