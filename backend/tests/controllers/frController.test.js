const mongoose = require('mongoose');

// Mock pino logger
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock frService (avoids loading @vladmandic/human ML models)
jest.mock('../../services/frService', () => ({
  registerFace: jest.fn(),
  recognizeFace: jest.fn(),
}));

// Mock frCacheService
jest.mock('../../services/frCacheService', () => ({
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

const frController = require('../../controllers/frController');
const frService = require('../../services/frService');
const frCacheService = require('../../services/frCacheService');
const FaceEmbedding = require('../../models/FaceEmbedding');
const User = require('../../models/user');

const { mockRequest, mockResponse, generateObjectId } = global.testUtils;

// Helper: create a test student in DB (uses User model with role='student')
async function createTestStudent(overrides = {}) {
  return User.create({
    name: 'Test Student',
    age: 12,
    gender: 'male',
    role: 'student',
    userId: Math.floor(Math.random() * 900000) + 100000,
    ...overrides,
  });
}

// Helper: create a face embedding record
async function createTestEmbedding(studentId, registeredBy, overrides = {}) {
  return FaceEmbedding.create({
    studentId,
    embedding: 'fake-encrypted-embedding-string',
    metadata: {
      confidence: 0.95,
      livenessScore: 0.88,
      quality: { detection: 0.9, landmarks: 0.85, image: 0.8 },
    },
    registeredBy,
    isActive: true,
    ...overrides,
  });
}

describe('FR Controller (Story 6.2)', () => {

  // ================================================================
  // registerFace
  // ================================================================
  describe('registerFace', () => {
    it('should return 400 when studentId is missing', async () => {
      const req = mockRequest({ body: {}, user: { _id: generateObjectId() } });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Student ID is required' })
      );
    });

    it('should return 400 when no photo is provided', async () => {
      const req = mockRequest({
        body: { studentId: generateObjectId().toString() },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Face photo is required (multipart file or base64 string)' })
      );
    });

    it('should return 404 when student does not exist', async () => {
      const fakeStudentId = generateObjectId().toString();
      const req = mockRequest({
        body: { studentId: fakeStudentId, photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Student not found' })
      );
    });

    it('should return 400 when frService.registerFace fails', async () => {
      const student = await createTestStudent();
      frService.registerFace.mockResolvedValue({
        success: false,
        error: 'No face detected in image',
      });

      const req = mockRequest({
        body: { studentId: student._id.toString(), photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'No face detected in image' })
      );
    });

    it('should register face successfully with base64 photo', async () => {
      const student = await createTestStudent({ name: 'FR Student' });
      frService.registerFace.mockResolvedValue({
        success: true,
        message: 'Face registered successfully',
        confidence: 0.95,
        quality: { detection: 0.9 },
        livenessScore: 0.88,
      });

      const req = mockRequest({
        body: { studentId: student._id.toString(), photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            studentName: 'FR Student',
            confidence: 0.95,
          }),
        })
      );
    });

    it('should register face successfully with multipart file upload', async () => {
      const student = await createTestStudent();
      frService.registerFace.mockResolvedValue({
        success: true,
        message: 'Face registered successfully',
        confidence: 0.92,
        quality: { detection: 0.85 },
        livenessScore: 0.90,
      });

      const req = mockRequest({
        body: { studentId: student._id.toString() },
        file: { buffer: Buffer.from('fake-image-data') },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 when base64 image exceeds 10MB', async () => {
      const student = await createTestStudent();
      // Create a base64 string that decodes to > 10MB
      const largeBuf = Buffer.alloc(11 * 1024 * 1024, 'A');
      const largeBase64 = largeBuf.toString('base64');

      const req = mockRequest({
        body: { studentId: student._id.toString(), photo: largeBase64 },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Image too large (max 10MB)' })
      );
    });

    it('should return 500 on unexpected server error', async () => {
      const student = await createTestStudent();
      frService.registerFace.mockRejectedValue(new Error('GPU memory overflow'));

      const req = mockRequest({
        body: { studentId: student._id.toString(), photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.registerFace(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Face registration failed due to server error' })
      );
    });
  });

  // ================================================================
  // recognizeFace
  // ================================================================
  describe('recognizeFace', () => {
    it('should return 400 when no photo is provided', async () => {
      const req = mockRequest({ body: {}, user: { _id: generateObjectId() } });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Face photo is required (multipart file or base64 string)' })
      );
    });

    it('should return 400 when threshold is out of range', async () => {
      const req = mockRequest({
        body: { photo: 'data:image/png;base64,iVBORw0KGgo=', threshold: '1.5' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Threshold must be between 0 and 1' })
      );
    });

    it('should return 400 when frService.recognizeFace fails (unknown face)', async () => {
      frService.recognizeFace.mockResolvedValue({
        success: false,
        error: 'No matching face found',
      });

      const req = mockRequest({
        body: { photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'No matching face found' })
      );
    });

    it('should return 404 when recognized student not in DB', async () => {
      const fakeStudentId = generateObjectId();
      frService.recognizeFace.mockResolvedValue({
        success: true,
        studentId: fakeStudentId,
        confidence: 0.92,
        threshold: 0.5,
        quality: {},
      });

      const req = mockRequest({
        body: { photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Recognized student not found in database' })
      );
    });

    it('should recognize face successfully', async () => {
      const student = await createTestStudent({ name: 'Known Student' });
      frService.recognizeFace.mockResolvedValue({
        success: true,
        studentId: student._id,
        confidence: 0.95,
        threshold: 0.5,
        quality: { detection: 0.9 },
        topMatches: [{ studentId: student._id, confidence: 0.95 }],
      });

      const req = mockRequest({
        body: { photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Face recognized successfully',
          data: expect.objectContaining({
            studentId: student._id,
            confidence: 0.95,
          }),
        })
      );
    });

    it('should recognize face with multipart file', async () => {
      const student = await createTestStudent({ name: 'File Student' });
      frService.recognizeFace.mockResolvedValue({
        success: true,
        studentId: student._id,
        confidence: 0.88,
        threshold: 0.5,
        quality: {},
      });

      const req = mockRequest({
        body: {},
        file: { buffer: Buffer.from('fake-image') },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 for base64 image exceeding size limit', async () => {
      const largeBuf = Buffer.alloc(11 * 1024 * 1024, 'B');
      const largeBase64 = largeBuf.toString('base64');

      const req = mockRequest({
        body: { photo: largeBase64 },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Image too large (max 10MB)' })
      );
    });

    it('should return 500 on server error', async () => {
      frService.recognizeFace.mockRejectedValue(new Error('Service unavailable'));

      const req = mockRequest({
        body: { photo: 'data:image/png;base64,iVBORw0KGgo=' },
        user: { _id: generateObjectId() },
      });
      const res = mockResponse();

      await frController.recognizeFace(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Face recognition failed due to server error' })
      );
    });
  });

  // ================================================================
  // getRegistrationStatus
  // ================================================================
  describe('getRegistrationStatus', () => {
    it('should return 404 when student does not exist', async () => {
      const req = mockRequest({ params: { studentId: generateObjectId().toString() } });
      const res = mockResponse();

      await frController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Student not found' })
      );
    });

    it('should return isRegistered=false when no embedding exists', async () => {
      const student = await createTestStudent();
      const req = mockRequest({ params: { studentId: student._id.toString() } });
      const res = mockResponse();

      await frController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isRegistered: false,
            registration: null,
          }),
        })
      );
    });

    it('should return isRegistered=true when active embedding exists', async () => {
      const student = await createTestStudent();
      const registeredBy = generateObjectId();
      await createTestEmbedding(student._id, registeredBy);

      const req = mockRequest({ params: { studentId: student._id.toString() } });
      const res = mockResponse();

      await frController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.isRegistered).toBe(true);
      expect(responseData.data.registration).toBeDefined();
      expect(responseData.data.registration.confidence).toBe(0.95);
    });

    it('should return isRegistered=false when embedding is inactive', async () => {
      const student = await createTestStudent();
      await createTestEmbedding(student._id, generateObjectId(), { isActive: false });

      const req = mockRequest({ params: { studentId: student._id.toString() } });
      const res = mockResponse();

      await frController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRegistered: false }),
        })
      );
    });

    it('should return 500 on server error', async () => {
      // Pass an invalid ObjectId to trigger a cast error
      const req = mockRequest({ params: { studentId: 'invalid-id' } });
      const res = mockResponse();

      await frController.getRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get registration status' })
      );
    });
  });

  // ================================================================
  // deleteFaceRegistration
  // ================================================================
  describe('deleteFaceRegistration', () => {
    it('should return 404 when student does not exist', async () => {
      const req = mockRequest({ params: { studentId: generateObjectId().toString() } });
      const res = mockResponse();

      await frController.deleteFaceRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Student not found' })
      );
    });

    it('should return 404 when no active registration exists', async () => {
      const student = await createTestStudent();
      const req = mockRequest({ params: { studentId: student._id.toString() } });
      const res = mockResponse();

      await frController.deleteFaceRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No active face registration found for this student' })
      );
    });

    it('should delete face registration successfully', async () => {
      const student = await createTestStudent({ name: 'Delete Student' });
      await createTestEmbedding(student._id, generateObjectId());

      const req = mockRequest({ params: { studentId: student._id.toString() } });
      const res = mockResponse();

      await frController.deleteFaceRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Face registration deleted successfully',
          data: expect.objectContaining({
            studentName: 'Delete Student',
            deactivatedCount: 1,
          }),
        })
      );
      expect(frCacheService.invalidateCache).toHaveBeenCalledWith(student._id.toString());

      // Verify embedding is now inactive in DB
      const embedding = await FaceEmbedding.findOne({ studentId: student._id });
      expect(embedding.isActive).toBe(false);
    });

    it('should return 500 on server error', async () => {
      const req = mockRequest({ params: { studentId: 'invalid-id' } });
      const res = mockResponse();

      await frController.deleteFaceRegistration(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to delete face registration' })
      );
    });
  });

  // ================================================================
  // getFRStats
  // ================================================================
  describe('getFRStats', () => {
    // FRSession model may not be registered in test env, so we register a stub
    beforeAll(() => {
      if (!mongoose.models.FRSession) {
        const frSessionSchema = new mongoose.Schema({
          type: String,
          success: Boolean,
          createdAt: Date,
        });
        frSessionSchema.statics.getSuccessRate = jest.fn().mockResolvedValue({
          total: 10,
          successful: 8,
          rate: 0.8,
        });
        mongoose.model('FRSession', frSessionSchema);
      }
    });

    it('should return FR statistics with default date range', async () => {
      // Create some test embeddings
      const studentId1 = generateObjectId();
      const studentId2 = generateObjectId();
      const registeredBy = generateObjectId();

      await FaceEmbedding.create([
        {
          studentId: studentId1,
          embedding: 'enc-1',
          metadata: { confidence: 0.9 },
          registeredBy,
          isActive: true,
        },
        {
          studentId: studentId2,
          embedding: 'enc-2',
          metadata: { confidence: 0.85 },
          registeredBy,
          isActive: false,
        },
      ]);

      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await frController.getFRStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.embeddings.total).toBe(2);
      expect(responseData.data.embeddings.active).toBe(1);
      expect(responseData.data.embeddings.inactive).toBe(1);
    });

    it('should accept custom date range', async () => {
      const req = mockRequest({
        query: {
          startDate: '2026-01-01',
          endDate: '2026-03-15',
        },
      });
      const res = mockResponse();

      await frController.getFRStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
