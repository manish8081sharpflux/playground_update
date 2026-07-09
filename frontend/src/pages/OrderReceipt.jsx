import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

/**
 * OrderReceipt Page - Sprint5-Story-04
 * Printable receipt view for orders
 */

export default function OrderReceipt() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = useCallback(async () => {
    try {
      const response = await api.get(`/api/v2/shop/orders/${orderNumber}`);
      setOrder(response.data.order);
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };


  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e9d5ff",
              borderTopColor: "#9333ea",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          ></div>
          <p style={{ color: "#475569", margin: 0 }}>Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Order not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white receipt-print-root">
      {/* Receipt Container */}
      <div className="bg-white p-8 max-w-2xl mx-auto receipt-print-area">
        {/* Receipt Header */}
        <div className="text-center mb-8 border-b-2 border-slate-900 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ISF Shop</h1>
          <p className="text-sm text-slate-600">Initiative Sewa Foundation</p>
          <p className="text-sm text-slate-600">Order Receipt</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 uppercase">Order Number</p>
            <p className="font-semibold text-slate-900">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Date</p>
            <p className="font-semibold text-slate-900">{formatDate(order.placedAt)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Student</p>
            <p className="font-semibold text-slate-900">
              {order.user?.name || order.userId?.name || 'Student'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Status</p>
            <p className="font-semibold text-slate-900 capitalize">{order.status}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6">
          <thead className="border-b-2 border-slate-900">
            <tr>
              <th className="text-left py-2 text-sm font-semibold text-slate-900">Item</th>
              <th className="text-center py-2 text-sm font-semibold text-slate-900">Qty</th>
              <th className="text-right py-2 text-sm font-semibold text-slate-900">Price</th>
              <th className="text-right py-2 text-sm font-semibold text-slate-900">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item._id} className="border-b border-slate-200">
                <td className="py-3 text-sm text-slate-900">
                  {item.product?.name || item.name}
                </td>
                <td className="py-3 text-sm text-center text-slate-900">{item.quantity}</td>
                <td className="py-3 text-sm text-right text-slate-900">{item.price}</td>
                <td className="py-3 text-sm text-right font-semibold text-slate-900">
                  {item.subtotal} coins
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-900">
            <tr>
              <td colSpan="3" className="py-3 text-right font-bold text-slate-900">
                Total:
              </td>
              <td className="py-3 text-right font-bold text-slate-900 text-lg">
                {order.totalAmount} coins
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        {/* <div className="text-center text-sm text-slate-500 mt-8 pt-6 border-t border-slate-200">
          <p>Thank you for shopping with ISF Shop!</p>
          <p className="mt-2">Generated on {formatDateTime(new Date())}</p>
        </div> */}

        {/* Print Buttons (hidden when printing) */}
        <div className="flex gap-3 mt-6 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={() => navigate(`/shop/orders/${orderNumber}`)}
            className="flex-1 bg-slate-200 text-slate-800 px-6 py-3 rounded-md hover:bg-slate-300 transition-colors font-medium"
          >
            Back to Order
          </button>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          html, body {
            background: white;
            height: auto !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }

          /* Hide everything on the page by default when printing,
             and collapse their height so they don't reserve blank space */
          body * {
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* Reveal only the receipt content and restore its natural size */
          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Pull the receipt out of normal flow so surrounding layout
             (navbar, dashboard widgets, sidebars) takes up no space at all */
          .receipt-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }

          /* Avoid the items table splitting awkwardly across pages */
          table, tr, td, th {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
