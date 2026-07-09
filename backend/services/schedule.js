const {
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
} = require("../data-access/schedule");
const { getUserObjectById } = require("../data-access/User");
const { logger } = require("../config/pino-config");
const { UserTypes } = require("../constants/users");
const { format } = require("date-fns");
const User = require("../models/user");

class Schedule {
  static async createScheduleNew(payload) {
    try {
      logger.info("Creating new schedules");

      // S6-S1-PROD-BUG-001: Allow both ADMIN and COACH roles to create schedules
      const isAdmin = payload.userRole === UserTypes.ADMIN;
      const isCoach = payload.userRole === UserTypes.COACH ||
                      payload.userRole === 'sports-coach' ||
                      payload.userRole === 'music-coach';

      if (!isAdmin && !isCoach) {
        return {
          success: false,
          message: "You are not authorized to create a schedule",
          data: null,
        };
      }

      const { balagruhaIds, assignedTo, schedules, createdBy } = payload;

      // S6-S1-PROD-BUG-001: Additional validation for COACH role
      if (isCoach) {
        // Get coach's assigned Balagruhas
        const coachResult = await getUserObjectById({ userId: createdBy });
        if (!coachResult.success || !coachResult.data) {
          return {
            success: false,
            message: "Coach user not found",
            data: null,
          };
        }

        const coach = coachResult.data;
        const coachBalagruhaIds = coach.balagruhaIds.map(id => id.toString());

        // Validate that all balagruhaIds are in coach's assigned Balagruhas
        for (const balagruhaId of balagruhaIds) {
          if (!coachBalagruhaIds.includes(balagruhaId.toString())) {
            return {
              success: false,
              message: `You are not authorized to create schedules for Balagruha ${balagruhaId}. You can only assign schedules for your assigned Balagruhas.`,
              data: null,
            };
          }
        }

        // Validate that assignedTo users are not students and are in coach's assigned Balagruhas
        for (const userId of assignedTo) {
          const userResult = await getUserObjectById({ userId });
          if (!userResult.success || !userResult.data) {
            return {
              success: false,
              message: `Assigned user ${userId} not found`,
              data: null,
            };
          }

          const assignedUser = userResult.data;

          // Check if user is a student (coaches cannot assign to students)
          if (assignedUser.role === 'student') {
            return {
              success: false,
              message: `Cannot assign schedule to students`,
              data: null,
            };
          }

          // Check if assignedUser has any Balagruha that matches coach's Balagruhas
          const assignedUserBalagruhaIds = assignedUser.balagruhaIds.map(id => id.toString());
          const hasCommonBalagruha = assignedUserBalagruhaIds.some(id =>
            coachBalagruhaIds.includes(id)
          );

          if (!hasCommonBalagruha) {
            return {
              success: false,
              message: `You can only assign schedules to users in your assigned Balagruhas`,
              data: null,
            };
          }
        }
      }

      // S6-S1-PROD-BUG-001: Validate that assignedTo users are not students (for both ADMIN and COACH)
      if (isAdmin) {
        for (const userId of assignedTo) {
          const userResult = await getUserObjectById({ userId });
          if (!userResult.success || !userResult.data) {
            return {
              success: false,
              message: `Assigned user ${userId} not found`,
              data: null,
            };
          }

          const assignedUser = userResult.data;

          // Check if user is a student (admins also cannot assign to students)
          if (assignedUser.role === 'student') {
            return {
              success: false,
              message: `Cannot assign schedule to students`,
              data: null,
            };
          }
        }
      }
      const overlappingSchedules = [];
      for (const balagruhaId of balagruhaIds) {
        for (const schedule of schedules) {
          const schedulePayload = {
            ...schedule,
            balagruhaId,
            assignedTo: assignedTo[0],
          };
          const overlappingSchedule = await this.getOverlappingSchedule(
            schedulePayload
          );
          if (overlappingSchedule) {
            overlappingSchedules.push({
              balagruhaId,
              schedule,
              overlappingSchedule,
            });
          }
        }
      }
      if (overlappingSchedules.length > 0) {
        return {
          success: false,
          data: null,
          message: "Found overlapping schedules",
          overlappingSchedules,
        };
      }
      const createdSchedules = [];
      for (const balagruhaId of balagruhaIds) {
        for (const schedule of schedules) {
          const schedulePayload = {
            ...schedule,
            balagruhaId,
            assignedTo: assignedTo[0],
            userRole: payload.userRole,
            createdBy: payload.createdBy,
          };
          const timeSlot = this.getTimeSlot(
            schedulePayload.startTime,
            schedulePayload.endTime
          );
          schedulePayload.timeSlot = timeSlot;
          const result = await createSchedule(schedulePayload);
          if (result.success) {
            const scheduleDetails = await this.getScheduleById(result.data._id);
            createdSchedules.push(scheduleDetails.data);
          }
        }
      }
      return {
        success: true,
        data: { schedules: createdSchedules },
        message: "Schedules created successfully",
      };
    } catch (error) {
      logger.error("Error creating schedules:", error);
      return { success: false, message: error.message };
    }
  }

  static async getScheduleById(scheduleId) {
    try {
      logger.info(`Fetching schedule with ID: ${scheduleId}`);
      const result = await getScheduleById(scheduleId);
      if (result.success) {
        logger.info("Schedule fetched successfully");
        return {
          success: true,
          data: result.data,
          message: "Schedule fetched successfully",
        };
      }
      return result;
    } catch (error) {
      logger.error("Error fetching schedule:", error);
      return { success: false, message: error.message };
    }
  }

