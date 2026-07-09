import { api } from './client';

export const getUserNotifications = async (limit = 50, skip = 0) => {
  try {
    const response = await api.get(`/api/notifications`, { params: { limit, skip } });
    return response.data;
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    throw error;
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await api.get(`/api/notifications/unread-count`);
    return response.data;
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put(`/api/notifications/mark-all-read`);
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

export const updateNotificationLastViewed = async () => {
  try {
    const response = await api.put(`/api/notifications/update-last-viewed`);
    return response.data;
  } catch (error) {
    console.error("Error updating notification last viewed time:", error);
    throw error;
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

export const createSystemAnnouncement = async (title, message, priority = "MEDIUM", metadata = {}) => {
  try {
    const response = await api.post(`/api/notifications/admin/system-announcement`, { title, message, priority, metadata });
    return response.data;
  } catch (error) {
    console.error("Error creating system announcement:", error);
    throw error;
  }
};

export const createShopUpdateNotification = async (title, message, metadata = {}) => {
  try {
    const response = await api.post(`/api/notifications/admin/shop-update`, { title, message, metadata });
    return response.data;
  } catch (error) {
    console.error("Error creating shop update notification:", error);
    throw error;
  }
};

export const sendAdminPersonalNotification = async (studentId, title, message, metadata = {}) => {
  try {
    const response = await api.post(`/api/notifications/admin/send-personal`, { studentId, title, message, metadata });
    return response.data;
  } catch (error) {
    console.error("Error sending admin personal notification:", error);
    throw error;
  }
};

export const getNotificationStats = async () => {
  try {
    const response = await api.get(`/api/notifications/admin/stats`);
    return response.data;
  } catch (error) {
    console.error("Error fetching notification statistics:", error);
    throw error;
  }
};

export const sendCoachMessage = async (studentId, message, metadata = {}) => {
  try {
    const response = await api.post(`/api/notifications/coach/message`, { studentId, message, metadata });
    return response.data;
  } catch (error) {
    console.error("Error sending coach message:", error);
    throw error;
  }
};
