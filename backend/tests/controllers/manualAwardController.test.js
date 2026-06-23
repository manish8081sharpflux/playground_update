const mongoose = require('mongoose');

// Mock the models
jest.mock('../../models/coin');
jest.mock('../../models/user');

const User = require('../../models/user');
const Coin = require('../../models/coin');
const { awardCoins } = require('../../controllers/lms/coach/manualAwardController');

describe('manualAwardController - Balagruha Authorization (FIX-013)', () => {
  let req, res;

  const coachBalagruhaId = new mongoose.Types.ObjectId();
  const otherBalagruhaId = new mongoose.Types.ObjectId();
  const studentId1 = new mongoose.Types.ObjectId().toString();
  const studentId2 = new mongoose.Types.ObjectId().toString();

  // Helper: make User.find return a chainable query with .select()
  const mockUserFind = (results) => {
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(results),
    });
  };

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    req = {
      body: {
        studentIds: [studentId1],
        amount: 10,
        reason: 'Good work',
        category: 'general',
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        role: 'coach',
        balagruhaIds: [coachBalagruhaId],
      },
    };
    jest.clearAllMocks();
  });

  // --- Validation tests (pre-existing, sanity) ---

  test('returns 400 if studentIds is missing', async () => {
    req.body.studentIds = undefined;
    await awardCoins(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('Student IDs') })
    );
  });

  test('returns 400 if amount is invalid', async () => {
    req.body.amount = -5;
    await awardCoins(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if reason is missing', async () => {
    req.body.reason = '';
    await awardCoins(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if amount exceeds 100', async () => {
    req.body.amount = 101;
    await awardCoins(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('exceed 100') })
    );
  });

  // --- FIX-013: Balagruha authorization ---

  test('returns 403 when coach has no assigned Balagruhas', async () => {
    req.user.balagruhaIds = [];

    await awardCoins(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('no assigned Balagruhas'),
      })
    );
  });

  test('returns 403 when student is not in coach Balagruha', async () => {
    // Student belongs to a different balagruha
    mockUserFind([
      {
        _id: { toString: () => studentId1 },
        name: 'Student One',
        balagruhaIds: [otherBalagruhaId],
      },
    ]);

    await awardCoins(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('do not have Balagruha authority'),
        unauthorizedStudentIds: [studentId1],
      })
    );
  });

  test('returns 403 when any student in batch is unauthorized', async () => {
    req.body.studentIds = [studentId1, studentId2];

    mockUserFind([
      {
        _id: { toString: () => studentId1 },
        name: 'Student One',
        balagruhaIds: [coachBalagruhaId], // authorized
      },
      {
        _id: { toString: () => studentId2 },
        name: 'Student Two',
        balagruhaIds: [otherBalagruhaId], // NOT authorized
      },
    ]);

    await awardCoins(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        unauthorizedStudentIds: [studentId2],
      })
    );
  });

  test('allows coach to award students in their Balagruha', async () => {
    const mockCoinRecord = {
      addCoins: jest.fn().mockResolvedValue(true),
    };

    mockUserFind([
      {
        _id: { toString: () => studentId1 },
        name: 'Student One',
        balagruhaIds: [coachBalagruhaId],
      },
    ]);

    User.findById.mockResolvedValue({
      _id: studentId1,
      name: 'Student One',
      balagruhaIds: [coachBalagruhaId],
    });

    Coin.findOrCreateForUser.mockResolvedValue(mockCoinRecord);

    await awardCoins(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(mockCoinRecord.addCoins).toHaveBeenCalledWith(
      10, 'earned', 'Good work', 'manual_award', expect.any(Object)
    );
  });

  test('admin bypasses Balagruha check entirely', async () => {
    req.user.role = 'admin';
    req.user.balagruhaIds = []; // admin may have no balagruhaIds

    const mockCoinRecord = {
      addCoins: jest.fn().mockResolvedValue(true),
    };

    // User.find should NOT be called for authorization when admin
    User.findById.mockResolvedValue({
      _id: studentId1,
      name: 'Student One',
      balagruhaIds: [otherBalagruhaId],
    });

    Coin.findOrCreateForUser.mockResolvedValue(mockCoinRecord);

    await awardCoins(req, res);

    // User.find for balagruha check should not have been called
    expect(User.find).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test('skips not-found students in authorization (caught later as error)', async () => {
    req.body.studentIds = [studentId1, studentId2];

    // Only student1 is found; student2 does not exist
    mockUserFind([
      {
        _id: { toString: () => studentId1 },
        name: 'Student One',
        balagruhaIds: [coachBalagruhaId],
      },
    ]);

    // In the per-student loop, student2 will not be found
    User.findById.mockImplementation((id) => {
      if (id === studentId1) {
        return Promise.resolve({
          _id: studentId1,
          name: 'Student One',
          balagruhaIds: [coachBalagruhaId],
        });
      }
      return Promise.resolve(null);
    });

    const mockCoinRecord = { addCoins: jest.fn().mockResolvedValue(true) };
    Coin.findOrCreateForUser.mockResolvedValue(mockCoinRecord);

    await awardCoins(req, res);

    // Should not 403 — the missing student is handled as an error, not an auth failure
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        errors: expect.arrayContaining([
          expect.objectContaining({ studentId: studentId2, message: 'Student not found' }),
        ]),
      })
    );
  });

  test('returns 403 when student has no balagruhaIds (empty array)', async () => {
    mockUserFind([
      {
        _id: { toString: () => studentId1 },
        name: 'Orphan Student',
        balagruhaIds: [], // no balagruha assigned
      },
    ]);

    await awardCoins(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ unauthorizedStudentIds: [studentId1] })
    );
  });
});
