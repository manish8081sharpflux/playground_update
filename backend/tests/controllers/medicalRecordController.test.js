const mongoose = require('mongoose');

// Mock pino logger before requiring controller
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock S3 service
jest.mock('../../services/aws/s3', () => ({
  deleteFileFromS3: jest.fn().mockResolvedValue(true),
}));

const medicalRecordController = require('../../controllers/medicalRecordController');
const MedicalRecord = require('../../models/medical');
const { deleteFileFromS3 } = require('../../services/aws/s3');

const { mockRequest, mockResponse, generateObjectId } = global.testUtils;

// Helper: create a medical record with history items
async function createTestMedicalRecord(studentId, historyItems = []) {
  return MedicalRecord.create({
    studentId,
    healthCheckupDate: new Date(),
    medicalHistory: historyItems.length > 0 ? historyItems : [
      {
        name: 'Flu',
        description: 'Seasonal flu',
        date: new Date(),
        doctorsName: 'Dr. Test',
        hospitalName: 'Test Hospital',
        caseId: 'CASE-001',
        currentStatus: { status: 'Recovered', notes: 'Full recovery' },
        prescriptions: [{ url: 'https://s3.example.com/rx1.pdf', name: 'rx1.pdf' }],
        otherAttachments: [{ url: 'https://s3.example.com/att1.pdf', name: 'att1.pdf' }],
      },
    ],
    notes: 'Test medical record',
    createdBy: generateObjectId(),
  });
}

