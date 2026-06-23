import { api } from './client';

export const getStudentListforAttendance = async (id, date) => {
  const response = await api.get(
    `/api/v1/users/students/attendance/${id}?date=${date}`
  );
  return response.data;
};

export const postmarkAttendance = async (data) => {
  const response = await api.post(`/api/v1/users/students/attendance`, data);
  return response.data;
};
