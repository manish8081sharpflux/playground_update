import { api, apiWithoutContentType } from './client';

// Pin Management APIs
export const createWtfPin = async (data) => {
  try {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === "file" && data[key]) {
        formData.append("file", data[key]);
      } else if (key === "tags" && Array.isArray(data[key])) {
        if (data[key].length > 0) {
          data[key].forEach((tag) => {
            formData.append("tags[]", tag);
          });
        } else {
          formData.append("tags", JSON.stringify([]));
        }
      } else if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    const response = await api.post(`/api/v1/wtf/pins`, formData);
    return response.data;
  } catch (error) {
    console.error("Error creating WTF pin:", error);
    throw error;
  }
};

export const getActiveWtfPins = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/pins`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching active WTF pins:", error);
    throw error;
  }
};

export const getWtfDrafts = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/pins/drafts`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF drafts:", error);
    throw error;
  }
};

export const createCoachSuggestion = async (suggestionData) => {
  try {
    if (!suggestionData.file) {
      const response = await api.post("/api/v1/wtf/coach-suggestions", {
        title: suggestionData.title,
        content: suggestionData.content || "",
        type: suggestionData.type,
        studentName: suggestionData.studentName,
        studentId: suggestionData.studentId,
        balagruha: suggestionData.balagruha || "",
        reason: suggestionData.reason,
      });
      return response.data;
    }
    const formData = new FormData();
    formData.append("title", suggestionData.title);
    formData.append("content", suggestionData.content || "");
    formData.append("type", suggestionData.type);
    formData.append("studentName", suggestionData.studentName);
    formData.append("studentId", suggestionData.studentId);
    formData.append("balagruha", suggestionData.balagruha || "");
    formData.append("reason", suggestionData.reason);
    formData.append("file", suggestionData.file);
    const response = await api.post("/api/v1/wtf/coach-suggestions", formData);
    return response.data;
  } catch (error) {
    console.error("Error creating coach suggestion:", error);
    throw error;
  }
};

export const getWtfPinById = async (pinId) => {
  try {
    const response = await api.get(`/api/v1/wtf/pins/${pinId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF pin by ID:", error);
    throw error;
  }
};

export const updateWtfPin = async (pinId, data) => {
  try {
    const response = await api.put(`/api/v1/wtf/pins/${pinId}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating WTF pin:", error);
    throw error;
  }
};

export const deleteWtfPin = async (pinId) => {
  try {
    const response = await api.delete(`/api/v1/wtf/pins/${pinId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting WTF pin:", error);
    throw error;
  }
};

// WTF Settings API
export const getWtfSettings = async () => {
  try {
    const response = await api.get("/api/v1/wtf/settings/current");
    return response.data;
  } catch (error) {
    console.error("Error getting WTF settings:", error);
    throw error;
  }
};

export const updateWtfSettings = async (settings) => {
  try {
    const response = await api.put("/api/v1/wtf/settings/update", settings);
    return response.data;
  } catch (error) {
    console.error("Error updating WTF settings:", error);
    throw error;
  }
};

export const uploadWtfBackgroundImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("backgroundImage", file);
    const response = await api.post("/api/v1/wtf/settings/background-image", formData);
    return response.data;
  } catch (error) {
    console.error("Error uploading WTF background image:", error);
    throw error;
  }
};

export const uploadWtfFont = async (file) => {
  try {
    const formData = new FormData();
    formData.append("font", file);
    const response = await api.post("/api/v1/wtf/settings/font", formData);
    return response.data;
  } catch (error) {
    console.error("Error uploading WTF font:", error);
    throw error;
  }
};

export const getWtfSettingsHistory = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/api/v1/wtf/settings/history?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error getting WTF settings history:", error);
    throw error;
  }
};

export const getWtfCoinReward = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/settings/coin-reward`);
    return response.data;
  } catch (error) {
    console.error("Error getting WTF coin reward:", error);
    throw error;
  }
};

export const updateWtfCoinReward = async (wtfCoinReward) => {
  try {
    const response = await api.put(`/api/v1/wtf/settings/coin-reward`, { wtfCoinReward });
    return response.data;
  } catch (error) {
    console.error("Error updating WTF coin reward:", error);
    throw error;
  }
};

export const deleteWtfBackgroundImage = async (imageUrl) => {
  try {
    const response = await api.delete("/api/v1/wtf/settings/background-image", {
      data: { imageUrl },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting WTF background image:", error);
    throw error;
  }
};

export const changeWtfPinStatus = async (pinId, status) => {
  try {
    const response = await api.patch(`/api/v1/wtf/pins/${pinId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("Error changing WTF pin status:", error);
    throw error;
  }
};

export const reorderWtfPins = async (orderedPinIds) => {
  try {
    const response = await api.post(`/api/v1/wtf/pins/reorder`, { orderedPinIds });
    return response.data;
  } catch (error) {
    console.error("Error reordering WTF pins:", error);
    throw error;
  }
};

// Interaction APIs
export const likeWtfPin = async (pinId, likeType = "thumbs_up") => {
  try {
    const response = await api.post(`/api/v1/wtf/pins/${pinId}/like`, { likeType });
    return response.data;
  } catch (error) {
    console.error("Error liking WTF pin:", error);
    throw error;
  }
};

export const loveWtfPin = async (pinId) => {
  try {
    const response = await api.post(`/api/v1/wtf/pins/${pinId}/love`);
    return response.data;
  } catch (error) {
    console.error("Error loving WTF pin:", error);
    throw error;
  }
};

export const markWtfPinAsSeen = async (pinId, viewDuration = 1) => {
  try {
    const response = await api.post(`/api/v1/wtf/pins/${pinId}/seen`, { viewDuration });
    return response.data;
  } catch (error) {
    console.error("Error marking WTF pin as seen:", error);
    throw error;
  }
};

export const getWtfPinInteractions = async (pinId) => {
  try {
    const response = await api.get(`/api/v1/wtf/pins/${pinId}/interactions`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF pin interactions:", error);
    throw error;
  }
};

// Submission APIs
export const submitVoiceNote = async (data) => {
  try {
    let formData;
    if (data instanceof FormData) {
      formData = data;
    } else {
      formData = new FormData();
      if (data?.file) formData.append("file", data.file);
      if (data?.title) formData.append("title", data.title);
      if (data?.type) formData.append("type", data.type);
      if (data?.audioDuration != null) formData.append("audioDuration", String(data.audioDuration));
      if (data?.audioTranscription) formData.append("audioTranscription", data.audioTranscription);
      if (Array.isArray(data?.tags)) {
        if (data.tags.length > 0) {
          data.tags.forEach((tag) => formData.append("tags[]", tag));
        } else {
          formData.append("tags", JSON.stringify([]));
        }
      }
    }
    const response = await apiWithoutContentType.post(`/api/v1/wtf/submissions/voice`, formData);
    return response.data;
  } catch (error) {
    console.error("Error submitting voice note:", error);
    throw error;
  }
};

export const submitWtfMedia = async (formData) => {
  try {
    const response = await apiWithoutContentType.post(`/api/v1/wtf/submissions/media`, formData);
    return response.data;
  } catch (error) {
    console.error("Error submitting WTF media:", error);
    throw error;
  }
};

export const submitArticle = async (data) => {
  try {
    const response = await api.post(`/api/v1/wtf/submissions/article`, data);
    return response.data;
  } catch (error) {
    console.error("Error submitting article:", error);
    throw error;
  }
};

export const getSubmissionsForReview = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/submissions/review`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching submissions for review:", error);
    throw error;
  }
};

export const reviewSubmission = async (submissionId, data) => {
  try {
    const response = await api.put(`/api/v1/wtf/submissions/${submissionId}/review`, data);
    return response.data;
  } catch (error) {
    console.error("Error reviewing submission:", error);
    throw error;
  }
};

export const getArchivedSubmissions = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/submissions/archived`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching archived submissions:", error);
    throw error;
  }
};

export const unarchiveSubmission = async (submissionId) => {
  try {
    const response = await api.patch(`/api/v1/wtf/submissions/${submissionId}/unarchive`);
    return response.data;
  } catch (error) {
    console.error("Error unarchiving submission:", error);
    throw error;
  }
};

// Analytics APIs
export const getWtfAnalytics = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/analytics`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF analytics:", error);
    throw error;
  }
};

export const getWtfInteractionAnalytics = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/analytics/interactions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF interaction analytics:", error);
    throw error;
  }
};