describe('Medical Record Controller (Story 6.2)', () => {

  // ================================================================
  // deleteMedicalHistoryItem
  // ================================================================
  describe('deleteMedicalHistoryItem', () => {
    it('should return 400 when userId is missing', async () => {
      const req = mockRequest({ params: { medicalHistoryId: generateObjectId().toString() } });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'User ID and medical history ID are required' })
      );
    });

    it('should return 400 when medicalHistoryId is missing', async () => {
      const req = mockRequest({ params: { userId: generateObjectId().toString() } });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User ID and medical history ID are required' })
      );
    });

    it('should return 404 when medical record not found', async () => {
      const req = mockRequest({
        params: {
          userId: generateObjectId().toString(),
          medicalHistoryId: generateObjectId().toString(),
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medical record not found for this user' })
      );
    });

    it('should return 404 when history item not found in record', async () => {
      const studentId = generateObjectId();
      await createTestMedicalRecord(studentId);

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: generateObjectId().toString(),
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medical history item not found' })
      );
    });

    it('should delete medical history item and associated S3 files', async () => {
      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId);
      const historyItemId = record.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: historyItemId,
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Medical history item deleted successfully',
        })
      );

      // Verify S3 deletion was called for both prescription and attachment
      expect(deleteFileFromS3).toHaveBeenCalledTimes(2);

      // Verify the item is removed from DB
      const updatedRecord = await MedicalRecord.findOne({ studentId });
      expect(updatedRecord.medicalHistory).toHaveLength(0);
    });

    it('should delete item even if S3 deletion fails', async () => {
      deleteFileFromS3.mockRejectedValue(new Error('S3 network error'));

      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId);
      const historyItemId = record.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: historyItemId,
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      // Verify item was still removed even though S3 failed
      const updatedRecord = await MedicalRecord.findOne({ studentId });
      expect(updatedRecord.medicalHistory).toHaveLength(0);
    });

    it('should delete item with no attachments', async () => {
      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId, [
        {
          name: 'Headache',
          description: 'Mild headache',
          date: new Date(),
          doctorsName: 'Dr. Smith',
          prescriptions: [],
          otherAttachments: [],
        },
      ]);
      const historyItemId = record.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: historyItemId,
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(deleteFileFromS3).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // updateMedicalHistoryItem
  // ================================================================
  describe('updateMedicalHistoryItem', () => {
    it('should return 400 when userId is missing', async () => {
      const req = mockRequest({
        params: { medicalHistoryId: generateObjectId().toString() },
        body: { description: 'Updated' },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User ID and medical history ID are required' })
      );
    });

    it('should return 400 when medicalHistoryId is missing', async () => {
      const req = mockRequest({
        params: { userId: generateObjectId().toString() },
        body: { description: 'Updated' },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User ID and medical history ID are required' })
      );
    });

    it('should return 404 when medical record not found', async () => {
      const req = mockRequest({
        params: {
          userId: generateObjectId().toString(),
          medicalHistoryId: generateObjectId().toString(),
        },
        body: { description: 'Updated' },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medical record not found for this user' })
      );
    });

    it('should return 404 when history item not found', async () => {
      const studentId = generateObjectId();
      await createTestMedicalRecord(studentId);

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: generateObjectId().toString(),
        },
        body: { description: 'Updated' },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medical history item not found' })
      );
    });

    it('should update medical history item successfully', async () => {
      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId);
      const historyItemId = record.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: historyItemId,
        },
        body: {
          description: 'Updated description',
          doctorsName: 'Dr. Updated',
          hospitalName: 'Updated Hospital',
        },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Medical history item updated successfully',
        })
      );

      // Verify the data was updated in DB
      const updatedRecord = await MedicalRecord.findOne({ studentId });
      expect(updatedRecord.medicalHistory[0].description).toBe('Updated description');
      expect(updatedRecord.medicalHistory[0].doctorsName).toBe('Dr. Updated');
      expect(updatedRecord.medicalHistory[0].hospitalName).toBe('Updated Hospital');
      // Original field should remain
      expect(updatedRecord.medicalHistory[0].name).toBe('Flu');
    });

    it('should update status with status history', async () => {
      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId);
      const historyItemId = record.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: historyItemId,
        },
        body: {
          currentStatus: {
            status: 'Under Treatment',
            notes: 'Follow-up required',
            date: new Date(),
          },
        },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedRecord = await MedicalRecord.findOne({ studentId });
      expect(updatedRecord.medicalHistory[0].currentStatus.status).toBe('Under Treatment');
    });

    it('should handle multiple history items - update only the target', async () => {
      const studentId = generateObjectId();
      const record = await createTestMedicalRecord(studentId, [
        {
          name: 'Flu',
          description: 'Item 1',
          date: new Date(),
        },
        {
          name: 'Cold',
          description: 'Item 2',
          date: new Date(),
        },
      ]);
      const targetId = record.medicalHistory[1]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentId.toString(),
          medicalHistoryId: targetId,
        },
        body: { description: 'Updated Item 2' },
      });
      const res = mockResponse();

      await medicalRecordController.updateMedicalHistoryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const updatedRecord = await MedicalRecord.findOne({ studentId });
      expect(updatedRecord.medicalHistory[0].description).toBe('Item 1'); // Unchanged
      expect(updatedRecord.medicalHistory[1].description).toBe('Updated Item 2'); // Updated
    });
  });

  // ================================================================
  // RBAC Scope Filtering Tests
  // ================================================================
  describe('RBAC scope isolation', () => {
    it('should only find records for the specified user (scope isolation)', async () => {
      const studentA = generateObjectId();
      const studentB = generateObjectId();
      await createTestMedicalRecord(studentA, [{ name: 'Flu A', date: new Date() }]);
      await createTestMedicalRecord(studentB, [{ name: 'Flu B', date: new Date() }]);

      // Attempt to delete student B's record using student A's userId
      const recordB = await MedicalRecord.findOne({ studentId: studentB });
      const historyItemB = recordB.medicalHistory[0]._id.toString();

      const req = mockRequest({
        params: {
          userId: studentA.toString(),
          medicalHistoryId: historyItemB,
        },
      });
      const res = mockResponse();

      await medicalRecordController.deleteMedicalHistoryItem(req, res);

      // Should not find the item because it belongs to student B
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Medical history item not found' })
      );

      // Verify student B's record is still intact
      const stillExists = await MedicalRecord.findOne({ studentId: studentB });
      expect(stillExists.medicalHistory).toHaveLength(1);
    });
  });
});
