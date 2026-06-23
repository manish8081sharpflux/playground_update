/**
 * Middleware: verifyStudentOwnership
 * Story 12.5 (FIX-010) — RBAC Enforcement on Student-Scoped LMS Endpoints
 *
 * Ensures the authenticated user matches the :studentId URL parameter.
 * Prevents cross-student data access (Student A cannot read Student B's data).
 *
 * Bypass: admin and coach roles can access any student's data.
 *
 * Must be placed AFTER the authenticate middleware in the route chain.
 */

const ADMIN_ROLES = ['admin'];
const ELEVATED_ROLES = ['admin', 'coach', 'balagruha-incharge'];

/**
 * Verify that the authenticated user owns the :studentId resource,
 * or has an elevated role that grants cross-student access.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyStudentOwnership = (req, res, next) => {
  try {
    const { studentId } = req.params;

    // If no studentId param present, skip (route does not require it)
    if (!studentId) {
      return next();
    }

    // Ensure authenticate middleware has run
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRole = req.user.role;

    // Elevated roles (admin, coach, balagruha-incharge) bypass ownership check
    if (userRole && ELEVATED_ROLES.includes(userRole)) {
      return next();
    }

    // Compare authenticated user's ID with the requested studentId
    // req.user._id is a Mongoose ObjectId; convert both to strings for comparison
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (userId === studentId) {
      return next();
    }

    // Mismatch: student is trying to access another student's data
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own student data.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during student ownership verification.',
    });
  }
};

module.exports = verifyStudentOwnership;
