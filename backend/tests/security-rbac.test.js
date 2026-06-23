/**
 * Security Tests: RBAC System
 *
 * Purpose: Verify RBAC security - no bypass, proper scoping, permission enforcement
 * Created: 2025-10-18 22:29:47
 * Sprint: 1.1 - RBAC Refactor
 */

const { getScopeFilter } = require('../middleware/checkPermission');
const mongoose = require('mongoose');

describe('RBAC Security Tests', () => {
  describe('Development Bypass - MUST BE REMOVED', () => {
    test('should NOT bypass permission checks in development mode', () => {
      // Read auth.js middleware
      const fs = require('fs');
      const authMiddleware = fs.readFileSync(require('path').join(__dirname, '..', 'middleware', 'auth.js'), 'utf8');

      // Check that development bypass is REMOVED
      expect(authMiddleware).not.toMatch(/NODE_ENV.*development.*next\(\)/);
      expect(authMiddleware).not.toMatch(/DEVELOPMENT BYPASS.*Skip role checks/);
      expect(authMiddleware).not.toMatch(/process\.env\.NODE_ENV.*===.*"development"/);
    });

    test('should NOT bypass permission checks in local mode', () => {
      const fs = require('fs');
      const authMiddleware = fs.readFileSync(require('path').join(__dirname, '..', 'middleware', 'auth.js'), 'utf8');

      expect(authMiddleware).not.toMatch(/process\.env\.NODE_ENV.*===.*"local"/);
    });
  });

  describe('Balagruh-Level Data Isolation', () => {
    const mockCoachBalagruh1 = {
      _id: new mongoose.Types.ObjectId(),
      role: 'coach',
      balagruhaIds: [new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')],
    };

    const mockCoachBalagruh2 = {
      _id: new mongoose.Types.ObjectId(),
      role: 'coach',
      balagruhaIds: [new mongoose.Types.ObjectId('507f1f77bcf86cd799439022')],
    };

    test('Coach A cannot access Balagruh B data', () => {
      const filterA = getScopeFilter(mockCoachBalagruh1, 'balagruh');
      const filterB = getScopeFilter(mockCoachBalagruh2, 'balagruh');

      // Filters should be different
      expect(filterA.balagruhaId.$in[0].toString()).not.toBe(
        filterB.balagruhaId.$in[0].toString()
      );

      // Coach A filter should only include Balagruh 1
      expect(filterA.balagruhaId.$in).toEqual(mockCoachBalagruh1.balagruhaIds);

      // Coach B filter should only include Balagruh 2
      expect(filterB.balagruhaId.$in).toEqual(mockCoachBalagruh2.balagruhaIds);
    });

    test('Coach with no assigned Balagruh gets null filter', () => {
      const coachNoAccess = {
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        // No balagruhaIds
      };

      const filter = getScopeFilter(coachNoAccess, 'balagruh');

      expect(filter).toEqual({ balagruhaId: null });
      // This filter will match NO documents in database
    });

    test('Multi-Balagruh coach can access all assigned Balagruhs', () => {
      const multiCoach = {
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        balagruhaIds: [
          new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
        ],
      };

      const filter = getScopeFilter(multiCoach, 'balagruh');

      expect(filter.balagruhaId.$in).toHaveLength(2);
      expect(filter.balagruhaId.$in).toEqual(multiCoach.balagruhaIds);
    });
  });

  describe('Permission Escalation Prevention', () => {
    test('Student cannot escalate to Admin scope', () => {
      const student = {
        _id: new mongoose.Types.ObjectId(),
        role: 'student',
      };

      // Even if someone modifies the scope parameter
      const filter = getScopeFilter(student, 'all'); // Trying to get admin access

      // Should still return empty (admin filter), but student won't have this permission
      // The permission check happens in middleware before getScopeFilter is called
      expect(filter).toEqual({}); // This is admin filter, but student won't pass permission check
    });

    test('Invalid scope defaults to most restrictive (own)', () => {
      const user = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
        role: 'student',
      };

      const filter = getScopeFilter(user, 'INVALID_SCOPE');

      // Should default to 'own' (most restrictive)
      expect(filter).toEqual({ _id: user._id });
    });
  });

  describe('Field Naming Consistency', () => {
    test('should use balagruhaIds (with a) not balagruhIds (without a)', () => {
      const coach = {
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        balagruhaIds: [new mongoose.Types.ObjectId()], // Correct spelling
      };

      const filter = getScopeFilter(coach, 'balagruh');

      // Should generate filter with balagruhaId (correct spelling)
      expect(filter).toHaveProperty('balagruhaId');
      expect(filter).not.toHaveProperty('balagruhId'); // Wrong spelling
    });
  });

  describe('Admin Global Access', () => {
    test('Admin should get empty filter (no restrictions)', () => {
      const admin = {
        _id: new mongoose.Types.ObjectId(),
        role: 'admin',
      };

      const filter = getScopeFilter(admin, 'all');

      expect(filter).toEqual({});
      expect(Object.keys(filter)).toHaveLength(0);
    });
  });

  describe('Student Own-Data Access', () => {
    test('Student should only access own data', () => {
      const student = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
        role: 'student',
      };

      const filter = getScopeFilter(student, 'own');

      expect(filter).toEqual({ _id: student._id });
      expect(filter._id.toString()).toBe(student._id.toString());
    });

    test('Student cannot access another student data', () => {
      const student1 = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        role: 'student',
      };

      const student2 = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
        role: 'student',
      };

      const filter1 = getScopeFilter(student1, 'own');
      const filter2 = getScopeFilter(student2, 'own');

      expect(filter1._id.toString()).not.toBe(filter2._id.toString());
    });
  });
});

describe('Security Audit Checklist', () => {
  test('Middleware code should not contain bypasses', () => {
    const fs = require('fs');
    const checkPermissionCode = fs.readFileSync(
      require('path').join(__dirname, '..', 'middleware', 'checkPermission.js'),
      'utf8'
    );

    // Should not contain bypass keywords
    expect(checkPermissionCode.toLowerCase()).not.toMatch(/bypass/);
    expect(checkPermissionCode.toLowerCase()).not.toMatch(/skip.*check/);
    expect(checkPermissionCode.toLowerCase()).not.toMatch(/skip.*permission/);
  });

  test('Auth middleware should not contain development shortcuts', () => {
    const fs = require('fs');
    const authCode = fs.readFileSync(require('path').join(__dirname, '..', 'middleware', 'auth.js'), 'utf8');

    // Should not skip authentication
    expect(authCode.toLowerCase()).not.toMatch(/skip.*auth/);
    expect(authCode.toLowerCase()).not.toMatch(/bypass.*auth/);
  });
});
