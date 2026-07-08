import { api, apiWithoutContentType } from './client';

export const getSportsOverview = async (balagruhaId, date) => {
  try {
    const response = await api.get(`/api/v1/sports/overview/${balagruhaId}`, {
      params: { date },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching sports overview:", error);
    throw error;
  }
};

export const createSportsTask = async (data) => {
  try {
    const response = await apiWithoutContentType.post(`/api/v1/sports/task`, data);
    return response.data;
  } catch (error) {
    console.error("Error creating sports task:", error);
    throw error;
  }
};

export const updateSportsTask = async (taskId, data) => {
  try {
    const response = await api.put(`/api/v1/sports/task/${taskId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating sports task:", error);
    throw error;
  }
};

export const addOrUpdateSportsTaskAttachments = async (taskId, data) => {
  try {
    const response = await apiWithoutContentType.post(
      `/api/v1/sports/task/attachments/${taskId}`,
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

export const addOrUpdateSportsTaskComments = async (taskId, data) => {
  try {
    const response = await apiWithoutContentType.post(
      `/api/v1/sports/tasks/comment/${taskId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error adding/updating comments:", error);
    throw error;
  }
};

export const getSportsTaskListByBalagruha = async (filters) => {
  try {
    const response = await api.post(`/api/v1/sports/tasks/list`, filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching sports task list by Balagruha:", error);
    throw error;
  }
};

export const getSportsTaskListByStudents = async (filters) => {
  try {
    const response = await api.post(`/api/v1/sports/students/all`, filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching sports task list by students:", error);
    throw error;
  }
};
