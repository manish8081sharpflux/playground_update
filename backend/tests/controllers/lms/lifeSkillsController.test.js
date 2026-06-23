/**
 * Tests for backend/controllers/lms/student/lifeSkillsController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../models/course');
jest.mock('../../../models/StudentProgress');
jest.mock('../../../models/Submission');
jest.mock('../../../services/aws/s3');

const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const Submission = require('../../../models/Submission');
const s3Service = require('../../../services/aws/s3');
const fs = require('fs');

const lifeSkillsController = require('../../../controllers/lms/student/lifeSkillsController');
const { mockRequest, mockResponse } = global.testUtils;

describe('LifeSkillsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getLifeSkillsTasks ====================
  describe('getLifeSkillsTasks', () => {
    it('should return empty when no course found', async () => {
      Course.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await lifeSkillsController.getLifeSkillsTasks(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tasks: [],
          totalTasks: 0,
        })
      );
    });

    it('should return tasks with completion status', async () => {
      const courseId = new mongoose.Types.ObjectId();
      const itemId = new mongoose.Types.ObjectId();

      Course.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: courseId,
            title: 'Life Skills 101',
            modules: [
              {
                _id: new mongoose.Types.ObjectId(),
                title: 'Mod 1',
                chapters: [
                  {
                    _id: new mongoose.Types.ObjectId(),
                    title: 'Ch 1',
                    contentItems: [
                      {
                        _id: itemId,
                        title: 'Voice Task',
                        type: 'voice',
                        description: 'Answer this',
                        fileUrl: 'audio.mp3',
                        metadata: { difficulty: 'easy', coins: 20 },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        }),
      });

      StudentProgress.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          completedItems: [{ itemId: itemId }],
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await lifeSkillsController.getLifeSkillsTasks(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          totalTasks: 1,
          completedTasks: 1,
        })
      );
    });

    it('should handle errors with 500', async () => {
      Course.findOne.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await lifeSkillsController.getLifeSkillsTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getVoiceTask ====================
  describe('getVoiceTask', () => {
    it('should return 400 for invalid taskId', async () => {
      const req = mockRequest({
        params: { studentId: 'sid', taskId: 'bad' },
      });
      const res = mockResponse();
      await lifeSkillsController.getVoiceTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when task not found', async () => {
      const taskId = new mongoose.Types.ObjectId().toString();
      // The controller calls Course.findOne twice:
      // 1st: await Course.findOne(query, projection) - no .lean()
      // 2nd: await Course.findOne({...}).lean()
      // Both need to return null
      Course.findOne.mockImplementation(() => {
        const result = Promise.resolve(null);
        result.lean = jest.fn().mockResolvedValue(null);
        return result;
      });

      const req = mockRequest({
        params: { studentId: 'sid', taskId },
      });
      const res = mockResponse();
      await lifeSkillsController.getVoiceTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==================== submitVoiceRecording ====================
  describe('submitVoiceRecording', () => {
    it('should return 404 if task not found', async () => {
      Course.findOne.mockResolvedValue(null);

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { taskId: new mongoose.Types.ObjectId().toString() },
        file: { path: '/tmp/a.wav', originalname: 'a.wav', mimetype: 'audio/wav' },
      });
      const res = mockResponse();
      await lifeSkillsController.submitVoiceRecording(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if no audio file', async () => {
      Course.findOne.mockResolvedValue({ _id: 'cid', modules: [] });

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { taskId: new mongoose.Types.ObjectId().toString() },
        file: null,
      });
      const res = mockResponse();
      await lifeSkillsController.submitVoiceRecording(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should submit voice recording successfully', async () => {
      const taskId = new mongoose.Types.ObjectId().toString();

      Course.findOne.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        modules: [
          {
            chapters: [
              {
                contentItems: [
                  { _id: { toString: () => taskId }, title: 'Voice Q' },
                ],
              },
            ],
          },
        ],
      });

      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/audio.wav',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const saveMock = jest.fn().mockResolvedValue(true);
      Submission.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = saveMock;
      });

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { taskId, duration: 15 },
        file: { path: '/tmp/a.wav', originalname: 'a.wav', mimetype: 'audio/wav' },
      });
      const res = mockResponse();
      await lifeSkillsController.submitVoiceRecording(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(saveMock).toHaveBeenCalled();

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });
  });

  // ==================== getSubmissionHistory ====================
  describe('getSubmissionHistory', () => {
    it('should return submissions', async () => {
      Submission.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              type: 'voice',
              status: 'graded',
              grade: { score: 80, points: 20 },
              submittedAt: new Date(),
            },
          ]),
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await lifeSkillsController.getSubmissionHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors with 500', async () => {
      Submission.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await lifeSkillsController.getSubmissionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== markItemComplete ====================
  describe('markItemComplete', () => {
    it('should return 400 if missing required fields', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: {},
      });
      const res = mockResponse();
      await lifeSkillsController.markItemComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should mark item complete successfully', async () => {
      // The updateProgress helper creates/updates StudentProgress
      StudentProgress.findOne.mockResolvedValue({
        completedItems: [],
        lastAccessedAt: null,
        save: jest.fn().mockResolvedValue(true),
      });

      const req = mockRequest({
        params: { studentId: new mongoose.Types.ObjectId().toString() },
        body: {
          itemId: new mongoose.Types.ObjectId().toString(),
          courseId: new mongoose.Types.ObjectId().toString(),
          itemType: 'content',
        },
      });
      const res = mockResponse();
      await lifeSkillsController.markItemComplete(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
