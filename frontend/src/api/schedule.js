import { api } from './client';

export const createSchedule = async (data) => {
  try {
    const response = await api.post("/api/schedules", data);
    return response.data;
  } catch (error) {
    console.error("Error creating schedule:", error);
    throw error;
  }
};

export const getSchedules = async (filters) => {
  try {
    const response = await api.post("/api/schedules/admin", filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules:", error);
    throw error;
  }
};

export const updateSchedule = async (data, scheduleId) => {
  try {
    const response = await api.put(`/api/schedules/${scheduleId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating schedule:", error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await api.delete(`/api/schedules/${scheduleId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting schedule:", error);
    throw error;
  }
};

export const getSchedulesByUser = async (userId) => {
  try {
    const response = await api.get(`/api/schedules/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules by user:", error);
    throw error;
  }
};

export const getSchedulesForAdmin = async (filters) => {
  try {
    const response = await api.post("/api/schedules/admin", filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules for admin:", error);
    throw error;
  }
};

export const getSchedulesForCoach = async (filters) => {
  try {
    const response = await api.post("/api/schedules/coach", filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules for coach:", error);
    throw error;
  }
};

export const getSchedulesCoach = async (filters) => {
  try {
    const response = await api.post("/api/schedules/coach", filters);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules for coach:", error);
    throw error;
  }
};

export const updateScheduleStatus = async (scheduleId, status) => {
  try {
    const response = await api.put(`/api/schedules/${scheduleId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating schedule status:", error);
    throw error;
  }
};
