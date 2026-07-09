const MedicalCheckIn = require("../models/medicalCheckIns");

exports.createMedicalCheckIn = async (payload) => {
  return await MedicalCheckIn.create([payload])
    .then((result) => ({
      success: true,
      data: result,
      message: "Created medical check-in successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
exports.getAllMedicalCheckIns = async (filters = {}, pagination = {}, scopeFilter = {}) => {
  const { page = 1, limit = 10 } = pagination;
  const query = { ...scopeFilter, ...filters };  // Merge scope filter with user filters

  return await MedicalCheckIn.find(query)
    .populate("student", "firstName lastName studentId balagruhaId")
    .populate("createdBy", "name email")
    .populate("followUp.assignedCoaches", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean()
    .then(async (results) => {
      const totalCount = await MedicalCheckIn.countDocuments(query);
      return {
        success: true,
        data: results,
        count: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        message: "Fetched medical check-ins successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
exports.getMedicalCheckInsByStudentId = async (studentId, pagination = {}, scopeFilter = {}) => {
  const { page = 1, limit = 10 } = pagination;
  const query = { ...scopeFilter, studentId: studentId };  // Merge scope filter with studentId filter (HEAD field name + Sprint 2 RBAC)

  return await MedicalCheckIn.find(query)
    .populate("studentId", "firstName lastName studentId") // Used HEAD's field name 'studentId'
    .populate("createdBy", "name email")
    .populate("followUp.assignedCoaches", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean()
    .then(async (results) => {
      const totalCount = await MedicalCheckIn.countDocuments(query);
      return {
        success: true,
        data: results,
        count: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        message: "Fetched student's medical check-ins successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
exports.getMedicalCheckInById = async (checkInId, scopeFilter = {}) => {
  const query = { ...scopeFilter, _id: checkInId };  // Merge scope filter with ID lookup

  return await MedicalCheckIn.findOne(query)
    .populate("studentId", "firstName lastName studentId")
    .populate("createdBy", "name email")
    .populate("followUp.assignedCoaches", "name email")
    .lean()
    .then((result) => ({
      success: true,
      data: result,
      message: "Fetched medical check-in successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.updateMedicalCheckIn = async (checkInId, payload) => {
  return await MedicalCheckIn.findByIdAndUpdate(checkInId, { $set: payload }, {
    new: true,
  })
    .then((result) => ({
      success: true,
      data: result,
      message: "Updated medical check-in successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.deleteMedicalCheckIn = async (checkInId) => {
  return await MedicalCheckIn.findByIdAndDelete(checkInId)
    .then((result) => ({
      success: true,
      data: result,
      message: "Deleted medical check-in successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.updateMedicalCheckInAttachments = async (checkInId, updateData) => {
  return await MedicalCheckIn.findByIdAndUpdate(
    checkInId,
    { $set: updateData },
    { new: true }
  )
    .then((result) => ({
      success: true,
      data: result,
      message: "Updated medical check-in attachments successfully",
    }))
    .catch((error) => {
      throw error;
    });
};

exports.deleteAttachment = async (checkInId, attachmentId) => {
  return await MedicalCheckIn.findByIdAndUpdate(
    checkInId,
    { $pull: { attachments: { _id: attachmentId } } },
    { new: true }
  )
    .then((result) => ({
      success: true,
      data: result,
      message: "Deleted attachment successfully",
    }))
    .catch((error) => {
      throw error;
    });
};
