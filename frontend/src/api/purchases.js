import { api, headers } from './client';

export const getPurchaseOverView = async () => {
  try {
    const response = await api.get(`/api/v1/purchase-repair/overview`);
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase overview:", error);
    throw error;
  }
};

export const createPurchase = async (data) => {
  try {
    const response = await api.post(
      `/api/v1/purchase-repair/purchase-orders`,
      data,
      { headers }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAllPurchases = async () => {
  try {
    const response = await api.get(`/api/v1/purchase-repair/purchase-orders`);
    return response.data;
  } catch (error) {
    console.error("Error fetching purchases:", error);
    throw error;
  }
};

export const deletePurchase = async (id) => {
  try {
    const response = await api.delete(
      `/api/v1/purchase-repair/purchase-orders/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting purchase:", error);
    throw error;
  }
};

export const updatePurchaseOrder = async (id, data) => {
  try {
    const response = await api.put(
      `/api/v1/purchase-repair/purchase-orders/${id}`,
      data,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating purchase order:", error);
    throw error;
  }
};
