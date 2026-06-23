const DoctorService = require("../services/doctor");
const logger = require("pino")(require("../config/pino-config"));

// Sprint6-Story-3-AC2: Doctor controller for API endpoints

// GET /api/doctors - Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received for getting all doctors"
    );

    const result = await DoctorService.getAllDoctors();

    if (result.success) {
      logger.info("Doctors fetched successfully");
      return res.status(200).json(result);
    } else {
      logger.error("Failed to fetch doctors:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in getAllDoctors controller:", error);
    return res.status(500).json({
      success: false,
      data: [],
      message: error.message || "Internal server error",
    });
  }
};

// POST /api/doctors - Create new doctor
exports.createDoctor = async (req, res) => {
  try {
    const { name, specialty, hospital, contactNumber } = req.body;
    const createdBy = req.user?._id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { name, specialty, hospital },
      },
      "Request received for creating doctor"
    );

    const result = await DoctorService.createDoctor({
      name,
      specialty,
      hospital,
      contactNumber,
      createdBy,
    });

    if (result.success) {
      logger.info(`Doctor created/found: ${name}`);
      return res.status(result.data.createdAt ? 201 : 200).json(result);
    } else {
      logger.error("Failed to create doctor:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in createDoctor controller:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Internal server error",
    });
  }
};

// PUT /api/doctors/:id - Update doctor
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, hospital, contactNumber } = req.body;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { id, name, specialty, hospital },
      },
      "Request received for updating doctor"
    );

    const result = await DoctorService.updateDoctor(id, {
      name,
      specialty,
      hospital,
      contactNumber,
    });

    if (result.success) {
      logger.info(`Doctor updated: ${id}`);
      return res.status(200).json(result);
    } else {
      logger.error("Failed to update doctor:", result.message);
      return res.status(result.message === "Doctor not found" ? 404 : 400).json(result);
    }
  } catch (error) {
    logger.error("Error in updateDoctor controller:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Internal server error",
    });
  }
};

// DELETE /api/doctors/:id - Delete doctor
exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { id },
      },
      "Request received for deleting doctor"
    );

    const result = await DoctorService.deleteDoctor(id);

    if (result.success) {
      logger.info(`Doctor deleted: ${id}`);
      return res.status(200).json(result);
    } else {
      logger.error("Failed to delete doctor:", result.message);
      return res.status(result.message === "Doctor not found" ? 404 : 400).json(result);
    }
  } catch (error) {
    logger.error("Error in deleteDoctor controller:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Internal server error",
    });
  }
};

// GET /api/doctors/search?q=searchTerm - Search doctors
exports.searchDoctors = async (req, res) => {
  try {
    const { q } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: { q },
      },
      "Request received for searching doctors"
    );

    const result = await DoctorService.searchDoctors(q);

    if (result.success) {
      logger.info(`Doctors search completed, found ${result.data.length} results`);
      return res.status(200).json(result);
    } else {
      logger.error("Failed to search doctors:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in searchDoctors controller:", error);
    return res.status(500).json({
      success: false,
      data: [],
      message: error.message || "Internal server error",
    });
  }
};
