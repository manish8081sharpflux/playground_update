import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Breadcrumbs Component - Sprint5-Story-15
 * Displays navigation breadcrumbs for shop pages
 * Format: Shop > Section > Page
 */
const Breadcrumbs = ({ customPath }) => {
  const location = useLocation();

  // If customPath is provided, use it; otherwise build from location
  const buildBreadcrumbs = () => {
    if (customPath) {
      return customPath;
    }

    const path = location.pathname;
    const breadcrumbs = [{ label: 'Shop', path: '/shop' }];

    // Shop Home
    if (path === '/shop') {
      return breadcrumbs;
    }

    // Orders
    if (path === '/shop/orders') {
      breadcrumbs.push({ label: 'My Orders', path: '/shop/orders' });
    } else if (path.startsWith('/shop/orders/') && path.includes('/receipt')) {
      const orderNumber = path.split('/')[3];
      breadcrumbs.push({ label: 'My Orders', path: '/shop/orders' });
      breadcrumbs.push({ label: `Order ${orderNumber}`, path: `/shop/orders/${orderNumber}` });
      breadcrumbs.push({ label: 'Receipt', path: path });
    } else if (path.startsWith('/shop/orders/')) {
      const orderNumber = path.split('/')[3];
      breadcrumbs.push({ label: 'My Orders', path: '/shop/orders' });
      breadcrumbs.push({ label: `Order ${orderNumber}`, path: path });
    }

    // Checkout
    if (path === '/shop/checkout') {
      breadcrumbs.push({ label: 'Checkout', path: '/shop/checkout' });
    }

    // Transactions
    if (path === '/coins/history') {
      breadcrumbs.push({ label: 'Transactions', path: '/coins/history' });
    }

    // Coach Deliveries
    if (path === '/coach/deliveries') {
      breadcrumbs.push({ label: 'Deliveries', path: '/coach/deliveries' });
    }

    // Coach Requests Dashboard
    if (path === '/coach/requests') {
      breadcrumbs.push({ label: 'My Requests', path: '/coach/requests' });
    }

    // Admin Routes
    if (path.startsWith('/shop/admin')) {
      breadcrumbs.push({ label: 'Admin', path: null });

      if (path === '/shop/admin/products') {
        breadcrumbs.push({ label: 'Product Management', path: '/shop/admin/products' });
      } else if (path === '/shop/admin/vendors') {
        breadcrumbs.push({ label: 'Vendor Management', path: '/shop/admin/vendors' });
      } else if (path === '/shop/admin/inventory') {
        breadcrumbs.push({ label: 'Inventory Management', path: '/shop/admin/inventory' });
      } else if (path === '/shop/admin/inventory/low-stock') {
        breadcrumbs.push({ label: 'Inventory', path: '/shop/admin/inventory' });
        breadcrumbs.push({ label: 'Low Stock Report', path: '/shop/admin/inventory/low-stock' });
      } else if (path === '/shop/admin/inventory/out-of-stock') {
        breadcrumbs.push({ label: 'Inventory', path: '/shop/admin/inventory' });
        breadcrumbs.push({ label: 'Out of Stock Report', path: '/shop/admin/inventory/out-of-stock' });
      } else if (path === '/shop/admin/inventory/master-report') {
        breadcrumbs.push({ label: 'Inventory', path: '/shop/admin/inventory' });
        breadcrumbs.push({ label: 'Master Inventory Report', path: '/shop/admin/inventory/master-report' });
      } else if (path === '/shop/admin/analytics') {
        breadcrumbs.push({ label: 'Analytics', path: '/shop/admin/analytics' });
      } else if (path === '/shop/admin/reports') {
        breadcrumbs.push({ label: 'Transaction Reports', path: '/shop/admin/reports' });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <nav className="bg-slate-50 border-b border-slate-200 py-2">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {crumb.path && !isLast ? (
                  <Link
                    to={crumb.path}
                    className="text-purple-600 hover:text-purple-700 hover:underline font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-slate-900 font-semibold" : "text-slate-600"}>
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumbs;
