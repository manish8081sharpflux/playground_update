/**
 * Tests for backend/controllers/contentController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../models/ContentLibrary');
jest.mock('../../../services/aws/s3');

const ContentLibrary = require('../../../models/ContentLibrary');
const s3Service = require('../../../services/aws/s3');
const fs = require('fs');

const contentController = require('../../../controllers/contentController');
const { mockRequest, mockResponse } = global.testUtils;

describe('ContentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== uploadFiles ====================
  describe('uploadFiles', () => {
    it('should return 400 if no files provided', async () => {
      const req = mockRequest({ files: null, body: {}, user: { _id: 'u1' } });
      const res = mockResponse();
      await contentController.uploadFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 400 if files array is empty', async () => {
      const req = mockRequest({ files: [], body: {}, user: { _id: 'u1' } });
      const res = mockResponse();
      await contentController.uploadFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should upload files successfully and return 201', async () => {
      const file = {
        path: '/tmp/test.pdf',
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/test.pdf',
        s3Key: 'lms/test.pdf',
        fileType: 'pdf',
        mimeType: 'application/pdf',
      });

      const saveMock = jest.fn().mockResolvedValue(true);
      ContentLibrary.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = saveMock;
      });

      // Mock fs.existsSync
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const req = mockRequest({
        files: [file],
        body: { tags: '["test"]', description: 'A file' },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await contentController.uploadFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(s3Service.uploadLMSContent).toHaveBeenCalledWith(
        file.path,
        file.originalname,
        'pdf',
        file.mimetype
      );

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    it('should handle unsupported file types gracefully', async () => {
      const file = {
        path: '/tmp/test.xyz',
        originalname: 'test.xyz',
        mimetype: 'application/octet-stream',
        size: 512,
      };

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const req = mockRequest({
        files: [file],
        body: {},
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await contentController.uploadFiles(req, res);

      // No files uploaded successfully => 500
      expect(res.status).toHaveBeenCalledWith(500);

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    it('should handle S3 upload failure', async () => {
      const file = {
        path: '/tmp/test.mp4',
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 2048,
      };

      s3Service.uploadLMSContent.mockResolvedValue({
        success: false,
        message: 'S3 error',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const req = mockRequest({
        files: [file],
        body: {},
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await contentController.uploadFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });
  });

  // ==================== getAllFiles ====================
  describe('getAllFiles', () => {
    it('should return files with 200', async () => {
      const files = [{ fileName: 'a.pdf' }];
      ContentLibrary.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue(files),
              }),
            }),
          }),
        }),
      });
      ContentLibrary.countDocuments.mockResolvedValue(1);

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await contentController.getAllFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, totalFiles: 1 })
      );
    });

    it('should apply fileType filter', async () => {
      ContentLibrary.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      ContentLibrary.countDocuments.mockResolvedValue(0);

      const req = mockRequest({ query: { fileType: 'video' } });
      const res = mockResponse();
      await contentController.getAllFiles(req, res);

      expect(ContentLibrary.find).toHaveBeenCalledWith(
        expect.objectContaining({ fileType: 'video', uploadStatus: 'complete' })
      );
    });

    it('should handle errors with 500', async () => {
      ContentLibrary.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await contentController.getAllFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getFileById ====================
  describe('getFileById', () => {
    it('should return 404 if file not found', async () => {
      ContentLibrary.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({ params: { id: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await contentController.getFileById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return file and update lastAccessedAt', async () => {
      const file = {
        _id: new mongoose.Types.ObjectId(),
        fileName: 'test.pdf',
        save: jest.fn().mockResolvedValue(true),
      };
      ContentLibrary.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(file),
        }),
      });

      const req = mockRequest({ params: { id: file._id.toString() } });
      const res = mockResponse();
      await contentController.getFileById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(file.save).toHaveBeenCalled();
    });
  });

  // ==================== updateFileMetadata ====================
  describe('updateFileMetadata', () => {
    it('should return 404 if file not found', async () => {
      ContentLibrary.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: {},
      });
      const res = mockResponse();
      await contentController.updateFileMetadata(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update metadata and return 200', async () => {
      const file = {
        _id: new mongoose.Types.ObjectId(),
        description: 'old',
        tags: [],
        save: jest.fn().mockResolvedValue(true),
      };
      ContentLibrary.findById.mockResolvedValue(file);

      const req = mockRequest({
        params: { id: file._id.toString() },
        body: { description: 'new', tags: ['tag1'] },
      });
      const res = mockResponse();
      await contentController.updateFileMetadata(req, res);

      expect(file.description).toBe('new');
      expect(file.tags).toEqual(['tag1']);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==================== deleteFile ====================
  describe('deleteFile', () => {
    it('should return 404 if file not found', async () => {
      ContentLibrary.findById.mockResolvedValue(null);

      const req = mockRequest({ params: { id: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await contentController.deleteFile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if file is used in courses', async () => {
      const file = {
        _id: new mongoose.Types.ObjectId(),
        s3Key: 'key',
        usedInCourses: [{ courseId: 'c1' }],
      };
      ContentLibrary.findById.mockResolvedValue(file);

      const req = mockRequest({ params: { id: file._id.toString() } });
      const res = mockResponse();
      await contentController.deleteFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should delete from S3 and DB and return 200', async () => {
      const file = {
        _id: new mongoose.Types.ObjectId(),
        fileName: 'test.pdf',
        s3Key: 'lms/test.pdf',
        usedInCourses: [],
      };
      ContentLibrary.findById.mockResolvedValue(file);
      s3Service.deleteLMSContent.mockResolvedValue({ success: true });
      ContentLibrary.findByIdAndDelete.mockResolvedValue(file);

      const req = mockRequest({ params: { id: file._id.toString() } });
      const res = mockResponse();
      await contentController.deleteFile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(s3Service.deleteLMSContent).toHaveBeenCalledWith('lms/test.pdf');
      expect(ContentLibrary.findByIdAndDelete).toHaveBeenCalled();
    });
  });

  // ==================== getContentStats ====================
  describe('getContentStats', () => {
    it('should return stats with 200', async () => {
      ContentLibrary.aggregate.mockResolvedValueOnce([{ _id: 'pdf', count: 5, totalSize: 1024 }]);
      ContentLibrary.countDocuments.mockResolvedValue(5);
      ContentLibrary.aggregate.mockResolvedValueOnce([{ total: 1024 }]);

      const req = mockRequest({});
      const res = mockResponse();
      await contentController.getContentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          stats: expect.objectContaining({ totalFiles: 5 }),
        })
      );
    });

    it('should handle errors with 500', async () => {
      ContentLibrary.aggregate.mockRejectedValue(new Error('Aggregate fail'));

      const req = mockRequest({});
      const res = mockResponse();
      await contentController.getContentStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
