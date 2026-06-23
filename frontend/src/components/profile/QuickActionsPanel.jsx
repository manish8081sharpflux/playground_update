// Sprint5-Story-16: Quick Actions Panel
// Navigation shortcuts for students viewing their own profile

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Coins, Lightbulb, BookOpen } from 'lucide-react';

export default function QuickActionsPanel() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: ShoppingBag,
      label: 'Browse Shop',
      description: 'Explore products',
      color: 'purple',
      path: '/shop'
    },
    {
      icon: Coins,
      label: 'Transactions',
      description: 'View coin history',
      color: 'blue',
      path: '/shop/transactions'
    },
    {
      icon: Lightbulb,
      label: 'WTF System',
      description: 'Create pins',
      color: 'yellow',
      path: '/wtf'
    },
    {
      icon: BookOpen,
      label: 'My Orders',
      description: 'Track orders',
      color: 'green',
      path: '/shop/orders'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
      blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600',
      green: 'bg-green-50 hover:bg-green-100 text-green-600'
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
        <p className="text-sm text-slate-600">Navigate to key features</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${getColorClasses(action.color)}`}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-600">{action.description}</p>
              </div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
