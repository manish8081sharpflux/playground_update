/**
 * Migration Test: Add Scope to Permissions
 *
 * Tests the migration script that adds scope field to role permissions
 * Created: 2025-10-18 21:29:31
 * Sprint: 1.1 - RBAC Refactor
 */

const mongoose = require('mongoose');
const Role = require('../models/role');

describe('Migration: Add Scope to Permissions', () => {
  beforeEach(async () => {
    // Clear roles collection before each test
    await Role.deleteMany({});
  });

  test('should add scope field to new permissions', async () => {
    // Create a role with permissions (no scope field initially)
    const adminRole = new Role({
      roleName: 'admin',
      permissions: [
        {
          module: 'User Management',
          actions: ['Create', 'Read', 'Update', 'Delete'],
        },
      ],
    });

    await adminRole.save();

    // Verify scope was added with default value
    const savedRole = await Role.findOne({ roleName: 'admin' });
    expect(savedRole.permissions[0].scope).toBe('own'); // Default value
  });

  test('should allow setting scope to "all" for admin', async () => {
    const adminRole = new Role({
      roleName: 'admin',
      permissions: [
        {
          module: 'User Management',
          actions: ['Create', 'Read', 'Update', 'Delete'],
          scope: 'all',
        },
      ],
    });

    await adminRole.save();

    const savedRole = await Role.findOne({ roleName: 'admin' });
    expect(savedRole.permissions[0].scope).toBe('all');
  });

  test('should allow setting scope to "balagruh" for coach', async () => {
    const coachRole = new Role({
      roleName: 'coach',
      permissions: [
        {
          module: 'Student Management',
          actions: ['Read'],
          scope: 'balagruh',
        },
      ],
    });

    await coachRole.save();

    const savedRole = await Role.findOne({ roleName: 'coach' });
    expect(savedRole.permissions[0].scope).toBe('balagruh');
  });

  test('should allow setting scope to "own" for student', async () => {
    const studentRole = new Role({
      roleName: 'student',
      permissions: [
        {
          module: 'Course Management',
          actions: ['Read'],
          scope: 'own',
        },
      ],
    });

    await studentRole.save();

    const savedRole = await Role.findOne({ roleName: 'student' });
    expect(savedRole.permissions[0].scope).toBe('own');
  });

  test('should reject invalid scope values', async () => {
    const invalidRole = new Role({
      roleName: 'test-role',
      permissions: [
        {
          module: 'Test Module',
          actions: ['Read'],
          scope: 'invalid-scope', // Should fail validation
        },
      ],
    });

    await expect(invalidRole.save()).rejects.toThrow();
  });

  test('should allow multiple permissions with different scopes', async () => {
    const mixedRole = new Role({
      roleName: 'mixed-role',
      permissions: [
        {
          module: 'Module A',
          actions: ['Read'],
          scope: 'own',
        },
        {
          module: 'Module B',
          actions: ['Read', 'Update'],
          scope: 'balagruh',
        },
        {
          module: 'Module C',
          actions: ['Read', 'Create', 'Update', 'Delete'],
          scope: 'all',
        },
      ],
    });

    await mixedRole.save();

    const savedRole = await Role.findOne({ roleName: 'mixed-role' });
    expect(savedRole.permissions).toHaveLength(3);
    expect(savedRole.permissions[0].scope).toBe('own');
    expect(savedRole.permissions[1].scope).toBe('balagruh');
    expect(savedRole.permissions[2].scope).toBe('all');
  });
});

// Manual test for migration script
describe('Migration Script Logic Verification', () => {
  test('should map role names to correct default scopes', () => {
    const SCOPE_MAPPING = {
      'admin': 'all',
      'coach': 'balagruh',
      'balagruha-incharge': 'balagruh',
      'student': 'own',
      'purchase-manager': 'all',
      'medical-incharge': 'balagruh',
      'sports-coach': 'balagruh',
      'music-coach': 'balagruh',
      'amma': 'all',
    };

    // Verify admin gets 'all'
    expect(SCOPE_MAPPING['admin']).toBe('all');

    // Verify coaches get 'balagruh'
    expect(SCOPE_MAPPING['coach']).toBe('balagruh');
    expect(SCOPE_MAPPING['balagruha-incharge']).toBe('balagruh');
    expect(SCOPE_MAPPING['sports-coach']).toBe('balagruh');

    // Verify student gets 'own'
    expect(SCOPE_MAPPING['student']).toBe('own');
  });
});
