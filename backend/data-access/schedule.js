const Schedules = require("../models/schedules");
const mongoose = require("mongoose");

const createSchedule = async (scheduleData) => {
  try {
    const schedule = new Schedules(scheduleData);
    const savedSchedule = await schedule.save();
    return { success: true, data: savedSchedule };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
const getScheduleById = async (scheduleId, scopeFilter = {}) => {
  try {
    const query = { ...scopeFilter, _id: scheduleId };  // Merge scope filter with ID lookup
    const schedule = await Schedules.findOne(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name");
    if (!schedule) {
      return { success: false, message: "Schedule not found" };
    }
    return { success: true, data: schedule };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
const getSchedules = async ({
  balagruhaId,
  assignedTo,
  startDate,
  endDate,
  status,
  page = 1,
  limit = 10,
  scopeFilter = {},  // Add scope filter to parameters
}) => {
  try {
    const query = { ...scopeFilter };  // Start with scope filter
    if (balagruhaId) query.balagruhaId = balagruhaId;
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const schedules = await Schedules.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1 });
    const total = await Schedules.countDocuments(query);
    return {
      success: true,
      data: {
        schedules,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const updateSchedule = async (scheduleId, updateData) => {
  try {
    const schedule = await Schedules.findByIdAndUpdate(
      scheduleId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name");
    if (!schedule) {
      return { success: false, message: "Schedule not found" };
    }
    return { success: true, data: schedule };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const deleteSchedule = async (scheduleId) => {
  try {
    const schedule = await Schedules.findByIdAndDelete(scheduleId);
    if (!schedule) {
      return { success: false, message: "Schedule not found" };
    }
    return { success: true, data: schedule };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// RBAC: Added scopeFilter parameter for Balagruh-level filtering
const getSchedulesByUser = async (userId, scopeFilter = {}) => {
  try {
    const query = { ...scopeFilter, assignedTo: userId };  // Merge scope filter with user filter
    const schedules = await Schedules.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("balagruhaId", "name")
      .sort({ date: -1 });
    return { success: true, data: schedules };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const getOverlappingSchedule = async (assignedTo, date, startTime, endTime) => {
  const overlappingSchedule = await Schedules.findOne({
    assignedTo,
    date,
    startTime: { $lte: endTime },
    endTime: { $gte: startTime },
  });
  return overlappingSchedule;
};

const getOverlappingScheduleOtherThanGivenSchedule = async ({
  scheduleId,
  assignedTo,
  date,
  startTime,
  endTime,
}) => {
  const overlappingSchedule = await Schedules.findOne({
    assignedTo,
    date,
    startTime: { $lte: endTime },
    endTime: { $gte: startTime },
    _id: { $ne: scheduleId },
  });
  return overlappingSchedule;
};

const getSchedulesForAdmin = async (
  balagruhaIds,
  assignedTo,
  startDate,
  endDate,
  status
) => {
  if (status == null || status == undefined || status.length == 0) {
    status = ["pending", "inprogress", "completed", "cancelled"];
  }
  if (
    balagruhaIds == null ||
    balagruhaIds == undefined ||
    balagruhaIds.length == 0
  ) {
    return { success: false, message: "Balagruha ID is required" };
  } else {
    balagruhaIds = balagruhaIds.map((balagruhaId) =>
      mongoose.Types.ObjectId.createFromHexString(balagruhaId)
    );
  }
  if (assignedTo == null || assignedTo == undefined || assignedTo.length == 0) {
    return { success: false, message: "Assigned To is required" };
  } else {
    assignedTo = mongoose.Types.ObjectId.createFromHexString(assignedTo);
  }
  startDate = new Date(startDate);
  endDate = new Date(endDate);
  const schedules = await Schedules.aggregate([
    {
      $match: {
        balagruhaId: { $in: balagruhaIds },
        assignedTo: { $eq: assignedTo },
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $lookup: {
        from: "balagruhas",
        localField: "balagruhaId",
        foreignField: "_id",
        as: "balagruha",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedToUser",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByUser",
      },
    },
    { $unwind: { path: "$balagruha" } },
    { $unwind: { path: "$assignedToUser" } },
    { $unwind: { path: "$createdByUser" } },
    {
      $project: {
        _id: 1,
        balagruhaId: 1,
        assignedTo: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        date: 1,
        title: 1,
        description: 1,
        timeSlot: 1,
        createdBy: 1,
        "balagruha._id": 1,
        "balagruha.name": 1,
        "balagruha.location": 1,
        "assignedToUser._id": 1,
        "assignedToUser.name": 1,
        "assignedToUser.email": 1,
        "createdByUser._id": 1,
        "createdByUser.name": 1,
        "createdByUser.email": 1,
      },
    },
    { $sort: { date: -1, startTime: -1 } },
  ])
    .then((result) => ({
      success: true,
      data: result,
      message: "Schedules fetched successfully",
    }))
    .catch((error) => ({ success: false, data: null, message: error.message }));
  return schedules;
};

const updateScheduleStatus = async (scheduleId, status) => {
  const schedule = await Schedules.findByIdAndUpdate(
    scheduleId,
    { status },
    { new: true }
  );
  return schedule;
};

module.exports = {
  createSchedule,
  getScheduleById,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  getSchedulesByUser,
  getOverlappingSchedule,
  getSchedulesForAdmin,
  getOverlappingScheduleOtherThanGivenSchedule,
  updateScheduleStatus,
};
