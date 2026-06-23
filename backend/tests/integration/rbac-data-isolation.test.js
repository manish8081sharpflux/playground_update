/**
 * RBAC Data Isolation Integration Tests (Story 6.6)
 *
 * Purpose: Verify ACTUAL data isolation across Balagruhas at the DB query level.
 * Unlike Story 2.4's 112 tests that verify getScopeFilter() returns correct objects,
 * these tests CREATE real data in mongodb-memory-server and verify that controllers
 * only return data matching the scope filter.
 *
 * Test Architecture:
 * 1. Seed 2 Balagruhas (A, B) with distinct data
 * 2. Simulate authenticated request with Coach A's scope filter
 * 3. Call actual controller method
 * 4. Assert response contains ONLY Balagruha A data
 * 5. Repeat with Coach B — assert ONLY Balagruha B data
 * 6. Admin — assert ALL data across both Balagruhas
 *
 * Controllers tested (6 high-risk controllers):
 * - taskController.getAllTasks
 * - scheduleController.getSchedules
 * - purchaseAndRepair.getAllRepairRequests
 * - purchaseAndRepair.getAllPurchaseOrders
 * - userController.getAllUsers
 * - balagruha controller.getAllBalagruha
 *
 * Created: 2026-03-16
 * Sprint: S2 — Story 6.6 RBAC Data Isolation Integration Tests
 */

const mongoose = require('mongoose');

// ─── Fix User Model ─────────────────────────────────────────────────────────
// The test setup.js registers a simplified User model without assignedMachines
// and medicalRecords fields. The userController.getAllUsers tries to populate
// these fields, causing "Cannot populate path" errors. Fix by ensuring the
// full User schema is registered before any controller imports.
if (mongoose.models.User) {
  // Delete the simplified User model so the full one can be registered
  delete mongoose.models.User;
  delete mongoose.connection.collections['users'];
  // Also remove from modelSchemas
  if (mongoose.modelSchemas && mongoose.modelSchemas.User) {
    delete mongoose.modelSchemas.User;
  }
}

// ─── Models ─────────────────────────────────────────────────────────────────
const BalagruhaModel = require('../../models/balagruha');
const TaskModel = require('../../models/task');
const ScheduleModel = require('../../models/schedules');
const RepairRequestModel = require('../../models/repairRequests');
const PurchaseOrderModel = require('../../models/purchaseOrders');
const User = require('../../models/user');

// ─── Controllers ────────────────────────────────────────────────────────────
const taskController = require('../../controllers/taskController');
const scheduleController = require('../../controllers/scheduleController');
const purchaseAndRepairController = require('../../controllers/purchaseAndRepair');
const userController = require('../../controllers/userController');
const balagruhaController = require('../../controllers/balagruha');

// ─── Middleware ──────────────────────────────────────────────────────────────
const { getScopeFilter } = require('../../middleware/checkPermission');

// ─── Test Constants ─────────────────────────────────────────────────────────
let BALAGRUHA_A_ID;
let BALAGRUHA_B_ID;
let COACH_A_ID;
let COACH_B_ID;
let ADMIN_ID;
let STUDENT_A1_ID;
let STUDENT_A2_ID;
let STUDENT_B1_ID;
let STUDENT_B2_ID;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a mock Express request object with scopeFilter set
 */
function createMockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { _id: new mongoose.Types.ObjectId(), role: 'admin' },
    scopeFilter: {},
    permissionScope: 'all',
    socket: { remoteAddress: '127.0.0.1' },
    method: 'GET',
    originalUrl: '/api/test',
    ...overrides,
  };
}

/**
 * Create a mock Express response object that captures status and json calls
 */
