import { api, apiWithoutContentType } from './client';

export const fetchRolesandPermissions = async () => {
  const response = await api.get("/api/roles");
  return response.data;
};

export const faceIdlogin = async (data) => {
  const response = await apiWithoutContentType.post(
    `/api/auth/student/facial/login`,
    data
  );
  return response.data;
};

export const updateRolePermissions = async (id, data) => {
  const response = await api.put(`/api/roles/${id}`, data);
  return response.data;
};

export const pinLogin = async (data) => {
  try {
    const response = await api.post("/api/auth/login", data);
    return response.data;
  } catch (error) {
    console.error("Error in pin login:", error);
    throw error;
  }
};

// Student userId-only login
export const studentPinLogin = async (data) => {
  try {
    const response = await api.post("/api/auth/student/login", data);
    return response.data;
  } catch (error) {
    console.error("Error in student pin login:", error);
    throw error;
  }
};

// Debug: Check current user permissions
export const debugUserPermissions = async () => {
  try {
    const response = await api.get(`/api/notifications/debug/user-permissions`);
    return response.data;
  } catch (error) {
    console.error("Error checking user permissions:", error);
    throw error;
  }
};
