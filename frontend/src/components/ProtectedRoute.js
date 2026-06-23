// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRBAC } from "../contexts/RBACContext";
import { normalizeUserRole } from "../constants/userTypes";

/**
 * Helper to determine role-appropriate dashboard for redirect.
 * Students go to /student/dashboard; everyone else goes to /dashboard.
 */
const getDashboardForRole = (role) => {
  const normalized = normalizeUserRole(role);
  if (normalized === "student") return "/student/dashboard";
  return "/dashboard";
};

/**
 * ProtectedRoute – guards routes by authentication, role, and module/action permission.
 *
 * Props:
 *   - requiredRoles: string[] – if provided, user.role must match one of these
 *   - module / action: string – if both provided, checked via useRBAC.hasPermission
 *   - children: rendered when access is granted
 */
const ProtectedRoute = ({ children, module, action, requiredRoles }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isLoading: rbacLoading, hasPermission, permissions } = useRBAC();

  // Permissions are only ready when rbacLoading is false AND permissions have been populated
  const permissionsReady = !rbacLoading && Object.keys(permissions || {}).length > 0;

  // If either auth or RBAC is loading (or permissions not yet populated), show loading
  if (authLoading || rbacLoading || (module && action && !permissionsReady)) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading permissions...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {

    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeUserRole(user?.role);

  // If requiredRoles specified, check the user's role is in the list
  if (requiredRoles && requiredRoles.length > 0) {
    const roleAllowed = requiredRoles.some(
      (r) => r.toLowerCase() === userRole
    );

    if (!roleAllowed) {

      return <Navigate to={getDashboardForRole(userRole)} replace />;
    }
  }

  // If module and action are specified, check permissions via RBAC context
  if (module && action) {
    // Admin always has access (RBAC API returns full permissions for admin,
    // but as a safety net we also grant here)
    const isAdmin = userRole === "admin";
    const permitted = isAdmin || hasPermission(module, action);



    if (!permitted) {

      return <Navigate to={getDashboardForRole(userRole)} replace />;
    }
  }

  // If authenticated and has permission (or no permission check needed), render the children
  return children;
};

export default ProtectedRoute;
