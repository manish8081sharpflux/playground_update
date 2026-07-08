const { default: mongoose } = require("mongoose");
const { errorLogger } = require("../config/pino-config");
const WtfSubmission = require("../models/wtfSubmission");

// Create WTF submission
exports.createWtfSubmission = async (submissionData) => {
  try {
    const submission = new WtfSubmission(submissionData);
    await submission.save();

    const populatedSubmission = await WtfSubmission.findById(submission._id)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author")
      .lean();

    // Transform submission to include proper student name and balagruha
    const transformed = { ...populatedSubmission };

    // Extract student name from populated studentId or metadata
    if (populatedSubmission.studentId) {
      transformed.studentName =
        populatedSubmission.studentId.name ||
        `${populatedSubmission.studentId.firstName || ""} ${
          populatedSubmission.studentId.lastName || ""
        }`.trim() ||
        populatedSubmission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        populatedSubmission.studentId.balagruhaIds &&
        populatedSubmission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          populatedSubmission.studentId.balagruhaIds[0]?.name ||
          "Unknown House";
      } else if (populatedSubmission.studentId.balagruha) {
        transformed.balagruha = populatedSubmission.studentId.balagruha;
      } else {
        transformed.balagruha =
          populatedSubmission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        populatedSubmission.metadata?.studentName || "Unknown Student";
      transformed.balagruha =
        populatedSubmission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission created successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in createWtfSubmission");
    throw error;
  }
};

// Get WTF submission by ID
exports.getWtfSubmissionById = async (submissionId) => {
  try {
    const submission = await WtfSubmission.findById(submissionId)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author")
      .lean();

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = { ...submission };

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getWtfSubmissionById"
    );
    throw error;
  }
};

// Get pending submissions for review
exports.getPendingSubmissions = async ({
  page = 1,
  limit = 20,
  type = null,
  isCoachSuggestion = null,
  status = null,
  coachId = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = {
      status: status
        ? Array.isArray(status)
          ? { $in: status }
          : status
        : { $in: ["pending", "reviewed", "considered"] },
      isDraft: false,
    };

    if (type) query.type = type;
    if (coachId) query["metadata.coachId"] = coachId;

    // Filter by coach suggestion status if specified
    if (isCoachSuggestion !== null) {
      if (isCoachSuggestion) {
        // Only get coach suggestions
        query["metadata.isCoachSuggestion"] = true;
      } else {
        // Only get student submissions (not coach suggestions)
        query["metadata.isCoachSuggestion"] = { $ne: true };
      }
    }

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const total = await WtfSubmission.countDocuments(query);

    return {
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Pending submissions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getPendingSubmissions"
    );
    throw error;
  }
};

// Backward-compatible alias (used by older services/tests)
exports.getSubmissionsForReview = exports.getPendingSubmissions;

// Get student's submissions
exports.getStudentSubmissions = async (
  studentId,
  { page = 1, limit = 20, status = null, type = null }
) => {
  try {
    const skip = (page - 1) * limit;
    const query = { studentId: new mongoose.Types.ObjectId(studentId) };

    if (status) query.status = status;
    if (type) query.type = type;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const total = await WtfSubmission.countDocuments(query);

    return {
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Student submissions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getStudentSubmissions"
    );
    throw error;
  }
};

// Update submission
exports.updateWtfSubmission = async (submissionId, updateData) => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission updated successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in updateWtfSubmission");
    throw error;
  }
};

// Delete submission
exports.deleteWtfSubmission = async (submissionId) => {
  try {
    const submission = await WtfSubmission.findById(submissionId)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    await WtfSubmission.findByIdAndDelete(submissionId);

    return {
      success: true,
      data: transformed,
      message: "WTF Submission deleted successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in deleteWtfSubmission");
    throw error;
  }
};

// Approve submission
exports.approveSubmission = async (submissionId, reviewerId, notes = "") => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "approved",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission approved successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in approveSubmission");
    throw error;
  }
};

// Mark submission as reviewed (keeps it in table but no longer pending)
exports.markSubmissionReviewed = async (
  submissionId,
  reviewerId,
  notes = ""
) => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "reviewed",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    const transformed = submission.toObject();
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission marked as reviewed",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in markSubmissionReviewed"
    );
    throw error;
  }
};

