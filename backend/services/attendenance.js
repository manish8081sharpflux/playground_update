const { errorLogger } = require("../config/pino-config");
const {
  getAttendanceByStudentIdAndDate,
  updateAttendanceById,
  saveAttendance,
} = require("../data-access/attendance");
const { dateToString } = require("../utils/helper");

class Attendance {
  constructor(obj = {}) {
    this.balagruhaId = obj.balagruhaId || null;
    this.studentId = obj.studentId || null;
    this.date = obj.date || null;
    this.dateString = obj.dateString || "";
    this.status = obj.status || "absent";
    this.notes = obj.notes || "";
  }

  toJSON() {
    return {
      balagruhaId: this.balagruhaId,
      studentId: this.studentId,
      date: this.date,
      dateString: this.dateString,
      status: this.status,
      notes: this.notes,
      // Include manual override fields if they exist
      isManualOverride: this.isManualOverride,
      overrideReason: this.overrideReason,
      frSessionId: this.frSessionId,
      markedBy: this.markedBy,
    };
  }
  async saveToDb() {
    return await saveAttendance(this.toJSON());
  }

  static async saveAttendance(payload) {
    try {
      let { studentId, date } = payload;
      let dateString = dateToString(date);
      payload.dateString = dateString;
      // check for the attendance is already marked for the student on the given date
      let attendance = await getAttendanceByStudentIdAndDate({
        studentId: studentId,
        dateString: dateString,
      });
      if (attendance.success && attendance.data) {
        // if present update the attendance
        // update the attendance
        let result = await updateAttendanceById(attendance.data._id, payload);
        if (result.success) {
          return {
            success: true,
            data: {
              attendance: result.data,
            },
            message: "Attendance updated successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Error updating attendance",
          };
        }
      } else {
        // else create the attendance
        let attendanceObj = new Attendance(payload);
        let result = await attendanceObj.saveToDb();
        if (result.success) {
          return {
            success: true,
            data: {
              attendance: result.data,
            },
            message: "Attendance created successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Error creating attendance",
          };
        }
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Attendance service error");
      throw error;
    }
  }

  /**
   * Save Manual Override Attendance
   *
   * Marks attendance manually (when FR fails or is unavailable).
   * Ensures FR is an enhancement, not a blocker for attendance workflow.
   *
   * @param {Object} payload - Attendance data
   * @param {string} payload.studentId - Student ID
   * @param {string} payload.balagruhaId - Balagruha ID
   * @param {Date} payload.date - Attendance date
   * @param {string} payload.status - "present" or "absent"
   * @param {string} payload.overrideReason - Reason for manual marking
   * @param {string} payload.markedBy - User ID who marked attendance
   * @param {string} payload.frSessionId - Optional FR session ID (if FR was attempted)
   * @param {string} payload.notes - Optional notes
   * @returns {Object} { success, data, message }
   *
   * Sprint 1.1 Epic 02 Story 01 Task 9: Manual Override Workflow
   */
  static async saveManualAttendance(payload) {
    try {
      const { studentId, date, markedBy, overrideReason } = payload;

      // Validation
      if (!studentId) {
        return {
          success: false,
          data: {},
          message: "Student ID is required",
        };
      }

      if (!markedBy) {
        return {
          success: false,
          data: {},
          message: "markedBy (user ID) is required for manual override",
        };
      }

      if (!overrideReason) {
        return {
          success: false,
          data: {},
          message: "Override reason is required for manual attendance",
        };
      }

      // Prepare payload with manual override fields
      const dateString = dateToString(date);
      const attendancePayload = {
        ...payload,
        dateString,
        isManualOverride: true,
        overrideReason,
        markedBy,
      };

      // Check if attendance already exists for this student on this date
      const existingAttendance = await getAttendanceByStudentIdAndDate({
        studentId,
        dateString,
      });

      if (existingAttendance.success && existingAttendance.data) {
        // Update existing attendance record
        const result = await updateAttendanceById(
          existingAttendance.data._id,
          attendancePayload
        );

        if (result.success) {
          return {
            success: true,
            data: {
              attendance: result.data,
              isUpdate: true,
            },
            message: "Manual attendance updated successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Error updating manual attendance",
          };
        }
      } else {
        // Create new attendance record
        const attendanceObj = new Attendance(attendancePayload);
        const result = await attendanceObj.saveToDb();

        if (result.success) {
          return {
            success: true,
            data: {
              attendance: result.data,
              isUpdate: false,
            },
            message: "Manual attendance created successfully",
          };
        } else {
          return {
            success: false,
            data: {},
            message: "Error creating manual attendance",
          };
        }
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Manual attendance service error");
      throw error;
    }
  }
}

module.exports = Attendance;