  static async getSchedules(filters) {
    try {
      logger.info("Fetching schedules with filters:", filters);
      const result = await getSchedules(filters);
      if (result.success) {
        logger.info("Schedules fetched successfully");
        return {
          success: true,
          data: result.data,
          message: "Schedules fetched successfully",
        };
      }
      return result;
    } catch (error) {
      logger.error("Error fetching schedules:", error);
      return { success: false, message: error.message };
    }
  }

  static async updateSchedule(scheduleId, updateData) {
    try {
      logger.info(`Updating schedule with ID: ${scheduleId}`);
      const overlappingSchedule =
        await this.getOverlappingScheduleOtherThanGivenSchedule(
          scheduleId,
          updateData
        );
      if (overlappingSchedule) {
        if (scheduleId == overlappingSchedule._id.toString()) {
        } else {
          return {
            success: false,
            message:
              "You have an overlapping schedule for the same date and within the start time and end time",
            data: {},
            overlappingSchedules: overlappingSchedule,
          };
        }
      }
      const result = await updateSchedule(scheduleId, updateData);
      if (result.success) {
        logger.info("Schedule updated successfully");
        return {
          success: true,
          data: { schedule: result.data },
          message: "Schedule updated successfully",
        };
      }
      return result;
    } catch (error) {
      logger.error("Error updating schedule:", error);
      return { success: false, message: error.message };
    }
  }

  static async deleteSchedule(scheduleId) {
    try {
      logger.info(`Deleting schedule with ID: ${scheduleId}`);
      const result = await deleteSchedule(scheduleId);
      if (result.success) {
        logger.info("Schedule deleted successfully");
        return {
          success: true,
          data: { schedule: result.data },
          message: "Schedule deleted successfully",
        };
      }
      return result;
    } catch (error) {
      logger.error("Error deleting schedule:", error);
      return { success: false, message: error.message };
    }
  }

  static async getSchedulesByUser(userId) {
    try {
      logger.info(`Fetching schedules for user: ${userId}`);
      const result = await getSchedulesByUser(userId);
      if (result.success) {
        logger.info("User schedules fetched successfully");
        return {
          success: true,
          data: result.data,
          message: "User schedules fetched successfully",
        };
      }
      return result;
    } catch (error) {
      logger.error("Error fetching user schedules:", error);
      return { success: false, message: error.message };
    }
  }

  static async getOverlappingSchedule(payload) {
    const { assignedTo, date, startTime, endTime } = payload;
    const overlappingSchedule = await getOverlappingSchedule(
      assignedTo,
      date,
      startTime,
      endTime
    );
    return overlappingSchedule;
  }
  static async getOverlappingScheduleOtherThanGivenSchedule(
    scheduleId,
    payload
  ) {
    const { assignedTo, date, startTime, endTime } = payload;
    const overlappingSchedule =
      await getOverlappingScheduleOtherThanGivenSchedule({
        scheduleId,
        assignedTo,
        date,
        startTime,
        endTime,
      });
    return overlappingSchedule;
  }

  static getTimeSlot(startTime, endTime) {
    let start = format(startTime, "hh:mm a");
    let end = format(endTime, "hh:mm a");
    return `${start} - ${end}`;
  }

  static async getSchedulesForAdmin(
    balagruhaIds,
    assignedTo,
    startDate,
    endDate,
    status
  ) {
    const result = await getSchedulesForAdmin(
      balagruhaIds,
      assignedTo,
      startDate,
      endDate,
      status
    );
    if (result.success) {
      if (result.data) {
        const schedulesObj = {};
        result.data.forEach((schedule) => {
          let date = format(schedule.date, "yyyy-MM-dd");
          if (!schedulesObj[date]) {
            schedulesObj[date] = [];
          }
          schedulesObj[date].push(schedule);
        });
        const dates = Object.keys(schedulesObj);
        dates.sort();
        const sortedSchedulesObj = dates.map((date) => ({
          date,
          schedules: schedulesObj[date],
        }));
        return {
          success: true,
          data: { schedules: sortedSchedulesObj },
          message: "Schedules fetched successfully",
        };
      }
      return {
        success: true,
        data: result.data,
        message: "Schedules fetched successfully",
      };
    }
  }

  static async getSchedulesForCoach(
    balagruhaIds,
    assignedTo,
    startDate,
    endDate,
    status
  ) {
    const result = await getSchedulesForAdmin(
      balagruhaIds,
      assignedTo,
      startDate,
      endDate,
      status
    );
    if (result.success) {
      if (result.data) {
        const schedulesObj = {};
        result.data.forEach((schedule) => {
          let date = format(schedule.date, "yyyy-MM-dd");
          if (!schedulesObj[date]) {
            schedulesObj[date] = [];
          }
          schedulesObj[date].push(schedule);
        });
        const dates = Object.keys(schedulesObj);
        dates.sort();
        const sortedSchedulesObj = dates.map((date) => ({
          date,
          schedules: schedulesObj[date],
        }));
        return {
          success: true,
          data: { schedules: sortedSchedulesObj },
          message: "Schedules fetched successfully",
        };
      }
      return {
        success: true,
        data: result.data,
        message: "Schedules fetched successfully",
      };
    }
  }

  static async updateScheduleStatus(scheduleId, status) {
    const result = await updateScheduleStatus(scheduleId, status);
    return result;
  }
}

module.exports = Schedule;
