const { errorLogger } = require("../config/pino-config");
const { createMedicalRecords } = require("../data-access/medicalRecords");

class MedicalRecords {
  constructor(obj) {
    this.studentId = obj.studentId || "";
    this.healthCheckupDate = obj.healthCheckupDate || "";
    this.vaccinations = obj.vaccinations || "";
    this.medicalHistory = obj.medicalHistory || "";
    this.notes = obj.notes || "";
    this.createdBy = obj.createdBy || "";
  }

  toJSON() {
    return {
      studentId: this.studentId,
      healthCheckupDate: this.healthCheckupDate,
      vaccinations: this.vaccinations,
      medicalHistory: this.medicalHistory,
      notes: this.notes,
      createdBy: this.createdBy,
    };
  }

  static async createMedicalRecords(obj) {
    try {
      // check for the createdBy and studentId are existing
      let medicalRecord = new MedicalRecords(obj).toJSON();
      if (!medicalRecord.studentId) {
        return {
          success: false,
          data: {},
          message: "Student id is required",
        };
      }
      if (!medicalRecord.createdBy) {
        return {
          success: false,
          data: {},
          message: "Created Admin Id is required",
        };
      }
      let result = await createMedicalRecords(medicalRecord);
      if (result) {
        // fetch the student details by student id
      } else {
        return result;
      }
    } catch (error) {
      errorLogger.error({ error: error.message }, "Medical records service error");
      throw error;
    }
  }
}

module.exports = MedicalRecords;
