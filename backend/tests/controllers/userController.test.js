const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock services used by controller
jest.mock('../../services/user', () => ({
  createUser: jest.fn(),
  findUsersByRoleAndBalagruhaId: jest.fn(),
  getUserInfo: jest.fn(),
  updateUserPasswordByAdmin: jest.fn(),
  assignBalagruhaToUser: jest.fn(),
  updateUserDetailsById: jest.fn(),
  deleteUserById: jest.fn(),
  getUserListByAssignedBalagruhaByRole: jest.fn(),
}));

jest.mock('../../services/student', () => ({
  createStudentMedicalRecords: jest.fn(),
}));

jest.mock('../../services/attendenance', () => ({
  createStudentAttendance: jest.fn(),
  createManualAttendance: jest.fn(),
}));

jest.mock('../../data-access/medicalRecords', () => ({
  updateNextActionDate: jest.fn(),
}));

jest.mock('../../utils/helper', () => ({
  isRequestFromLocalhost: jest.fn().mockReturnValue(false),
}));

const userController = require('../../controllers/userController');
const userService = require('../../services/user');

const User = mongoose.model('User');
const { mockRequest, mockResponse, generateObjectId } = global.testUtils;

// Helper
async function createTestUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`,
    role: 'admin',
    ...overrides,
  });
}

describe('User Controller', () => {

  // ─── getAllUsers ───────────────────────────────────────────────
  // Note: getAllUsers uses .populate() on models (Balagruha, Machine, MedicalRecord)
  // that aren't registered in the test DB. We test the error handling path
  // and the simpler query path by registering stub models.
  describe('getAllUsers', () => {
    beforeAll(() => {
      // Register stub models so populate doesn't crash
      if (!mongoose.models.Balagruha) {
        mongoose.model('Balagruha', new mongoose.Schema({ name: String }));
      }
      if (!mongoose.models.Machine) {
        mongoose.model('Machine', new mongoose.Schema({ name: String }));
      }
      if (!mongoose.models.MedicalRecord) {
        mongoose.model('MedicalRecord', new mongoose.Schema({
          medicalHistory: [mongoose.Schema.Types.Mixed],
          nextActionDate: Date,
        }));
      }
      if (!mongoose.models.Report) {
        mongoose.model('Report', new mongoose.Schema({ title: String }));
      }
      if (!mongoose.models.Attendance) {
        mongoose.model('Attendance', new mongoose.Schema({ date: Date }));
      }

      // Add missing fields to the test User schema so populate works
      const userSchema = mongoose.model('User').schema;
      if (!userSchema.path('assignedMachines')) {
        userSchema.add({
          assignedMachines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Machine' }],
          medicalRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' }],
          attendanceRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
        });
      }
    });

    it('should return paginated users', async () => {
      await createTestUser({ name: 'Alice' });
      await createTestUser({ name: 'Bob' });

      const req = mockRequest({
        query: { page: '1', limit: '10' },
        scopeFilter: {},
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        count: 2,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 2,
        }),
      }));
    });

    it('should cap limit to 100', async () => {
      const req = mockRequest({
        query: { page: '1', limit: '500' },
        scopeFilter: {},
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({
          limit: 100,
        }),
      }));
    });

    it('should apply balagruhaId scope filter', async () => {
      const bgId = generateObjectId();
      await createTestUser({ name: 'Scoped', balagruhaIds: [bgId] });
      await createTestUser({ name: 'Other', balagruhaIds: [generateObjectId()] });

      const req = mockRequest({
        query: {},
        scopeFilter: { balagruhaId: { $in: [bgId] } },
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.count).toBe(1);
      expect(jsonArg.data[0].name).toBe('Scoped');
    });

    it('should default to page 1 limit 20', async () => {
      const req = mockRequest({
        query: {},
        scopeFilter: {},
      });
      const res = mockResponse();

      await userController.getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      }));
    });
  });

  // ─── getUserById ──────────────────────────────────────────────
  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = await createTestUser({ name: 'FindMe' });

      const req = mockRequest({ params: { _id: user._id.toString() } });
      const res = mockResponse();

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'FindMe',
      }));
    });

    it('should return 404 for non-existent user', async () => {
      const req = mockRequest({ params: { _id: generateObjectId().toString() } });
      const res = mockResponse();

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── createUser (simple CRUD version) ────────────────────────
  describe('createUser', () => {
    it('should create a user', async () => {
      const req = mockRequest({
        body: {
          name: 'New User',
          email: `new-${Date.now()}@test.com`,
          role: 'coach',
        },
      });
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New User',
        role: 'coach',
      }));
    });

    it('should create user with minimal fields', async () => {
      const req = mockRequest({
        body: { name: 'Minimal', role: 'admin' },
      });
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Minimal',
      }));
    });
  });

  // ─── updateUser ───────────────────────────────────────────────
  describe('updateUser', () => {
    it('should update user fields', async () => {
      const user = await createTestUser({ name: 'Old Name' });

      const req = mockRequest({
        params: { id: user._id.toString() },
        body: { name: 'New Name' },
      });
      const res = mockResponse();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Name',
      }));
    });

    it('should return 404 for non-existent user', async () => {
      const req = mockRequest({
        params: { id: generateObjectId().toString() },
        body: { name: 'Ghost' },
      });
      const res = mockResponse();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update role', async () => {
      const user = await createTestUser({ role: 'coach' });

      const req = mockRequest({
        params: { id: user._id.toString() },
        body: { role: 'admin' },
      });
      const res = mockResponse();

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        role: 'admin',
      }));
    });
  });

  // ─── deleteUser (simple CRUD) ────────────────────────────────
  describe('deleteUser', () => {
    it('should delete an existing user', async () => {
      const user = await createTestUser();

      const req = mockRequest({ params: { id: user._id.toString() } });
      const res = mockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User deleted successfully',
      }));

      const found = await User.findById(user._id);
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const req = mockRequest({ params: { id: generateObjectId().toString() } });
      const res = mockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── getUserInfo (service-backed) ─────────────────────────────
  describe('getUserInfo', () => {
    it('should return user info when found', async () => {
      const userId = generateObjectId().toString();

      userService.getUserInfo.mockResolvedValue({
        success: true,
        data: { name: 'Info User', role: 'coach' },
      });

      const req = mockRequest({
        params: { userId },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.getUserInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should return 404 when user not found', async () => {
      userService.getUserInfo.mockResolvedValue({
        success: false,
        message: 'User not found',
      });

      const req = mockRequest({
        params: { userId: generateObjectId().toString() },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.getUserInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for missing userId', async () => {
      const req = mockRequest({
        params: { userId: undefined },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.getUserInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateUserPassword (RBAC) ────────────────────────────────
  describe('updateUserPassword', () => {
    it('should reject non-admin', async () => {
      const req = mockRequest({
        body: { userId: generateObjectId().toString(), password: 'newpass' },
        user: { _id: generateObjectId(), role: 'coach' },
      });
      const res = mockResponse();

      await userController.updateUserPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });

    it('should allow admin to update password', async () => {
      userService.updateUserPasswordByAdmin.mockResolvedValue({
        success: true,
        message: 'Password updated',
      });

      const req = mockRequest({
        body: { userId: generateObjectId().toString(), password: 'newpass' },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.updateUserPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(userService.updateUserPasswordByAdmin).toHaveBeenCalled();
    });
  });

  // ─── deleteUserById (RBAC) ────────────────────────────────────
  describe('deleteUserById', () => {
    it('should reject non-admin', async () => {
      const req = mockRequest({
        params: { userId: generateObjectId().toString() },
        user: { _id: generateObjectId(), role: 'coach' },
      });
      const res = mockResponse();

      await userController.deleteUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow admin to delete user', async () => {
      userService.deleteUserById.mockResolvedValue({
        success: true,
        message: 'User deleted',
      });

      const req = mockRequest({
        params: { userId: generateObjectId().toString() },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.deleteUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing userId', async () => {
      const req = mockRequest({
        params: { userId: undefined },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.deleteUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── updateUserDetails (validation) ───────────────────────────
  describe('updateUserDetails', () => {
    it('should return 400 for missing userId', async () => {
      const req = mockRequest({
        params: { userId: ':userId' },
        body: {},
        user: { _id: generateObjectId(), role: 'admin' },
        files: [],
      });
      const res = mockResponse();

      await userController.updateUserDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'User ID is required',
      }));
    });

    it('should call updateUserDetailsById service with valid userId', async () => {
      const userId = generateObjectId().toString();
      userService.updateUserDetailsById.mockResolvedValue({
        success: true,
        data: { name: 'Updated' },
      });

      const req = mockRequest({
        params: { userId },
        body: { name: 'Updated' },
        user: { _id: generateObjectId(), role: 'admin' },
        files: [],
      });
      const res = mockResponse();

      await userController.updateUserDetails(req, res);

      expect(userService.updateUserDetailsById).toHaveBeenCalled();
    });
  });

  // ─── createUserV1 (RBAC) ─────────────────────────────────────
  describe('createUserV1', () => {
    it('should reject non-admin creating non-student', async () => {
      const req = mockRequest({
        body: { name: 'Impostor', role: 'admin' },
        user: { _id: generateObjectId(), role: 'coach' },
        files: [],
      });
      const res = mockResponse();

      await userController.createUserV1(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Only admin'),
      }));
    });
  });

  // ─── getUsersByRoleAndBalagruhaId ─────────────────────────────
  describe('getUsersByRoleAndBalagruhaId', () => {
    it('should call service and return results', async () => {
      userService.findUsersByRoleAndBalagruhaId.mockResolvedValue({
        success: true,
        data: [],
      });

      const req = mockRequest({
        query: { role: 'coach', balagruhaId: generateObjectId().toString() },
        user: { _id: generateObjectId(), role: 'admin' },
      });
      const res = mockResponse();

      await userController.getUsersByRoleAndBalagruhaId(req, res);

      expect(userService.findUsersByRoleAndBalagruhaId).toHaveBeenCalled();
    });
  });
});
