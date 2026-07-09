const Doctor = require("../models/doctor");

// Sprint6-Story-3-AC2: Get all doctors
// Data Bank: returns full fields so the management UI can render everything
exports.getAllDoctors = async () => {
  try {
    const doctors = await Doctor.find()
      .select("name specialty hospital contactNumber createdBy createdAt updatedAt")
      .populate("createdBy", "name email")
      .sort({ name: 1 })
      .lean();

    return {
      success: true,
      data: doctors,
      message: "Doctors fetched successfully",
    };
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw error;
  }
};

// Get single doctor by ID
exports.getDoctorById = async (id) => {
  try {
    const doctor = await Doctor.findById(id)
      .populate("createdBy", "name email")
      .lean();
    if (!doctor) {
      return { success: false, data: null, message: "Doctor not found" };
    }
    return { success: true, data: doctor, message: "Doctor fetched successfully" };
  } catch (error) {
    console.error("Error fetching doctor by ID:", error);
    throw error;
  }
};

// Update doctor fields
exports.updateDoctor = async (id, updates) => {
  try {
    const allowed = ["name", "specialty", "hospital", "contactNumber"];
    const safeUpdates = {};
    allowed.forEach((k) => {
      if (updates[k] !== undefined) safeUpdates[k] = updates[k];
    });

    const doctor = await Doctor.findByIdAndUpdate(id, safeUpdates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!doctor) {
      return { success: false, data: null, message: "Doctor not found" };
    }

    return { success: true, data: doctor, message: "Doctor updated successfully" };
  } catch (error) {
    console.error("Error updating doctor:", error);
    throw error;
  }
};

// Delete doctor
exports.deleteDoctor = async (id) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(id);
    if (!doctor) {
      return { success: false, data: null, message: "Doctor not found" };
    }
    return { success: true, data: doctor, message: "Doctor deleted successfully" };
  } catch (error) {
    console.error("Error deleting doctor:", error);
    throw error;
  }
};

// Sprint6-Story-3-AC2: Create new doctor
exports.createDoctor = async ({ name, specialty, hospital, contactNumber, createdBy }) => {
  try {
    // Check if doctor with same name already exists (case-insensitive)
    const existingDoctor = await Doctor.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingDoctor) {
      return {
        success: true,
        data: existingDoctor,
        message: "Doctor already exists",
      };
    }

    const doctor = new Doctor({
      name,
      specialty,
      hospital,
      contactNumber,
      createdBy,
    });

    await doctor.save();

    return {
      success: true,
      data: doctor,
      message: "Doctor created successfully",
    };
  } catch (error) {
    console.error("Error creating doctor:", error);
    throw error;
  }
};

// Sprint6-Story-3-AC2: Search doctors by name
exports.searchDoctors = async (searchTerm) => {
  try {
    const doctors = await Doctor.find({
      name: { $regex: searchTerm, $options: "i" },
    })
      .select("name specialty hospital")
      .sort({ name: 1 })
      .limit(20)
      .lean();

    return {
      success: true,
      data: doctors,
      message: "Doctors searched successfully",
    };
  } catch (error) {
    console.error("Error searching doctors:", error);
    throw error;
  }
};
