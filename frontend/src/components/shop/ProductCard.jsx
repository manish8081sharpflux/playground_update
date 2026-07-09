import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Package } from "lucide-react";
import useShopStore from "../../store/shopStore";
import { useAuth } from "../../contexts/AuthContext";

/**
 * ProductCard Component - Story-01, Story-02 AC1
 * Displays individual product with image, name, price, and add-to-cart button
 * Design System: WTF Module pin card pattern
 */
const ProductCard = ({ product, onRequestItem }) => {
  const navigate = useNavigate();
  const { addToCart } = useShopStore();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  // Check if user is admin, coach, or purchase-manager - they cannot purchase from shop
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isCoach = user?.role?.toLowerCase() === "coach";
  const isPurchaseManager = user?.role?.toLowerCase() === "purchase-manager";
  const isMedical = user?.role?.toLowerCase() === "medical-incharge";
  
  // Staff Roles (Story 2.2)
  const isStaff = isAdmin || isCoach || isPurchaseManager || isMedical;
  const canPurchase =
    product.inStock && product.isActive !== false && !product.isPendingProduct;
  const hasDiscountPrice =
    Number(product.discountPrice) > 0;

  // Navigate to product detail page on card click
  const handleCardClick = () => {
    navigate(`/shop/products/${product._id}`);
  };

  const handleCardKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleAction = async () => {
    // If staff, request item
    if (isStaff) {
      if (onRequestItem) onRequestItem(product);
      return;
    }

    // If student, add to cart
    if (!canPurchase || isAdding) return;

    setIsAdding(true);
    try {
      await addToCart(product, 1);
    } catch (error) {
      // Error toast is handled in the store
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden flex flex-col h-full"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${product.name}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square flex-shrink-0">
        <img
          src={product.primaryImageUrl || product.imageUrl || "/placeholder-product.png"}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Out of Stock Overlay */}
        {!canPurchase && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold">
              {product.inStock ? "Unavailable" : "Out of Stock"}
            </span>
          </div>
        )}

        {/* Low Stock Badge */}
        {product.lowStock && canPurchase && (
          <div className="absolute top-2 right-2">
            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              Only {product.stock} left!
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category Badge */}
        <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full mb-2">
          {product.category}
        </span>

        {/* Product Name */}
        <h3 className="font-semibold text-slate-900 mb-1 truncate">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.description}
        </p>

        {/* Spacer to push button to bottom */}
        <div className="flex-1"></div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          {hasDiscountPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-600">
                {product.discountPrice} coins
              </span>
              <span className="text-sm text-slate-400 line-through">
                {product.price} coins
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-slate-900">
              {product.price} coins
            </span>
          )}
        </div>

        {/* Add to Cart / Request Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleAction(); }}
          disabled={(!canPurchase && !isStaff) || isAdding}
          className={`w-full px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${
            canPurchase || isStaff
              ? "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
              : "bg-slate-300 text-slate-500 cursor-not-allowed"
          }`}
          aria-label={isStaff ? `Request ${product.name}` : `Add ${product.name} to cart`}
        >
          {isAdding ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {isStaff ? <Package className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
              {isStaff
                ? "Request Item"
                : canPurchase
                ? "Add to Cart"
                : product.inStock
                ? "Unavailable"
                : "Out of Stock"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
