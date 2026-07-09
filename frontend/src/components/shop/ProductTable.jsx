import React from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';

/**
 * ProductTable Component - Sprint5-Story-05
 * Displays products in a table format with edit/delete actions
 */

export default function ProductTable({ products, onEdit, onDelete }) {
  const formatPrice = (price) => {
    return `${price} coins`;
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'ISF Shop': 'bg-indigo-100 text-indigo-800',
      'Medicines': 'bg-red-100 text-red-800',
      'Consumables': 'bg-blue-100 text-blue-800',
      'Repairs': 'bg-amber-100 text-amber-800',
      'Infra': 'bg-green-100 text-green-800',
      'Others': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((product) => (
              <tr
                key={product._id}
                className="hover:bg-slate-50 transition-colors"
              >
                {/* Product */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {(product.imageUrl || product.primaryImageUrl || product.images?.length > 0) ? (
                      <img
                        src={
                          product.imageUrl ||
                          product.primaryImageUrl ||
                          product.images?.find(img => img.isPrimary)?.url ||
                          product.images?.[0]?.url ||
                          'https://via.placeholder.com/48'
                        }
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-sm text-slate-500 line-clamp-1">
                        {product.description}
                      </div>
                    </div>
                  </div>
                </td>

                {/* SKU */}
                <td className="px-4 py-4">
                  <span className="font-mono text-sm text-slate-700">{product.sku}</span>
                </td>

                {/* Category */}
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(product.category)}`}>
                    {product.category}
                  </span>
                </td>

                {/* Price */}
                <td className="px-4 py-4">
                  <div>
                    {product.discountPrice ? (
                      <>
                        <div className="font-medium text-slate-900">
                          {formatPrice(product.discountPrice)}
                        </div>
                        <div className="text-sm text-slate-500 line-through">
                          {formatPrice(product.price)}
                        </div>
                      </>
                    ) : (
                      <div className="font-medium text-slate-900">
                        {formatPrice(product.price)}
                      </div>
                    )}
                  </div>
                </td>

                {/* Stock */}
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-slate-900">{product.stock}</div>
                    {product.stock <= product.lowStockThreshold && product.stock > 0 && (
                      <div className="text-xs text-amber-600">Low stock</div>
                    )}
                    {product.stock === 0 && (
                      <div className="text-xs text-red-600">Out of stock</div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-1">
                    {product.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                    {product.isPendingProduct ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Completed
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(product)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
