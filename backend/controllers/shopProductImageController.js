const ShopItem = require('../models/shopItem');
const { uploadShopProductImage, deleteShopProductImage } = require('../services/aws/s3');
const fs = require('fs');
const { errorLogger } = require('../config/pino-config');

/**
 * Upload product images
 * POST /api/v2/shop/products/:productId/images
 * Allows coaches/admins to upload up to 5 images per product
 */
exports.uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;
    const files = req.files;

    // Validation: Check if files exist
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided. Please select at least one image.'
      });
    }

    // Validation: Max 5 images per request
    if (files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per upload'
      });
    }

    // Check product exists
    const product = await ShopItem.findById(productId);
    if (!product) {
      // Cleanup uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validation: Check total image count (existing + new)
    const existingImageCount = product.images ? product.images.length : 0;
    if (existingImageCount + files.length > 5) {
      // Cleanup uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      return res.status(400).json({
        success: false,
        message: `Cannot upload ${files.length} images. Product already has ${existingImageCount} image(s). Maximum 5 images allowed per product.`
      });
    }

    const uploadedImages = [];
    const failedUploads = [];

    // Upload each image to S3
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await uploadShopProductImage(file.path, productId);

        if (result.success) {
          uploadedImages.push({
            url: result.url,
            isPrimary: existingImageCount === 0 && i === 0, // First image is primary only if no existing images
            uploadedAt: new Date()
          });

          // Cleanup local file after successful S3 upload
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } else {
          failedUploads.push({
            filename: file.originalname,
            error: result.message
          });

          // Cleanup failed file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      } catch (uploadError) {
        errorLogger.error({
          error: uploadError.message,
          file: file.originalname,
          productId
        }, 'Failed to upload product image');

        failedUploads.push({
          filename: file.originalname,
          error: uploadError.message
        });

        // Cleanup failed file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Check if at least one image uploaded successfully
    if (uploadedImages.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any images',
        failedUploads
      });
    }

    // Update product with new images
    product.images = [...(product.images || []), ...uploadedImages];
    await product.save();

    // Log success
    errorLogger.info({
      productId,
      uploadedCount: uploadedImages.length,
      failedCount: failedUploads.length
    }, 'Product images uploaded');

    res.json({
      success: true,
      images: uploadedImages,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      ...(failedUploads.length > 0 && {
        warning: `${failedUploads.length} image(s) failed to upload`,
        failedUploads
      })
    });

  } catch (error) {
    errorLogger.error({
      error: error.message,
      productId: req.params.productId
    }, 'Product image upload controller error');

    // Cleanup any remaining files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Delete product image
 * DELETE /api/v2/shop/products/:productId/images/:imageId
 * Allows coaches/admins to delete a specific product image
 */
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    const product = await ShopItem.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find image in product
    const imageIndex = product.images.findIndex(
      img => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in product'
      });
    }

    const imageToDelete = product.images[imageIndex];

    // Delete from S3 (best effort - continue even if fails)
    try {
      await deleteShopProductImage(imageToDelete.url);
    } catch (s3Error) {
      errorLogger.error({
        error: s3Error.message,
        imageUrl: imageToDelete.url
      }, 'Failed to delete image from S3 (continuing with DB removal)');
      // Continue - remove from DB anyway
    }

    // Remove from product
    product.images.splice(imageIndex, 1);

    // If deleted image was primary, make first image primary
    if (imageToDelete.isPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true;
    }

    await product.save();

    errorLogger.info({
      productId,
      imageId,
      imageUrl: imageToDelete.url
    }, 'Product image deleted');

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    errorLogger.error({
      error: error.message,
      productId: req.params.productId,
      imageId: req.params.imageId
    }, 'Product image delete controller error');

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Set primary image
 * PUT /api/v2/shop/products/:productId/images/:imageId/primary
 * Allows coaches/admins to set which image is the primary product image
 */
exports.setPrimaryImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    const product = await ShopItem.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Reset all images to non-primary
    product.images.forEach(img => {
      img.isPrimary = false;
    });

    // Set selected image as primary
    const imageIndex = product.images.findIndex(
      img => img._id.toString() === imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found in product'
      });
    }

    product.images[imageIndex].isPrimary = true;
    await product.save();

    errorLogger.info({
      productId,
      imageId
    }, 'Primary product image updated');

    res.json({
      success: true,
      message: 'Primary image updated successfully'
    });

  } catch (error) {
    errorLogger.error({
      error: error.message,
      productId: req.params.productId,
      imageId: req.params.imageId
    }, 'Set primary image controller error');

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * Upload generic/temp image (for new items)
 * POST /api/v2/upload/image
 * @access Private (Admin)
 */
exports.uploadGenericImage = async (req, res) => {
  try {
    const file = req.file; // middleware provides single file in 'image' field

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }

    // Use a temp ID or generic folder
    const tempId = `temp_${Date.now()}`;
    // Reuse existing service but with temp ID
    const result = await uploadShopProductImage(file.path, tempId);

    // Cleanup local file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (result.success) {
      res.json({
        success: true,
        url: result.url
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to upload to S3',
        error: result.message
      });
    }

  } catch (error) {
    errorLogger.error({ error: error.message }, 'Generic image upload error');
    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

