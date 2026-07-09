const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock medicalCheckIns service
jest.mock('../../services/medicalCheckIns', () => ({
  createMedicalCheckIn: jest.fn(),
  getAllMedicalCheckIns: jest.fn(),
  getMedicalCheckInsByStudentId: jest.fn(),
  getMedicalCheckInById: jest.fn(),
  updateMedicalCheckIn: jest.fn(),
  deleteMedicalCheckIn: jest.fn(),
  addOrUpdateAttachments: jest.fn(),
  deleteAttachment: jest.fn(),
  getMedicalCheckInsByBalagruhaIds: jest.fn(),
}));

const medicalCheckInsController = require('../../controllers/medicalCheckInsController');
const MedicalCheckIns = require('../../services/medicalCheckIns');
const { mockRequest, mockResponse } = global.testUtils;

describe('MedicalCheckInsController (Story 5.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== createMedicalCheckIn ====================
  describe('createMedicalCheckIn', () => {
    it('should create medical check-in successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        user: { _id: userId },
        body: {
          studentId,
          temperature: 98.6,
          date: '2026-03-16',
          healthStatus: 'healthy',
          notes: 'All good',
          symptoms: [],
        },
      });
      const res = mockResponse();

      MedicalCheckIns.createMedicalCheckIn.mockResolvedValue({
        success: true,
        data: { studentId, temperature: 98.6 },
        message: 'Check-in created',
      });

      await medicalCheckInsController.createMedicalCheckIn(req, res);

      expect(MedicalCheckIns.createMedicalCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({ studentId, temperature: 98.6, createdBy: userId }),
        expect.objectContaining({
          attachments: [],
          prescriptions: [],
          testResults: [],
          followUpDescriptions: [],
          followUpTestResults: [],
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle file uploads', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { studentId: 's1', temperature: 99.0, date: '2026-03-16', healthStatus: 'sick' },
        files: {
          attachments: [{ path: '/uploads/att1.jpg' }],
          prescriptions: [{ path: '/uploads/presc1.pdf' }],
          testResults: [{ path: '/uploads/test1.pdf' }],
          followUpDescriptions: [{ path: '/uploads/fu1.jpg' }],
          followUpTestResults: [{ path: '/uploads/ftr1.pdf' }],
        },
      });
      const res = mockResponse();

      MedicalCheckIns.createMedicalCheckIn.mockResolvedValue({ success: true, data: {}, message: 'OK' });

      await medicalCheckInsController.createMedicalCheckIn(req, res);

      expect(MedicalCheckIns.createMedicalCheckIn).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          attachments: ['/uploads/att1.jpg'],
          prescriptions: ['/uploads/presc1.pdf'],
          testResults: ['/uploads/test1.pdf'],
          followUpDescriptions: ['/uploads/fu1.jpg'],
          followUpTestResults: ['/uploads/ftr1.pdf'],
        })
      );
    });

    it('should parse JSON string for doctorVisits', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: {
          studentId: 's1',
          temperature: 98,
          date: '2026-03-16',
          healthStatus: 'healthy',
          doctorVisits: JSON.stringify([{ doctor: 'Dr. Test', date: '2026-03-16' }]),
          followUps: JSON.stringify([{ type: 'checkup', date: '2026-03-23' }]),
        },
      });
      const res = mockResponse();

      MedicalCheckIns.createMedicalCheckIn.mockResolvedValue({ success: true, data: {}, message: 'OK' });

      await medicalCheckInsController.createMedicalCheckIn(req, res);

      expect(MedicalCheckIns.createMedicalCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorVisits: [{ doctor: 'Dr. Test', date: '2026-03-16' }],
          followUps: [{ type: 'checkup', date: '2026-03-23' }],
        }),
        expect.any(Object)
      );
    });

    it('should return 400 on service failure', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { studentId: 's1' },
      });
      const res = mockResponse();

      MedicalCheckIns.createMedicalCheckIn.mockResolvedValue({ success: false, message: 'Validation error' });

      await medicalCheckInsController.createMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const userId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        user: { _id: userId },
        body: { studentId: 's1' },
      });
      const res = mockResponse();

      MedicalCheckIns.createMedicalCheckIn.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.createMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getAllMedicalCheckIns ====================
  describe('getAllMedicalCheckIns', () => {
    it('should get all check-ins with default pagination', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      MedicalCheckIns.getAllMedicalCheckIns.mockResolvedValue({
        success: true,
        data: { checkIns: [], total: 0 },
        message: 'OK',
      });

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(MedicalCheckIns.getAllMedicalCheckIns).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should apply query filters', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        query: {
          student: studentId,
          healthStatus: 'sick',
          date: '2026-03-16',
          page: '2',
          limit: '20',
        },
      });
      const res = mockResponse();

      MedicalCheckIns.getAllMedicalCheckIns.mockResolvedValue({ success: true, data: {}, message: 'OK' });

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(MedicalCheckIns.getAllMedicalCheckIns).toHaveBeenCalledWith(
        expect.objectContaining({ student: studentId, healthStatus: 'sick' }),
        { page: 2, limit: 20 }
      );
    });

    it('should return 400 when student ID is invalid', async () => {
      const req = mockRequest({
        query: { student: 'not-a-valid-id' },
      });
      const res = mockResponse();

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid student ID',
      }));
    });

    it('should apply scope filter', async () => {
      const balagruhaId = new mongoose.Types.ObjectId();
      const req = mockRequest({
        query: {},
        scopeFilter: { balagruhaId },
      });
      const res = mockResponse();

      MedicalCheckIns.getAllMedicalCheckIns.mockResolvedValue({ success: true, data: {}, message: 'OK' });

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(MedicalCheckIns.getAllMedicalCheckIns).toHaveBeenCalledWith(
        expect.objectContaining({ balagruhaId }),
        expect.any(Object)
      );
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      MedicalCheckIns.getAllMedicalCheckIns.mockResolvedValue({ success: false, message: 'Failed' });

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      MedicalCheckIns.getAllMedicalCheckIns.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.getAllMedicalCheckIns(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getMedicalCheckInsByStudentId ====================
  describe('getMedicalCheckInsByStudentId', () => {
    it('should get check-ins by student ID', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { studentId }, query: {} });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByStudentId.mockResolvedValue({
        success: true,
        data: [{ studentId }],
        message: 'OK',
      });

      await medicalCheckInsController.getMedicalCheckInsByStudentId(req, res);

      expect(MedicalCheckIns.getMedicalCheckInsByStudentId).toHaveBeenCalledWith(
        studentId, { page: 1, limit: 10 }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { studentId: 's1' }, query: {} });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByStudentId.mockResolvedValue({ success: false, message: 'Not found' });

      await medicalCheckInsController.getMedicalCheckInsByStudentId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ params: { studentId: 's1' }, query: {} });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByStudentId.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.getMedicalCheckInsByStudentId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getMedicalCheckInById ====================
  describe('getMedicalCheckInById', () => {
    it('should get check-in by ID', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { checkInId } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInById.mockResolvedValue({
        success: true,
        data: { _id: checkInId },
        message: 'OK',
      });

      await medicalCheckInsController.getMedicalCheckInById(req, res);

      expect(MedicalCheckIns.getMedicalCheckInById).toHaveBeenCalledWith(checkInId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInById.mockResolvedValue({ success: false, message: 'Not found' });

      await medicalCheckInsController.getMedicalCheckInById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInById.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.getMedicalCheckInById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== updateMedicalCheckIn ====================
  describe('updateMedicalCheckIn', () => {
    it('should update check-in successfully', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { checkInId },
        body: { temperature: 99.5, healthStatus: 'sick', notes: 'Fever' },
      });
      const res = mockResponse();

      MedicalCheckIns.updateMedicalCheckIn.mockResolvedValue({
        success: true,
        data: { _id: checkInId, temperature: 99.5 },
        message: 'Updated',
      });

      await medicalCheckInsController.updateMedicalCheckIn(req, res);

      expect(MedicalCheckIns.updateMedicalCheckIn).toHaveBeenCalledWith(
        checkInId,
        expect.objectContaining({ temperature: 99.5, healthStatus: 'sick', notes: 'Fever' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should parse doctorVisits JSON string during update', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { checkInId },
        body: {
          doctorVisits: JSON.stringify([{ doctor: 'Dr. A' }]),
          followUps: JSON.stringify([{ type: 'checkup' }]),
        },
      });
      const res = mockResponse();

      MedicalCheckIns.updateMedicalCheckIn.mockResolvedValue({ success: true, data: {}, message: 'OK' });

      await medicalCheckInsController.updateMedicalCheckIn(req, res);

      expect(MedicalCheckIns.updateMedicalCheckIn).toHaveBeenCalledWith(
        checkInId,
        expect.objectContaining({
          doctorVisits: [{ doctor: 'Dr. A' }],
          followUps: [{ type: 'checkup' }],
        })
      );
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' }, body: {} });
      const res = mockResponse();

      MedicalCheckIns.updateMedicalCheckIn.mockResolvedValue({ success: false, message: 'Not found' });

      await medicalCheckInsController.updateMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' }, body: {} });
      const res = mockResponse();

      MedicalCheckIns.updateMedicalCheckIn.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.updateMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== deleteMedicalCheckIn ====================
  describe('deleteMedicalCheckIn', () => {
    it('should delete check-in successfully', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { checkInId } });
      const res = mockResponse();

      MedicalCheckIns.deleteMedicalCheckIn.mockResolvedValue({
        success: true,
        data: {},
        message: 'Deleted',
      });

      await medicalCheckInsController.deleteMedicalCheckIn(req, res);

      expect(MedicalCheckIns.deleteMedicalCheckIn).toHaveBeenCalledWith(checkInId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' } });
      const res = mockResponse();

      MedicalCheckIns.deleteMedicalCheckIn.mockResolvedValue({ success: false, message: 'Not found' });

      await medicalCheckInsController.deleteMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ params: { checkInId: 'id1' } });
      const res = mockResponse();

      MedicalCheckIns.deleteMedicalCheckIn.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.deleteMedicalCheckIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== addOrUpdateAttachments ====================
  describe('addOrUpdateAttachments', () => {
    it('should add attachments successfully', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const createdBy = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({
        params: { checkInId },
        body: { createdBy },
        files: {
          attachments: [{ path: '/uploads/att1.jpg' }],
          prescriptions: [{ path: '/uploads/presc1.pdf' }],
          testResults: [{ path: '/uploads/test1.pdf' }],
        },
      });
      const res = mockResponse();

      MedicalCheckIns.addOrUpdateAttachments.mockResolvedValue({
        success: true,
        data: {},
        message: 'Attachments updated',
      });

      await medicalCheckInsController.addOrUpdateAttachments(req, res);

      expect(MedicalCheckIns.addOrUpdateAttachments).toHaveBeenCalledWith(
        checkInId,
        expect.objectContaining({
          attachments: ['/uploads/att1.jpg'],
          prescriptions: ['/uploads/presc1.pdf'],
          testResults: ['/uploads/test1.pdf'],
        }),
        createdBy
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when createdBy is missing', async () => {
      const req = mockRequest({
        params: { checkInId: 'id1' },
        body: {},
      });
      const res = mockResponse();

      await medicalCheckInsController.addOrUpdateAttachments(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'createdBy ID is required',
      }));
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({
        params: { checkInId: 'id1' },
        body: { createdBy: 'user1' },
      });
      const res = mockResponse();

      MedicalCheckIns.addOrUpdateAttachments.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.addOrUpdateAttachments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== deleteAttachment ====================
  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const checkInId = new mongoose.Types.ObjectId().toString();
      const attachmentId = new mongoose.Types.ObjectId().toString();
      const req = mockRequest({ params: { checkInId, attachmentId } });
      const res = mockResponse();

      MedicalCheckIns.deleteAttachment.mockResolvedValue({
        success: true,
        data: {},
        message: 'Attachment deleted',
      });

      await medicalCheckInsController.deleteAttachment(req, res);

      expect(MedicalCheckIns.deleteAttachment).toHaveBeenCalledWith(checkInId, attachmentId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ params: { checkInId: 'id1', attachmentId: 'att1' } });
      const res = mockResponse();

      MedicalCheckIns.deleteAttachment.mockResolvedValue({ success: false, message: 'Not found' });

      await medicalCheckInsController.deleteAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ params: { checkInId: 'id1', attachmentId: 'att1' } });
      const res = mockResponse();

      MedicalCheckIns.deleteAttachment.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.deleteAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getMedicalCheckInsByBalagruhaIds ====================
  describe('getMedicalCheckInsByBalagruhaIds', () => {
    it('should get check-ins by balagruha IDs', async () => {
      const req = mockRequest({ body: { balagruhaIds: ['bg1', 'bg2'] } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByBalagruhaIds.mockResolvedValue({
        success: true,
        data: [{ studentId: 's1' }],
        message: 'OK',
      });

      await medicalCheckInsController.getMedicalCheckInsByBalagruhaIds(req, res);

      expect(MedicalCheckIns.getMedicalCheckInsByBalagruhaIds).toHaveBeenCalledWith(['bg1', 'bg2']);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should restrict balagruhaIds with scopeFilter', async () => {
      const allowedBg = new mongoose.Types.ObjectId();
      const req = mockRequest({
        body: { balagruhaIds: [allowedBg.toString(), 'other-bg'] },
        scopeFilter: { balagruhaId: { $in: [allowedBg] } },
      });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByBalagruhaIds.mockResolvedValue({ success: true, data: [], message: 'OK' });

      await medicalCheckInsController.getMedicalCheckInsByBalagruhaIds(req, res);

      expect(MedicalCheckIns.getMedicalCheckInsByBalagruhaIds).toHaveBeenCalledWith([allowedBg.toString()]);
    });

    it('should return 400 on service failure', async () => {
      const req = mockRequest({ body: { balagruhaIds: [] } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByBalagruhaIds.mockResolvedValue({ success: false, message: 'Failed' });

      await medicalCheckInsController.getMedicalCheckInsByBalagruhaIds(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on exception', async () => {
      const req = mockRequest({ body: { balagruhaIds: ['bg1'] } });
      const res = mockResponse();

      MedicalCheckIns.getMedicalCheckInsByBalagruhaIds.mockRejectedValue(new Error('DB error'));

      await medicalCheckInsController.getMedicalCheckInsByBalagruhaIds(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
