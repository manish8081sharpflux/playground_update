import { api, apiWithoutContentType } from './client';

export const createRepair = async (data) => {
  try {
    const response = await apiWithoutContentType.post(
      `/api/v1/purchase-repair/repair-requests`,
      data
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllRepairs = async () => {
  try {
    const response = await api.get(`/api/v1/purchase-repair/repair-requests`);
    return response.data;
  } catch (error) {
    console.error("Error fetching repairs:", error);
    throw error;
  }
};

export const deleteRepair = async (id) => {
  try {
    const response = await api.delete(
      `/api/v1/purchase-repair/repair-requests/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting repair:", error);
    throw error;
  }
};

export const updateRepairRequest = async (id, data) => {
  try {
    const response = await apiWithoutContentType.put(
      `/api/v1/purchase-repair/repair-requests/${id}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating repair request:", error);
    throw error;
  }
};
