const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const WtfPin = require("../models/wtfPin");

// Create WTF Pin
exports.createWtfPin = async (payload) => {
  try {
    const result = await WtfPin.create(payload);
    return {
      success: true,
      data: result,
      message: "WTF Pin created successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in createWtfPin");
    throw error;
  }
};

// Get all active pins with pagination
exports.getActivePins = async ({
  page = 1,
  limit = 20,
  type = null,
  author = null,
  isOfficial = null,
  officialCategory = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = {
      status: "active",
      expiresAt: { $gt: new Date() },
    };

    // Add filters
    if (type) query.type = type;
    if (author) {
      // Handle both ObjectId and string author values
      if (mongoose.Types.ObjectId.isValid(author)) {
        query.author = new mongoose.Types.ObjectId(author);
      } else {
        // If author is a string (name), we'll need to find the author first
        // For now, we'll skip the author filter if it's not a valid ObjectId
        // This can be enhanced later to search by user name
        console.log(`Skipping author filter for non-ObjectId: ${author}`);
      }
    }
    if (isOfficial !== null) query.isOfficial = isOfficial;
    if (officialCategory !== null) query.officialCategory = officialCategory;

    // Prefer manual position ordering when available, fallback to createdAt desc
    const pins = await WtfPin.find(query)
      .sort({ position: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name role")
      .lean();

    const total = await WtfPin.countDocuments(query);

    return {
      success: true,
      data: {
        pins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Active pins fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getActivePins");
    throw error;
  }
};

// Get pins by status with pagination
exports.getPinsByStatus = async ({
  page = 1,
  limit = 20,
  status = "active",
  type = null,
  author = null,
  isOfficial = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = { status };

    // For active status, also filter by expiration to exclude expired pins
    if (status === "active") {
      query.expiresAt = { $gt: new Date() };
    }

    // Add filters
    if (type) query.type = type;
    if (author) {
      // Handle both ObjectId and string author values
      if (mongoose.Types.ObjectId.isValid(author)) {
        query.author = new mongoose.Types.ObjectId(author);
      } else {
        // If author is a string (name), we'll need to find the author first
        // For now, we'll skip the author filter if it's not a valid ObjectId
        // This can be enhanced later to search by user name
        console.log(`Skipping author filter for non-ObjectId: ${author}`);
      }
    }
    if (isOfficial !== null) query.isOfficial = isOfficial;

    const pins = await WtfPin.find(query)
      .sort({ position: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name role")
      .lean();

    const total = await WtfPin.countDocuments(query);

    return {
      success: true,
      data: {
        pins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: `${status} pins fetched successfully`,
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getPinsByStatus");
    throw error;
  }
};

// Get pin by ID
exports.getWtfPinById = async (pinId) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      return {
        success: false,
        data: null,
        message: "Invalid pin ID format",
      };
    }

    const pin = await WtfPin.findById(pinId)
      .populate("author", "name role")
      .lean();

    if (!pin) {
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    return {
      success: true,
      data: pin,
      message: "WTF Pin fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getWtfPinById");
    throw error;
  }
};

// Update WTF Pin
exports.updateWtfPin = async (pinId, updateData) => {
  try {
    const pin = await WtfPin.findByIdAndUpdate(pinId, updateData, {
      new: true,
      runValidators: true,
    }).populate("author", "name role");

    if (!pin) {
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    return {
      success: true,
      data: pin,
      message: "WTF Pin updated successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in updateWtfPin");
    throw error;
  }
};

// Delete WTF Pin
exports.deleteWtfPin = async (pinId) => {
  try {
    const pin = await WtfPin.findByIdAndDelete(pinId);

    if (!pin) {
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    return {
      success: true,
      data: pin,
      message: "WTF Pin deleted successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in deleteWtfPin");
    throw error;
  }
};

// Change pin status
exports.updatePinStatus = async (pinId, status) => {
  try {
    const pin = await WtfPin.findByIdAndUpdate(
      pinId,
      { status },
      { new: true, runValidators: true }
    ).populate("author", "name role");

    if (!pin) {
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    return {
      success: true,
      data: pin,
      message: `WTF Pin status updated to ${status}`,
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in updatePinStatus");
    throw error;
  }
};

// Get pins by author
exports.getPinsByAuthor = async (
  authorId,
  { page = 1, limit = 20, status = null }
) => {
  try {
    const skip = (page - 1) * limit;

    // Handle both ObjectId and string author values
    let authorQuery;
    if (mongoose.Types.ObjectId.isValid(authorId)) {
      authorQuery = new mongoose.Types.ObjectId(authorId);
    } else {
      // If authorId is a string (name), we'll need to find the user first
      // For now, we'll skip the author filter if it's not a valid ObjectId
      // This can be enhanced later to search by user name
      console.log(`Skipping author filter for non-ObjectId: ${authorId}`);
      return {
        success: true,
        data: {
          pins: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        message: "Author filter skipped - invalid author ID format",
      };
    }

    const query = { author: authorQuery };

    if (status) query.status = status;

    const pins = await WtfPin.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name role")
      .lean();

    const total = await WtfPin.countDocuments(query);

    return {
      success: true,
      data: {
        pins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Author pins fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getPinsByAuthor");
    throw error;
  }
};

// Get pins by status (admin utility)
exports.getPinsByStatus = async ({
  status = "active",
  page = 1,
  limit = 20,
  type = null,
  author = null,
  isOfficial = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = { status };

    if (type) query.type = type;
    if (author) {
      // Handle both ObjectId and string author values
      if (mongoose.Types.ObjectId.isValid(author)) {
        query.author = new mongoose.Types.ObjectId(author);
      } else {
        // If author is a string (name), we'll need to find the user first
        // For now, we'll skip the author filter if it's not a valid ObjectId
        // This can be enhanced later to search by user name
        console.log(`Skipping author filter for non-ObjectId: ${author}`);
      }
    }
    if (isOfficial !== null) query.isOfficial = isOfficial;

    const pins = await WtfPin.find(query)
      .sort({ position: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name role")
      .lean();

    const total = await WtfPin.countDocuments(query);

    return {
      success: true,
      data: {
        pins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: `Pins with status ${status} fetched successfully`,
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getPinsByStatus");
    throw error;
  }
};

// Get expired pins for cleanup (pins that have passed their expiration date)
exports.getExpiredPins = async () => {
  try {
    const now = new Date();

    const pins = await WtfPin.find({
      status: "active",
      expiresAt: { $lte: now },
    })
      .populate("author", "name role")
      .lean();

    return {
      success: true,
      data: pins,
      message: "Expired pins fetched successfully",
      expirationCutoff: now,
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getExpiredPins");
    throw error;
  }
};

// Get pins for FIFO management (limit active pins to 20)
exports.getPinsForFifoManagement = async () => {
  try {
    const activePinsCount = await WtfPin.countDocuments({ 
      status: "active",
      expiresAt: { $gt: new Date() } // Only count non-expired pins
    });

    if (activePinsCount <= 20) {
      return {
        success: true,
        data: [],
        message: "No pins need to be unpinned for FIFO management",
      };
    }

    const pinsToUnpin = await WtfPin.find({ 
      status: "active",
      expiresAt: { $gt: new Date() } // Only consider non-expired pins
    })
      .sort({ createdAt: 1 }) // Oldest first
      .limit(activePinsCount - 20)
      .lean();

    return {
      success: true,
      data: pinsToUnpin,
      message: "Pins for FIFO management fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getPinsForFifoManagement"
    );
    throw error;
  }
};

// Update engagement metrics
exports.updateEngagementMetrics = async (pinId, metrics) => {
  try {
    console.log("🔧 updateEngagementMetrics called with:", { pinId, metrics });

    // Check if pin exists first
    const existingPin = await WtfPin.findById(pinId);
    if (!existingPin) {
      console.log("❌ Pin not found:", pinId);
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    console.log(
      "🔧 Existing pin engagement metrics:",
      existingPin.engagementMetrics
    );

    // Calculate clamped values so they never go below 0
    const current = existingPin.engagementMetrics || {};
    const deltaLikes = metrics.likes || 0;
    const deltaLoves = metrics.loves || 0;
    const deltaSeen = metrics.seen || 0;
    const deltaShares = metrics.shares || 0;

    const newLikes = Math.max(0, (current.likes || 0) + deltaLikes);
    const newLoves = Math.max(0, (current.loves || 0) + deltaLoves);
    const newSeen = Math.max(0, (current.seen || 0) + deltaSeen);
    const newShares = Math.max(0, (current.shares || 0) + deltaShares);

    const pin = await WtfPin.findByIdAndUpdate(
      pinId,
      {
        $set: {
          "engagementMetrics.likes": newLikes,
          "engagementMetrics.loves": newLoves,
          "engagementMetrics.seen": newSeen,
          "engagementMetrics.shares": newShares,
        },
      },
      { new: true, runValidators: true }
    );

    if (!pin) {
      console.log("❌ Pin not found after update:", pinId);
      return {
        success: false,
        data: null,
        message: "WTF Pin not found after update",
      };
    }

    console.log(
      "✅ Engagement metrics updated successfully:",
      pin.engagementMetrics
    );

    return {
      success: true,
      data: pin,
      message: "Engagement metrics updated successfully",
    };
  } catch (error) {
    console.error("❌ Error in updateEngagementMetrics:", error);
    console.error("❌ Error stack:", error.stack);
    errorLogger.error(
      { error: error.message },
      "Error in updateEngagementMetrics"
    );
    return {
      success: false,
      data: null,
      message: "Error in updateEngagementMetrics",
    };
  }
};

// Get pin analytics
exports.getPinAnalytics = async (pinId) => {
  try {
    const pin = await WtfPin.findById(pinId).lean();

    if (!pin) {
      return {
        success: false,
        data: null,
        message: "WTF Pin not found",
      };
    }

    const analytics = {
      pinId: pin._id,
      title: pin.title,
      type: pin.type,
      engagementMetrics: pin.engagementMetrics,
      engagementRate: pin.engagementRate,
      daysUntilExpiration: pin.daysUntilExpiration,
      isActive: pin.isActive(),
      createdAt: pin.createdAt,
      expiresAt: pin.expiresAt,
    };

    return {
      success: true,
      data: analytics,
      message: "Pin analytics fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getPinAnalytics");
    throw error;
  }
};

// Get overall WTF analytics
exports.getWtfAnalytics = async () => {
  try {
    const analytics = await WtfPin.aggregate([
      {
        $group: {
          _id: null,
          totalPins: { $sum: 1 },
          activePins: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "active"] },
                    { $gt: ["$expiresAt", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalLikes: { $sum: "$engagementMetrics.likes" },
          totalSeen: { $sum: "$engagementMetrics.seen" },
          totalShares: { $sum: "$engagementMetrics.shares" },
          officialPins: {
            $sum: { $cond: ["$isOfficial", 1, 0] },
          },
        },
      },
    ]);

    const typeDistribution = await WtfPin.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      ...analytics[0],
      typeDistribution,
    };

    return {
      success: true,
      data: result,
      message: "WTF analytics fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getWtfAnalytics");
    throw error;
  }
};

// Bulk update pin statuses (for lifecycle management)
exports.bulkUpdatePinStatus = async (pinIds, status) => {
  try {
    const result = await WtfPin.updateMany(
      { _id: { $in: pinIds } },
      { status }
    );

    return {
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      message: `Bulk updated ${result.modifiedCount} pins to ${status}`,
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in bulkUpdatePinStatus");
    throw error;
  }
};

// Get active pins count for admin (without expiry filter)
exports.getActivePinsCountForAdmin = async () => {
  try {
    const count = await WtfPin.countDocuments({ status: "active" });
    return {
      success: true,
      data: count,
      message: "Active pins count fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getActivePinsCountForAdmin"
    );
    throw error;
  }
};

// Get all active pins for admin (without expiry filter)
exports.getActivePinsForAdmin = async ({
  page = 1,
  limit = 20,
  type = null,
  author = null,
  isOfficial = null,
  officialCategory = null,
  dateFrom = null,
  dateTo = null,
  source = null,
  pinType = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = { status: "active" }; // No expiry filter for admin

    // Add filters
    if (type) query.type = type;
    if (author) {
      // Handle both ObjectId and string author values
      if (mongoose.Types.ObjectId.isValid(author)) {
        query.author = new mongoose.Types.ObjectId(author);
      } else {
        // If author is a string (name), we'll need to find the author first
        // For now, we'll skip the author filter if it's not a valid ObjectId
        // This can be enhanced later to search by user name
        console.log(`Skipping author filter for non-ObjectId: ${author}`);
      }
    }
    if (isOfficial !== null) query.isOfficial = isOfficial;
    if (officialCategory !== null) query.officialCategory = officialCategory;

    // Add date filters
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Set to end of day for dateTo
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Add source filter (for distinguishing between different content sources)
    if (source && source !== "all") {
      if (source === "wtf") {
        query.isOfficial = false;
      } else if (source === "official") {
        query.isOfficial = true;
      }
    }

    // Add pin type filter (alias for type, but more specific)
    if (pinType && pinType !== "all") {
      query.type = pinType;
    }

    const pins = await WtfPin.find(query)
      .sort({ position: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name role")
      .lean();

    const total = await WtfPin.countDocuments(query);

    return {
      success: true,
      data: {
        pins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Active pins fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getActivePinsForAdmin"
    );
    throw error;
  }
};

// Bulk reorder pins by providing an ordered list of pinIds. Missing IDs are ignored.
exports.reorderPins = async (orderedPinIds = []) => {
  try {
    if (!Array.isArray(orderedPinIds) || orderedPinIds.length === 0) {
      return {
        success: false,
        data: null,
        message: "orderedPinIds must be a non-empty array",
      };
    }

    // Validate and convert to ObjectIds where possible; skip invalid
    const validIds = orderedPinIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length === 0) {
      return {
        success: false,
        data: null,
        message: "No valid pin IDs provided",
      };
    }

    // Assign positions starting from 1 in the provided order
    // Use bulkWrite for efficiency
    const bulkOps = validIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { position: idx + 1 } },
      },
    }));

    const result = await WtfPin.bulkWrite(bulkOps);

    return {
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      message: "Pins reordered successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in reorderPins");
    throw error;
  }
};
