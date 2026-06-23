import { api, headers } from './client';

export const createMusicTask = async (data) => {
  try {
    const response = await api.post(`/api/v1/music/task`, data, { headers });
    return response.data;
  } catch (error) {
    console.error("Error creating music task:", error);
    throw error;
  }
};

export const updateMusicTask = async (taskId, data) => {
  try {
    const response = await api.put(`/api/v1/music/task/${taskId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating music task:", error);
    throw error;
  }
};

export const addOrUpdateMusicTaskAttachments = async (taskId, data) => {
  try {
    const response = await api.post(
      `/api/v1/music/task/attachments/${taskId}`,
      data,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding/updating attachments:", error);
    throw error;
  }
};

export const addOrUpdateMusicTaskComments = async (taskId, data) => {
  try {
    const response = await api.post(
      `/api/v1/music/tasks/comment/${taskId}`,
      data,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding/updating comments:", error);
    throw error;
  }
};