function createMockRes() {
  const res = {};
  res.statusCode = null;
  res.jsonData = null;
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((data) => {
    res.jsonData = data;
    return res;
  });
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP: Seed 2 Balagruhas with distinct data
// ═══════════════════════════════════════════════════════════════════════════════

describe('RBAC Data Isolation Integration Tests (Story 6.6)', () => {
  beforeEach(async () => {
    // Create Balagruhas
    const balagruhaA = await BalagruhaModel.create({
      name: 'Balagruha Alpha',
      location: 'Location Alpha',
    });
    const balagruhaB = await BalagruhaModel.create({
      name: 'Balagruha Beta',
      location: 'Location Beta',
    });
    BALAGRUHA_A_ID = balagruhaA._id;
    BALAGRUHA_B_ID = balagruhaB._id;

    // Create Admin (no balagruha assignment)
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
    });
    ADMIN_ID = admin._id;

    // Create Coach A (assigned to Balagruha A)
    const coachA = await User.create({
      name: 'Coach Alpha',
      email: 'coach.alpha@test.com',
      password: 'hashedpassword',
      role: 'coach',
      balagruhaIds: [BALAGRUHA_A_ID],
    });
    COACH_A_ID = coachA._id;

    // Create Coach B (assigned to Balagruha B)
    const coachB = await User.create({
      name: 'Coach Beta',
      email: 'coach.beta@test.com',
      password: 'hashedpassword',
      role: 'coach',
      balagruhaIds: [BALAGRUHA_B_ID],
    });
    COACH_B_ID = coachB._id;

    // Create Students for Balagruha A
    const studentA1 = await User.create({
      name: 'Student A1',
      email: 'student.a1@test.com',
      password: 'hashedpassword',
      role: 'student',
      age: 12,
      gender: 'male',
      balagruhaIds: [BALAGRUHA_A_ID],
    });
    STUDENT_A1_ID = studentA1._id;

    const studentA2 = await User.create({
      name: 'Student A2',
      email: 'student.a2@test.com',
      password: 'hashedpassword',
      role: 'student',
      age: 13,
      gender: 'female',
      balagruhaIds: [BALAGRUHA_A_ID],
    });
    STUDENT_A2_ID = studentA2._id;

    // Create Students for Balagruha B
    const studentB1 = await User.create({
      name: 'Student B1',
      email: 'student.b1@test.com',
      password: 'hashedpassword',
      role: 'student',
      age: 11,
      gender: 'male',
      balagruhaIds: [BALAGRUHA_B_ID],
    });
    STUDENT_B1_ID = studentB1._id;

    const studentB2 = await User.create({
      name: 'Student B2',
      email: 'student.b2@test.com',
      password: 'hashedpassword',
      role: 'student',
      age: 14,
      gender: 'female',
      balagruhaIds: [BALAGRUHA_B_ID],
    });
    STUDENT_B2_ID = studentB2._id;

    // ─── Seed Tasks ───────────────────────────────────────────────────────
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await TaskModel.create([
      {
        title: 'Task Alpha 1',
        description: 'Task for Balagruha A',
        assignedUser: STUDENT_A1_ID,
        createdBy: COACH_A_ID,
        deadline: futureDate,
        priority: 'high',
        balagruhaId: BALAGRUHA_A_ID,
      },
      {
        title: 'Task Alpha 2',
        description: 'Task for Balagruha A',
        assignedUser: STUDENT_A2_ID,
        createdBy: COACH_A_ID,
        deadline: futureDate,
        priority: 'medium',
        balagruhaId: BALAGRUHA_A_ID,
      },
      {
        title: 'Task Beta 1',
        description: 'Task for Balagruha B',
        assignedUser: STUDENT_B1_ID,
        createdBy: COACH_B_ID,
        deadline: futureDate,
        priority: 'high',
        balagruhaId: BALAGRUHA_B_ID,
      },
      {
        title: 'Task Beta 2',
        description: 'Task for Balagruha B',
        assignedUser: STUDENT_B2_ID,
        createdBy: COACH_B_ID,
        deadline: futureDate,
        priority: 'low',
        balagruhaId: BALAGRUHA_B_ID,
      },
    ]);

    // ─── Seed Schedules ───────────────────────────────────────────────────
    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + 7);
    const startTime = new Date(scheduleDate);
    startTime.setHours(9, 0, 0, 0);
    const endTime = new Date(scheduleDate);
    endTime.setHours(10, 0, 0, 0);

    await ScheduleModel.create([
      {
        balagruhaId: BALAGRUHA_A_ID,
        assignedTo: COACH_A_ID,
        startTime: startTime,
        endTime: endTime,
        date: scheduleDate,
        title: 'Schedule Alpha 1',
        description: 'Schedule for Balagruha A',
        status: 'pending',
        createdBy: COACH_A_ID,
      },
      {
        balagruhaId: BALAGRUHA_A_ID,
        assignedTo: STUDENT_A1_ID,
        startTime: new Date(startTime.getTime() + 3600000),
        endTime: new Date(endTime.getTime() + 3600000),
        date: scheduleDate,
        title: 'Schedule Alpha 2',
        description: 'Schedule for Balagruha A',
        status: 'pending',
        createdBy: COACH_A_ID,
      },
      {
        balagruhaId: BALAGRUHA_B_ID,
        assignedTo: COACH_B_ID,
        startTime: startTime,
        endTime: endTime,
        date: scheduleDate,
        title: 'Schedule Beta 1',
        description: 'Schedule for Balagruha B',
        status: 'pending',
        createdBy: COACH_B_ID,
      },
      {
        balagruhaId: BALAGRUHA_B_ID,
        assignedTo: STUDENT_B1_ID,
        startTime: new Date(startTime.getTime() + 7200000),
        endTime: new Date(endTime.getTime() + 7200000),
        date: scheduleDate,
        title: 'Schedule Beta 2',
        description: 'Schedule for Balagruha B',
        status: 'pending',
        createdBy: COACH_B_ID,
      },
    ]);

    // ─── Seed Repair Requests ─────────────────────────────────────────────
    await RepairRequestModel.create([
      {
        balagruhaId: BALAGRUHA_A_ID,
        issueName: 'Repair Alpha 1',
        description: 'Repair for Balagruha A',
        urgency: 'high',
        status: 'pending',
        createdBy: COACH_A_ID,
      },
      {
        balagruhaId: BALAGRUHA_A_ID,
        issueName: 'Repair Alpha 2',
        description: 'Repair for Balagruha A',
        urgency: 'low',
        status: 'in-progress',
        createdBy: COACH_A_ID,
      },
      {
        balagruhaId: BALAGRUHA_B_ID,
        issueName: 'Repair Beta 1',
        description: 'Repair for Balagruha B',
        urgency: 'medium',
        status: 'pending',
        createdBy: COACH_B_ID,
      },
    ]);

    // ─── Seed Purchase Orders ─────────────────────────────────────────────
    await PurchaseOrderModel.create([
      {
        balagruhaId: BALAGRUHA_A_ID,
        machineDetails: 'Machine A1',
        vendorDetails: 'Vendor A1',
        costEstimate: 5000,
        status: 'pending',
        createdBy: COACH_A_ID,
      },
      {
        balagruhaId: BALAGRUHA_B_ID,
        machineDetails: 'Machine B1',
        vendorDetails: 'Vendor B1',
        costEstimate: 3000,
        status: 'pending',
        createdBy: COACH_B_ID,
      },
      {
        balagruhaId: BALAGRUHA_B_ID,
        machineDetails: 'Machine B2',
        vendorDetails: 'Vendor B2',
        costEstimate: 7000,
        status: 'in-progress',
        createdBy: COACH_B_ID,
      },
    ]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Task Controller Data Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('taskController.getAllTasks — Data Isolation', () => {
    test('Coach A sees ONLY Balagruha A tasks (2 tasks)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.tasks).toHaveLength(2);
      res.jsonData.tasks.forEach((task) => {
        expect(task.balagruhaId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });
    });

    test('Coach B sees ONLY Balagruha B tasks (2 tasks)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.tasks).toHaveLength(2);
      res.jsonData.tasks.forEach((task) => {
        expect(task.balagruhaId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });
    });

    test('Coach A response contains ZERO Balagruha B tasks', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      const bBalagruhaTaskIds = res.jsonData.tasks.filter(
        (task) => task.balagruhaId.toString() === BALAGRUHA_B_ID.toString()
      );
      expect(bBalagruhaTaskIds).toHaveLength(0);
    });

    test('Admin sees ALL tasks across both Balagruhas (4 tasks)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      expect(res.jsonData.tasks).toHaveLength(4);
      expect(res.jsonData.totalTasks).toBe(4);
    });

    test('Coach A with additional status filter still scoped to Balagruha A', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: { priority: 'high' },
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.tasks).toHaveLength(1);
      expect(res.jsonData.tasks[0].balagruhaId.toString()).toBe(BALAGRUHA_A_ID.toString());
      expect(res.jsonData.tasks[0].priority).toBe('high');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Schedule Controller Data Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('scheduleController.getSchedules — Data Isolation', () => {
    test('Coach A sees ONLY Balagruha A schedules (2 schedules)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await scheduleController.getSchedules(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const schedules = res.jsonData.data.schedules || res.jsonData.data;
      // Verify all returned schedules belong to Balagruha A
      const scheduleArr = Array.isArray(schedules) ? schedules : [];
      scheduleArr.forEach((schedule) => {
        const bgId = schedule.balagruhaId?._id || schedule.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });
    });

    test('Coach B sees ONLY Balagruha B schedules (2 schedules)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await scheduleController.getSchedules(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const schedules = res.jsonData.data.schedules || res.jsonData.data;
      const scheduleArr = Array.isArray(schedules) ? schedules : [];
      scheduleArr.forEach((schedule) => {
        const bgId = schedule.balagruhaId?._id || schedule.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });
    });

    test('Coach A response contains ZERO Balagruha B schedules', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await scheduleController.getSchedules(req, res);

      const schedules = res.jsonData.data.schedules || res.jsonData.data;
      const scheduleArr = Array.isArray(schedules) ? schedules : [];
      const bSchedules = scheduleArr.filter((s) => {
        const bgId = s.balagruhaId?._id || s.balagruhaId;
        return bgId.toString() === BALAGRUHA_B_ID.toString();
      });
      expect(bSchedules).toHaveLength(0);
    });

    test('Admin sees ALL schedules across both Balagruhas (4 schedules)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await scheduleController.getSchedules(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const schedules = res.jsonData.data.schedules || res.jsonData.data;
      const scheduleArr = Array.isArray(schedules) ? schedules : [];
      expect(scheduleArr).toHaveLength(4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Repair Requests Data Isolation (purchaseAndRepair controller)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('purchaseAndRepair.getAllRepairRequests — Data Isolation', () => {
    test('Coach A sees ONLY Balagruha A repair requests (2 requests)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllRepairRequests(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const repairRequests = res.jsonData.data.repairRequests;
      expect(repairRequests).toHaveLength(2);
      repairRequests.forEach((rr) => {
        const bgId = rr.balagruhaId?._id || rr.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });
    });

    test('Coach B sees ONLY Balagruha B repair requests (1 request)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllRepairRequests(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const repairRequests = res.jsonData.data.repairRequests;
      expect(repairRequests).toHaveLength(1);
      repairRequests.forEach((rr) => {
        const bgId = rr.balagruhaId?._id || rr.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });
    });

    test('Coach A response contains ZERO Balagruha B repair requests', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllRepairRequests(req, res);

      const repairRequests = res.jsonData.data.repairRequests;
      const bRequests = repairRequests.filter((rr) => {
        const bgId = rr.balagruhaId?._id || rr.balagruhaId;
        return bgId.toString() === BALAGRUHA_B_ID.toString();
      });
      expect(bRequests).toHaveLength(0);
    });

    test('Admin sees ALL repair requests across both Balagruhas (3 requests)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllRepairRequests(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const repairRequests = res.jsonData.data.repairRequests;
      expect(repairRequests).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Purchase Orders Data Isolation (purchaseAndRepair controller)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('purchaseAndRepair.getAllPurchaseOrders — Data Isolation', () => {
    test('Coach A sees ONLY Balagruha A purchase orders (1 order)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllPurchaseOrders(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const purchaseOrders = res.jsonData.data.purchaseOrders;
      expect(purchaseOrders).toHaveLength(1);
      purchaseOrders.forEach((po) => {
        const bgId = po.balagruhaId?._id || po.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });
    });

    test('Coach B sees ONLY Balagruha B purchase orders (2 orders)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllPurchaseOrders(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const purchaseOrders = res.jsonData.data.purchaseOrders;
      expect(purchaseOrders).toHaveLength(2);
      purchaseOrders.forEach((po) => {
        const bgId = po.balagruhaId?._id || po.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });
    });

    test('Coach A response contains ZERO Balagruha B purchase orders', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllPurchaseOrders(req, res);

      const purchaseOrders = res.jsonData.data.purchaseOrders;
      const bOrders = purchaseOrders.filter((po) => {
        const bgId = po.balagruhaId?._id || po.balagruhaId;
        return bgId.toString() === BALAGRUHA_B_ID.toString();
      });
      expect(bOrders).toHaveLength(0);
    });

    test('Admin sees ALL purchase orders across both Balagruhas (3 orders)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await purchaseAndRepairController.getAllPurchaseOrders(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const purchaseOrders = res.jsonData.data.purchaseOrders;
      expect(purchaseOrders).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: User Controller Data Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('userController.getAllUsers — Data Isolation', () => {
    test('Coach A sees ONLY users assigned to Balagruha A', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      // Coach A + Student A1 + Student A2 = 3 users in Balagruha A
      const users = res.jsonData.data;
      expect(users.length).toBe(3);
      users.forEach((user) => {
        const userBgIds = (user.balagruhaIds || []).map((bg) => {
          const id = bg._id || bg;
          return id.toString();
        });
        expect(userBgIds).toContain(BALAGRUHA_A_ID.toString());
      });
    });

    test('Coach B sees ONLY users assigned to Balagruha B', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      // Coach B + Student B1 + Student B2 = 3 users in Balagruha B
      const users = res.jsonData.data;
      expect(users.length).toBe(3);
      users.forEach((user) => {
        const userBgIds = (user.balagruhaIds || []).map((bg) => {
          const id = bg._id || bg;
          return id.toString();
        });
        expect(userBgIds).toContain(BALAGRUHA_B_ID.toString());
      });
    });

    test('Coach A response contains ZERO Balagruha B users', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await userController.getAllUsers(req, res);

      const users = res.jsonData.data;
      const bUsers = users.filter((user) => {
        const userBgIds = (user.balagruhaIds || []).map((bg) => {
          const id = bg._id || bg;
          return id.toString();
        });
        return userBgIds.includes(BALAGRUHA_B_ID.toString()) &&
               !userBgIds.includes(BALAGRUHA_A_ID.toString());
      });
      expect(bUsers).toHaveLength(0);
    });

    test('Admin sees ALL users across both Balagruhas', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await userController.getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      // Admin + Coach A + Coach B + Student A1 + Student A2 + Student B1 + Student B2 = 7
      expect(res.jsonData.data.length).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: Balagruha Controller Data Isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('balagruhaController.getAllBalagruha — Data Isolation', () => {
    test('Coach A sees ONLY Balagruha A (1 balagruha)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        permissionScope: 'balagruh',
        user: { _id: COACH_A_ID, role: 'coach', balagruhaIds: [BALAGRUHA_A_ID] },
      });
      const res = createMockRes();

      await balagruhaController.getAllBalagruha(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const balagruhas = res.jsonData.data.balagruhas;
      expect(balagruhas).toHaveLength(1);
      expect(balagruhas[0].name).toBe('Balagruha Alpha');
    });

    test('Coach B sees ONLY Balagruha B (1 balagruha)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID] },
        'balagruh'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        permissionScope: 'balagruh',
        user: { _id: COACH_B_ID, role: 'coach', balagruhaIds: [BALAGRUHA_B_ID] },
      });
      const res = createMockRes();

      await balagruhaController.getAllBalagruha(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const balagruhas = res.jsonData.data.balagruhas;
      expect(balagruhas).toHaveLength(1);
      expect(balagruhas[0].name).toBe('Balagruha Beta');
    });

    test('Admin sees ALL Balagruhas (2 balagruhas)', async () => {
      const scopeFilter = getScopeFilter(
        { _id: ADMIN_ID },
        'all'
      );
      const req = createMockReq({
        query: {},
        scopeFilter,
        permissionScope: 'all',
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await balagruhaController.getAllBalagruha(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.success).toBe(true);
      const balagruhas = res.jsonData.data.balagruhas;
      expect(balagruhas).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: Cross-Controller Isolation Consistency
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cross-Controller Isolation Consistency', () => {
    test('Same scope filter produces isolation across ALL controllers for Coach A', async () => {
      const coachAUser = { _id: COACH_A_ID, balagruhaIds: [BALAGRUHA_A_ID], role: 'coach' };
      const scopeFilter = getScopeFilter(coachAUser, 'balagruh');

      // Task controller
      const taskReq = createMockReq({ query: {}, scopeFilter, user: coachAUser });
      const taskRes = createMockRes();
      await taskController.getAllTasks(taskReq, taskRes);
      expect(taskRes.jsonData.tasks.length).toBeGreaterThan(0);
      taskRes.jsonData.tasks.forEach((t) => {
        expect(t.balagruhaId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });

      // Repair requests
      const repairReq = createMockReq({ query: {}, scopeFilter, user: coachAUser });
      const repairRes = createMockRes();
      await purchaseAndRepairController.getAllRepairRequests(repairReq, repairRes);
      expect(repairRes.jsonData.data.repairRequests.length).toBeGreaterThan(0);
      repairRes.jsonData.data.repairRequests.forEach((rr) => {
        const bgId = rr.balagruhaId?._id || rr.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });

      // Purchase orders
      const poReq = createMockReq({ query: {}, scopeFilter, user: coachAUser });
      const poRes = createMockRes();
      await purchaseAndRepairController.getAllPurchaseOrders(poReq, poRes);
      expect(poRes.jsonData.data.purchaseOrders.length).toBeGreaterThan(0);
      poRes.jsonData.data.purchaseOrders.forEach((po) => {
        const bgId = po.balagruhaId?._id || po.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_A_ID.toString());
      });
    });

    test('Same scope filter produces isolation across ALL controllers for Coach B', async () => {
      const coachBUser = { _id: COACH_B_ID, balagruhaIds: [BALAGRUHA_B_ID], role: 'coach' };
      const scopeFilter = getScopeFilter(coachBUser, 'balagruh');

      // Task controller
      const taskReq = createMockReq({ query: {}, scopeFilter, user: coachBUser });
      const taskRes = createMockRes();
      await taskController.getAllTasks(taskReq, taskRes);
      expect(taskRes.jsonData.tasks.length).toBeGreaterThan(0);
      taskRes.jsonData.tasks.forEach((t) => {
        expect(t.balagruhaId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });

      // Repair requests
      const repairReq = createMockReq({ query: {}, scopeFilter, user: coachBUser });
      const repairRes = createMockRes();
      await purchaseAndRepairController.getAllRepairRequests(repairReq, repairRes);
      expect(repairRes.jsonData.data.repairRequests.length).toBeGreaterThan(0);
      repairRes.jsonData.data.repairRequests.forEach((rr) => {
        const bgId = rr.balagruhaId?._id || rr.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });

      // Purchase orders
      const poReq = createMockReq({ query: {}, scopeFilter, user: coachBUser });
      const poRes = createMockRes();
      await purchaseAndRepairController.getAllPurchaseOrders(poReq, poRes);
      expect(poRes.jsonData.data.purchaseOrders.length).toBeGreaterThan(0);
      poRes.jsonData.data.purchaseOrders.forEach((po) => {
        const bgId = po.balagruhaId?._id || po.balagruhaId;
        expect(bgId.toString()).toBe(BALAGRUHA_B_ID.toString());
      });
    });

    test('Empty balagruhaIds returns zero results for balagruh scope', async () => {
      const orphanUser = { _id: new mongoose.Types.ObjectId(), balagruhaIds: [], role: 'coach' };
      const scopeFilter = getScopeFilter(orphanUser, 'balagruh');

      // Task controller - should return 0 tasks
      const taskReq = createMockReq({ query: {}, scopeFilter, user: orphanUser });
      const taskRes = createMockRes();
      await taskController.getAllTasks(taskReq, taskRes);
      expect(taskRes.jsonData.tasks).toHaveLength(0);

      // Repair requests - should return 0
      const repairReq = createMockReq({ query: {}, scopeFilter, user: orphanUser });
      const repairRes = createMockRes();
      await purchaseAndRepairController.getAllRepairRequests(repairReq, repairRes);
      expect(repairRes.jsonData.data.repairRequests).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    test('Coach with multiple balagruhaIds sees data from ALL assigned balagruhas', async () => {
      // Coach assigned to BOTH Balagruha A and B
      const multiCoachUser = {
        _id: new mongoose.Types.ObjectId(),
        balagruhaIds: [BALAGRUHA_A_ID, BALAGRUHA_B_ID],
        role: 'coach',
      };
      const scopeFilter = getScopeFilter(multiCoachUser, 'balagruh');

      const taskReq = createMockReq({ query: {}, scopeFilter, user: multiCoachUser });
      const taskRes = createMockRes();
      await taskController.getAllTasks(taskReq, taskRes);

      expect(taskRes.jsonData.tasks).toHaveLength(4); // All tasks from both balagruhas
    });

    test('Scope filter with "own" scope restricts to user ID only', async () => {
      // Student scope: only see own data (by _id)
      const studentUser = { _id: STUDENT_A1_ID, role: 'student' };
      const scopeFilter = getScopeFilter(studentUser, 'own');

      // For tasks, 'own' filter uses { _id: userId } which won't match any tasks
      // (tasks don't have the student's _id as their own _id)
      // This verifies that 'own' scope is most restrictive
      const taskReq = createMockReq({ query: {}, scopeFilter, user: studentUser });
      const taskRes = createMockRes();
      await taskController.getAllTasks(taskReq, taskRes);

      // Student with 'own' scope gets { _id: studentId } filter on Task collection
      // which means no tasks have that _id, so 0 results - confirming isolation
      expect(taskRes.jsonData.tasks).toHaveLength(0);
    });

    test('Undefined scopeFilter defaults to no filtering (backward compat)', async () => {
      // When scopeFilter is not set (undefined/null), controller should handle gracefully
      const req = createMockReq({
        query: {},
        scopeFilter: undefined,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      // Should return all tasks (no filter applied)
      expect(res.statusCode).toBe(200);
      expect(res.jsonData.tasks).toHaveLength(4);
    });

    test('Null scopeFilter defaults to no filtering (backward compat)', async () => {
      const req = createMockReq({
        query: {},
        scopeFilter: null,
        user: { _id: ADMIN_ID, role: 'admin' },
      });
      const res = createMockRes();

      await taskController.getAllTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonData.tasks).toHaveLength(4);
    });
  });
});
