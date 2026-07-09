# Frontend RBAC Integration Guide

**Created:** 2025-10-18 22:28:00
**Sprint:** 1.1 - RBAC Refactor
**Purpose:** Guide for integrating permission-based UI in frontend components

---

## New RBAC Tools Available

### 1. usePermission Hook
```javascript
import usePermission from '../hooks/usePermission';

function MyComponent() {
  const canEdit = usePermission('User Management', 'Update');
  const canDelete = usePermission('User Management', 'Delete');

  return (
    <div>
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

### 2. PermissionGuard Component
```javascript
import PermissionGuard from '../components/PermissionGuard';

function MyComponent() {
  return (
    <div>
      <PermissionGuard module="User Management" action="Create">
        <button>Create User</button>
      </PermissionGuard>

      <PermissionGuard module="User Management" action="Delete">
        <button>Delete User</button>
      </PermissionGuard>
    </div>
  );
}
```

### 3. Existing RBACContext (useRBAC hook)
```javascript
import { useRBAC } from '../contexts/RBACContext';

function MyComponent() {
  const { hasPermission, hasModuleAccess } = useRBAC();

  if (!hasModuleAccess('User Management')) {
    return <div>No access to this module</div>;
  }

  return (
    <div>
      {hasPermission('User Management', 'Create') && <button>Create</button>}
      {hasPermission('User Management', 'Update') && <button>Edit</button>}
    </div>
  );
}
```

---

## Integration Patterns

### Navigation Menu Filtering
```javascript
import { useRBAC } from '../contexts/RBACContext';

function Sidebar() {
  const { hasModuleAccess } = useRBAC();

  return (
    <nav>
      {hasModuleAccess('User Management') && (
        <Link to="/users">Users</Link>
      )}
      {hasModuleAccess('Student Management') && (
        <Link to="/students">Students</Link>
      )}
      {hasModuleAccess('Shop Management') && (
        <Link to="/shop">Shop</Link>
      )}
    </nav>
  );
}
```

### Button Visibility
```javascript
import PermissionGuard from '../components/PermissionGuard';

function UserList() {
  return (
    <table>
      {/* ... table rows ... */}
      <tr>
        <td>John Doe</td>
        <td>
          <PermissionGuard module="User Management" action="Update">
            <button>Edit</button>
          </PermissionGuard>

          <PermissionGuard module="User Management" action="Delete">
            <button>Delete</button>
          </PermissionGuard>
        </td>
      </tr>
    </table>
  );
}
```

### Form Field Disabling
```javascript
import usePermission from '../hooks/usePermission';

function UserForm() {
  const canEditRole = usePermission('User Management', 'Manage');

  return (
    <form>
      <input name="name" />
      <input name="email" />
      <select name="role" disabled={!canEditRole}>
        <option>Admin</option>
        <option>Coach</option>
      </select>
    </form>
  );
}
```

---

## Components to Update

Priority components that need RBAC integration:

1. **Navigation/Sidebar** - Filter menu items
2. **User Management** - Show/hide Edit/Delete buttons
3. **Student Management** - Show/hide management buttons
4. **Shop Management** - Admin-only product creation
5. **Reports** - Role-based report access
6. **Settings** - Admin-only settings

---

## Best Practices

✅ **DO:**
- Use PermissionGuard for simple show/hide
- Use usePermission for complex conditional logic
- Hide UI elements users can't use (better UX)
- Check permissions on both frontend AND backend

❌ **DON'T:**
- Rely only on frontend permission checks (security)
- Hardcode role names (use permission checks)
- Show buttons that will fail on backend
- Forget to handle loading states

---

**Last Updated:** 2025-10-18 22:28:00
