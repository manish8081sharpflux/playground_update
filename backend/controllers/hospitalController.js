const HospitalService = require("../services/hospital");
const logger = require("pino")(require("../config/pino-config"));

// Sprint6-Story-3-BugFix-006: Hospital controller for API endpoints

// GET /api/hospitals - Get all hospitals
exports.getAllHospitals = async (req, res) => {
  try {
    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
      },
      "Request received for getting all hospitals"
    );

    const result = await HospitalService.getAllHospitals();

    if (result.success) {
      logger.info("Hospitals fetched successfully");
      return res.status(200).json(result);
    } else {
      logger.error("Failed to fetch hospitals:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in getAllHospitals controller:", error);
    return res.status(500).json({
      success: false,
      data: [],
      message: error.message || "Internal server error",
    });
  }
};

// POST /api/hospitals - Create new hospital
exports.createHospital = async (req, res) => {
  try {
    const { name, address, city, contactNumber } = req.body;
    const createdBy = req.user?._id;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        data: { name, address, city },
      },
      "Request received for creating hospital"
    );

    const result = await HospitalService.createHospital({
      name,
      address,
      city,
      contactNumber,
      createdBy,
    });

    if (result.success) {
      logger.info(`Hospital created/found: ${name}`);
      return res.status(result.data.createdAt ? 201 : 200).json(result);
    } else {
      logger.error("Failed to create hospital:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in createHospital controller:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message || "Internal server error",
    });
  }
};

// GET /api/hospitals/search?q=searchTerm - Search hospitals
exports.searchHospitals = async (req, res) => {
  try {
    const { q } = req.query;

    logger.info(
      {
        clientIP: req.socket.remoteAddress,
        method: req.method,
        api: req.originalUrl,
        query: { q },
      },
      "Request received for searching hospitals"
    );

    const result = await HospitalService.searchHospitals(q);

    if (result.success) {
      logger.info(`Hospitals search completed, found ${result.data.length} results`);
      return res.status(200).json(result);
    } else {
      logger.error("Failed to search hospitals:", result.message);
      return res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in searchHospitals controller:", error);
    return res.status(500).json({
      success: false,
      data: [],
      message: error.message || "Internal server error",
    });
  }
};
