# Database Migrations

This directory contains database migration scripts for the ISF Playground project.

## Available Migrations

### 1. Add Scope to Permissions (`add-scope-to-permissions.js`)

**Purpose:** Add `scope` field to all existing role permissions
**Created:** 2025-10-18 21:29:31
**Sprint:** 1.1 - RBAC Refactor
**Story:** epic-01-story-01

**Scope Mapping:**
- Admin roles → `scope='all'` (global access)
- Coach/In-Charge → `scope='balagruh'` (assigned Balagruh only)
- Student → `scope='own'` (own data only)

**Usage:**

```bash
# Run migration
node backend/migrations/add-scope-to-permissions.js

# Rollback migration
node backend/migrations/add-scope-to-permissions.js rollback
```

**Environment Variables Required:**
- `MONGO_URI` or `MONGODB_URI` - MongoDB connection string

**Safety Features:**
- Idempotent (safe to run multiple times)
- Rollback support
- Skips permissions that already have scope field
- Transaction support (future enhancement)

---

## Migration Best Practices

1. **Always backup database before running migrations**
2. **Test on staging environment first**
3. **Keep migrations idempotent** (safe to run multiple times)
4. **Include rollback functions** for emergency reversion
5. **Document scope mapping logic** for future reference

---

## Testing Migrations

Before running on production:

1. Backup database
2. Run on staging environment
3. Verify data integrity
4. Test application functionality
5. Document any issues
6. Prepare rollback plan

---

**Last Updated:** 2025-10-18 21:29:31