// Mark submission as considered for future talk (keeps it in table)
exports.markSubmissionConsidered = async (
  submissionId,
  reviewerId,
  notes = ""
) => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "considered",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    const transformed = submission.toObject();
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission marked as considered",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in markSubmissionConsidered"
    );
    throw error;
  }
};
// Reject submission
exports.rejectSubmission = async (submissionId, reviewerId, notes = "") => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "rejected",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission rejected successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in rejectSubmission");
    throw error;
  }
};

// Archive submission
exports.archiveSubmission = async (submissionId, reviewerId, notes = "") => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "archived",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission archived successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in archiveSubmission");
    throw error;
  }
};

// Unarchive submission
exports.unarchiveSubmission = async (submissionId, reviewerId, notes = "") => {
  try {
    const submission = await WtfSubmission.findByIdAndUpdate(
      submissionId,
      {
        status: "pending",
        reviewedBy: reviewerId,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .populate("approvedPinId", "title type author");

    if (!submission) {
      return {
        success: false,
        data: null,
        message: "WTF Submission not found",
      };
    }

    // Transform submission to include proper student name and balagruha
    const transformed = submission.toObject();

    // Extract student name from populated studentId or metadata
    if (submission.studentId) {
      transformed.studentName =
        submission.studentId.name ||
        `${submission.studentId.firstName || ""} ${
          submission.studentId.lastName || ""
        }`.trim() ||
        submission.metadata?.studentName ||
        "Unknown Student";

      // Extract balagruha from populated studentId or metadata
      if (
        submission.studentId.balagruhaIds &&
        submission.studentId.balagruhaIds.length > 0
      ) {
        transformed.balagruha =
          submission.studentId.balagruhaIds[0]?.name || "Unknown House";
      } else if (submission.studentId.balagruha) {
        transformed.balagruha = submission.studentId.balagruha;
      } else {
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }
    } else {
      // Fallback to metadata if studentId is not populated
      transformed.studentName =
        submission.metadata?.studentName || "Unknown Student";
      transformed.balagruha = submission.metadata?.balagruha || "Unknown House";
    }

    return {
      success: true,
      data: transformed,
      message: "WTF Submission unarchived successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in unarchiveSubmission");
    throw error;
  }
};

// Get archived submissions
exports.getArchivedSubmissions = async ({
  page = 1,
  limit = 20,
  type = null,
} = {}) => {
  try {
    const skip = (page - 1) * limit;
    const query = { status: "archived" };

    if (type) query.type = type;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const total = await WtfSubmission.countDocuments(query);

    return {
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Archived submissions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getArchivedSubmissions"
    );
    throw error;
  }
};

// Get submissions by type
exports.getSubmissionsByType = async (
  type,
  { page = 1, limit = 20, status = null }
) => {
  try {
    const skip = (page - 1) * limit;
    const query = { type };

    if (status) query.status = status;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const total = await WtfSubmission.countDocuments(query);

    return {
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: `${type} submissions fetched successfully`,
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getSubmissionsByType"
    );
    throw error;
  }
};

// Get submission statistics
exports.getSubmissionStats = async () => {
  try {
    const submissions = await WtfSubmission.find()
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const stats = await WtfSubmission.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          types: { $addToSet: "$type" },
        },
      },
    ]);

    const countsByStatus = (stats || []).reduce((acc, s) => {
      if (s && s._id) acc[s._id] = s.count || 0;
      return acc;
    }, {});

    const totalSubmissions = transformedSubmissions.length;
    const pendingCount =
      (countsByStatus.pending || 0) +
      (countsByStatus.reviewed || 0) +
      (countsByStatus.considered || 0);
    const newCount = countsByStatus.pending || 0;
    const approvedCount = countsByStatus.approved || 0;
    const rejectedCount = countsByStatus.rejected || 0;

    return {
      success: true,
      data: {
        totalSubmissions,
        pendingCount,
        newCount,
        approvedCount,
        rejectedCount,
        countsByStatus,
        stats,
        submissions: transformedSubmissions,
      },
      message: "Submission statistics fetched successfully",
    };
  } catch (error) {
    errorLogger.error({ error: error.message }, "Error in getSubmissionStats");
    throw error;
  }
};

// Get recent submissions for analytics
exports.getRecentSubmissions = async ({ days = 30, type = null }) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const query = { createdAt: { $gte: date } };
    if (type) query.type = type;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    return {
      success: true,
      data: transformedSubmissions,
      message: "Recent submissions fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getRecentSubmissions"
    );
    throw error;
  }
};

