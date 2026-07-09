/**
 * usePermission Hook - Convenience wrapper around useRBAC
 *
 * Delegates all permission checks to the RBACContext (which fetches from API).
 * Provides convenience methods: canCreate, canRead, canUpdate, canDelete.
 *
 * Story 8.2: Consolidated from broken localStorage-based hook to useRBAC wrapper.
 *
 * Usage (object mode - no args):
 *   const { canCreate, canRead, canUpdate, canDelete, can } = usePermission();
 *   const allowed = canRead('User Management');
 *
 * Usage (boolean mode - with args):
 *   const hasPermission = usePermission('User Management', 'Read');
 */

import { useRBAC } from '../contexts/RBACContext';

export const usePermission = (module, action) => {
  const { hasPermission, hasModuleAccess, getAllModules } = useRBAC();

  const can = (checkAction, checkModule) => {
    return hasPermission(checkModule, checkAction);
  };

  const canCreate = (mod) => hasPermission(mod, 'Create');
  const canRead = (mod) => hasPermission(mod, 'Read');
  const canUpdate = (mod) => hasPermission(mod, 'Update');
  const canDelete = (mod) => hasPermission(mod, 'Delete');

  const getAccessibleModules = () => {
    return getAllModules().filter((mod) => hasModuleAccess(mod));
  };

  // If called with args directly, return boolean (PermissionGuard usage)
  if (module && action) {
    return hasPermission(module, action);
  }

  // If called without args, return object with convenience methods
  return { can, canCreate, canRead, canUpdate, canDelete, getAccessibleModules };
};

export default usePermission;
