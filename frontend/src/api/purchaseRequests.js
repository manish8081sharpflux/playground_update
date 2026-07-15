import { api, apiWithoutContentType, headers } from './client';

export const getLowStockProducts = async (balagruhaId) => {
  try {
    const response = await api.get('/api/v2/shop/products', {
      params: { stockStatus: 'low', balagruhaIds: balagruhaId }
    });
    const products = response.data.products || response.data || [];
    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching low-stock products:", error);
    throw error;
  }
};

export const createPurchaseRequest = async (data) => {
  try {
    const client = data instanceof FormData ? apiWithoutContentType : api;
    const config = data instanceof FormData ? {} : { headers };
    const response = await client.post('/api/v2/shop/admin/purchase-requests', data, config);
    return response.data;
  } catch (error) {
    console.error("Error creating purchase request:", error);
    throw error;
  }
};

export const updatePurchaseRequest = async (id, data) => {
  try {
    const client = data instanceof FormData ? apiWithoutContentType : api;
    const config = data instanceof FormData ? {} : { headers };
    const response = await client.put(`/api/v2/shop/admin/purchase-requests/${id}`, data, config);
    return response.data;
  } catch (error) {
    console.error("Error updating purchase request:", error);
    throw error;
  }
};

export const deletePurchaseRequest = async (id) => {
  try {
    const response = await api.delete(`/api/v2/shop/admin/purchase-requests/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting purchase request:", error);
    throw error;
  }
};

export const getMyPurchaseRequests = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.balagruhaId) queryParams.append('balagruhaId', params.balagruhaId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    const response = await api.get(`/api/v2/shop/admin/purchase-requests/my?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase requests:", error);
    throw error;
  }
};

export const getAllPurchaseRequests = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.balagruhaId) queryParams.append('balagruhaId', params.balagruhaId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    const response = await api.get(`/api/v2/shop/admin/purchase-requests?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all purchase requests:", error);
    throw error;
  }
};

export const getPendingPurchaseRequestCount = async () => {
  try {
    const response = await api.get('/api/v2/shop/admin/purchase-requests/pending-count');
    return response.data;
  } catch (error) {
    console.error("Error fetching pending purchase request count:", error);
    throw error;
  }
};

export const getPurchaseRequestById = async (requestId) => {
  try {
    const response = await api.get(`/api/v2/shop/admin/purchase-requests/${requestId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase request:", error);
    throw error;
  }
};

export const downloadPurchaseRequestAttachment = async (requestId, attachmentId) => {
  try {
    const response = await api.get(
      `/api/v2/shop/admin/purchase-requests/${requestId}/attachments/${attachmentId}`,
      { responseType: 'blob' }
    );
    return response;
  } catch (error) {
    console.error("Error downloading purchase request attachment:", error);
    throw error;
  }
};

export const cancelPurchaseRequest = async (requestId) => {
  try {
    const response = await api.put(`/api/v2/shop/admin/purchase-requests/${requestId}/cancel`);
    return response.data;
  } catch (error) {
    console.error("Error cancelling purchase request:", error);
    throw error;
  }
};

export const approvePurchaseRequest = async (requestId, data) => {
  try {
    const response = await api.post(`/api/v2/shop/admin/purchase-requests/${requestId}/approve`, data);
    return response.data;
  } catch (error) {
    console.error("Error approving purchase request:", error);
    throw error;
  }
};

export const rejectPurchaseRequest = async (requestId, data) => {
  try {
    const response = await api.post(`/api/v2/shop/admin/purchase-requests/${requestId}/reject`, data);
    return response.data;
  } catch (error) {
    console.error("Error rejecting purchase request:", error);
    throw error;
  }
};

export const completePurchaseRequest = async (requestId, data) => {
  try {
    const response = await api.post(`/api/v2/shop/admin/purchase-requests/${requestId}/complete`, data);
    return response.data;
  } catch (error) {
    console.error("Error completing purchase request:", error);
    throw error;
  }
};

export const updatePurchaseRequestStatus = async (requestId, data) => {
  try {
    const response = await api.patch(`/api/v2/shop/admin/purchase-requests/${requestId}/status`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating purchase request status:", error);
    throw error;
  }
};

export const getPurchaseRequestStats = async () => {
  try {
    const response = await api.get('/api/v2/shop/admin/purchase-requests/stats');
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase request stats:", error);
    throw error;
  }
};

// FIX-037: Get unique requesters from backend for filter dropdown
export const getPurchaseRequestRequesters = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.balagruhaId) queryParams.append('balagruhaId', params.balagruhaId);
    const response = await api.get(`/api/v2/shop/admin/purchase-requests/requesters?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching requesters:", error);
    throw error;
  }
};

// FIX-038: Batch order multiple purchase requests
export const batchOrderPurchaseRequests = async (requestIds, notes) => {
  try {
    const response = await api.post('/api/v2/shop/admin/purchase-requests/batch-order', {
      requestIds,
      notes
    });
    return response.data;
  } catch (error) {
    console.error("Error in batch order:", error);
    throw error;
  }
};
