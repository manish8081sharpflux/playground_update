import { api } from './client';

export const createTraining = async (data) => {
  try {
    const response = await api.post(`api/v1/training-session`, data);
    return response.data;
  } catch (error) {
    console.error("Error adding/updating training:", error);
    throw error;
  }
};

export const getTraining = async (id, type) => {
  try {
    const response = await api.get(
      `/api/v1/sports/training-sessions?balagruhaIds=${id}&type=${type}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting training:", error);
    throw error;
  }
};

export const updateTraining = async (id, data) => {
  try {
    const response = await api.put(`/api/v1/training-session/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error adding/updating training:", error);
    throw error;
  }
};

export const deleteTrainign = async (id) => {
  try {
    const response = await api.delete(`/api/v1/sports/training-session/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting training:", error);
    throw error;
  }
};
