import { api, headers } from './client';

// ==================== PM DASHBOARD TABS (Story 3.6) ====================

export const getStockLevels = async (params) => {
  try {
    const response = await api.get('/api/v2/shop/admin/inventory/stock-levels', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    throw error;
  }
};

export const getVendorsWithProductCount = async (params) => {
  try {
    const response = await api.get('/api/v2/shop/vendors', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    throw error;
  }
};

export const getMostConsumed = async (params) => {
  try {
    const response = await api.get('/api/v2/shop/admin/analytics/most-consumed', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching most consumed analytics:', error);
    throw error;
  }
};

// ==================== SHOP ORDERS ====================

export const cancelOrder = async (orderNumber, reason) => {
  try {
    const response = await api.post(`/api/v2/shop/orders/${orderNumber}/cancel`, { reason });
    return response.data;
  } catch (error) {
    console.error("Error cancelling order:", error);
    throw error;
  }
};

export const getAllOrdersAdmin = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const response = await api.get(`/api/v2/shop/orders/all?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all orders:", error);
    throw error;
  }
};

// ==================== SHOP ANALYTICS (Sprint5-Story-11) ====================

export const getShopAnalytics = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/api/v2/shop/admin/analytics?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching shop analytics:", error);
    throw error;
  }
};

export const getStudentParticipationDetails = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/api/v2/shop/admin/analytics/participation?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching student participation details:", error);
    throw error;
  }
};

// ==================== SHOP REPORTS (Sprint5-Story-12) ====================

export const getTransactionLog = async (params) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const response = await api.get(`/api/v2/shop/admin/reports/transactions?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transaction log:", error);
    throw error;
  }
};

export const getStudentLeaderboard = async (type = 'earners', limit = 10, params = {}) => {
  try {
    const response = await api.get(`/api/v2/shop/admin/reports/leaderboard`, {
      params: { type, limit, ...params }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching student leaderboard:", error);
    throw error;
  }
};

export const getZeroPurchaseStudents = async (params = {}) => {
  try {
    const response = await api.get(`/api/v2/shop/admin/reports/zero-purchases`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching zero-purchase students:", error);
    throw error;
  }
};

export const getCoinEconomyHealth = async () => {
  try {
    const response = await api.get(`/api/v2/shop/admin/reports/coin-economy`);
    return response.data;
  } catch (error) {
    console.error("Error fetching coin economy health:", error);
    throw error;
  }
};

export const exportReport = async (type, filters = {}) => {
  try {
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('format', 'csv');
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const response = await api.get(`/api/v2/shop/admin/reports/export?${params.toString()}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { success: true, message: 'Export successful' };
  } catch (error) {
    console.error("Error exporting report:", error);
    throw error;
  }
};

// ==================== COACH DELIVERY (Sprint5-Story-13) ====================

export const getCoachDeliveryStats = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '' && params[key] !== 'all') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    const url = `/api/v2/shop/coach/deliveries/stats${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching coach delivery stats:", error);
    throw error;
  }
};

export const getCoachDeliveries = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const response = await api.get(`/api/v2/shop/coach/deliveries?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching coach deliveries:", error);
    throw error;
  }
};

export const markOrderDelivered = async (orderId, deliveryNotes = '') => {
  try {
    const response = await api.patch(`/api/v2/shop/coach/deliveries/${orderId}/deliver`, { deliveryNotes });
    return response.data;
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    throw error;
  }
};

// ==================== SHOP ITEMS ====================

export const getAllShopItems = async () => {
  try {
    const response = await api.get('/api/v2/shop/products?limit=1000&inStock=false');
    return { success: true, data: response.data.products || [] };
  } catch (error) {
    console.error("Error fetching shop items:", error);
    throw error;
  }
};

export const getShopItemsByCategory = async ({ category, purchaseCategory, limit = 1000 } = {}) => {
  try {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (purchaseCategory) qs.set('purchaseCategory', purchaseCategory);
    if (limit) qs.set('limit', String(limit));
    qs.set('inStock', 'false');
    const response = await api.get(`/api/v2/shop/products?${qs.toString()}`);
    return { success: true, data: response.data.products || [] };
  } catch (error) {
    console.error('Error fetching shop items by category:', error);
    throw error;
  }
};

export const createPendingProduct = async (productData) => {
  try {
    const response = await api.post('/api/v2/shop/admin/products/pending', productData);
    return response.data;
  } catch (error) {
    console.error("Error creating pending product:", error);
    throw error;
  }
};
