const Hospital = require("../models/hospital");

// Sprint6-Story-3-BugFix-006: Get all hospitals
exports.getAllHospitals = async () => {
  try {
    const hospitals = await Hospital.find()
      .select("name address city")
      .sort({ name: 1 })
      .lean();

    return {
      success: true,
      data: hospitals,
      message: "Hospitals fetched successfully",
    };
  } catch (error) {
    console.error("Error fetching hospitals:", error);
    throw error;
  }
};

// Sprint6-Story-3-BugFix-006: Create new hospital
exports.createHospital = async ({ name, address, city, contactNumber, createdBy }) => {
  try {
    // Check if hospital with same name already exists (case-insensitive)
    const existingHospital = await Hospital.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingHospital) {
      return {
        success: true,
        data: existingHospital,
        message: "Hospital already exists",
      };
    }

    const hospital = new Hospital({
      name,
      address,
      city,
      contactNumber,
      createdBy,
    });

    await hospital.save();

    return {
      success: true,
      data: hospital,
      message: "Hospital created successfully",
    };
  } catch (error) {
    console.error("Error creating hospital:", error);
    throw error;
  }
};

// Sprint6-Story-3-BugFix-006: Search hospitals by name
exports.searchHospitals = async (searchTerm) => {
  try {
    const hospitals = await Hospital.find({
      name: { $regex: searchTerm, $options: "i" },
    })
      .select("name address city")
      .sort({ name: 1 })
      .limit(20)
      .lean();

    return {
      success: true,
      data: hospitals,
      message: "Hospitals searched successfully",
    };
  } catch (error) {
    console.error("Error searching hospitals:", error);
    throw error;
  }
};
