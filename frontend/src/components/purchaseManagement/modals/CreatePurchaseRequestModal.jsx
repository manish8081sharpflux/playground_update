import React, { useState, useEffect, useRef } from "react";
import {
  api,
  createPurchaseRequest,
  updatePurchaseRequest, // Sprint5-Story-EditDelete
  downloadPurchaseRequestAttachment,
  getLowStockProducts,
  getAllShopItems,
  getShopItemsByCategory,
  createPendingProduct, // Sprint5-Story-25
} from "../../../api";
import showToast from "../../../utils/toast";
import ImageUpload from "../../shop/ImageUpload";
import { UserTypes, normalizeUserRole } from "../../../constants/userTypes";
import VendorFormModal from "../../shop/VendorFormModal";
import "../PurchaseManagement.css";

/**
 * Create Purchase Request Modal - Sprint5-Story-17
 * Form for Purchase Managers to create multi-product purchase requests with file upload
 * REWRITTEN: Supports multiple products, file attachments, and estimated costs
 */
export default function CreatePurchaseRequestModal({
  onClose,
  onSuccess,
  userBalagruhas,
  balagruhas,
  userRole,
  initialProduct, // { product, balagruhaId }
  requestToEdit, // Sprint5-Story-EditDelete
}) {
  const isAdmin = normalizeUserRole(userRole) === UserTypes.ADMIN;
  const isPurchaseManager =
    normalizeUserRole(userRole) === UserTypes.PURCHASE_MANAGER;
  // Admin + PM can add new products inline and select vendors/suppliers.
  // Previously admin-only, which blocked PMs from adding products they
  // need to order from suppliers.
  const canAddProducts = isAdmin || isPurchaseManager;

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [formData, setFormData] = useState({
    balagruhaId: "",
    category: "", // NEW - Sprint5-Story-20
    deadline: "",
    priority: "medium",
    items: [], // Array of {productId, productName, productSKU, requestedQuantity}
    attachments: [], // NEW - File array
  });
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);
  const [attachmentToRemove, setAttachmentToRemove] = useState(null);

  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Sprint5-Story-25: Inline product addition state
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    category: formData.category || "ISF Shop",
    unit: "pieces",
    sku: "",
    description: "",
    maxPrice: "",
    sellingPrice: "",
    discountPrice: "",
    stock: "0",
    lowStockThreshold: "10",
    imageUrl: "",
  });
  const [newProductErrors, setNewProductErrors] = useState({});
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [manualProductName, setManualProductName] = useState("");

  const shouldScopeByPurchaseCategory = (requestCategory) => {
    // Selecting ISF Shop should not artificially hide items.
    return Boolean(requestCategory) && requestCategory !== "ISF Shop";
  };

  // Vendors (for inline product addition)
  const [vendorOptions, setVendorOptions] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState(null);
  const [newProductSelectedVendors, setNewProductSelectedVendors] = useState([
    { vendorId: "", rank: 1 },
    { vendorId: "", rank: 2 },
    { vendorId: "", rank: 3 },
  ]);

  useEffect(() => {
    if (!canAddProducts) {
      setShowAddProductForm(false);
    }
  }, [canAddProducts]);

  const resetInlineProductForm = () => {
    setNewProductForm({
      name: "",
      category: formData.category || "ISF Shop",
      unit: "pieces",
      sku: "",
      description: "",
      maxPrice: "",
      sellingPrice: "",
      discountPrice: "",
      stock: "0",
      lowStockThreshold: "10",
      imageUrl: "",
    });
    setNewProductErrors({});
    setNewProductSelectedVendors([
      { vendorId: "", rank: 1 },
      { vendorId: "", rank: 2 },
      { vendorId: "", rank: 3 },
    ]);
  };

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
        setVendorOptions(response.data.vendors || []);
      } else {
        throw new Error(response.data?.error || "Failed to load vendors");
      }
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setVendorOptions([]);
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
        showToast("Vendor created successfully!", "success");
        await fetchVendors(); // Refresh list
        setShowVendorModal(false);

        // Auto-select the new vendor in the first empty slot
        const newVendorId = response.data.vendor._id;
        setNewProductSelectedVendors((prev) => {
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
      showToast(
        error.response?.data?.message || "Failed to create vendor",
        "error",
      );
    }
  };

  useEffect(() => {
    if (!canAddProducts) return;
    if (!showAddProductForm) return;
    fetchVendors();
  }, [canAddProducts, showAddProductForm]);

  const handleNewProductFieldChange = (field, value) => {
    const nextValue =
      field === "sku" ? value.toUpperCase().replace(/\s+/g, "") : value;

    setNewProductForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    if (newProductErrors[field]) {
      setNewProductErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNewProductVendorChange = (index, vendorId) => {
    if (vendorId) {
      const isDuplicate = newProductSelectedVendors.some(
        (v, i) => i !== index && v.vendorId === vendorId,
      );
      if (isDuplicate) {
        showToast("This vendor is already selected in another rank", "error");
        return;
      }
    }

    setNewProductSelectedVendors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], vendorId };
      return next;
    });

    if (newProductErrors.approvedVendors) {
      setNewProductErrors((prev) => {
        const next = { ...prev };
        delete next.approvedVendors;
        return next;
      });
    }
  };

  // ============================================================================
  // FILE PREVIEW COMPONENT (Copied from MachineRepairsView.jsx)
  // ============================================================================

  const FilePreview = ({ file }) => {
    const [preview, setPreview] = useState("");

    useEffect(() => {
      if (file) {
        if (file instanceof File) {
          // For new files
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          // For existing files from server
          setPreview(file.fileUrl || file.url);
        }
      }
    }, [file]);

    const isImage = (file) => {
      const imageTypes = ["jpg", "jpeg", "png", "gif", "webp"];
      const extension = file.name
        ? file.name.split(".").pop().toLowerCase()
        : (file.fileUrl || file.url)?.split(".").pop().toLowerCase();
      return imageTypes.includes(extension);
    };

    const getFileExtension = (file) => {
      const source = file.name || file.fileUrl || file.url || "";
      const extension = source.split(".").pop();
      return extension ? extension.toUpperCase().slice(0, 5) : "FILE";
    };

    return (
      <div className="file-preview">
        {isImage(file) ? (
          <img
            src={preview}
            alt="Purchase request attachment preview"
            className="preview-image"
          />
        ) : (
          <div className="preview-document">
            <i className="fas fa-file-alt"></i>
            <span>{getFileExtension(file)}</span>
          </div>
        )}
      </div>
    );
  };

  const getAttachmentName = (file) =>
    file?.filename || file?.name || file?.fileUrl || file?.url || "Attachment";

  const getAttachmentHref = (file) => {
    if (requestToEdit?._id && file?._id) {
      return `/api/v2/shop/admin/purchase-requests/${requestToEdit._id}/attachments/${file._id}`;
    }
    return file?.fileUrl || file?.url || "#";
  };

  const handleExistingAttachmentOpen = async (event, file) => {
    if (!requestToEdit?._id || !file?._id) {
      return;
    }

    event.preventDefault();
    const openedWindow = window.open("", "_blank");

    try {
      const response = await downloadPurchaseRequestAttachment(
        requestToEdit._id,
        file._id,
      );
      const blobUrl = window.URL.createObjectURL(response.data);

      if (openedWindow) {
        openedWindow.opener = null;
        openedWindow.location.href = blobUrl;
      } else {
        const fallbackWindow = window.open(blobUrl, "_blank");
        if (fallbackWindow) {
          fallbackWindow.opener = null;
        }
      }

      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      if (openedWindow) {
        openedWindow.close();
      }
      showToast("Unable to open attachment", "error");
    }
  };

  const handleRemoveExistingAttachment = async (event, file) => {
    event.preventDefault();
    event.stopPropagation();

    if (!requestToEdit?._id || !file?._id) {
      return;
    }

    setAttachmentToRemove(file);
  };

  const confirmRemoveExistingAttachment = async () => {
    const file = attachmentToRemove;
    if (!requestToEdit?._id || !file?._id) {
      setAttachmentToRemove(null);
      return;
    }

    try {
      await api.delete(
        `/api/v2/shop/admin/purchase-requests/${requestToEdit._id}/attachments/${file._id}`,
      );
      setExistingAttachments((prev) => prev.filter((f) => f._id !== file._id));
      showToast("Attachment removed", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to remove attachment",
        "error",
      );
    } finally {
      setAttachmentToRemove(null);
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Debug: Log formData changes
  useEffect(() => {}, [formData]);

  // Track if we've already initialized the edit data to prevent re-setting
  const hasInitializedEdit = useRef(false);

  // Reset the flag when requestToEdit changes (modal opens/closes)
  useEffect(() => {
    if (!requestToEdit) {
      hasInitializedEdit.current = false;
      setExistingAttachments([]);
    }
  }, [requestToEdit]);

  useEffect(() => {
    // Sprint5-Story-EditDelete: Handle request editing FIRST to prevent overwriting
    if (requestToEdit) {
      // Prevent re-initializing if we've already set the edit data
      if (hasInitializedEdit.current) {
        return;
      }

      hasInitializedEdit.current = true;
      setExistingAttachments(requestToEdit.attachments || []);

      setFormData({
        balagruhaId:
          requestToEdit.balagruhaId?._id || requestToEdit.balagruhaId || "",
        category: requestToEdit.category || "",
        deadline: requestToEdit.deadline
          ? new Date(requestToEdit.deadline).toISOString().split("T")[0]
          : "",
        priority: requestToEdit.priority || "medium",
        items: requestToEdit.items.map((item) => ({
          productId: item.productId?._id || item.productId,
          productName: item.productName,
          productSKU: item.productSKU,
          requestedQuantity: item.requestedQuantity,
          estimatedUnitCost: item.estimatedUnitCost || 0,
          estimatedTotalCost: item.estimatedTotalCost || 0,
          isPendingProduct: item.isPendingProduct || false,
        })),
        attachments: [], // We don't edit existing attachments here, just allow adding new ones
      });

      const productIds = new Set(
        requestToEdit.items.map(
          (item) => item.productId?._id || item.productId,
        ),
      );
      setSelectedProducts(productIds);
      fetchProducts(
        requestToEdit.balagruhaId?._id || requestToEdit.balagruhaId,
        requestToEdit.category,
      );
    }
    // Set default balagruha if only one assigned
    else if (userBalagruhas.length === 1 && balagruhas.length > 0) {
      setExistingAttachments([]);
      const defaultBalagruha = balagruhas[0];
      setFormData((prev) => ({ ...prev, balagruhaId: defaultBalagruha._id }));
      fetchProducts(defaultBalagruha._id);
    }
    // Handle initial product selection (Reorder flow)
    else if (initialProduct && initialProduct.balagruhaId) {
      setExistingAttachments([]);
      // Sprint5-Story-20: Valid purchase categories
      const validCategories = [
        "ISF Shop",
        "Medicines",
        "Consumables",
        "Repairs",
        "Infra",
        "Others",
      ];
      const productCategory = initialProduct.product?.category;

      // Determine safe category: Use specific category if valid, otherwise default to 'ISF Shop'
      const safeCategory = validCategories.includes(productCategory)
        ? productCategory
        : "ISF Shop";

      setFormData((prev) => ({
        ...prev,
        balagruhaId: initialProduct.balagruhaId,
        category: safeCategory,
      }));

      // Use the determining safe category for fetching
      fetchProducts(initialProduct.balagruhaId, safeCategory);

      // Let's just set the state. The second useEffect depends on `formData.category`.
      // But wait! `formData.balagruhaId` is also a dependency for determining if it runs?
      // No, `[formData.category]` is the dependency.

      // If we set category, it triggers. If we don't (same category), it doesn't.
      // If we only set BalagruhaId, the category hook does NOT run (it only watches category).

      // So we MUST call fetchProducts here. BUT `formData` is stale.
      // We should use the values we just determined.

      // Refactor fetchProducts to accept category as arg?
      // Or just assume stale state is fine (empty category) -> fetch all -> then re-filter?

      // Let's rely on passing the category to fetchProducts if needed.
      // But fetchProducts definition uses formData.category.

      // Fix: Update fetchProducts to accept optional overrides.
      fetchProducts(
        initialProduct.balagruhaId,
        initialProduct.product?.category,
      );
    }
  }, [userBalagruhas, balagruhas, initialProduct, requestToEdit]);

  // Effect to auto-select the product once products are loaded
  useEffect(() => {
    if (
      initialProduct &&
      products.length > 0 &&
      !selectedProducts.has(initialProduct.product._id)
    ) {
      const productToSelect = products.find(
        (p) => p._id === initialProduct.product._id,
      );

      if (productToSelect) {
        handleProductToggle(productToSelect);
      }
    }
  }, [products, initialProduct]);

  // ============================================================================
  // PRODUCT FETCHING
  // ============================================================================

  const fetchProducts = async (balagruhaId, categoryOverride) => {
    try {
      setFetchingProducts(true);

      const categoryToUse =
        categoryOverride !== undefined ? categoryOverride : formData.category;

      // Story 2.5: Reduce product list size by filtering products based on selected purchase category.
      const response = shouldScopeByPurchaseCategory(categoryToUse)
        ? await getShopItemsByCategory({
            purchaseCategory: categoryToUse,
            limit: 1000,
          })
        : await getAllShopItems();

      if (response.success) {
        const allProducts = response.data || [];

        // Filter products by selected balagruha
        const balagruhaProducts = allProducts.filter((item) => {
          const matchesBalagruha =
            !item.balagruhaId || item.balagruhaId === balagruhaId;
          return matchesBalagruha;
        });

        // Further filter to get only low-stock products
        const lowStock = balagruhaProducts.filter((item) => {
          return item.stock <= item.lowStockThreshold;
        });

        setProducts(balagruhaProducts); // All products for this balagruha
        setLowStockProducts(lowStock); // Only low-stock products
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      showToast("Error loading products", "error");
    } finally {
      setFetchingProducts(false);
    }
  };

  // ============================================================================
  // EVENT HANDLERS - Balagruha Selection
  // ============================================================================

  const handleBalagruhaChange = (e) => {
    const balagruhaId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      balagruhaId,
      items: [], // Reset items when balagruha changes
    }));
    setSelectedProducts(new Set()); // Clear selected products

    if (balagruhaId) {
      fetchProducts(balagruhaId);
    } else {
      setLowStockProducts([]);
    }
  };

  // Story 2.5: When purchase category changes, refetch products so the picker is scoped.
  useEffect(() => {
    if (!formData.balagruhaId) {
      return;
    }

    // Sprint5-Story-EditDelete: Don't clear items when in edit mode
    // The edit initialization handles setting up items correctly
    if (requestToEdit) {
      return;
    }

    // Clear selection since chosen products may no longer be visible in new scope
    setSelectedProducts(new Set());
    setFormData((prev) => ({
      ...prev,
      items: [],
    }));

    fetchProducts(formData.balagruhaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category, requestToEdit]);

  // ============================================================================
  // EVENT HANDLERS - Product Selection
  // ============================================================================

  const handleProductToggle = (product) => {
    const newSelected = new Set(selectedProducts);

    if (newSelected.has(product._id)) {
      // Uncheck - remove from selection
      newSelected.delete(product._id);
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.productId !== product._id),
      }));
    } else {
      // Check - add to selection
      newSelected.add(product._id);
      setFormData((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            productId: product._id,
            productName: product.name,
            productSKU: product.sku,
            requestedQuantity: 0, // Default quantity - user must enter a value
            isPendingProduct: product.isPendingProduct || false, // Sprint5-Story-25: Track if pending
          },
        ],
      }));
    }

    setSelectedProducts(newSelected);
  };
  // ============================================================================
  // EVENT HANDLERS - Item Quantity and Cost
  // ============================================================================

  const updateItemQuantity = (index, quantity) => {
    const parsed = quantity === "" ? 0 : Math.max(0, parseInt(quantity) || 0);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              requestedQuantity: parsed,
              estimatedTotalCost: parsed * (item.estimatedUnitCost || 0),
            }
          : item,
      ),
    }));
  };
  // Update estimated unit cost for an item
  const updateItemCost = (index, cost) => {
    const unitCost = parseFloat(cost) || 0;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              estimatedUnitCost: unitCost,
              estimatedTotalCost: (item.requestedQuantity || 1) * unitCost,
            }
          : item,
      ),
    }));
  };

  const removeItem = async (index) => {
    const removedItem = formData.items[index];
    const removedProductId = removedItem.productId;

    // If editing existing request, update DB immediately
    if (requestToEdit) {
      try {
        const updatedItems = formData.items.filter((_, i) => i !== index);
        const submitData = new FormData();
        submitData.append("balagruhaId", formData.balagruhaId);
        submitData.append("category", formData.category);
        submitData.append("priority", formData.priority);
        if (formData.deadline) {
          submitData.append("deadline", formData.deadline);
        }
        const itemsToSubmit = updatedItems.map((item) => ({
          ...item,
          productId: String(item.productId).startsWith("manual-")
            ? null
            : item.productId,
          isManualEntry: String(item.productId).startsWith("manual-")
            ? true
            : false,
        }));
        submitData.append("items", JSON.stringify(itemsToSubmit));

        await updatePurchaseRequest(requestToEdit._id, submitData);
        showToast("Product removed successfully", "success");
      } catch (error) {
        showToast("Error removing product", "error");
        return;
      }
    }

    // Remove from local state
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(removedProductId);
      return newSet;
    });
  };

  // ============================================================================
  // EVENT HANDLERS - File Upload (Copied from MachineRepairsView.jsx)
  // ============================================================================

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // ============================================================================
  // Sprint5-Story-25: INLINE PRODUCT ADDITION HANDLERS
  // ============================================================================

  const handleAddNewProduct = async () => {
    // Reset errors
    setNewProductErrors({});

    // Validation
    const errors = {};
    if (!newProductForm.name.trim()) {
      errors.name = "Product name is required";
    }
    if (!newProductForm.category) {
      errors.category = "Category is required";
    }
    if (!newProductForm.unit) {
      errors.unit = "Unit is required";
    }

    if (newProductForm.sku.trim()) {
      if (!/^[A-Z0-9-]+$/.test(newProductForm.sku)) {
        errors.sku =
          "SKU must contain only uppercase letters, numbers, and hyphens";
      } else if (
        newProductForm.sku.length < 3 ||
        newProductForm.sku.length > 20
      ) {
        errors.sku = "SKU must be between 3 and 20 characters";
      }
    }

    const maxPrice = Number(newProductForm.maxPrice);
    if (newProductForm.category === "ISF Shop") {
      if (
        newProductForm.maxPrice === "" ||
        Number.isNaN(maxPrice) ||
        maxPrice < 0
      ) {
        errors.maxPrice = "Max Price (₹) is required for ISF Shop items";
      }
    } else if (
      newProductForm.maxPrice !== "" &&
      (Number.isNaN(maxPrice) || maxPrice < 0)
    ) {
      errors.maxPrice = "Max Price must be a non-negative number";
    }

    const sellingPrice = Number(newProductForm.sellingPrice);
    if (newProductForm.category === "ISF Shop") {
      if (
        newProductForm.sellingPrice === "" ||
        Number.isNaN(sellingPrice) ||
        sellingPrice < 0
      ) {
        errors.sellingPrice =
          "Selling Price (coins) is required for ISF Shop items";
      }
    } else if (
      newProductForm.sellingPrice !== "" &&
      (Number.isNaN(sellingPrice) || sellingPrice < 0)
    ) {
      errors.sellingPrice = "Selling Price must be a non-negative number";
    }

    if (
      newProductForm.discountPrice !== "" &&
      newProductForm.discountPrice !== null &&
      newProductForm.discountPrice !== undefined
    ) {
      const discountPrice = Number(newProductForm.discountPrice);
      if (Number.isNaN(discountPrice) || discountPrice < 0) {
        errors.discountPrice = "Discount price must be a non-negative number";
      } else if (!Number.isNaN(sellingPrice) && discountPrice >= sellingPrice) {
        errors.discountPrice = "Discount price must be less than selling price";
      }
    }

    if (
      newProductForm.stock !== "" &&
      newProductForm.stock !== null &&
      newProductForm.stock !== undefined
    ) {
      const stock = Number(newProductForm.stock);
      if (Number.isNaN(stock) || stock < 0) {
        errors.stock = "Stock must be a non-negative number";
      }
    }

    if (
      newProductForm.lowStockThreshold !== "" &&
      newProductForm.lowStockThreshold !== null &&
      newProductForm.lowStockThreshold !== undefined
    ) {
      const threshold = Number(newProductForm.lowStockThreshold);
      if (Number.isNaN(threshold) || threshold < 0) {
        errors.lowStockThreshold =
          "Low stock threshold must be a non-negative number";
      }
    }

    const approvedVendors = newProductSelectedVendors
      .filter((v) => v.vendorId)
      .map((v) => ({ vendorId: v.vendorId, rank: v.rank }));
    if (approvedVendors.length === 0) {
      errors.approvedVendors = "Please select at least one approved vendor";
    }

    if (Object.keys(errors).length > 0) {
      setNewProductErrors(errors);
      return;
    }

    try {
      // Call API to create pending product
      const response = await createPendingProduct({
        name: newProductForm.name.trim(),
        category: newProductForm.category,
        unit: newProductForm.unit,
        sku: newProductForm.sku.trim() || undefined,
        description: newProductForm.description.trim() || undefined,
        maxPrice: Number(newProductForm.maxPrice),
        sellingPrice: Number(newProductForm.sellingPrice),
        discountPrice:
          newProductForm.discountPrice !== ""
            ? Number(newProductForm.discountPrice)
            : undefined,
        approvedVendors,
        stock: newProductForm.stock !== "" ? Number(newProductForm.stock) : 0,
        lowStockThreshold:
          newProductForm.lowStockThreshold !== ""
            ? Number(newProductForm.lowStockThreshold)
            : 10,
        imageUrl: newProductForm.imageUrl || undefined,
        images: newProductForm.imageUrl
          ? [{ url: newProductForm.imageUrl, isPrimary: true }]
          : [],
      });

      if (response.success && response.product) {
        const newProduct = response.product;

        // Add to products list (for immediate display)
        setProducts((prev) => [newProduct, ...prev]);

        // Auto-select the new product
        const newSelected = new Set(selectedProducts);
        newSelected.add(newProduct._id);
        setSelectedProducts(newSelected);

        // Add to formData items with isPendingProduct flag
        setFormData((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              productId: newProduct._id,
              productName: newProduct.name,
              productSKU: newProduct.sku,
              requestedQuantity: 1,
              isPendingProduct: true, // Mark as pending
            },
          ],
        }));

        // Reset form and hide
        resetInlineProductForm();
        setShowAddProductForm(false);

        showToast(
          "New product created successfully! Please fill in quantity and estimated cost.",
          "success",
        );
      } else {
        showToast("Failed to create product. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error creating pending product:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to create product";
      showToast(errorMsg, "error");
    }
  };

  const handleCancelAddProduct = () => {
    resetInlineProductForm();
    setShowAddProductForm(false);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const calculateTotalCost = () => {
    return 0;
  };

  const getStockBadge = (product) => {
    if (product.stock === 0) {
      return <span className="stock-badge out-of-stock">🔴</span>;
    } else if (product.stock <= product.lowStockThreshold) {
      return <span className="stock-badge low-stock">⚠️</span>;
    }
    return null;
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation - Balagruha
    if (!formData.balagruhaId) {
      showToast("Please select a balagruha", "error");
      return;
    }

    // Validation - Category (Sprint5-Story-20)
    if (!formData.category) {
      showToast("Please select a purchase category", "error");
      return;
    }

    // Deadline is optional, but if provided it cannot be in the past
    if (formData.deadline) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (formData.deadline < todayStr) {
        showToast("Deadline cannot be in the past", "error");
        return;
      }
    }

    // Validation - At least one product
    if (formData.items.length === 0) {
      showToast("Please select at least one product", "error");
      return;
    }

    // Validation - All items must have valid quantity and cost
    const invalidItems = formData.items.filter(
      (item) => !item.requestedQuantity || item.requestedQuantity < 1,
    );

    if (invalidItems.length > 0) {
      showToast("Please enter valid quantity (≥1) for all products", "error");
      return;
    }

    // Validation - All items must have estimated unit cost
    const itemsWithoutCost = formData.items.filter(
      (item) => !item.estimatedUnitCost || item.estimatedUnitCost <= 0,
    );

    if (itemsWithoutCost.length > 0) {
      showToast(
        "Please enter estimated unit cost (> ₹0) for all products",
        "error",
      );
      return;
    }

    // Validation - Reason no longer required

    try {
      setLoading(true);

      // Create FormData (required for file upload)
      const submitData = new FormData();

      // Add regular fields
      submitData.append("balagruhaId", formData.balagruhaId);
      submitData.append("category", formData.category); // Sprint5-Story-20
      submitData.append("priority", formData.priority);
      if (formData.deadline) {
        submitData.append("deadline", formData.deadline);
      }
      const itemsToSubmit = formData.items.map((item) => ({
        ...item,
        productId: String(item.productId).startsWith("manual-")
          ? null
          : item.productId,
        isManualEntry: String(item.productId).startsWith("manual-")
          ? true
          : false,
      }));
      submitData.append("items", JSON.stringify(itemsToSubmit)); // Stringify items array

      // Add files
      formData.attachments.forEach((file) => {
        submitData.append("attachments", file);
      });

      // Send request
      const response = requestToEdit
        ? await updatePurchaseRequest(requestToEdit._id, submitData)
        : await createPurchaseRequest(submitData);

      if (response.success) {
        const savedRequest =
          response.data?.purchaseRequest || response.data?.request;
        if (savedRequest?.attachments) {
          setExistingAttachments(savedRequest.attachments);
          setFormData((prev) => ({ ...prev, attachments: [] }));
        }

        showToast(
          requestToEdit
            ? "Purchase request updated successfully"
            : "Purchase request created successfully",
          "success",
        );
        onSuccess();
      } else {
        showToast(
          response.message ||
            `Error ${requestToEdit ? "updating" : "creating"} request`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error creating request:", error);
      showToast(
        error.response?.data?.message || "Error creating request",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const ConfirmDialog = ({ message, onYes, onNo }) => (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗑️</div>
        <h3 style={{ margin: "0 0 8px", color: "#1f2937", fontSize: "18px" }}>
          Are you sure?
        </h3>
        <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onNo}
            style={{
              padding: "10px 24px",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onYes}
            style={{
              padding: "10px 24px",
              backgroundColor: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container large purchase-request-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            {requestToEdit
              ? "✏️ Edit Purchase Request"
              : "📝 New Purchase Request (Multi-Product)"}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* ================================================================ */}
            {/* BALAGRUHA SELECTION */}
            {/* ================================================================ */}

            <div className="form-group">
              <label className="form-label">
                Balagruha <span className="required">*</span>
              </label>
              <select
                value={formData.balagruhaId}
                onChange={handleBalagruhaChange}
                required
                disabled={
                  userBalagruhas.length === 1 &&
                  !balagruhas.some((bg) => bg._id === "STOCK")
                }
                className="form-select"
              >
                <option value="">Select Balagruha or STOCK</option>

                {/* Sprint5-Story-21: STOCK Option - First in list */}
                {balagruhas
                  .filter((bg) => bg._id === "STOCK")
                  .map((bg) => (
                    <option
                      key={bg._id}
                      value={bg._id}
                      style={{ fontWeight: "bold", color: "#1976d2" }}
                    >
                      📦 {bg.name} (General Inventory)
                    </option>
                  ))}

                {balagruhas.some((bg) => bg._id === "STOCK") &&
                  balagruhas.some((bg) => bg._id !== "STOCK") && (
                    <option disabled>──────────</option>
                  )}

                {/* Regular Balagruhas */}
                {balagruhas
                  .filter((bg) => bg._id !== "STOCK")
                  .map((bg) => (
                    <option key={bg._id} value={bg._id}>
                      {bg.name}
                    </option>
                  ))}
              </select>
              {userBalagruhas.length === 1 &&
                !balagruhas.some((bg) => bg._id === "STOCK") && (
                  <small className="form-hint">
                    Only one balagruha assigned to you
                  </small>
                )}
              {formData.balagruhaId === "STOCK" && (
                <small className="form-hint" style={{ color: "#1976d2" }}>
                  💡 STOCK purchases are visible to all users and can be
                  allocated to Balagruhas later
                </small>
              )}
            </div>

            {/* ================================================================ */}
            {/* CATEGORY SELECTION - Sprint5-Story-20 */}
            {/* ================================================================ */}

            <div className="form-group">
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                required
                className="form-select"
              >
                <option value="">Select category...</option>
                <option value="ISF Shop">ISF Shop</option>
                <option value="Medicines">Medicines</option>
                <option value="Consumables">Consumables</option>
                <option value="Repairs">Repairs</option>
                <option value="Infra">Infra</option>
                <option value="Others">Others</option>
              </select>
              <small className="form-hint">
                Categorize this purchase request for better tracking and
                reporting
              </small>
            </div>

            {/* ================================================================ */}
            {/* PRIORITY (C3): Per-request */}
            {/* ================================================================ */}

            <div className="form-group">
              <label className="form-label">
                Priority <span className="required">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, priority: e.target.value }))
                }
                className="form-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <small className="form-hint">Use High only when urgent.</small>
            </div>

            {/* ================================================================ */}
            {/* DEADLINE (C3): Per-request */}
            {/* ================================================================ */}

            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deadline: e.target.value }))
                }
                className="form-input"
              />
              <small className="form-hint">
                Deadline must be today or a future date
              </small>
            </div>

            {/* ================================================================ */}
            {/* PRODUCT SELECTION - Checkbox List */}
            {/* Hidden during Reorder flow for Purchase Managers since the */}
            {/* product is already pre-selected via initialProduct */}
            {/* ================================================================ */}

            {!(initialProduct && isPurchaseManager) && (
            <div className="form-group">
              <label className="form-label">
                Select Products <span className="required">*</span>
              </label>

              {!canAddProducts && (
                <small className="form-hint">
                  Need a new item? Contact an Admin to add it to the Master
                  Catalog.
                </small>
              )}

              {/* Sprint5-Story-25: Add New Product Button — Admin + PM */}
              {canAddProducts &&
                formData.balagruhaId &&
                !showAddProductForm && (
                  <button
                    type="button"
                    className="btn-add-product"
                    onClick={() => setShowAddProductForm(true)}
                    style={{
                      marginBottom: "10px",
                      padding: "8px 16px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    + Add New Product
                  </button>
                )}

              {/* Sprint5-Story-25: Inline Product Addition Form — Admin + PM */}
              {canAddProducts && showAddProductForm && (
                <div
                  className="inline-product-form"
                  style={{
                    border: "2px solid #007bff",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: "16px",
                      color: "#007bff",
                    }}
                  >
                    Add New Product
                  </h4>

                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Product Name <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newProductForm.name}
                      onChange={(e) =>
                        handleNewProductFieldChange("name", e.target.value)
                      }
                      placeholder="Enter product name"
                    />
                    {newProductErrors.name && (
                      <small style={{ color: "red" }}>
                        {newProductErrors.name}
                      </small>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Category <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        value={newProductForm.category}
                        onChange={(e) =>
                          handleNewProductFieldChange(
                            "category",
                            e.target.value,
                          )
                        }
                      >
                        <option value="ISF Shop">ISF Shop</option>
                        <option value="Medicines">Medicines</option>
                        <option value="Consumables">Consumables</option>
                        <option value="Repairs">Repairs</option>
                        <option value="Infra">Infra</option>
                        <option value="Others">Others</option>
                      </select>
                      {newProductErrors.category && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.category}
                        </small>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Unit <span style={{ color: "red" }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        value={newProductForm.unit}
                        onChange={(e) =>
                          handleNewProductFieldChange("unit", e.target.value)
                        }
                      >
                        <option value="pieces">Pieces</option>
                        <option value="packets">Packets</option>
                        <option value="boxes">Boxes</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="liters">Liters</option>
                        <option value="meters">Meters</option>
                        <option value="units">Units</option>
                        <option value="grams">Grams</option>
                        <option value="ml">Milliliters (ml)</option>
                        <option value="sets">Sets</option>
                        <option value="pairs">Pairs</option>
                        <option value="dozen">Dozen</option>
                      </select>
                      {newProductErrors.unit && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.unit}
                        </small>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      SKU (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={newProductForm.sku}
                      onChange={(e) =>
                        handleNewProductFieldChange("sku", e.target.value)
                      }
                      placeholder="Leave blank for auto-generation"
                    />
                    {newProductErrors.sku && (
                      <small style={{ color: "red" }}>
                        {newProductErrors.sku}
                      </small>
                    )}
                    <small style={{ color: "#6c757d" }}>
                      If left blank, SKU will be auto-generated (NEW-
                      {Date.now()})
                    </small>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      value={newProductForm.description}
                      onChange={(e) =>
                        handleNewProductFieldChange(
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder="Enter product description"
                      rows="2"
                    />
                  </div>

                  {/* Story 1.2 / 1.3: Governance fields */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Max Price (₹){" "}
                        {newProductForm.category === "ISF Shop" && (
                          <span style={{ color: "red" }}>*</span>
                        )}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={newProductForm.maxPrice}
                        onChange={(e) =>
                          handleNewProductFieldChange(
                            "maxPrice",
                            e.target.value,
                          )
                        }
                        placeholder="Procurement limit"
                        min="0"
                      />
                      {newProductErrors.maxPrice && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.maxPrice}
                        </small>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Selling Price (coins){" "}
                        {newProductForm.category === "ISF Shop" && (
                          <span style={{ color: "red" }}>*</span>
                        )}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={newProductForm.sellingPrice}
                        onChange={(e) =>
                          handleNewProductFieldChange(
                            "sellingPrice",
                            e.target.value,
                          )
                        }
                        placeholder="Shop price"
                        min="0"
                        required
                      />
                      {newProductErrors.sellingPrice && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.sellingPrice}
                        </small>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Discount Price (coins)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={newProductForm.discountPrice}
                        onChange={(e) =>
                          handleNewProductFieldChange(
                            "discountPrice",
                            e.target.value,
                          )
                        }
                        placeholder="Optional"
                        min="0"
                      />
                      {newProductErrors.discountPrice && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.discountPrice}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Approved Vendors */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <label style={{ marginBottom: 0, fontWeight: "bold" }}>
                        Approved Vendors (Ranked){" "}
                        <span style={{ color: "red" }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVendorModal(true)}
                        style={{
                          fontSize: "12px",
                          color: "#007bff",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "bold",
                          padding: 0,
                        }}
                      >
                        + Create New Vendor
                      </button>
                    </div>

                    {vendorsLoading ? (
                      <small style={{ color: "#6c757d" }}>
                        Loading vendors...
                      </small>
                    ) : vendorsError ? (
                      <div>
                        <small style={{ color: "red" }}>{vendorsError}</small>
                        <div>
                          <button
                            type="button"
                            onClick={fetchVendors}
                            style={{
                              marginTop: "6px",
                              padding: "6px 12px",
                              backgroundColor: "#f8f9fa",
                              border: "1px solid #ced4da",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        {newProductSelectedVendors.map((slot, index) => (
                          <React.Fragment key={slot.rank}>
                            <div
                              style={{ fontSize: "13px", fontWeight: "bold" }}
                            >
                              Rank {slot.rank}
                            </div>
                            <select
                              className="form-select"
                              value={slot.vendorId}
                              onChange={(e) =>
                                handleNewProductVendorChange(
                                  index,
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select vendor...</option>
                              {vendorOptions.map((v) => (
                                <option key={v._id} value={v._id}>
                                  {v.name} ({v.phone})
                                </option>
                              ))}
                            </select>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {newProductErrors.approvedVendors && (
                      <small style={{ color: "red" }}>
                        {newProductErrors.approvedVendors}
                      </small>
                    )}

                    {!vendorsLoading &&
                      !vendorsError &&
                      vendorOptions.length === 0 && (
                        <small style={{ color: "#6c757d" }}>
                          No active vendors found. Please create vendors in Shop
                          Admin → Vendors.
                        </small>
                      )}
                  </div>

                  {/* Stock */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Stock
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={
                          newProductForm.stock === "0"
                            ? ""
                            : newProductForm.stock
                        }
                        onChange={(e) =>
                          handleNewProductFieldChange("stock", e.target.value)
                        }
                        placeholder="0"
                        min="0"
                      />
                      {newProductErrors.stock && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.stock}
                        </small>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={newProductForm.lowStockThreshold}
                        onChange={(e) =>
                          handleNewProductFieldChange(
                            "lowStockThreshold",
                            e.target.value,
                          )
                        }
                        placeholder="10"
                        min="0"
                      />
                      {newProductErrors.lowStockThreshold && (
                        <small style={{ color: "red" }}>
                          {newProductErrors.lowStockThreshold}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Image */}
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: "bold",
                      }}
                    >
                      Product Image
                    </label>
                    <div style={{ maxWidth: "520px" }}>
                      <ImageUpload
                        currentImageUrl={newProductForm.imageUrl}
                        onUpload={(url) =>
                          handleNewProductFieldChange("imageUrl", url)
                        }
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleAddNewProduct}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Create & Add Product
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAddProduct}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#6c757d",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Product Name Entry */}
              {/* <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  margin: "10px 0",
                  padding: "10px 12px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "6px",
                  border: "1px dashed #3b82f6",
                }}
              >
                <input
                  type="text"
                  placeholder="Or type product name manually..."
                  value={manualProductName}
                  onChange={(e) => setManualProductName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const name = manualProductName.trim();
                      if (!name) return;
                      const tempId = `manual-${Date.now()}`;
                      setFormData((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            productId: tempId,
                            productName: name,
                            productSKU: "MANUAL",
                            requestedQuantity: 1,
                            estimatedUnitCost: 0,
                            estimatedTotalCost: 0,
                          },
                        ],
                      }));
                      setManualProductName("");
                    }
                  }}
                  className="form-input"
                  style={{ flex: 1, margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = manualProductName.trim();
                    if (!name) return;
                    const tempId = `manual-${Date.now()}`;
                    setFormData((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        {
                          productId: tempId,
                          productName: name,
                          productSKU: "MANUAL",
                          requestedQuantity: 1,
                          estimatedUnitCost: 0,
                          estimatedTotalCost: 0,
                        },
                      ],
                    }));
                    setManualProductName("");
                  }}
                  disabled={!manualProductName.trim()}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: manualProductName.trim()
                      ? "#3b82f6"
                      : "#d1d5db",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: manualProductName.trim()
                      ? "pointer"
                      : "not-allowed",
                    whiteSpace: "nowrap",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  + Add Row
                </button>
              </div> */}

              {/* Toggle: Show All Products */}
              <div className="product-filter">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showAllProducts}
                    onChange={(e) => setShowAllProducts(e.target.checked)}
                    disabled={!formData.balagruhaId || fetchingProducts}
                  />
                  Show all products (not just low stock)
                </label>
              </div>

              {/* Product Multi-Select Dropdown */}
              {formData.balagruhaId && !fetchingProducts && (
                <div className="multi-select-dropdown">
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    disabled={!formData.balagruhaId || fetchingProducts}
                  >
                    <span>
                      {selectedProducts.size === 0
                        ? "Select products..."
                        : `${selectedProducts.size} product${selectedProducts.size > 1 ? "s" : ""} selected`}
                    </span>
                    <span className="dropdown-arrow">
                      {productDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {productDropdownOpen && (
                    <div className="dropdown-panel">
                      {/* Search Bar */}
                      <div className="dropdown-search">
                        <input
                          type="text"
                          placeholder="Search products by name or SKU..."
                          value={productSearchQuery}
                          onChange={(e) =>
                            setProductSearchQuery(e.target.value)
                          }
                          className="search-input"
                        />
                      </div>

                      {/* Product Checklist */}
                      <div className="dropdown-options">
                        {(showAllProducts ? products : lowStockProducts)
                          .filter(
                            (product) =>
                              productSearchQuery === "" ||
                              product.name
                                .toLowerCase()
                                .includes(productSearchQuery.toLowerCase()) ||
                              product.sku
                                .toLowerCase()
                                .includes(productSearchQuery.toLowerCase()),
                          )
                          .map((product) => (
                            <label
                              key={product._id}
                              className="dropdown-option"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product._id)}
                                onChange={() => {
                                  handleProductToggle(product);
                                  setProductDropdownOpen(false);
                                }}
                              />
                              <span className="product-details">
                                <span className="product-name">
                                  {product.name}
                                  {/* Sprint5-Story-25: Badge for pending products */}
                                  {product.isPendingProduct && (
                                    <span
                                      style={{
                                        marginLeft: "6px",
                                        padding: "1px 6px",
                                        backgroundColor: "#ff9800",
                                        color: "white",
                                        borderRadius: "3px",
                                        fontSize: "10px",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      NEW
                                    </span>
                                  )}
                                </span>
                                <span className="product-meta">
                                  {product.sku} · Stock: {product.stock}/
                                  {product.lowStockThreshold}
                                  {getStockBadge(product)}
                                </span>
                              </span>
                            </label>
                          ))}

                        {(showAllProducts ? products : lowStockProducts).filter(
                          (product) =>
                            productSearchQuery === "" ||
                            product.name
                              .toLowerCase()
                              .includes(productSearchQuery.toLowerCase()) ||
                            product.sku
                              .toLowerCase()
                              .includes(productSearchQuery.toLowerCase()),
                        ).length === 0 && (
                          <div className="no-results">
                            No products found matching "{productSearchQuery}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {fetchingProducts && (
                <p className="form-hint">Loading products...</p>
              )}

              {!formData.balagruhaId && (
                <p className="form-hint">Please select a balagruha first</p>
              )}

              {formData.balagruhaId &&
                !fetchingProducts &&
                lowStockProducts.filter(
                  (p) =>
                    !p.balagruhaId || p.balagruhaId === formData.balagruhaId,
                ).length === 0 &&
                !showAllProducts && (
                  <small className="form-hint success">
                    ✅ No low-stock items in this balagruha! Toggle to show all
                    products.
                  </small>
                )}
            </div>
            )}

            {/* ================================================================ */}
            {/* SELECTED PRODUCTS TABLE */}
            {/* ================================================================ */}

            {formData.items.length > 0 && (
              <div
                className="selected-products-section"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    🛒 Selected Products
                    <span
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "white",
                        borderRadius: "999px",
                        padding: "2px 10px",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {formData.items.length}
                    </span>
                  </h4>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "600",
                    }}
                  >
                    Grand Total:{" "}
                    <span style={{ color: "#16a34a", fontWeight: "800" }}>
                      ₹
                      {formData.items
                        .reduce(
                          (sum, item) => sum + (item.estimatedTotalCost || 0),
                          0,
                        )
                        .toFixed(2)}
                    </span>
                  </span>
                </div>

                <div className="table-responsive">
                  <table
                    className="selected-items-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "28%",
                            textAlign: "left",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          Product
                        </th>
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "14%",
                            textAlign: "left",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          SKU
                        </th>
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "12%",
                            textAlign: "left",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          Qty *
                        </th>
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "16%",
                            textAlign: "left",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          Est. Unit Cost (₹) *
                        </th>
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "15%",
                            textAlign: "right",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          Total (₹)
                        </th>
                        <th
                          style={{
                            padding: "10px 10px",
                            width: "15%",
                            textAlign: "center",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            color: "#64748b",
                            fontWeight: "700",
                            borderBottom: "2px solid #e2e8f0",
                          }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr
                          key={item.productId}
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#ffffff" : "#fafbfc",
                            transition: "background-color 0.15s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f0f7ff")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              index % 2 === 0 ? "#ffffff" : "#fafbfc")
                          }
                        >
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #f1f5f9",
                              fontWeight: "600",
                              color: "#1e293b",
                              fontSize: "14px",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.productName}
                            {item.isPendingProduct && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  padding: "2px 8px",
                                  backgroundColor: "#fff3e0",
                                  color: "#e65100",
                                  border: "1px solid #ffcc80",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                }}
                              >
                                NEW
                              </span>
                            )}
                          </td>
                          <td
                            className="sku-cell"
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #f1f5f9",
                              fontSize: "12px",
                              color: "#64748b",
                              fontFamily: "monospace",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.productSKU}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <input
                              type="number"
                              className="table-input"
                              value={
                                item.requestedQuantity === 0
                                  ? ""
                                  : item.requestedQuantity
                              }
                              onChange={(e) =>
                                updateItemQuantity(index, e.target.value)
                              }
                              onFocus={(e) => e.target.select()}
                              min="0"
                              placeholder="0"
                              required
                              style={{
                                width: "100%",
                                padding: "7px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "13px",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <input
                              type="number"
                              className="table-input"
                              value={item.estimatedUnitCost || ""}
                              onChange={(e) =>
                                updateItemCost(index, e.target.value)
                              }
                              min="0"
                              step="0.01"
                              placeholder="₹0.00"
                              required
                              style={{
                                width: "100%",
                                padding: "7px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                fontSize: "13px",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              textAlign: "right",
                              fontWeight: "700",
                              color: "#16a34a",
                              fontSize: "14px",
                              borderBottom: "1px solid #f1f5f9",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ₹{(item.estimatedTotalCost || 0).toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "10px",
                              textAlign: "center",
                              verticalAlign: "middle",
                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            {deleteConfirmIndex === index ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "#fff5f5",
                                  border: "1px solid #fed7d7",
                                  borderRadius: "6px",
                                  padding: "6px 8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "#c53030",
                                    fontWeight: "600",
                                  }}
                                >
                                  Remove?
                                </span>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      removeItem(index);
                                      setDeleteConfirmIndex(null);
                                    }}
                                    style={{
                                      fontSize: "11px",
                                      backgroundColor: "#e53e3e",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 8px",
                                      cursor: "pointer",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmIndex(null)}
                                    style={{
                                      fontSize: "11px",
                                      backgroundColor: "#e2e8f0",
                                      color: "#4a5568",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "2px 8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon-remove"
                                onClick={() => setDeleteConfirmIndex(index)}
                                title="Remove product"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid #fecaca",
                                  backgroundColor: "#fef2f2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  transition: "background-color 0.15s ease",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#fee2e2")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#fef2f2")
                                }
                              >
                                ✖
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 20px",
                    background:
                      "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                    borderTop: "2px solid #d1fae5",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#065f46",
                    }}
                  >
                    Grand Total
                  </span>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: "#16a34a",
                    }}
                  >
                    ₹
                    {formData.items
                      .reduce(
                        (sum, item) => sum + (item.estimatedTotalCost || 0),
                        0,
                      )
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* FILE UPLOAD SECTION */}
            {/* ================================================================ */}

            <div className="form-group">
              <label className="form-label">Attachments (Optional)</label>
              {existingAttachments.length > 0 && (
                <div className="existing-attachments purchase-request-attachments">
                  <h4>Uploaded Files ({existingAttachments.length}):</h4>
                  <div className="attachments-grid purchase-request-attachments-grid">
                    {existingAttachments.map((file, index) => (
                      <a
                        key={file._id || file.fileUrl || `existing-${index}`}
                        href={getAttachmentHref(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-item purchase-request-attachment-item"
                        title={getAttachmentName(file)}
                        onClick={(event) =>
                          handleExistingAttachmentOpen(event, file)
                        }
                      >
                        <FilePreview file={file} />
                        <div className="attachment-actions">
                          <span className="file-name">
                            {getAttachmentName(file)}
                          </span>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={(event) =>
                              handleRemoveExistingAttachment(event, file)
                            }
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="file-upload-container">
                <input
                  type="file"
                  id="purchase-request-file-upload"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  multiple
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="purchase-request-file-upload"
                  className="file-upload-label"
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  Choose Files (PDF, Images, Documents)
                </label>
              </div>

              {/* File Previews */}
              {formData.attachments.length > 0 && (
                <div className="new-attachments purchase-request-attachments">
                  <h4>Selected Files ({formData.attachments.length}):</h4>
                  <div className="attachments-grid purchase-request-attachments-grid">
                    {formData.attachments.map((file, index) => (
                      <div key={`new-${index}`} className="attachment-item purchase-request-attachment-item">
                        <FilePreview file={file} />
                        <div className="attachment-actions">
                          <span className="file-name" title={file.name}>{file.name}</span>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={() => removeFile(index)}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reason and Justification removed as per user request */}
          </div>

          {/* ================================================================ */}
          {/* MODAL FOOTER - Action Buttons */}
          {/* ================================================================ */}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || formData.items.length === 0}
            >
              {loading
                ? requestToEdit
                  ? "Updating..."
                  : "Creating..."
                : requestToEdit
                  ? "Update Request"
                  : "Create Request"}
            </button>
          </div>
        </form>
        {/* ✅ MOVED HERE - inside modal-container so clicks don't bubble to overlay */}
        {deleteConfirmIndex !== null && (
          <ConfirmDialog
            message="Are you sure you want to remove this product from the list?"
            onYes={() => {
              removeItem(deleteConfirmIndex);
              setDeleteConfirmIndex(null);
            }}
            onNo={() => setDeleteConfirmIndex(null)}
          />
        )}
        {attachmentToRemove && (
          <ConfirmDialog
            message={`Remove "${getAttachmentName(attachmentToRemove)}"? This cannot be undone.`}
            onYes={confirmRemoveExistingAttachment}
            onNo={() => setAttachmentToRemove(null)}
          />
        )}
      </div>

      {/* Inline Vendor Creation Modal */}
      {showVendorModal && (
        <VendorFormModal
          onClose={() => setShowVendorModal(false)}
          onSubmit={handleCreateVendor}
        />
      )}
    </div>
  );
}
