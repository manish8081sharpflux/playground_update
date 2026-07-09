import { api, apiWithoutContentType } from './client';

export const fetchUsers = async ({ limit = 1000, page = 1 } = {}) => {
  const response = await api.get(`/api/users?limit=${limit}&page=${page}`);
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/api/users/${id}`);
  return response.data;
};

export const coachBasedUsers = async () => {
  const response = await api.get("/api/v1/users/assigned/users");
  return response.data;
};

export const addUsers = async (data, type) => {
  const response = await apiWithoutContentType.post("/api/v1/users", data);
  return response.data;
};

export const updateUsers = async (id, data) => {
  const response = await apiWithoutContentType.put(`/api/v1/users/${id}`, data);
  return response.data;
};

export const deleteUsers = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
};

// S6-S1-PROD-BUG-001: Fetch assignable users for schedule creation
export const getAssignableUsersForSchedule = async () => {
  const response = await api.get("/api/users/assignable-for-schedule");
  return response.data;
};

export const getBalagruhaListbyUserID = async (id) => {
  try {
    const response = await api.get(`/api/v1/balagruha/user/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error balagruha list by user id", error);
    throw error;
  }
};

export const getBalagruhaListByAssignedID = async (id) => {
  try {
    const response = await api.get(`/api/v1/balagruha/user/assigned/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error balagruha list by assigned id", error);
    throw error;
  }
};

export const getAnyUserBasedonRoleandBalagruha = async (role, balagruhaId) => {
  try {
    const response = await api.get(
      `/api/v1/users/role/${role}?balagruhaId=${balagruhaId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching users by role and balagruha:", error);
    throw error;
  }
};

// Get all coaches for filters
export const getAllCoaches = async () => {
  try {
    const response = await api.get(`/api/v1/users/role/coach`);
    return response.data;
  } catch (error) {
    console.error("Error fetching coaches:", error);
    throw error;
  }
};
