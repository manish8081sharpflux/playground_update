const mongoose = require('mongoose');
const Machine = require('../models/machine');
const MachineActivityStamp = require('../models/machineactivelog');
const machineController = require('../controllers/machineController');

/**
 * Story 3.4: Machine Usage Logs
 * Tests for the getMachineLogs controller and MachineActivityStamp model
 */

describe('Machine Usage Logs - Story 3.4', () => {
  let testMachine;

  beforeEach(async () => {
    jest.clearAllMocks();

    testMachine = await Machine.create({
      machineId: `MACH-LOG-${Date.now()}`,
      macAddress: `AA:BB:CC:DD:${Date.now().toString(16).slice(-4).toUpperCase()}`,
      serialNumber: `SN-LOG-${Date.now()}`,
      status: 'active',
    });
  });

  describe('MachineActivityStamp Model', () => {
    it('should create a valid activity log entry', async () => {
      const userId = new mongoose.Types.ObjectId();
      const log = await MachineActivityStamp.create({
        MachineID: testMachine._id,
        UserID: userId,
        LoginTimestamp: new Date('2026-03-01T10:00:00Z'),
        LogoutTimestamp: new Date('2026-03-01T11:30:00Z'),
      });

      expect(log._id).toBeDefined();
      expect(log.MachineID.toString()).toBe(testMachine._id.toString());
      expect(log.UserID.toString()).toBe(userId.toString());
      expect(log.LoginTimestamp).toBeDefined();
      expect(log.LogoutTimestamp).toBeDefined();
    });

    it('should auto-calculate SessionDuration on save', async () => {
      const userId = new mongoose.Types.ObjectId();
      const log = new MachineActivityStamp({
        MachineID: testMachine._id,
        UserID: userId,
        LoginTimestamp: new Date('2026-03-01T10:00:00Z'),
        LogoutTimestamp: new Date('2026-03-01T11:30:00Z'),
      });

      await log.save();

      // 1.5 hours = 5400 seconds
      expect(log.SessionDuration).toBe(5400);
    });

    it('should default SessionDuration to 0 when no LogoutTimestamp', async () => {
      const userId = new mongoose.Types.ObjectId();
      const log = await MachineActivityStamp.create({
        MachineID: testMachine._id,
        UserID: userId,
        LoginTimestamp: new Date(),
      });

      expect(log.SessionDuration).toBe(0);
    });

    it('should require MachineID', async () => {
      const userId = new mongoose.Types.ObjectId();
      const log = new MachineActivityStamp({
        UserID: userId,
        LoginTimestamp: new Date(),
      });

      let error;
      try {
        await log.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.MachineID).toBeDefined();
    });

    it('should require UserID', async () => {
      const log = new MachineActivityStamp({
        MachineID: testMachine._id,
        LoginTimestamp: new Date(),
      });

      let error;
      try {
        await log.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.UserID).toBeDefined();
    });
  });

  describe('getMachineLogs Controller', () => {
    it('should return logs for a valid machine with pagination', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create 3 log entries
      await MachineActivityStamp.create([
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-01T08:00:00Z'),
          LogoutTimestamp: new Date('2026-03-01T09:00:00Z'),
          SessionDuration: 3600,
        },
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-02T10:00:00Z'),
          LogoutTimestamp: new Date('2026-03-02T11:30:00Z'),
          SessionDuration: 5400,
        },
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-03T14:00:00Z'),
          LogoutTimestamp: new Date('2026-03-03T15:00:00Z'),
          SessionDuration: 3600,
        },
      ]);

      const req = {
        params: { id: testMachine._id.toString() },
        query: { page: 1, limit: 20 },
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.logs).toHaveLength(3);
      expect(responseData.data.total).toBe(3);
      expect(responseData.data.page).toBe(1);
      expect(responseData.data.totalPages).toBe(1);
    });

    it('should sort logs by most recent first', async () => {
      const userId = new mongoose.Types.ObjectId();

      await MachineActivityStamp.create([
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-01T08:00:00Z'),
          SessionDuration: 0,
        },
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-03T08:00:00Z'),
          SessionDuration: 0,
        },
        {
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date('2026-03-02T08:00:00Z'),
          SessionDuration: 0,
        },
      ]);

      const req = {
        params: { id: testMachine._id.toString() },
        query: {},
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const logs = res.json.mock.calls[0][0].data.logs;
      expect(logs).toHaveLength(3);

      // Most recent first
      const timestamps = logs.map((l) => new Date(l.LoginTimestamp).getTime());
      expect(timestamps[0]).toBeGreaterThan(timestamps[1]);
      expect(timestamps[1]).toBeGreaterThan(timestamps[2]);
    });

    it('should paginate correctly with limit', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create 5 log entries
      const logEntries = [];
      for (let i = 0; i < 5; i++) {
        logEntries.push({
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date(`2026-03-0${i + 1}T08:00:00Z`),
          SessionDuration: 0,
        });
      }
      await MachineActivityStamp.create(logEntries);

      // Request page 1 with limit 2
      const req = {
        params: { id: testMachine._id.toString() },
        query: { page: 1, limit: 2 },
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.logs).toHaveLength(2);
      expect(responseData.data.total).toBe(5);
      expect(responseData.data.page).toBe(1);
      expect(responseData.data.totalPages).toBe(3);
    });

    it('should return page 2 correctly', async () => {
      const userId = new mongoose.Types.ObjectId();

      const logEntries = [];
      for (let i = 0; i < 5; i++) {
        logEntries.push({
          MachineID: testMachine._id,
          UserID: userId,
          LoginTimestamp: new Date(`2026-03-0${i + 1}T08:00:00Z`),
          SessionDuration: 0,
        });
      }
      await MachineActivityStamp.create(logEntries);

      const req = {
        params: { id: testMachine._id.toString() },
        query: { page: 2, limit: 2 },
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.logs).toHaveLength(2);
      expect(responseData.data.page).toBe(2);
    });

    it('should return empty array for machine with no logs', async () => {
      const req = {
        params: { id: testMachine._id.toString() },
        query: {},
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.logs).toHaveLength(0);
      expect(responseData.data.total).toBe(0);
      expect(responseData.data.totalPages).toBe(0);
    });

    it('should return 404 for non-existent machine', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: fakeId.toString() },
        query: {},
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Machine not found.',
        })
      );
    });

    it('should return 400 for invalid machine ID format', async () => {
      const req = {
        params: { id: 'not-a-valid-id' },
        query: {},
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid machine ID format.',
        })
      );
    });

    it('should default to page 1 and limit 20 when not specified', async () => {
      const userId = new mongoose.Types.ObjectId();
      await MachineActivityStamp.create({
        MachineID: testMachine._id,
        UserID: userId,
        LoginTimestamp: new Date(),
        SessionDuration: 0,
      });

      const req = {
        params: { id: testMachine._id.toString() },
        query: {}, // no page/limit specified
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.page).toBe(1);
    });

    it('should not return logs for a different machine', async () => {
      const userId = new mongoose.Types.ObjectId();
      const otherMachine = await Machine.create({
        machineId: `MACH-OTHER-${Date.now()}`,
        macAddress: `FF:FF:FF:FF:${Date.now().toString(16).slice(-4).toUpperCase()}`,
        serialNumber: `SN-OTHER-${Date.now()}`,
      });

      // Create logs for the other machine only
      await MachineActivityStamp.create({
        MachineID: otherMachine._id,
        UserID: userId,
        LoginTimestamp: new Date(),
        SessionDuration: 100,
      });

      // Request logs for testMachine
      const req = {
        params: { id: testMachine._id.toString() },
        query: {},
      };
      const res = global.testUtils.mockResponse();

      await machineController.getMachineLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.logs).toHaveLength(0);
      expect(responseData.data.total).toBe(0);
    });
  });
});
