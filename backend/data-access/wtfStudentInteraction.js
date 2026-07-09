const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const WtfStudentInteraction = require("../models/wtfStudentInteraction");

// Create interaction (like or seen)
exports.createInteraction = async (payload) => {
  try {
    const result = await WtfStudentInteraction.create(payload);
    return {
      success: true,
      data: result,
      message: "Interaction created successfully",
    };
  } catch (error) {
    // Handle duplicate key error (unique constraint)
    if (error.code === 11000) {
      return {
        success: false,
        data: null,
        message: "Interaction already exists",
      };
    }
    errorLogger.error({ error: error.message }, "Error in createInteraction");
    throw error;
  }
};

// Get interaction by ID
exports.getInteractionById = async (interactionId) => {
  try {
    const interaction = await WtfStudentInteraction.findById(interactionId)
      .populate("studentId", "name role")
      .populate("pinId", "title type author")
      .lean();

    if (!interaction) {
      return {
        success: false,
        data: null,
        message: "Interaction not found",
      };
    }

    return {
      success: true,
      data: interaction,
      message: "Interaction fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getInteractionById");
    throw error;
  }
};

// Get student's interactions for a specific pin
exports.getStudentPinInteractions = async (studentId, pinId) => {
  try {
    const interactions = await WtfStudentInteraction.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      pinId: new mongoose.Types.ObjectId(pinId),
    })
      .populate("pinId", "title type author")
      .lean();

    return {
      success: true,
      data: interactions,
      message: "Student pin interactions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getStudentPinInteractions"
    );
    throw error;
  }
};

// Check if student has interacted with a pin
exports.hasStudentInteracted = async (studentId, pinId, type) => {
  try {
    const exists = await WtfStudentInteraction.exists({
      studentId: new mongoose.Types.ObjectId(studentId),
      pinId: new mongoose.Types.ObjectId(pinId),
      type: type,
    });

    return {
      success: true,
      data: { hasInteracted: !!exists },
      message: exists
        ? "Student has interacted with this pin"
        : "Student has not interacted with this pin",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in hasStudentInteracted"
    );
    throw error;
  }
};

// Get interaction counts for a pin
exports.getPinInteractionCounts = async (pinId) => {
  try {
    const counts = await WtfStudentInteraction.getPinInteractionCounts(pinId);

    // Format the results
    const formattedCounts = {
      likes: 0,
      seen: 0,
      likeTypes: {
        thumbs_up: 0,
        green_heart: 0,
      },
    };

    counts.forEach((item) => {
      if (item._id === "like") {
        formattedCounts.likes = item.count;
        // Count like types
        item.likeTypes.forEach((likeType) => {
          if (likeType) {
            formattedCounts.likeTypes[likeType]++;
          }
        });
      } else if (item._id === "seen") {
        formattedCounts.seen = item.count;
      }
    });

    return {
      success: true,
      data: formattedCounts,
      message: "Pin interaction counts fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getPinInteractionCounts"
    );
    throw error;
  }
};

// Get student's interaction history
exports.getStudentInteractionHistory = async (
  studentId,
  { page = 1, limit = 50, type = null }
) => {
  try {
    const skip = (page - 1) * limit;
    const query = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (type) query.type = type;

    const interactions = await WtfStudentInteraction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("pinId", "title type author")
      .lean();

    const total = await WtfStudentInteraction.countDocuments(query);

    return {
      success: true,
      data: {
        interactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Student interaction history fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getStudentInteractionHistory"
    );
    throw error;
  }
};

// Get recent interactions for analytics
exports.getRecentInteractions = async ({
  days = 7,
  type = null,
  limit = 100,
}) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const query = { createdAt: { $gte: date } };
    if (type) query.type = type;

    const interactions = await WtfStudentInteraction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("pinId", "title type author")
      .populate("studentId", "name role")
      .lean();

    return {
      success: true,
      data: interactions,
      message: "Recent interactions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getRecentInteractions"
    );
    throw error;
  }
};

