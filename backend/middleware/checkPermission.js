const Role = require("../models/role");

/**
 * Generate scope-based query filter for data access control
 * @param {Object} user - The authenticated user object
 * @param {string} scope - The permission scope ('own', 'balagruh', 'all')
 * @returns {Object} MongoDB query filter
 */
function getScopeFilter(user, scope) {
  if (!scope) {
    // Default to 'own' if scope is undefined (backward compatibility)
    scope = 'own';
  }

  switch (scope) {
    case 'all':
      // Admin or global access - no filtering
      return {};

    case 'balagruh':
      // Balagruh-level access - filter by user's assigned Balagruh(s)
      // Support both single balagruhaId and multiple balagruhaIds array
      if (user.balagruhaIds && user.balagruhaIds.length > 0) {
        return { balagruhaId: { $in: user.balagruhaIds } };
      } else if (user.balagruhaId) {
        return { balagruhaId: user.balagruhaId };
      } else {
        // User has no assigned Balagruh - return filter that matches nothing
        return { balagruhaId: null };
      }

    case 'own':
      // Own data only - filter by user ID
      return { _id: user._id };

    default:
      // Invalid scope - default to most restrictive (own)
      console.warn(`Invalid scope value: ${scope}. Defaulting to 'own'.`);
      return { _id: user._id };
  }
}

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res
          .status(403)
          .json({ error: "Access denied. User role is not defined." });
      }

      const userRole = req.user.role;

      const role = await Role.findOne({ roleName: userRole });

      if (!role) {
        return res
          .status(403)
          .json({ error: "Access denied. Role not found." });
      }

      // Find the permission that matches module and action
      const permission = role.permissions.find((permission) => {
        return permission.module === module && permission.actions.includes(action);
      });

      if (!permission) {
        return res.status(403).json({
          error:
            "Access denied. You do not have permission to perform this action.",
        });
      }

      // RBAC Refactor: Inject scope-based filter for data access control
      // Controllers will use req.scopeFilter to filter queries by Balagruh/User
      req.scopeFilter = getScopeFilter(req.user, permission.scope);

      // Store the permission scope for debugging/logging
      req.permissionScope = permission.scope || 'own';

      next();
    } catch (error) {
      console.error("Error in checkPermission middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to validate balagruhaId URL parameter against user's assigned Balagruhas
 * Use this AFTER checkPermission middleware on routes with :balagruhaId parameter
 *
 * @example
 * router.get('/students/:balagruhaId',
 *   authenticate,
 *   checkPermission('User Management', 'View'),
 *   validateBalagruhaAccess,
 *   controller.getStudents
 * );
 */
const validateBalagruhaAccess = (req, res, next) => {
  try {
    const { balagruhaId } = req.params;

    // If no balagruhaId in URL, skip validation
    if (!balagruhaId) {
      return next();
    }

    // Check if user and permissionScope exist (should be set by checkPermission)
    if (!req.user || !req.permissionScope) {
      console.warn('validateBalagruhaAccess: Missing req.user or req.permissionScope');
      return res.status(403).json({
        success: false,
        message: 'Access denied. Permission context not found.'
      });
    }

    const scope = req.permissionScope;

    // Admin (scope='all') can access any Balagruha
    if (scope === 'all') {
      return next();
    }

    // Student (scope='own') should not access Balagruha-level routes
    if (scope === 'own') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access Balagruha-level data.'
      });
    }

    // Coach (scope='balagruh') must have balagruhaId in their assigned list
    if (scope === 'balagruh') {
      const userBalagruhaIds = req.user.balagruhaIds || [];

      // Check if requested balagruhaId is in user's assigned Balagruhas
      const hasAccess = userBalagruhaIds.some(
        id => id.toString() === balagruhaId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to access this Balagruha.',
          balagruhaId: balagruhaId,
          assignedBalagruhas: userBalagruhaIds.length
        });
      }

      return next();
    }

    // Unknown scope - deny access
    return res.status(403).json({
      success: false,
      message: `Access denied. Unknown permission scope: ${scope}`
    });

  } catch (error) {
    console.error('Error in validateBalagruhaAccess middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Balagruha access validation'
    });
  }
};

module.exports = checkPermission;
module.exports.getScopeFilter = getScopeFilter; // Export for testing
module.exports.validateBalagruhaAccess = validateBalagruhaAccess; // Export URL parameter validator
