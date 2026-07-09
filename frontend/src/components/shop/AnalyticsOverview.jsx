// Sprint5-Story-11: Analytics Overview Component
// AC1: Dashboard overview cards showing key metrics

import React from 'react';
import { ShoppingCart, DollarSign, TrendingUp, Users } from 'lucide-react';

const AnalyticsOverview = ({ data }) => {
  const cards = [
    {
      id: 'totalOrders',
      title: 'Total Orders',
      value: data?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'totalRevenue',
      title: 'Total Revenue',
      value: `${data?.totalRevenue || 0} coins`,
      icon: DollarSign,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      id: 'avgOrderValue',
      title: 'Avg Order Value',
      value: `${data?.avgOrderValue || 0} coins`,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      id: 'studentParticipation',
      title: 'Student Participation',
      value: data?.studentParticipation
        ? `${data.studentParticipation.purchased}/${data.studentParticipation.total} (${data.studentParticipation.percentage}%)`
        : '0/0 (0%)',
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      subtitle: data?.studentParticipation
        ? `${data.studentParticipation.neverPurchased} never purchased`
        : 'No data'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`bg-white rounded-lg shadow-sm border ${card.borderColor} p-6 hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-gray-500">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalyticsOverview;
