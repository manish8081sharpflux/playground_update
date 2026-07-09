import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { api } from "../api";
import useShopStore from "../store/shopStore";
import { useAuth } from "../contexts/AuthContext";
import LoadingState from "../components/common/LoadingState";

/**
 * ProductDetail Page - Story 13.4 (FIX-016 / FR4)
 * Full product detail view at /shop/products/:id
 * Shows full description, image gallery, stock status, price in coins, and Add to Cart.
 */
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useShopStore();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Role checks (mirrors ProductCard logic)
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isCoach = user?.role?.toLowerCase() === "coach";
  const isPurchaseManager = user?.role?.toLowerCase() === "purchase-manager";
  const isMedical = user?.role?.toLowerCase() === "medical-incharge";
  const isStaff = isAdmin || isCoach || isPurchaseManager || isMedical;
  const canPurchase =
    product?.inStock && product.isActive !== false && !product.isPendingProduct;

  // Fetch product by ID
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v2/shop/products/${id}`);
      if (response.data?.product) {
        setProduct(response.data.product);
      } else {
        setError("Product not found");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Product not found");
      } else {
        setError(
          err.response?.data?.message || "Failed to load product details"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Build image list from product data
  const getImages = () => {
    if (!product) return [];
    const images = [];

    // Use images array if available
    if (product.images && product.images.length > 0) {
      // Sort so primary image is first
      const sorted = [...product.images].sort((a, b) =>
        b.isPrimary ? 1 : a.isPrimary ? -1 : 0
      );
      sorted.forEach((img) => images.push(img.url));
    } else {
      // Fallback to single image fields
      const singleUrl =
        product.primaryImageUrl || product.imageUrl || "/placeholder-product.png";
      images.push(singleUrl);
    }

    return images;
  };

  const images = product ? getImages() : [];

  // Gallery navigation
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index) => {
    setActiveImageIndex(index);
  };

  // Keyboard navigation for gallery
  const handleGalleryKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrevImage();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNextImage();
    }
  };

  // Quantity helpers
  const maxQuantity = product ? Math.min(product.stock ?? 99, 99) : 99;

  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else if (val > maxQuantity) {
      setQuantity(maxQuantity);
    } else {
      setQuantity(val);
    }
  };

  const incrementQuantity = () => {
    setQuantity((prev) => Math.min(prev + 1, maxQuantity));
  };

  const decrementQuantity = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  // Add to cart / request action
  const handleAction = async () => {
    if (!product) return;

    if (isStaff) {
      // Staff cannot add to cart; navigate back to shop where request modal lives
      navigate("/shop");
      return;
    }

    if (!canPurchase || isAdding) return;

    setIsAdding(true);
    try {
      await addToCart(product, quantity);
    } catch {
      // Error toast handled in store
    } finally {
      setIsAdding(false);
    }
  };

  // Determine stock status display
  const getStockStatus = () => {
    if (!product) return null;
    if (!canPurchase) {
      return {
        label: product.inStock ? "Unavailable" : "Out of Stock",
        className: "bg-red-100 text-red-800",
      };
    }
    if (product.lowStock) {
      return {
        label: `Low Stock - Only ${product.stock} left`,
        className: "bg-orange-100 text-orange-800",
      };
    }
    return {
      label: "In Stock",
      className: "bg-green-100 text-green-800",
    };
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading product details..." fullScreen />;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{error}</h1>
          <p className="text-slate-600">
            The product you are looking for might have been removed or is
            temporarily unavailable.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors font-medium"
            aria-label="Back to shop"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const hasDiscount = Number(product.discountPrice) > 0;
  const displayPrice = hasDiscount
    ? product.discountPrice
    : (product.currentPrice ?? product.price);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb / Back navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-slate-600">
              <li>
                <Link
                  to="/shop"
                  className="hover:text-purple-600 transition-colors"
                >
                  Shop
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span className="text-slate-900 font-medium" aria-current="page">
                  {product.name}
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 transition-colors mb-6 font-medium text-sm"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image Gallery */}
              <div className="p-6 lg:border-r border-slate-200">
                {/* Main Image */}
                <div
                  className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-4"
                  role="region"
                  aria-label="Product image gallery"
                  tabIndex={0}
                  onKeyDown={handleGalleryKeyDown}
                >
                  <img
                    src={images[activeImageIndex] || "/placeholder-product.png"}
                    alt={`${product.name} - image ${activeImageIndex + 1} of ${images.length}`}
                    className="w-full h-full object-contain"
                  />

                  {/* Gallery navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-700" />
                      </button>
                    </>
                  )}

                  {/* Out of Stock Overlay */}
                  {!canPurchase && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                        {product.inStock ? "Unavailable" : "Out of Stock"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div
                    className="flex gap-2 overflow-x-auto pb-2"
                    role="tablist"
                    aria-label="Product image thumbnails"
                  >
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => handleThumbnailClick(index)}
                        role="tab"
                        aria-selected={activeImageIndex === index}
                        aria-label={`View image ${index + 1}`}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          activeImageIndex === index
                            ? "border-purple-500"
                            : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-6 flex flex-col">
                {/* Category Badge */}
                {product.category && (
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full mb-3 self-start">
                    {product.category}
                  </span>
                )}

                {/* Product Name */}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                  {product.name}
                </h1>

                {/* Stock Status */}
                {stockStatus && (
                  <span
                    className={`inline-block text-sm font-medium px-3 py-1 rounded-full mb-4 self-start ${stockStatus.className}`}
                    aria-label={`Stock status: ${stockStatus.label}`}
                  >
                    {stockStatus.label}
                  </span>
                )}

                {/* Price */}
                <div className="flex items-center gap-3 mb-6">
                  {hasDiscount ? (
                    <>
                      <span className="text-3xl font-bold text-emerald-600">
                        {product.discountPrice} coins
                      </span>
                      <span className="text-xl text-slate-400 line-through">
                        {product.price} coins
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-slate-900">
                      {displayPrice} coins
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    Description
                  </h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {product.description || "No description available."}
                  </p>
                </div>

                {/* Product details metadata */}
                <div className="border-t border-slate-200 pt-4 mb-6">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                    Details
                  </h2>
                  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    {product.category && (
                      <>
                        <dt className="text-slate-500">Category</dt>
                        <dd className="text-slate-900 font-medium">
                          {product.category}
                        </dd>
                      </>
                    )}
                    {product.sku && (
                      <>
                        <dt className="text-slate-500">SKU</dt>
                        <dd className="text-slate-900 font-medium">
                          {product.sku}
                        </dd>
                      </>
                    )}
                    {product.vendor?.name && (
                      <>
                        <dt className="text-slate-500">Vendor</dt>
                        <dd className="text-slate-900 font-medium">
                          {product.vendor.name}
                        </dd>
                      </>
                    )}
                    {product.stock != null && (
                      <>
                        <dt className="text-slate-500">Available</dt>
                        <dd className="text-slate-900 font-medium">
                          {product.stock} units
                        </dd>
                      </>
                    )}
                  </dl>
                </div>

                {/* Quantity Selector (students only, when in stock) */}
                {!isStaff && canPurchase && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                      Quantity
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-10 h-10 rounded-md border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        value={quantity}
                        onChange={handleQuantityChange}
                        className="w-16 h-10 text-center border border-slate-300 rounded-md text-slate-900 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Quantity"
                      />
                      <button
                        onClick={incrementQuantity}
                        disabled={quantity >= maxQuantity}
                        className="w-10 h-10 rounded-md border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      {maxQuantity < 99 && (
                        <span className="text-xs text-slate-500 ml-2">
                          Max {maxQuantity}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Add to Cart / Request button */}
                <button
                  onClick={handleAction}
                  disabled={(!canPurchase && !isStaff) || isAdding}
                  className={`w-full px-6 py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-colors ${
                    canPurchase || isStaff
                      ? "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                  aria-label={
                    isStaff
                      ? `Request ${product.name}`
                      : `Add ${product.name} to cart`
                  }
                >
                  {isAdding ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isStaff ? (
                        <Package className="w-6 h-6" />
                      ) : (
                        <ShoppingCart className="w-6 h-6" />
                      )}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
