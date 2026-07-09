/**
 * Unit Tests: checkPermission Middleware with Scope Filtering
 *
 * Tests the scope-based query filter generation logic
 * Created: 2025-10-18 21:34:00
 * Sprint: 1.1 - RBAC Refactor
 * Task: 2 - Implement Scope Filtering Middleware
 */

const mongoose = require('mongoose');
const { getScopeFilter } = require('../middleware/checkPermission');

describe('getScopeFilter - Scope-Based Query Filtering', () => {
  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    role: 'admin',
    balagruhIds: [],
  };

  const mockCoachUser = {
    _id: new mongoose.Types.ObjectId(),
    role: 'coach',
    balagruhaIds: [
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    ],
  };

  const mockSingleBalagruhCoach = {
    _id: new mongoose.Types.ObjectId(),
    role: 'balagruha-incharge',
    balagruhaId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
  };

  const mockStudentUser = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
    role: 'student',
    balagruhaId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
  };

  describe('Scope: "all" (Admin/Global Access)', () => {
    test('should return empty filter for scope="all"', () => {
      const filter = getScopeFilter(mockAdminUser, 'all');
      expect(filter).toEqual({});
    });

    test('should allow admin to see all data (no restrictions)', () => {
      const filter = getScopeFilter(mockAdminUser, 'all');
      expect(Object.keys(filter)).toHaveLength(0);
    });
  });

  describe('Scope: "balagruh" (Balagruh-Level Access)', () => {
    test('should filter by balagruhaIds array for multi-Balagruh users', () => {
      const filter = getScopeFilter(mockCoachUser, 'balagruh');

      expect(filter).toHaveProperty('balagruhaId');
      expect(filter.balagruhaId).toHaveProperty('$in');
      expect(filter.balagruhaId.$in).toHaveLength(2);
      expect(filter.balagruhaId.$in).toEqual(mockCoachUser.balagruhaIds);
    });

    test('should filter by single balagruhaId for users with balagruhaId field', () => {
      const filter = getScopeFilter(mockSingleBalagruhCoach, 'balagruh');

      expect(filter).toHaveProperty('balagruhaId');
      expect(filter.balagruhaId).toEqual(mockSingleBalagruhCoach.balagruhaId);
    });

    test('should return null filter if user has no assigned Balagruh', () => {
      const userWithNoBalagruh = {
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        // No balagruhaId or balagruhaIds
      };

      const filter = getScopeFilter(userWithNoBalagruh, 'balagruh');
      expect(filter).toEqual({ balagruhaId: null });
    });
  });

  describe('Scope: "own" (User-Level Access)', () => {
    test('should filter by _id for scope="own"', () => {
      const filter = getScopeFilter(mockStudentUser, 'own');

      expect(filter).toHaveProperty('_id');
      expect(filter._id).toEqual(mockStudentUser._id);
    });

    test('should restrict student to own data only', () => {
      const filter = getScopeFilter(mockStudentUser, 'own');

      expect(Object.keys(filter)).toEqual(['_id']);
      expect(filter._id).toBe(mockStudentUser._id);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should default to "own" if scope is undefined', () => {
      const filter = getScopeFilter(mockStudentUser, undefined);

      expect(filter).toHaveProperty('_id');
      expect(filter._id).toEqual(mockStudentUser._id);
    });

    test('should default to "own" if scope is null', () => {
      const filter = getScopeFilter(mockStudentUser, null);

      expect(filter).toHaveProperty('_id');
      expect(filter._id).toEqual(mockStudentUser._id);
    });

    test('should default to "own" for invalid scope value', () => {
      const filter = getScopeFilter(mockStudentUser, 'invalid-scope');

      expect(filter).toHaveProperty('_id');
      expect(filter._id).toEqual(mockStudentUser._id);
    });

    test('should handle user with no _id field gracefully', () => {
      const userWithoutId = { role: 'student' };
      const filter = getScopeFilter(userWithoutId, 'own');

      expect(filter).toHaveProperty('_id');
      expect(filter._id).toBeUndefined();
    });
  });

  describe('Real-World Scenarios', () => {
    test('Admin can query all students (no filter)', () => {
      const filter = getScopeFilter(mockAdminUser, 'all');
      // Query: Student.find(filter) -> returns all students
      expect(filter).toEqual({});
    });

    test('Coach can query only assigned Balagruh students', () => {
      const filter = getScopeFilter(mockCoachUser, 'balagruh');
      // Query: Student.find(filter) -> returns only students in Balagruh 1 & 2
      expect(filter.balagruhaId.$in).toEqual(mockCoachUser.balagruhaIds);
    });

    test('Student can query only own data', () => {
      const filter = getScopeFilter(mockStudentUser, 'own');
      // Query: Course.find(filter) -> returns only student's own courses
      expect(filter._id).toEqual(mockStudentUser._id);
    });
  });
});

describe('Integration Test: Scope Filter with MongoDB Queries', () => {
  test('should construct valid MongoDB query with scope filter', () => {
    const mockCoach = {
      _id: new mongoose.Types.ObjectId(),
      balagruhaIds: [new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')],
    };

    const filter = getScopeFilter(mockCoach, 'balagruh');

    // Simulate controller usage
    const query = { ...filter, status: 'active' };

    expect(query).toEqual({
      balagruhaId: { $in: mockCoach.balagruhaIds },
      status: 'active',
    });
  });

  test('should allow combining scope filter with other query parameters', () => {
    const mockStudent = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
    };

    const filter = getScopeFilter(mockStudent, 'own');

    // Controller adds additional filters
    const query = {
      ...filter,
      courseId: '123',
      completed: true,
    };

    expect(query).toEqual({
      _id: mockStudent._id,
      courseId: '123',
      completed: true,
    });
  });
});
