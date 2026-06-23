const Medical = require("../models/medical");

// Function for create the medical records
exports.createMedicalRecords = async (payload) => {
  return await Medical.create([payload])
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Successfully created the medical records",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};

// update medical next action date by student id
exports.updateNextActionDate = async (studentId, nextActionDate) => {
  return await Medical.findOneAndUpdate(
    { studentId: studentId },
    { nextActionDate: nextActionDate },
    { new: true }
  )
    .then((result) => {
      return {
        success: true,
        data: result,
        message: "Successfully updated the medical records",
      };
    })
    .catch((error) => {
      console.log("error", error);
      throw error;
    });
};
