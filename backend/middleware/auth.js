const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const Machine = require("../models/machine");
const { getScopeFilter } = require("./checkPermission");
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.status === "inactive") {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    // MAC Address validation (disabled - hardware-specific requirement)
    // To enable, uncomment the following code:
    /*
    const macAddress = req.header("MAC-Address");

    if (!macAddress) {
      return res.status(403).json({
        success: false,
        message: "MAC Address is required",
      });
    }

    const machine = await Machine.findOne({
      macAddress: macAddress,
      status: "active",
    });

    if (!machine) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Invalid or inactive machine",
      });
    }

    if (user.role === "Student") {
      if (String(user.balagruhaId) !== String(machine.AssignedBalagruha)) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: Student is not in the same Balagruha as the machine",
        });
      }
    }
    */

    req.user = user;

    next();
  } catch (err) {
    console.error(err);

    // Handle JWT-specific errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED"
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        code: "INVALID_TOKEN"
      });
    }

    // Generic authentication error
    res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
    });
  }
};

exports.authorize = (module, action) => {
  return async (req, res, next) => {
    try {
      const userRole = (req.user.role || "").trim().toLowerCase();

      if (userRole === "admin") {
        req.scopeFilter = {};
        req.permissionScope = "all";
        return next();
      }

      

      const role = await Role.findOne({
        roleName: { $regex: new RegExp(`^${userRole}$`, "i") },
      });

      

      if (!role) {
        return res.status(403).json({
          success: false,
          message: `Role ${userRole} not found`,
        });
      }

      const permission = role.permissions.find((permission) => {
        return (
          permission.module?.trim().toLowerCase() === module.trim().toLowerCase() &&
          permission.actions?.some(
            (a) => a.trim().toLowerCase() === action.trim().toLowerCase()
          )
        );
      });

      
      if (!permission) {
        return res.status(403).json({
          success: false,
          message: `Role ${userRole} is not authorized to perform ${action} on ${module}`,
        });
      }

      req.scopeFilter = getScopeFilter(req.user, permission.scope);
      req.permissionScope = permission.scope || "own";

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};