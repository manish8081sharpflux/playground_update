const mongoose = require('mongoose');

jest.mock('../../config/pino-config', () => ({
  errorLogger: { error: jest.fn() },
}));

jest.mock('../../data-access/medicalCheckIns', () => ({
  createMedicalCheckIn: jest.fn(),
  getAllMedicalCheckIns: jest.fn(),
  getMedicalCheckInById: jest.fn(),
  getMedicalCheckInsByStudentId: jest.fn(),
  updateMedicalCheckIn: jest.fn(),
  deleteMedicalCheckIn: jest.fn(),
  updateMedicalCheckInAttachments: jest.fn(),
  deleteAttachment: jest.fn(),
}));

jest.mock('../../data-access/User', () => ({
  getStudentMedicalCheckInsByBalagruhaIds: jest.fn(),
}));

jest.mock('../../models/user', () => ({
  findById: jest.fn(),
}));

jest.mock('../../services/aws/s3', () => ({
  uploadFileToS3: jest.fn(),
}));

const MedicalCheckIns = require('../../services/medicalCheckIns');
const dataAccess = require('../../data-access/medicalCheckIns');
const { uploadFileToS3 } = require('../../services/aws/s3');

describe('MedicalCheckIns attachment updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_S3_FOLDER_MEDICAL_RECORDS = 'medical-records';
    process.env.AWS_S3_FOLDER_MEDICAL_ATTACHMENTS = 'medical-attachments';
  });

  it('creates a legacy doctorVisit container when prescription files are uploaded and doctorVisit is null', async () => {
    const checkInId = new mongoose.Types.ObjectId().toString();
    const createdById = new mongoose.Types.ObjectId().toString();

    dataAccess.getMedicalCheckInById.mockResolvedValue({
      success: true,
      data: {
        _id: checkInId,
        attachments: [],
        doctorVisits: [],
        doctorVisit: null,
      },
    });
    uploadFileToS3.mockResolvedValue({
      success: true,
      url: 'https://example.test/prescription.pdf',
      contentType: 'application/pdf',
      size: 123,
    });
    dataAccess.updateMedicalCheckInAttachments.mockResolvedValue({
      success: true,
      data: {},
    });

    const result = await MedicalCheckIns.addOrUpdateAttachments(
      checkInId,
      {
        attachments: [],
        prescriptions: ['uploads/prescription.pdf'],
        testResults: [],
      },
      createdById
    );

    expect(result.success).toBe(true);
    expect(dataAccess.updateMedicalCheckInAttachments).toHaveBeenCalledWith(
      checkInId,
      expect.objectContaining({
        doctorVisit: expect.objectContaining({
          prescriptionFiles: [
            expect.objectContaining({
              fileName: 'prescription.pdf',
              fileUrl: 'https://example.test/prescription.pdf',
              uploadedBy: createdById,
            }),
          ],
          testResultFiles: [],
        }),
      })
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        dataAccess.updateMedicalCheckInAttachments.mock.calls[0][1],
        'doctorVisit.prescriptionFiles'
      )
    ).toBe(false);
  });
});
