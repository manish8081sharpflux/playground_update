/**
 * Tests for verifyStudentOwnership middleware
 * Story 12.5 (FIX-010) — RBAC Enforcement on Student-Scoped LMS Endpoints
 */

const mongoose = require('mongoose');
const verifyStudentOwnership = require('../../middleware/verifyStudentOwnership');

describe('verifyStudentOwnership middleware', () => {
  let req, res, next;

  const studentAId = new mongoose.Types.ObjectId();
  const studentBId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    req = {
      params: { studentId: studentAId.toString() },
      user: {
        _id: studentAId,
        id: studentAId.toString(),
        role: 'student',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  // ── Core ownership check ──────────────────────────────────────────

  it('should allow a student to access their own data', () => {
    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when student A tries to access student B data', () => {
    // Student A is authenticated, but URL has student B's ID
    req.params.studentId = studentBId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Access denied'),
      })
    );
  });

  // ── Admin bypass ──────────────────────────────────────────────────

  it('should allow admin to access any student data', () => {
    req.user.role = 'admin';
    req.params.studentId = studentBId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Coach bypass ──────────────────────────────────────────────────

  it('should allow coach to access any student data', () => {
    req.user.role = 'coach';
    req.params.studentId = studentBId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Balagruha-incharge bypass ─────────────────────────────────────

  it('should allow balagruha-incharge to access any student data', () => {
    req.user.role = 'balagruha-incharge';
    req.params.studentId = studentBId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── No studentId param ────────────────────────────────────────────

  it('should call next() when no studentId param is present', () => {
    req.params = {};

    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── Missing auth ──────────────────────────────────────────────────

  it('should return 401 when req.user is missing', () => {
    delete req.user;

    verifyStudentOwnership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Authentication required'),
      })
    );
  });

  // ── Non-student, non-elevated role ────────────────────────────────

  it('should block a non-elevated role (e.g. amma) accessing another student', () => {
    req.user.role = 'amma';
    req.params.studentId = studentBId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ── Edge: user only has .id (string), no ._id ─────────────────────

  it('should work when user only has string id (no _id)', () => {
    req.user = {
      id: studentAId.toString(),
      role: 'student',
    };

    verifyStudentOwnership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── Cross-student: different IDs explicitly ───────────────────────

  it('should block student with different _id from accessing another studentId', () => {
    const attackerId = new mongoose.Types.ObjectId();
    req.user._id = attackerId;
    req.user.id = attackerId.toString();
    req.params.studentId = studentAId.toString();

    verifyStudentOwnership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('your own student data'),
      })
    );
  });
});