// Delete interaction (for unlike functionality)
exports.deleteInteraction = async (studentId, pinId, type, likeType = null) => {
  try {
    const query = {
      studentId: new mongoose.Types.ObjectId(studentId),
      pinId: new mongoose.Types.ObjectId(pinId),
      type: type,
    };

    // For likes, also filter by likeType
    if (type === "like" && likeType) {
      query.likeType = likeType;
    }

    // For love and seen interactions, no additional fields needed
    // likeType should not be included for these types

    console.log("🗑️  deleteInteraction query:", JSON.stringify(query, null, 2));

    const interaction = await WtfStudentInteraction.findOneAndDelete(query);

    console.log(
      "🗑️  deleteInteraction result:",
      interaction ? "Found and deleted" : "Not found"
    );

    if (!interaction) {
      return {
        success: false,
        data: null,
        message: "Interaction not found",
      };
    }

    return {
      success: true,
      data: interaction,
      message: "Interaction deleted successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in deleteInteraction");
    throw error;
  }
};

// Update interaction (for seen duration updates)
exports.updateInteraction = async (interactionId, updateData) => {
  try {
    const interaction = await WtfStudentInteraction.findByIdAndUpdate(
      interactionId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("studentId", "name role")
      .populate("pinId", "title type author");

    if (!interaction) {
      return {
        success: false,
        data: null,
        message: "Interaction not found",
      };
    }

    return {
      success: true,
      data: interaction,
      message: "Interaction updated successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in updateInteraction");
    throw error;
  }
};

// Get interaction analytics
exports.getInteractionAnalytics = async ({ days = 7, type = null }) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const matchStage = { createdAt: { $gte: date } };
    if (type) matchStage.type = type;

    const analytics = await WtfStudentInteraction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          uniqueStudents: { $addToSet: "$studentId" },
          uniquePins: { $addToSet: "$pinId" },
          // For likes, also group by like type
          likeTypes: {
            $push: {
              $cond: [{ $eq: ["$type", "like"] }, "$likeType", null],
            },
          },
        },
      },
    ]);

    // Calculate additional metrics
    const totalInteractions = analytics.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const uniqueStudentsCount = new Set(
      analytics.flatMap((item) => item.uniqueStudents)
    ).size;
    const uniquePinsCount = new Set(
      analytics.flatMap((item) => item.uniquePins)
    ).size;

    const result = {
      period: `${days} days`,
      totalInteractions,
      uniqueStudents: uniqueStudentsCount,
      uniquePins: uniquePinsCount,
      breakdown: analytics,
      averageInteractionsPerStudent:
        uniqueStudentsCount > 0 ? totalInteractions / uniqueStudentsCount : 0,
      averageInteractionsPerPin:
        uniquePinsCount > 0 ? totalInteractions / uniquePinsCount : 0,
    };

    return {
      success: true,
      data: result,
      message: "Interaction analytics fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getInteractionAnalytics"
    );
    throw error;
  }
};

// Bulk create interactions (for batch operations)
exports.bulkCreateInteractions = async (interactions) => {
  try {
    const result = await WtfStudentInteraction.insertMany(interactions, {
      ordered: false, // Continue inserting even if some fail
    });

    return {
      success: true,
      data: {
        insertedCount: result.length,
        interactions: result,
      },
      message: `Successfully created ${result.length} interactions`,
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in bulkCreateInteractions"
    );
    throw error;
  }
};

// Get top performing pins by interactions
exports.getTopPerformingPins = async ({
  limit = 10,
  type = null,
  days = 30,
}) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const matchStage = { createdAt: { $gte: date } };
    if (type) matchStage.type = type;

    const topPins = await WtfStudentInteraction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$pinId",
          totalInteractions: { $sum: 1 },
          likes: {
            $sum: { $cond: [{ $eq: ["$type", "like"] }, 1, 0] },
          },
          seen: {
            $sum: { $cond: [{ $eq: ["$type", "seen"] }, 1, 0] },
          },
          uniqueStudents: { $addToSet: "$studentId" },
        },
      },
      {
        $addFields: {
          uniqueStudentCount: { $size: "$uniqueStudents" },
        },
      },
      {
        $sort: { totalInteractions: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "wtf_pins",
          localField: "_id",
          foreignField: "_id",
          as: "pinDetails",
        },
      },
      {
        $unwind: "$pinDetails",
      },
      {
        $project: {
          pinId: "$_id",
          title: "$pinDetails.title",
          type: "$pinDetails.type",
          author: "$pinDetails.author",
          totalInteractions: 1,
          likes: 1,
          seen: 1,
          uniqueStudentCount: 1,
          engagementRate: {
            $cond: [
              { $eq: ["$seen", 0] },
              0,
              { $multiply: [{ $divide: ["$likes", "$seen"] }, 100] },
            ],
          },
        },
      },
    ]);

    return {
      success: true,
      data: topPins,
      message: "Top performing pins fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getTopPerformingPins"
    );
    throw error;
  }
};
