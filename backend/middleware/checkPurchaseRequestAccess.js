/**
 * Sprint5-Story-24 + S24-BUG-005: Multi-Role Purchase Request Access Middleware
 * Allows ALL roles EXCEPT students to access purchase requests
 * without requiring specific "Purchase Management" permissions
 */

const checkPurchaseRequestAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          error: "Access denied. User role is not defined."
        });
      }

      const userRole = req.user.role.toLowerCase();

      // S24-BUG-005: Block only students from accessing purchase requests
      const blockedRoles = ['student'];

      if (blockedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: "Access denied. Students cannot access purchase requests."
        });
      }

      // All other roles are allowed
      next();
    } catch (error) {
      console.error("Error in checkPurchaseRequestAccess middleware:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  };
};

module.exports = checkPurchaseRequestAccess;
