const HospitalDataAccess = require("../data-access/hospital");

// Sprint6-Story-3-BugFix-006: Service layer for hospitals

exports.getAllHospitals = async () => {
  try {
    return await HospitalDataAccess.getAllHospitals();
  } catch (error) {
    console.error("Service error - getAllHospitals:", error);
    return {
      success: false,
      data: [],
      message: error.message || "Failed to fetch hospitals",
    };
  }
};

exports.createHospital = async (hospitalData) => {
  try {
    if (!hospitalData.name || hospitalData.name.trim() === "") {
      return {
        success: false,
        data: null,
        message: "Hospital name is required",
      };
    }

    return await HospitalDataAccess.createHospital(hospitalData);
  } catch (error) {
    console.error("Service error - createHospital:", error);
    return {
      success: false,
      data: null,
      message: error.message || "Failed to create hospital",
    };
  }
};

exports.searchHospitals = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === "") {
      return await HospitalDataAccess.getAllHospitals();
    }
    return await HospitalDataAccess.searchHospitals(searchTerm);
  } catch (error) {
    console.error("Service error - searchHospitals:", error);
    return {
      success: false,
      data: [],
      message: error.message || "Failed to search hospitals",
    };
  }
};
