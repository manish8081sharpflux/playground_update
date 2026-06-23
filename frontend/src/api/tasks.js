import { api, headers } from './client';

export const createTask = async (data) => {
  const response = await api.post(`/api/tasks`, data, { headers });
  return response.data;
};

export const addComment = async (id, data) => {
  const response = await api.post(`/api/tasks/comment/${id}`, data, {
    headers,
  });
  return response.data;
};

export const updateTaskAttachments = async (id, data) => {
  const response = await api.put(`/api/tasks/attachments/${id}`, data, {
    headers,
  });
  return response.data;
};

export const deleteAttachemnets = async (taskId, attachmentId) => {
  const response = await api.delete(
    `/api/tasks/attachments/${taskId}/${attachmentId}`,
    { headers }
  );
  return response.data;
};

export const getTasks = async (data) => {
  const response = await api.post(`/api/tasks/all/list`, data);
  return response.data;
};

export const getAssignableTaskUsers = async () => {
  const response = await api.get(`/api/tasks/assignable-users`);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/api/tasks/status/${id}`, data);
  return response.data;
};

export const getTaskBytaskId = async (id) => {
  const response = await api.get(`/api/tasks/${id}`);
  return response.data;
};

export const deleteCommentinTask = async (id, commentId) => {
  const response = await api.delete(`/api/tasks/comment/${id}/${commentId}`);
  return response.data;
};
