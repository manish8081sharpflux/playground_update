const mongoose = require('mongoose');
const Machine = require('../models/machine');
const Balagruha = require('../models/balagruha');

/**
 * Story 3.2: Machine Registration & Balagruha Assignment
 * Tests for the Machine model validation and the registerMachine controller logic
 */

describe('Machine Model - Story 3.2', () => {
  let testBalagruha;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Create a test Balagruha for assignment
    testBalagruha = await Balagruha.create({
      name: `Test Balagruha ${Date.now()}`,
      location: 'Test Location',
    });
  });

  describe('Model Validation', () => {
    it('should create a valid machine with all required fields', async () => {
      const machineData = {
        machineId: 'MACH-001',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        serialNumber: 'SN-001',
        assignedBalagruha: testBalagruha._id,
      };

      const machine = new Machine(machineData);
      const saved = await machine.save();

      expect(saved._id).toBeDefined();
      expect(saved.machineId).toBe('MACH-001');
      expect(saved.macAddress).toBe('AA:BB:CC:DD:EE:FF');
      expect(saved.serialNumber).toBe('SN-001');
      expect(saved.assignedBalagruha.toString()).toBe(testBalagruha._id.toString());
      expect(saved.status).toBe('active');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should fail without machineId', async () => {
      const machine = new Machine({
        macAddress: 'AA:BB:CC:DD:EE:01',
        serialNumber: 'SN-002',
        assignedBalagruha: testBalagruha._id,
      });

      let error;
      try {
        await machine.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.machineId).toBeDefined();
    });

    it('should fail without macAddress', async () => {
      const machine = new Machine({
        machineId: 'MACH-003',
        serialNumber: 'SN-003',
        assignedBalagruha: testBalagruha._id,
      });

      let error;
      try {
        await machine.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.macAddress).toBeDefined();
    });

    it('should fail without serialNumber', async () => {
      const machine = new Machine({
        machineId: 'MACH-004',
        macAddress: 'AA:BB:CC:DD:EE:04',
        assignedBalagruha: testBalagruha._id,
      });

      let error;
      try {
        await machine.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.serialNumber).toBeDefined();
    });

    it('should default status to active', async () => {
      const machine = new Machine({
        machineId: 'MACH-005',
        macAddress: 'AA:BB:CC:DD:EE:05',
        serialNumber: 'SN-005',
        assignedBalagruha: testBalagruha._id,
      });

      const saved = await machine.save();
      expect(saved.status).toBe('active');
    });

    it('should default assignedBalagruha to null', async () => {
      const machine = new Machine({
        machineId: 'MACH-006',
        macAddress: 'AA:BB:CC:DD:EE:06',
        serialNumber: 'SN-006',
      });

      const saved = await machine.save();
      expect(saved.assignedBalagruha).toBeNull();
    });

    it('should default lastLogin to null', async () => {
      const machine = new Machine({
        machineId: 'MACH-007',
        macAddress: 'AA:BB:CC:DD:EE:07',
        serialNumber: 'SN-007',
      });

      const saved = await machine.save();
      expect(saved.lastLogin).toBeNull();
    });

    it('should accept valid status values', async () => {
      const statuses = ['active', 'inactive', 'maintenance'];

      for (const status of statuses) {
        const machine = new Machine({
          machineId: `MACH-S-${status}`,
          macAddress: `AA:BB:CC:DD:${status.substring(0, 2).toUpperCase()}:00`,
          serialNumber: `SN-S-${status}`,
          status,
        });

        const saved = await machine.save();
        expect(saved.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const machine = new Machine({
        machineId: 'MACH-BAD-STATUS',
        macAddress: 'AA:BB:CC:DD:EE:99',
        serialNumber: 'SN-BAD',
        status: 'broken',
      });

      let error;
      try {
        await machine.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });
  });

  describe('Uniqueness Constraints', () => {
    it('should reject duplicate machineId', async () => {
      await Machine.create({
        machineId: 'MACH-DUP-ID',
        macAddress: 'AA:BB:CC:DD:EE:10',
        serialNumber: 'SN-010',
      });

      let error;
      try {
        await Machine.create({
          machineId: 'MACH-DUP-ID',
          macAddress: 'AA:BB:CC:DD:EE:11',
          serialNumber: 'SN-011',
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should reject duplicate macAddress', async () => {
      await Machine.create({
        machineId: 'MACH-012',
        macAddress: 'AA:BB:CC:DD:EE:12',
        serialNumber: 'SN-012',
      });

      let error;
      try {
        await Machine.create({
          machineId: 'MACH-013',
          macAddress: 'AA:BB:CC:DD:EE:12',
          serialNumber: 'SN-013',
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });

    it('should reject duplicate serialNumber', async () => {
      await Machine.create({
        machineId: 'MACH-014',
        macAddress: 'AA:BB:CC:DD:EE:14',
        serialNumber: 'SN-DUP',
      });

      let error;
      try {
        await Machine.create({
          machineId: 'MACH-015',
          macAddress: 'AA:BB:CC:DD:EE:15',
          serialNumber: 'SN-DUP',
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000);
    });
  });

  describe('Balagruha Assignment', () => {
    it('should populate assignedBalagruha with Balagruha details', async () => {
      const machine = await Machine.create({
        machineId: 'MACH-POP-001',
        macAddress: 'AA:BB:CC:DD:EE:20',
        serialNumber: 'SN-POP-001',
        assignedBalagruha: testBalagruha._id,
      });

      const populated = await Machine.findById(machine._id).populate(
        'assignedBalagruha',
        'name'
      );

      expect(populated.assignedBalagruha).toBeDefined();
      expect(populated.assignedBalagruha.name).toBe(testBalagruha.name);
    });

    it('should allow reassigning to a different Balagruha', async () => {
      const machine = await Machine.create({
        machineId: 'MACH-REASSIGN',
        macAddress: 'AA:BB:CC:DD:EE:21',
        serialNumber: 'SN-REASSIGN',
        assignedBalagruha: testBalagruha._id,
      });

      const newBalagruha = await Balagruha.create({
        name: `New Balagruha ${Date.now()}`,
        location: 'New Location',
      });

      machine.assignedBalagruha = newBalagruha._id;
      await machine.save();

      const updated = await Machine.findById(machine._id).populate(
        'assignedBalagruha',
        'name'
      );
      expect(updated.assignedBalagruha.name).toBe(newBalagruha.name);
    });
  });

  describe('registerMachine Controller Logic', () => {
    const machineController = require('../controllers/machineController');

    it('should register a machine successfully', async () => {
      const req = {
        body: {
          machineId: 'CTRL-001',
          macAddress: 'AA:BB:CC:DD:EE:30',
          serialNumber: 'SN-CTRL-001',
          assignedBalagruha: testBalagruha._id.toString(),
        },
      };

      const res = global.testUtils.mockResponse();

      await machineController.registerMachine(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Machine registered successfully',
          data: expect.objectContaining({
            machine: expect.objectContaining({
              machineId: 'CTRL-001',
              macAddress: 'AA:BB:CC:DD:EE:30',
              serialNumber: 'SN-CTRL-001',
              status: 'active',
            }),
          }),
        })
      );

      // Verify machine was actually saved
      const saved = await Machine.findOne({ machineId: 'CTRL-001' });
      expect(saved).not.toBeNull();
      expect(saved.assignedBalagruha.toString()).toBe(testBalagruha._id.toString());
    });

    it('should return 400 when required fields are missing', async () => {
      const req = {
        body: {
          machineId: 'CTRL-002',
          // macAddress missing
          serialNumber: 'SN-CTRL-002',
          assignedBalagruha: testBalagruha._id.toString(),
        },
      };

      const res = global.testUtils.mockResponse();

      await machineController.registerMachine(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'All fields are required.',
        })
      );
    });

    it('should return 400 for duplicate machineId/macAddress/serialNumber', async () => {
      // Create an existing machine
      await Machine.create({
        machineId: 'CTRL-DUP',
        macAddress: 'AA:BB:CC:DD:EE:40',
        serialNumber: 'SN-CTRL-DUP',
        assignedBalagruha: testBalagruha._id,
      });

      const req = {
        body: {
          machineId: 'CTRL-DUP', // duplicate
          macAddress: 'AA:BB:CC:DD:EE:41',
          serialNumber: 'SN-CTRL-UNIQUE',
          assignedBalagruha: testBalagruha._id.toString(),
        },
      };

      const res = global.testUtils.mockResponse();

      await machineController.registerMachine(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Machine ID, MAC Address, or Serial Number already exists.',
        })
      );
    });

    it('should return 400 for duplicate macAddress', async () => {
      await Machine.create({
        machineId: 'CTRL-MAC-ORIG',
        macAddress: 'AA:BB:CC:DD:EE:50',
        serialNumber: 'SN-MAC-ORIG',
        assignedBalagruha: testBalagruha._id,
      });

      const req = {
        body: {
          machineId: 'CTRL-MAC-NEW',
          macAddress: 'AA:BB:CC:DD:EE:50', // duplicate MAC
          serialNumber: 'SN-MAC-NEW',
          assignedBalagruha: testBalagruha._id.toString(),
        },
      };

      const res = global.testUtils.mockResponse();

      await machineController.registerMachine(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('getAllMachines Controller', () => {
    const machineController = require('../controllers/machineController');

    it('should return all machines', async () => {
      await Machine.create({
        machineId: 'LIST-001',
        macAddress: 'AA:BB:CC:DD:EE:60',
        serialNumber: 'SN-LIST-001',
        assignedBalagruha: testBalagruha._id,
      });

      await Machine.create({
        machineId: 'LIST-002',
        macAddress: 'AA:BB:CC:DD:EE:61',
        serialNumber: 'SN-LIST-002',
        assignedBalagruha: testBalagruha._id,
      });

      const req = { query: {} };
      const res = global.testUtils.mockResponse();

      await machineController.getAllMachines(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            machines: expect.any(Array),
          }),
        })
      );

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.machines.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter machines by status', async () => {
      await Machine.create({
        machineId: 'FILTER-ACT',
        macAddress: 'AA:BB:CC:DD:EE:70',
        serialNumber: 'SN-FILTER-ACT',
        status: 'active',
      });

      await Machine.create({
        machineId: 'FILTER-INACT',
        macAddress: 'AA:BB:CC:DD:EE:71',
        serialNumber: 'SN-FILTER-INACT',
        status: 'inactive',
      });

      const req = { query: { status: 'active' } };
      const res = global.testUtils.mockResponse();

      await machineController.getAllMachines(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      const machines = responseData.data.machines;
      machines.forEach((m) => {
        expect(m.status).toBe('active');
      });
    });

    it('should search machines by keyword', async () => {
      await Machine.create({
        machineId: 'SEARCH-NEEDLE',
        macAddress: 'FF:FF:FF:FF:FF:FF',
        serialNumber: 'SN-SEARCHABLE',
      });

      const req = { query: { search: 'NEEDLE' } };
      const res = global.testUtils.mockResponse();

      await machineController.getAllMachines(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.data.machines.length).toBeGreaterThanOrEqual(1);
      expect(responseData.data.machines[0].machineId).toBe('SEARCH-NEEDLE');
    });
  });
});
