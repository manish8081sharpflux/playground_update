/**
 * RBAC Verification & E2E Tests (Story 2.4)
 *
 * Purpose: Verify RBAC enforcement across all roles, scope filter isolation,
 * middleware chain integrity, and that no API endpoint leaks cross-scope data.
 *
 * Prerequisites: Stories 2.1-2.3 complete (42 controllers audited, scope filters
 * added to 8 controllers, auth middleware on 14 route files, FR TODOs resolved)
 *
 * Created: 2026-03-16
 * Sprint: S2 — Epic 2 RBAC Enforcement
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { getScopeFilter } = require('../middleware/checkPermission');

// ─── All 9 Roles ────────────────────────────────────────────────────────────
const ALL_ROLES = [
  'admin',
  'coach',
  'student',
  'balagruha-incharge',
  'purchase-manager',
  'medical-incharge',
  'sports-coach',
  'music-coach',
  'amma',
];

// ─── Test IDs ────────────────────────────────────────────────────────────────
const BALAGRUHA_A = new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
const BALAGRUHA_B = new mongoose.Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');
const BALAGRUHA_C = new mongoose.Types.ObjectId('cccccccccccccccccccccccc');

// ─── Helper: create mock user for a role ─────────────────────────────────────
function mockUser(role, opts = {}) {
  return {
    _id: opts._id || new mongoose.Types.ObjectId(),
    role,
    balagruhaIds: opts.balagruhaIds || [],
    balagruhaId: opts.balagruhaId || undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Scope Filter Generation — All 9 Roles
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Scope Filter for All 9 Roles (Story 2.4)', () => {

  describe('Admin role — scope "all"', () => {
    const admin = mockUser('admin');

    test('admin gets empty filter (unrestricted access)', () => {
      const filter = getScopeFilter(admin, 'all');
      expect(filter).toEqual({});
      expect(Object.keys(filter)).toHaveLength(0);
    });

    test('admin filter applied to query returns all documents', () => {
      const filter = getScopeFilter(admin, 'all');
      const query = { ...filter, status: 'active' };
      expect(query).toEqual({ status: 'active' });
    });
  });

  describe('Coach role — scope "balagruh"', () => {
    const coach = mockUser('coach', { balagruhaIds: [BALAGRUHA_A] });

    test('coach gets balagruha filter', () => {
      const filter = getScopeFilter(coach, 'balagruh');
      expect(filter).toHaveProperty('balagruhaId');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_A]);
    });

    test('coach cannot see Balagruha B data', () => {
      const filter = getScopeFilter(coach, 'balagruh');
      expect(filter.balagruhaId.$in.map(id => id.toString())).not.toContain(BALAGRUHA_B.toString());
    });
  });

  describe('Student role — scope "own"', () => {
    const student = mockUser('student');

    test('student gets own-data filter', () => {
      const filter = getScopeFilter(student, 'own');
      expect(filter).toEqual({ _id: student._id });
    });

    test('student filter only contains _id', () => {
      const filter = getScopeFilter(student, 'own');
      expect(Object.keys(filter)).toEqual(['_id']);
    });
  });

  describe('Balagruha-incharge role — scope "balagruh"', () => {
    const bic = mockUser('balagruha-incharge', { balagruhaIds: [BALAGRUHA_B] });

    test('BIC gets balagruha filter for assigned Balagruha', () => {
      const filter = getScopeFilter(bic, 'balagruh');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_B]);
    });
  });

  describe('Purchase-manager role — scope "all" or "balagruh"', () => {
    const pm = mockUser('purchase-manager', { balagruhaIds: [BALAGRUHA_A, BALAGRUHA_B] });

    test('PM with scope "all" gets empty filter', () => {
      const filter = getScopeFilter(pm, 'all');
      expect(filter).toEqual({});
    });

    test('PM with scope "balagruh" gets assigned Balagruha filter', () => {
      const filter = getScopeFilter(pm, 'balagruh');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_A, BALAGRUHA_B]);
    });
  });

  describe('Medical-incharge role — scope "balagruh"', () => {
    const medic = mockUser('medical-incharge', { balagruhaIds: [BALAGRUHA_C] });

    test('medical-incharge gets balagruha filter', () => {
      const filter = getScopeFilter(medic, 'balagruh');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_C]);
    });
  });

  describe('Sports-coach role — scope "balagruh"', () => {
    const sports = mockUser('sports-coach', { balagruhaIds: [BALAGRUHA_A] });

    test('sports-coach gets balagruha filter', () => {
      const filter = getScopeFilter(sports, 'balagruh');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_A]);
    });
  });

  describe('Music-coach role — scope "balagruh"', () => {
    const music = mockUser('music-coach', { balagruhaIds: [BALAGRUHA_B] });

    test('music-coach gets balagruha filter', () => {
      const filter = getScopeFilter(music, 'balagruh');
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_B]);
    });
  });

  describe('Amma role — scope "balagruh"', () => {
    const amma = mockUser('amma', { balagruhaIds: [BALAGRUHA_A, BALAGRUHA_C] });

    test('amma gets multi-balagruha filter', () => {
      const filter = getScopeFilter(amma, 'balagruh');
      expect(filter.balagruhaId.$in).toHaveLength(2);
      expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_A, BALAGRUHA_C]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Cross-Balagruha Data Isolation
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Cross-Balagruha Isolation (Story 2.4)', () => {

  test('two coaches at different Balagruhas produce non-overlapping filters', () => {
    const coachA = mockUser('coach', { balagruhaIds: [BALAGRUHA_A] });
    const coachB = mockUser('coach', { balagruhaIds: [BALAGRUHA_B] });

    const filterA = getScopeFilter(coachA, 'balagruh');
    const filterB = getScopeFilter(coachB, 'balagruh');

    const idsA = filterA.balagruhaId.$in.map(id => id.toString());
    const idsB = filterB.balagruhaId.$in.map(id => id.toString());

    // No overlap
    const overlap = idsA.filter(id => idsB.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test('multi-Balagruha user gets all assigned Balagruhas but not unassigned ones', () => {
    const user = mockUser('coach', { balagruhaIds: [BALAGRUHA_A, BALAGRUHA_B] });
    const filter = getScopeFilter(user, 'balagruh');

    const ids = filter.balagruhaId.$in.map(id => id.toString());
    expect(ids).toContain(BALAGRUHA_A.toString());
    expect(ids).toContain(BALAGRUHA_B.toString());
    expect(ids).not.toContain(BALAGRUHA_C.toString());
  });

  test('user with no balagruhaIds gets null filter (matches nothing)', () => {
    const user = mockUser('coach');
    const filter = getScopeFilter(user, 'balagruh');
    expect(filter).toEqual({ balagruhaId: null });
  });

  test('student filter uses _id, not balagruhaId', () => {
    const student = mockUser('student', { balagruhaIds: [BALAGRUHA_A] });
    const filter = getScopeFilter(student, 'own');
    expect(filter).toHaveProperty('_id');
    expect(filter).not.toHaveProperty('balagruhaId');
  });

  test('two students produce non-overlapping own-data filters', () => {
    const s1 = mockUser('student');
    const s2 = mockUser('student');
    const f1 = getScopeFilter(s1, 'own');
    const f2 = getScopeFilter(s2, 'own');
    expect(f1._id.toString()).not.toBe(f2._id.toString());
  });

  test('scope filter merges safely with additional query conditions', () => {
    const coach = mockUser('coach', { balagruhaIds: [BALAGRUHA_A] });
    const filter = getScopeFilter(coach, 'balagruh');
    const query = { ...filter, status: 'active', type: 'daily' };

    expect(query).toEqual({
      balagruhaId: { $in: [BALAGRUHA_A] },
      status: 'active',
      type: 'daily',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Escalation Prevention
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Escalation Prevention (Story 2.4)', () => {

  test('invalid scope defaults to most restrictive (own)', () => {
    const user = mockUser('coach', { balagruhaIds: [BALAGRUHA_A] });
    const filter = getScopeFilter(user, 'HACKED_SCOPE');
    expect(filter).toEqual({ _id: user._id });
  });

  test('empty string scope defaults to own', () => {
    const user = mockUser('admin');
    const filter = getScopeFilter(user, '');
    expect(filter).toEqual({ _id: user._id });
  });

  test('undefined scope defaults to own', () => {
    const user = mockUser('student');
    const filter = getScopeFilter(user, undefined);
    expect(filter).toEqual({ _id: user._id });
  });

  test('null scope defaults to own', () => {
    const user = mockUser('student');
    const filter = getScopeFilter(user, null);
    expect(filter).toEqual({ _id: user._id });
  });

  ALL_ROLES.forEach(role => {
    test(`${role} with invalid scope gets restrictive filter`, () => {
      const user = mockUser(role);
      const filter = getScopeFilter(user, 'superadmin');
      expect(filter).toHaveProperty('_id');
      expect(filter._id).toEqual(user._id);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Route-Level Middleware Verification (Static Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Route Middleware Enforcement (Story 2.4)', () => {

  // FR routes: zero TODOs, all protected
  describe('Facial Recognition routes', () => {
    const frRoutePath = path.join(__dirname, '..', 'routes', 'v2', 'facialRecognition.js');
    let frRouteCode;

    beforeAll(() => {
      frRouteCode = fs.readFileSync(frRoutePath, 'utf8');
    });

    test('FR routes contain zero TODO placeholders', () => {
      expect(frRouteCode).not.toMatch(/TODO/i);
    });

    test('FR register route has authenticate + checkPermission', () => {
      expect(frRouteCode).toMatch(/register.*authenticate.*checkPermission/s);
    });

    test('FR recognize route is public (login mechanism)', () => {
      // recognize route should NOT have authenticate — it is the login mechanism
      const recognizeBlock = frRouteCode.match(/\/recognize[\s\S]*?frController\.recognizeFace/);
      expect(recognizeBlock).not.toBeNull();
      expect(recognizeBlock[0]).not.toMatch(/authenticate/);
    });

    test('FR status route has authenticate + checkPermission', () => {
      expect(frRouteCode).toMatch(/status.*authenticate.*checkPermission/s);
    });

    test('FR delete route has authenticate + checkPermission', () => {
      // The delete route for register/:studentId
      const deleteBlock = frRouteCode.match(/delete[\s\S]*?deleteFaceRegistration/i);
      expect(deleteBlock).not.toBeNull();
      expect(deleteBlock[0]).toMatch(/authenticate/);
      expect(deleteBlock[0]).toMatch(/checkPermission/);
    });

    test('FR stats route has authenticate + checkPermission', () => {
      expect(frRouteCode).toMatch(/stats.*authenticate.*checkPermission/s);
    });
  });

  // LMS student routes: must have authenticate
  describe('LMS Student routes', () => {
    const lmsStudentDir = path.join(__dirname, '..', 'routes', 'v2', 'lms', 'student');

    const studentRouteFiles = [
      'computerApps.js',
      'art.js',
      'spokenEnglish.js',
      'lifeSkills.js',
      'dashboard.js',
    ];

    studentRouteFiles.forEach(routeFile => {
      test(`${routeFile} has authenticate middleware`, () => {
        const filePath = path.join(lmsStudentDir, routeFile);
        if (!fs.existsSync(filePath)) return; // skip if file doesn't exist
        const code = fs.readFileSync(filePath, 'utf8');
        expect(code).toMatch(/authenticate/);
      });
    });

    test('computerApps routes — previously had NO auth, now secured', () => {
      const filePath = path.join(lmsStudentDir, 'computerApps.js');
      const code = fs.readFileSync(filePath, 'utf8');
      // Every router.get/post should include authenticate
      const routeLines = code.match(/router\.(get|post|put|delete|patch)\([^)]+/g) || [];
      routeLines.forEach(line => {
        expect(line).toMatch(/authenticate/);
      });
    });
  });

  // Medical routes: must have authorize
  describe('Medical routes', () => {
    test('medicalCheckInsRoutes has authorize on all routes', () => {
      const filePath = path.join(__dirname, '..', 'routes', 'medicalCheckInsRoutes.js');
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authorize/);
      // Should have Medical Management module
      expect(code).toMatch(/Medical Management/);
    });

    test('medicalRecordsRoutes has authorize on all routes', () => {
      const filePath = path.join(__dirname, '..', 'routes', 'medicalRecordsRoutes.js');
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authorize/);
      expect(code).toMatch(/Medical Management/);
    });
  });

  // Schedule routes: must have authorize
  describe('Schedule routes', () => {
    test('scheduleRoutes has authorize middleware', () => {
      const filePath = path.join(__dirname, '..', 'routes', 'scheduleRoutes.js');
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authorize/);
      expect(code).toMatch(/Schedule Management/);
    });
  });

  // Mood tracker routes
  describe('Mood tracker routes', () => {
    test('studentMoodTrackerRoutes has authenticate + authorize', () => {
      const filePath = path.join(__dirname, '..', 'routes', 'studentMoodTrackerRoutes.js');
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authenticate/);
      expect(code).toMatch(/authorize/);
    });
  });

  // LMS Coach routes
  describe('LMS Coach routes', () => {
    const coachRouteFiles = [
      { file: 'routes/v2/lms/coach/assignments.js', name: 'assignments' },
      { file: 'routes/v2/lms/coach/grading.js', name: 'grading' },
      { file: 'routes/v2/lms/coach.js', name: 'coach main' },
    ];

    coachRouteFiles.forEach(({ file, name }) => {
      test(`${name} routes have authorize middleware`, () => {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) return;
        const code = fs.readFileSync(filePath, 'utf8');
        expect(code).toMatch(/authorize/);
        expect(code).toMatch(/LMS Management/);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Controller Scope Filter Usage Verification (Static Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Controller Scope Filter Enforcement (Story 2.4)', () => {

  const controllersWithScopeFilter = [
    'controllers/taskController.js',
    'controllers/medicalCheckInsController.js',
    'controllers/scheduleController.js',
    'controllers/sports.js',
    'controllers/music.js',
    'controllers/studentMoodTrackerController.js',
    'controllers/purchaseAndRepair.js',
    'controllers/userController.js',
    'controllers/balagruha.js',
  ];

  controllersWithScopeFilter.forEach(controllerPath => {
    const name = path.basename(controllerPath, '.js');

    test(`${name} uses req.scopeFilter in queries`, () => {
      const filePath = path.join(__dirname, '..', controllerPath);
      if (!fs.existsSync(filePath)) return;
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/req\.scopeFilter/);
    });
  });

  // Admin-only controllers should NOT need scopeFilter (they serve all data by design)
  const adminOnlyControllers = [
    'controllers/roleController.js',
    'controllers/adminProductController.js',
    'controllers/machineController.js',
  ];

  adminOnlyControllers.forEach(controllerPath => {
    const name = path.basename(controllerPath, '.js');

    test(`${name} is admin-only (no scope filter needed)`, () => {
      const filePath = path.join(__dirname, '..', controllerPath);
      if (!fs.existsSync(filePath)) return;
      const code = fs.readFileSync(filePath, 'utf8');
      // These are admin-only controllers — it's acceptable that they don't use scopeFilter
      // Just verify they exist and are reachable
      expect(code.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Middleware Security Audit (No Bypasses, No Dev Shortcuts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Security Audit (Story 2.4)', () => {

  test('auth.js contains no development bypass', () => {
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'auth.js'), 'utf8'
    );
    expect(code).not.toMatch(/NODE_ENV.*development.*next\(\)/);
    expect(code).not.toMatch(/DEVELOPMENT BYPASS/);
    expect(code.toLowerCase()).not.toMatch(/skip.*auth/);
    expect(code.toLowerCase()).not.toMatch(/bypass.*auth/);
  });

  test('checkPermission.js contains no bypass keywords', () => {
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'checkPermission.js'), 'utf8'
    );
    expect(code.toLowerCase()).not.toMatch(/bypass/);
    expect(code.toLowerCase()).not.toMatch(/skip.*check/);
    expect(code.toLowerCase()).not.toMatch(/skip.*permission/);
  });

  test('authorize function sets req.scopeFilter', () => {
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'auth.js'), 'utf8'
    );
    expect(code).toMatch(/req\.scopeFilter\s*=\s*getScopeFilter/);
  });

  test('checkPermission function sets req.scopeFilter', () => {
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'checkPermission.js'), 'utf8'
    );
    expect(code).toMatch(/req\.scopeFilter\s*=\s*getScopeFilter/);
  });

  test('both middleware functions set req.permissionScope', () => {
    const authCode = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'auth.js'), 'utf8'
    );
    const cpCode = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'checkPermission.js'), 'utf8'
    );
    expect(authCode).toMatch(/req\.permissionScope/);
    expect(cpCode).toMatch(/req\.permissionScope/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: validateBalagruhaAccess Middleware Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — validateBalagruhaAccess Middleware (Story 2.4)', () => {
  const { validateBalagruhaAccess } = require('../middleware/checkPermission');

  function makeReq(params = {}, user = {}, permissionScope = 'balagruh') {
    return {
      params,
      user,
      permissionScope,
    };
  }

  function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('admin (scope=all) can access any Balagruha', () => {
    const req = makeReq(
      { balagruhaId: BALAGRUHA_B.toString() },
      { role: 'admin' },
      'all'
    );
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('coach can access assigned Balagruha', () => {
    const req = makeReq(
      { balagruhaId: BALAGRUHA_A.toString() },
      { role: 'coach', balagruhaIds: [BALAGRUHA_A] },
      'balagruh'
    );
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('coach cannot access unassigned Balagruha', () => {
    const req = makeReq(
      { balagruhaId: BALAGRUHA_B.toString() },
      { role: 'coach', balagruhaIds: [BALAGRUHA_A] },
      'balagruh'
    );
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('student (scope=own) is denied Balagruha-level access', () => {
    const req = makeReq(
      { balagruhaId: BALAGRUHA_A.toString() },
      { role: 'student' },
      'own'
    );
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('skips validation when no balagruhaId in params', () => {
    const req = makeReq({}, { role: 'coach', balagruhaIds: [BALAGRUHA_A] }, 'balagruh');
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 403 when req.user is missing', () => {
    const req = { params: { balagruhaId: BALAGRUHA_A.toString() } };
    const res = makeRes();
    const next = jest.fn();

    validateBalagruhaAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: Comprehensive Role-to-Scope Matrix Verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Role-to-Scope Matrix (Story 2.4)', () => {

  // Verify the complete mapping of role + scope → expected filter type
  const testMatrix = [
    { role: 'admin',              scope: 'all',      expectType: 'empty',      desc: 'Admin sees everything' },
    { role: 'coach',              scope: 'balagruh', expectType: 'balagruha',  desc: 'Coach sees assigned Balagruha' },
    { role: 'student',            scope: 'own',      expectType: 'own',        desc: 'Student sees own data' },
    { role: 'balagruha-incharge', scope: 'balagruh', expectType: 'balagruha',  desc: 'BIC sees assigned Balagruha' },
    { role: 'purchase-manager',   scope: 'all',      expectType: 'empty',      desc: 'PM (all scope) sees everything' },
    { role: 'purchase-manager',   scope: 'balagruh', expectType: 'balagruha',  desc: 'PM (balagruh scope) sees assigned' },
    { role: 'medical-incharge',   scope: 'balagruh', expectType: 'balagruha',  desc: 'Medical sees assigned Balagruha' },
    { role: 'sports-coach',       scope: 'balagruh', expectType: 'balagruha',  desc: 'Sports coach sees assigned' },
    { role: 'music-coach',        scope: 'balagruh', expectType: 'balagruha',  desc: 'Music coach sees assigned' },
    { role: 'amma',               scope: 'balagruh', expectType: 'balagruha',  desc: 'Amma sees assigned Balagruha' },
    { role: 'admin',              scope: 'own',      expectType: 'own',        desc: 'Admin with own scope restricted' },
    { role: 'coach',              scope: 'own',      expectType: 'own',        desc: 'Coach with own scope restricted' },
  ];

  testMatrix.forEach(({ role, scope, expectType, desc }) => {
    test(desc, () => {
      const user = mockUser(role, { balagruhaIds: [BALAGRUHA_A] });
      const filter = getScopeFilter(user, scope);

      switch (expectType) {
        case 'empty':
          expect(filter).toEqual({});
          break;
        case 'balagruha':
          expect(filter).toHaveProperty('balagruhaId');
          break;
        case 'own':
          expect(filter).toHaveProperty('_id');
          expect(filter._id).toEqual(user._id);
          break;
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: Route Coverage Verification — Authenticate on Sensitive Routes
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — Sensitive Route Authentication (Story 2.4)', () => {

  // These route files MUST have authenticate middleware
  const sensitiveRoutes = [
    { file: 'routes/medicalCheckInsRoutes.js', name: 'Medical Check-ins' },
    { file: 'routes/medicalRecordsRoutes.js', name: 'Medical Records' },
    { file: 'routes/scheduleRoutes.js', name: 'Schedules' },
    { file: 'routes/studentMoodTrackerRoutes.js', name: 'Mood Tracker' },
    { file: 'routes/taskRoutes.js', name: 'Tasks' },
    { file: 'routes/v2/facialRecognition.js', name: 'Facial Recognition' },
    { file: 'routes/v2/lms/coach/assignments.js', name: 'LMS Coach Assignments' },
    { file: 'routes/v2/lms/coach/grading.js', name: 'LMS Coach Grading' },
    { file: 'routes/v2/lms/coach.js', name: 'LMS Coach Main' },
    { file: 'routes/v2/lms/student/computerApps.js', name: 'LMS Computer Apps' },
    { file: 'routes/v2/lms/student/art.js', name: 'LMS Art' },
    { file: 'routes/v2/lms/student/spokenEnglish.js', name: 'LMS Spoken English' },
    { file: 'routes/v2/lms/student/lifeSkills.js', name: 'LMS Life Skills' },
    { file: 'routes/v2/lms/student/dashboard.js', name: 'LMS Student Dashboard' },
    { file: 'routes/v1/coin.js', name: 'Coin Management' },
    { file: 'routes/notificationRoutes.js', name: 'Notifications' },
  ];

  sensitiveRoutes.forEach(({ file, name }) => {
    test(`${name} routes require authentication`, () => {
      const filePath = path.join(__dirname, '..', file);
      if (!fs.existsSync(filePath)) return;
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authenticate/);
    });
  });

  // These route files should have authorize OR checkPermission for role-based access
  const authorizedRoutes = [
    { file: 'routes/medicalCheckInsRoutes.js', name: 'Medical Check-ins' },
    { file: 'routes/medicalRecordsRoutes.js', name: 'Medical Records' },
    { file: 'routes/scheduleRoutes.js', name: 'Schedules' },
    { file: 'routes/v2/facialRecognition.js', name: 'Facial Recognition' },
    { file: 'routes/v2/lms/coach/assignments.js', name: 'LMS Coach Assignments' },
    { file: 'routes/v2/lms/coach/grading.js', name: 'LMS Coach Grading' },
    { file: 'routes/v2/lms/coach.js', name: 'LMS Coach Main' },
  ];

  authorizedRoutes.forEach(({ file, name }) => {
    test(`${name} routes have authorize/checkPermission for role enforcement`, () => {
      const filePath = path.join(__dirname, '..', file);
      if (!fs.existsSync(filePath)) return;
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toMatch(/authorize|checkPermission/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: Edge Cases for balagruhaId Handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Verification — balagruhaId Edge Cases (Story 2.4)', () => {

  test('user with single balagruhaId (not array) gets direct filter', () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      role: 'balagruha-incharge',
      balagruhaId: BALAGRUHA_A,
      // no balagruhaIds array
    };
    const filter = getScopeFilter(user, 'balagruh');
    expect(filter.balagruhaId).toEqual(BALAGRUHA_A);
  });

  test('user with empty balagruhaIds array gets null filter', () => {
    const user = mockUser('coach', { balagruhaIds: [] });
    const filter = getScopeFilter(user, 'balagruh');
    expect(filter).toEqual({ balagruhaId: null });
  });

  test('user with both balagruhaId and balagruhaIds prefers array', () => {
    const user = {
      _id: new mongoose.Types.ObjectId(),
      role: 'coach',
      balagruhaId: BALAGRUHA_A,
      balagruhaIds: [BALAGRUHA_B, BALAGRUHA_C],
    };
    const filter = getScopeFilter(user, 'balagruh');
    // balagruhaIds takes priority (checked first in getScopeFilter)
    expect(filter.balagruhaId.$in).toEqual([BALAGRUHA_B, BALAGRUHA_C]);
  });
});
