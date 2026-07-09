import { api, apiWithoutContentType } from './client';

export const createMusicTask = async (data) => {
  try {
    const response = await apiWithoutContentType.post(`/api/v1/music/task`, data);
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
    const response = await apiWithoutContentType.post(
      `/api/v1/music/task/attachments/${taskId}`,
      data
    );
    const res = response.data;
    if (res && res.success && res.data && res.data.task) return res.data.task;
    if (res && res.task) return res.task;
    return res;
  } catch (error) {
    console.error("Error adding/updating attachments:", error);
    throw error;
  }
};

export const addOrUpdateMusicTaskComments = async (taskId, data) => {
  try {
    const response = await apiWithoutContentType.post(
      `/api/v1/music/task/attachments/${taskId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error adding/updating comments:", error);
    throw error;
  }
};