// Get submission analytics
exports.getSubmissionAnalytics = async ({ days = 30, type = null }) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const query = { createdAt: { $gte: date } };
    if (type) query.type = type;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    // Calculate analytics
    const totalSubmissions = transformedSubmissions.length;
    const submissionsByType = transformedSubmissions.reduce(
      (acc, submission) => {
        acc[submission.type] = (acc[submission.type] || 0) + 1;
        return acc;
      },
      {}
    );

    const submissionsByStatus = transformedSubmissions.reduce(
      (acc, submission) => {
        acc[submission.status] = (acc[submission.status] || 0) + 1;
        return acc;
      },
      {}
    );

    const submissionsByBalagruha = transformedSubmissions.reduce(
      (acc, submission) => {
        acc[submission.balagruha] = (acc[submission.balagruha] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      success: true,
      data: {
        totalSubmissions,
        submissionsByType,
        submissionsByStatus,
        submissionsByBalagruha,
        submissions: transformedSubmissions,
        period: { days, startDate: date, endDate: new Date() },
      },
      message: "Submission analytics fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getSubmissionAnalytics"
    );
    throw error;
  }
};

// Bulk update submission statuses
exports.bulkUpdateSubmissionStatus = async (
  submissionIds,
  status,
  reviewerId = null
) => {
  try {
    const updateData = { status };
    if (reviewerId) {
      updateData.reviewedBy = reviewerId;
      updateData.reviewedAt = new Date();
    }

    const result = await WtfSubmission.updateMany(
      { _id: { $in: submissionIds } },
      updateData
    );

    // Fetch the updated submissions to return with proper data
    const updatedSubmissions = await WtfSubmission.find({
      _id: { $in: submissionIds },
    })
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .populate("reviewedBy", "name role")
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = updatedSubmissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    return {
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        updatedSubmissions: transformedSubmissions,
      },
      message: `Bulk updated ${result.modifiedCount} submissions to ${status}`,
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in bulkUpdateSubmissionStatus"
    );
    throw error;
  }
};

// Get submissions that need review (pending and not drafts)
exports.getSubmissionsNeedingReview = async ({
  page = 1,
  limit = 20,
  type = null,
}) => {
  try {
    const skip = (page - 1) * limit;
    const query = {
      status: "pending",
      isDraft: false,
    };

    if (type) query.type = type;

    const submissions = await WtfSubmission.find(query)
      .sort({ createdAt: 1 }) // Oldest first for review queue
      .skip(skip)
      .limit(limit)
      .populate({
        path: "studentId",
        select: "name firstName lastName balagruha balagruhaIds",
        populate: { path: "balagruhaIds", select: "name" },
      })
      .lean();

    // Transform submissions to include proper student name and balagruha
    const transformedSubmissions = submissions.map((submission) => {
      const transformed = { ...submission };

      // Extract student name from populated studentId or metadata
      if (submission.studentId) {
        transformed.studentName =
          submission.studentId.name ||
          `${submission.studentId.firstName || ""} ${
            submission.studentId.lastName || ""
          }`.trim() ||
          submission.metadata?.studentName ||
          "Unknown Student";

        // Extract balagruha from populated studentId or metadata
        if (
          submission.studentId.balagruhaIds &&
          submission.studentId.balagruhaIds.length > 0
        ) {
          transformed.balagruha =
            submission.studentId.balagruhaIds[0]?.name || "Unknown House";
        } else if (submission.studentId.balagruha) {
          transformed.balagruha = submission.studentId.balagruha;
        } else {
          transformed.balagruha =
            submission.metadata?.balagruha || "Unknown House";
        }
      } else {
        // Fallback to metadata if studentId is not populated
        transformed.studentName =
          submission.metadata?.studentName || "Unknown Student";
        transformed.balagruha =
          submission.metadata?.balagruha || "Unknown House";
      }

      return transformed;
    });

    const total = await WtfSubmission.countDocuments(query);

    return {
      success: true,
      data: {
        submissions: transformedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      message: "Submissions needing review fetched successfully",
    };
  } catch (error) {
    errorLogger.error(
      { error: error.message },
      "Error in getSubmissionsNeedingReview"
    );
    throw error;
  }
};
