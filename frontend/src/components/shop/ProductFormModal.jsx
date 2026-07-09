import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ImageUpload from "./ImageUpload";
import ProductImageUpload from "../admin/ProductImageUpload";
import VendorFormModal from "./VendorFormModal"; // Import Vendor Modal
import { api } from "../../api";

export default function ProductFormModal({
  product,
  onClose,
  onSubmit,
  onRefresh,
}) {
  const navigate = useNavigate();
  const isEditing = Boolean(product);

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState(null);
  const [selectedVendors, setSelectedVendors] = useState([
    { vendorId: "", rank: 1 },
    { vendorId: "", rank: 2 },
    { vendorId: "", rank: 3 },
  ]);

  const [showVendorModal, setShowVendorModal] = useState(false); // State for Vendor Modal

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category: "ISF Shop",
    price: "",
    discountPrice: "",
    maxPrice: "",
    stock: "",
    lowStockThreshold: "10",
    imageUrl: "",
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      setVendorsError(null);

      const response = await api.get("/api/v2/vendors", {
        params: {
          active: "true",
          limit: 100,
        },
      });

      if (response.data?.success) {
        setVendors(response.data.vendors || []);
      } else {
        throw new Error(response.data?.error || "Failed to load vendors");
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setVendors([]);
      setVendorsError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to load vendors",
      );
    } finally {
      setVendorsLoading(false);
    }
  };

  const handleCreateVendor = async (vendorData) => {
    try {
      const response = await api.post("/api/v2/vendors", vendorData);
      if (response.data.success) {
        toast.success("Vendor created successfully!");
        await fetchVendors(); // Refresh list
        setShowVendorModal(false);
        // Auto-select the new vendor in the first empty slot?
        const newVendorId = response.data.vendor._id;
        setSelectedVendors((prev) => {
          const firstEmptyIndex = prev.findIndex((v) => !v.vendorId);
          if (firstEmptyIndex !== -1) {
            const next = [...prev];
            next[firstEmptyIndex] = {
              ...next[firstEmptyIndex],
              vendorId: newVendorId,
            };
            return next;
          }
          return prev;
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create vendor");
    }
  };

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || "",
        name: product.name || "",
        description: product.description || "",
        category: product.category || "ISF Shop",
        price: product.price?.toString() || "",
        discountPrice: product.discountPrice?.toString() || "",
        maxPrice: product.maxPrice?.toString() || "",
        stock: product.stock?.toString() || "",
        lowStockThreshold: product.lowStockThreshold?.toString() || "10",
        imageUrl: product.imageUrl || product.primaryImageUrl || "",
        isActive: product.isActive !== undefined ? product.isActive : true,
      });

      const ranked = Array.isArray(product.approvedVendors)
        ? [...product.approvedVendors]
        : [];
      ranked.sort((a, b) => (a.rank || 0) - (b.rank || 0));

      setSelectedVendors([
        {
          vendorId: String(
            ranked.find((v) => (v.rank || 1) === 1)?.vendorId?._id ||
              ranked.find((v) => (v.rank || 1) === 1)?.vendorId ||
              "",
          ),
          rank: 1,
        },
        {
          vendorId: String(
            ranked.find((v) => (v.rank || 2) === 2)?.vendorId?._id ||
              ranked.find((v) => (v.rank || 2) === 2)?.vendorId ||
              "",
          ),
          rank: 2,
        },
        {
          vendorId: String(
            ranked.find((v) => (v.rank || 3) === 3)?.vendorId?._id ||
              ranked.find((v) => (v.rank || 3) === 3)?.vendorId ||
              "",
          ),
          rank: 3,
        },
      ]);
    } else {
      setSelectedVendors([
        { vendorId: "", rank: 1 },
        { vendorId: "", rank: 2 },
        { vendorId: "", rank: 3 },
      ]);
    }
  }, [product]);

  const handleVendorChange = (index, vendorId) => {
    if (vendorId) {
      const isDuplicate = selectedVendors.some(
        (v, i) => i !== index && v.vendorId === vendorId,
      );
      if (isDuplicate) {
        toast.error("This vendor is already selected in another rank");
        return;
      }
    }

    setSelectedVendors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], vendorId };
      return next;
    });

    if (errors.approvedVendors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.approvedVendors;
        return next;
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // SKU no longer forced uppercase or stripped of spaces strictly, but generally good practice to keep.
    // User only asked to remove "compulsary" nature.
    const nextValue =
      name === "sku" ? value.toUpperCase().replace(/\s+/g, "") : value;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : nextValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageUpload = (url) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
  };

  const validateForm = () => {
    const newErrors = {};

    // SKU validation - OPTIONAL NOW
    // if (!isEditing && !formData.sku.trim()) {
    //   newErrors.sku = 'SKU is required';
    // }
    // If entered, still validate format? User just said remove "compulsary".
    // Let's keep format check if value exists.
    if (!isEditing && formData.sku && !/^[A-Z0-9-]+$/.test(formData.sku)) {
      newErrors.sku =
        "SKU must contain only uppercase letters, numbers, and hyphens";
    } else if (
      !isEditing &&
      formData.sku &&
      (formData.sku.length < 3 || formData.sku.length > 20)
    ) {
      newErrors.sku = "SKU must be between 3 and 20 characters";
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    } else if (formData.name.length < 3 || formData.name.length > 100) {
      newErrors.name = "Name must be between 3 and 100 characters";
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (
      formData.description.length < 10 ||
      formData.description.length > 500
    ) {
      newErrors.description =
        "Description must be between 10 and 500 characters";
    }

    // Price validation - OPTIONAL NOW (Selling Price)
    // const price = parseInt(formData.price);
    // if (!formData.price || isNaN(price) || price < 1) {
    //   newErrors.price = 'Price must be a positive number';
    // }
    if (formData.price) {
      const price = parseInt(formData.price);
      const maxPrice = parseInt(formData.maxPrice);
      if (isNaN(price) || price < 1) {
        newErrors.price = "Selling price must be a positive integer (coins)";
      } else if (formData.maxPrice && price > maxPrice) {
        newErrors.price = "Selling price cannot be greater than max price";
      }
    }

    // Max price validation (required only for ISF Shop items)
    const maxPrice =
      formData.maxPrice === "" ? null : Number(formData.maxPrice);
    if (formData.category === "ISF Shop") {
      if (!isEditing) {
        if (maxPrice === null || Number.isNaN(maxPrice) || maxPrice < 0) {
          newErrors.maxPrice = "Max Price (₹) is required for ISF Shop items";
        }
      } else if (
        maxPrice !== null &&
        (Number.isNaN(maxPrice) || maxPrice < 0)
      ) {
        newErrors.maxPrice = "Max Price must be a non-negative number";
      }
    }

    // Discount price validation - OPTIONAL
    if (formData.discountPrice) {
      const discountPrice = parseInt(formData.discountPrice);
      const price = parseInt(formData.price) || 0; // Compare against price if exists, else 0?
      // If price is 0/empty, discount price validation against price might be irrelevant.

      if (isNaN(discountPrice) || discountPrice < 0) {
        newErrors.discountPrice =
          "Discount price must be a non-negative number";
      } else if (formData.price && discountPrice > price) {
        newErrors.discountPrice =
          "Discount price cannot be higher than regular price";
      }
    }

    // Stock validation
    if (formData.stock) {
      const stock = parseInt(formData.stock);
      if (isNaN(stock) || stock < 0) {
        newErrors.stock = "Stock must be a non-negative number";
      }
    }

    // Low stock threshold validation
    if (formData.lowStockThreshold) {
      const threshold = parseInt(formData.lowStockThreshold);
      if (isNaN(threshold) || threshold < 0) {
        newErrors.lowStockThreshold =
          "Low stock threshold must be a non-negative number";
      }
    }

    // Approved vendors (required for new products)
    const approvedVendors = selectedVendors.filter((v) => v.vendorId);
    if (!isEditing && approvedVendors.length === 0) {
      newErrors.approvedVendors = "Please select at least one approved vendor";
    }

    // If editing an item that already has vendors, prevent clearing all
    if (
      isEditing &&
      Array.isArray(product?.approvedVendors) &&
      product.approvedVendors.length > 0 &&
      approvedVendors.length === 0
    ) {
      newErrors.approvedVendors = "At least one approved vendor is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const approvedVendors = selectedVendors
        .filter((v) => v.vendorId)
        .map((v) => ({ vendorId: v.vendorId, rank: v.rank }));

      const submitData = {
        ...formData,
        sku: formData.sku || undefined, // Send undefined if empty to let backend handle (or auto-generate if logic exists there, else implies empty SKU)
        price: formData.price ? parseInt(formData.price) : undefined, // Default to 0?
        sellingPrice: formData.price ? parseInt(formData.price) : 0,
        discountPrice: formData.discountPrice
          ? parseInt(formData.discountPrice)
          : null,
        maxPrice:
          formData.maxPrice !== "" ? Number(formData.maxPrice) : undefined,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        lowStockThreshold: formData.lowStockThreshold
          ? parseInt(formData.lowStockThreshold)
          : 10,
      };

      // Since price/sellingPrice were required in schema, sending 0 might be safest if user leaves empty,
      // or check if backend allows missing. Schema usually requires number.
      // User said "remove compulsory nature", likely meaning ui validation. Backend might typically default to 0.

      if (approvedVendors.length > 0) {
        submitData.approvedVendors = approvedVendors;
      }

      // Remove empty/null values
      Object.keys(submitData).forEach((key) => {
        if (submitData[key] === "" || submitData[key] === null) {
          delete submitData[key];
        }
      });

      await onSubmit(submitData);
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const nextErrors = {};
        apiErrors.forEach((err) => {
          if (err?.field && err?.message && !nextErrors[err.field]) {
            nextErrors[err.field] = err.message;
          }
        });

        if (Object.keys(nextErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...nextErrors }));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? "Edit Product" : "Create Product"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* SKU (disabled for editing) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                disabled={isEditing}
                placeholder="e.g., STAT-001 (Optional)"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.sku ? "border-red-500" : "border-slate-300"
                } ${isEditing ? "bg-slate-100 cursor-not-allowed" : ""}`}
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600">{errors.sku}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Premium Notebook A4"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-slate-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Detailed product description..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.description ? "border-red-500" : "border-slate-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="ISF Shop">ISF Shop</option>
                <option value="Medicines">Medicines</option>
                <option value="Consumables">Consumables</option>
                <option value="Repairs">Repairs</option>
                <option value="Infra">Infra</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Pricing - Story 1.2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Price (₹){" "}
                  {formData.category === "ISF Shop" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="number"
                  name="maxPrice"
                  value={formData.maxPrice}
                  onChange={handleChange}
                  min="0"
                  placeholder="50"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.maxPrice ? "border-red-500" : "border-slate-300"
                  }`}
                />
                {errors.maxPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Selling Price (coins) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  placeholder="100"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.price ? "border-red-500" : "border-slate-300"
                  }`}
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount Price (coins)
                </label>
                <input
                  type="number"
                  name="discountPrice"
                  value={formData.discountPrice}
                  onChange={handleChange}
                  min="0"
                  placeholder="80"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.discountPrice ? "border-red-500" : "border-slate-300"
                  }`}
                />
                {errors.discountPrice && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.discountPrice}
                  </p>
                )}
              </div>
            </div>

            {/* Approved Vendors - Story 1.3 */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Approved Vendors (Ranked){" "}
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Create New Vendor
                </button>
              </div>

              {vendorsLoading ? (
                <div className="text-sm text-slate-600">Loading vendors...</div>
              ) : vendorsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-800">{vendorsError}</div>
                  <button
                    type="button"
                    onClick={fetchVendors}
                    className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedVendors.map((slot, index) => (
                    <div
                      key={slot.rank}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center"
                    >
                      <div className="text-sm text-slate-700 font-medium">
                        Rank {slot.rank}
                      </div>
                      <div className="md:col-span-2">
                        <select
                          value={slot.vendorId}
                          onChange={(e) =>
                            handleVendorChange(index, e.target.value)
                          }
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select vendor...</option>
                          {vendors.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.name} ({v.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {errors.approvedVendors && (
                    <p className="text-sm text-red-600">
                      {errors.approvedVendors}
                    </p>
                  )}

                  {!vendorsLoading && vendors.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        No active vendors found. Please create at least one
                        vendor before adding a new product.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stock & Low Stock Threshold */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  placeholder="50"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.stock ? "border-red-500" : "border-slate-300"
                  }`}
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600">{errors.stock}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  min="0"
                  placeholder="10"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.lowStockThreshold
                      ? "border-red-500"
                      : "border-slate-300"
                  }`}
                />
                {errors.lowStockThreshold && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lowStockThreshold}
                  </p>
                )}
              </div>
            </div>

            {/* Image Upload (Legacy - for backward compatibility) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product Image (Legacy)
              </label>
              <ImageUpload
                currentImageUrl={formData.imageUrl}
                onUpload={handleImageUpload}
              />
              <p className="mt-1 text-xs text-slate-500">
                {isEditing
                  ? "Use the image manager below for multiple images"
                  : "Save product first to upload multiple images"}
              </p>
            </div>

            {/* Story-14: Product Image Management (Only for existing products) */}
            {isEditing && product._id && (
              <ProductImageUpload
                productId={product._id}
                existingImages={product.images || []}
                onUploadSuccess={onRefresh}
              />
            )}

            {/* Pending Status */}
            {isEditing && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Product setup status:
                </span>
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
            )}

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-slate-700"
              >
                Product is active and visible to students
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Saving..."
                  : isEditing
                    ? "Update Product"
                    : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Inline Vendor Creation Modal */}
      {showVendorModal && (
        <VendorFormModal
          onClose={() => setShowVendorModal(false)}
          onSubmit={handleCreateVendor}
        />
      )}
    </>
  );
}