export const getWtfSubmissionAnalytics = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/analytics/submissions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF submission analytics:", error);
    throw error;
  }
};

export const getStudentSubmissions = async (studentId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/students/${studentId}/submissions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching student submissions:", error);
    throw error;
  }
};

export const getStudentInteractionHistory = async (studentId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/interactions/history`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching student interaction history:", error);
    throw error;
  }
};

export const getPinsByAuthor = async (authorId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/admin/pins/author/${authorId}`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching pins by author:", error);
    throw error;
  }
};

export const getSubmissionStats = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/admin/submissions/stats`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching submission stats:", error);
    throw error;
  }
};

export const getWebSocketStatus = async () => {
  try {
    const response = await api.get(`/api/v1/websocket/status`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WebSocket status:", error);
    throw error;
  }
};

export const getWtfTransactionHistory = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/coins/wtf/transactions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF transaction history:", error);
    throw error;
  }
};

export const getAllCoinTransactions = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/coin/all-transactions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching student coin transactions:", error);
    throw error;
  }
};

export const getWtfAdminCounts = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/admin/counts`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF admin counts:", error);
    throw error;
  }
};

export const getWtfSubmissionStats = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/admin/submissions/stats`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF submission stats:", error);
    throw error;
  }
};

// Coins
export const getUserCoinBalance = async () => {
  try {
    const response = await api.get(`/api/v1/coin/balance`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user coin balance:", error);
    throw error;
  }
};

export const getUserTransactionHistory = async (params) => {
  try {
    const response = await api.get(`/api/v1/coin/transactions?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user transaction history:", error);
    throw error;
  }
};

export const getPendingSubmissionsCount = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/submissions/review`, {
      params: { page: 1, limit: 1, isCoachSuggestion: false },
    });
    return response.data?.data?.pagination?.total || 0;
  } catch (error) {
    console.error("Error fetching pending submissions count:", error);
    throw error;
  }
};

export const getWtfDashboardMetrics = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/dashboard/metrics`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF dashboard metrics:", error);
    throw error;
  }
};

export const getWtfDashboardCounts = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/dashboard/counts`);
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard counts:", error);
    throw error;
  }
};

export const getActivePinsCount = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/pins/active/count`);
    return response.data?.data || 0;
  } catch (error) {
    console.error("Error fetching active pins count:", error);
    throw error;
  }
};

export const getWtfTotalEngagement = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/analytics/engagement`);
    return response.data;
  } catch (error) {
    console.error("Error fetching WTF total engagement:", error);
    throw error;
  }
};

export const getCoachSuggestionsCount = async () => {
  try {
    const response = await api.get(`/api/v1/wtf/coach-suggestions/count`);
    return response.data?.data?.pendingCount || 0;
  } catch (error) {
    console.error("Error fetching coach suggestions count:", error);
    throw error;
  }
};

export const getCoachSuggestions = async (params = {}) => {
  try {
    const response = await api.get(`/api/v1/wtf/coach-suggestions`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching coach suggestions:", error);
    throw error;
  }
};
