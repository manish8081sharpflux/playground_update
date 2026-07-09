import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ShopNavigation Component - Sprint5-Story-15
 * Simple navigation buttons for shop pages
 * - Students: Shop Home | My Orders | Transactions
 * - Coaches: Shop Home | Deliveries (Transactions removed - coaches don't need it)
 * - Admins: Shop Home | All Orders | All Transactions
 * - Clean, minimal design (no draggable panel for students)
 */
const ShopNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Handle both role formats: user.role (string) or user.role.roleName (object)
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName;
  const isAdmin = userRole?.toLowerCase() === 'admin';

  const navItems = [
    {
      label: 'Shop Home',
      icon: '🏠',
      path: '/shop',
      description: 'Browse products',
      roles: ['student', 'coach', 'admin']
    },
    {
      label: isAdmin ? 'All Orders' : 'My Orders',
      icon: '📦',
      path: '/shop/orders',
      description: isAdmin ? 'View all orders' : 'View your orders',
      roles: ['student', 'admin']
    },
    {
      label: 'Deliveries',
      icon: '🚚',
      path: '/coach/deliveries',
      description: 'Manage order deliveries',
      roles: ['coach', 'admin']
    },
    {
      label: 'My Requests',
      icon: '🧾',
      path: '/coach/requests',
      description: 'View my purchase requests and student orders',
      roles: ['coach', 'admin']
    },
    {
      label: isAdmin ? 'All Transactions' : 'Transactions',
      icon: '💰',
      path: isAdmin ? '/coins/history' : '/coins/history',
      description: isAdmin ? 'View all transactions' : 'View your coin history',
      roles: ['student', 'admin']
    }
  ].filter(item => {
    // Filter items based on user role
    if (!userRole) return false;
    return item.roles.includes(userRole.toLowerCase());
  });

  const isActive = (path) => {
    if (path === '/shop') {
      return location.pathname === '/shop';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm
                whitespace-nowrap transition-all duration-200
                ${
                  isActive(item.path)
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }
              `}
              title={item.description}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopNavigation;
