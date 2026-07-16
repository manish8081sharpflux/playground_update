/**
 * Tests for backend/controllers/lms/student/artCourseController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../models/course');
jest.mock('../../../models/StudentProgress');
jest.mock('../../../models/Submission');
jest.mock('../../../models/ArtGallery');
jest.mock('../../../models/ArtCompetition');
jest.mock('../../../services/aws/s3');

const Course = require('../../../models/course');
const StudentProgress = require('../../../models/StudentProgress');
const Submission = require('../../../models/Submission');
const ArtGallery = require('../../../models/ArtGallery');
const ArtCompetition = require('../../../models/ArtCompetition');
const s3Service = require('../../../services/aws/s3');
const fs = require('fs');

const artController = require('../../../controllers/lms/student/artCourseController');
const { mockRequest, mockResponse } = global.testUtils;

describe('ArtCourseController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getArtCourseData ====================
  describe('getArtCourseData', () => {
    it('should return art course data with modes', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();

      Course.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: courseId,
              title: 'Drawing Workshop',
              description: 'Learn to draw',
              thumbnail: 'thumb.jpg',
              difficultyLevel: 'Beginner',
              createdBy: { firstName: 'Coach', lastName: 'Art' },
              modules: [
                {
                  chapters: [
                    {
                      contentItems: [
                        { type: 'video', fileUrl: 'vid.mp4' },
                      ],
                    },
                  ],
                },
              ],
            },
          ]),
        }),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      ArtGallery.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      ArtCompetition.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await artController.getArtCourseData(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          modes: expect.arrayContaining([
            expect.objectContaining({ mode: 'workshops' }),
            expect.objectContaining({ mode: 'art_stories' }),
            expect.objectContaining({ mode: 'competition' }),
            expect.objectContaining({ mode: 'free_sketch' }),
          ]),
        })
      );
    });

    it('should include active competition in response', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();

      Course.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      StudentProgress.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      ArtGallery.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      ArtCompetition.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            theme: 'Nature',
            description: 'Draw nature',
            deadline: new Date(),
            status: 'active',
            prize: '50 coins',
            entries: [
              {
                student: { firstName: 'John', lastName: 'D' },
                fileUrl: 'art.jpg',
                title: 'Sunset',
                votes: 5,
              },
            ],
          }),
        }),
      });

      const req = mockRequest({ params: { studentId } });
      const res = mockResponse();
      await artController.getArtCourseData(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors with 500', async () => {
      Course.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await artController.getArtCourseData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== submitArtwork ====================
  describe('submitArtwork', () => {
    it('should return 400 for invalid type', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { type: 'invalid', mode: 'workshop' },
        file: { path: '/tmp/a.jpg', originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024 },
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid mode', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { type: 'art', mode: 'invalid_mode' },
        file: { path: '/tmp/a.jpg', originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024 },
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if no file provided', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { type: 'art', mode: 'workshop' },
        file: null,
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should submit artwork for workshop mode', async () => {
      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/art.jpg',
        s3Key: 'lms/art.jpg',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      Submission.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        submittedAt: new Date(),
      });

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: {
          type: 'art',
          mode: 'workshop',
          courseId: new mongoose.Types.ObjectId().toString(),
          taskTitle: 'Draw a Tree',
        },
        file: { path: '/tmp/a.jpg', originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024 },
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    it('should handle competition submission', async () => {
      const compId = new mongoose.Types.ObjectId();

      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/art.jpg',
        s3Key: 'lms/art.jpg',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const competition = {
        entries: [],
        save: jest.fn().mockResolvedValue(true),
      };
      competition.entries.some = jest.fn().mockReturnValue(false);
      competition.entries.push = jest.fn();
      ArtCompetition.findById.mockResolvedValue(competition);

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: {
          type: 'art',
          mode: 'competition',
          title: 'My Art',
          metadata: JSON.stringify({ competitionId: compId.toString() }),
        },
        file: { path: '/tmp/a.jpg', originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024 },
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    it('should return 409 if already entered competition', async () => {
      const compId = new mongoose.Types.ObjectId();

      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/art.jpg',
        s3Key: 'lms/art.jpg',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const competition = {
        entries: [{ student: { toString: () => 'sid' } }],
        save: jest.fn(),
      };
      competition.entries.some = Array.prototype.some.bind(competition.entries);
      ArtCompetition.findById.mockResolvedValue(competition);

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: {
          type: 'art',
          mode: 'competition',
          metadata: JSON.stringify({ competitionId: compId.toString() }),
        },
        file: { path: '/tmp/a.jpg', originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024 },
      });
      const res = mockResponse();
      await artController.submitArtwork(req, res);

      expect(res.status).toHaveBeenCalledWith(409);

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });
  });

  // ==================== saveToGallery ====================
  describe('saveToGallery', () => {
    it('should return 400 if no file', async () => {
      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { title: 'My Art' },
        file: null,
      });
      const res = mockResponse();
      await artController.saveToGallery(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should save to gallery successfully', async () => {
      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: 'https://s3.example.com/sketch.jpg',
        s3Key: 'lms/sketch.jpg',
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      ArtGallery.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        title: 'My Sketch',
        fileUrl: 'https://s3.example.com/sketch.jpg',
        createdAt: new Date(),
        canvasSize: { width: 1024, height: 768 },
        metadata: { sessionDuration: 30 },
      });

      const req = mockRequest({
        params: { studentId: 'sid' },
        body: { title: 'My Sketch', sessionDuration: '30' },
        file: { path: '/tmp/s.jpg', originalname: 's.jpg', mimetype: 'image/jpeg', size: 512 },
      });
      const res = mockResponse();
      await artController.saveToGallery(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );

      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });
  });

  // ==================== submitArtweaverDrawing ====================
  describe('submitArtweaverDrawing', () => {
    it('should save the JPEG and create a pending coach submission', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const galleryId = new mongoose.Types.ObjectId();
      const submissionId = new mongoose.Types.ObjectId();
      const galleryItem = {
        _id: galleryId,
        title: 'ArtWeaver Drawing',
        fileUrl: 'https://s3.example.com/artweaver.jpg',
        createdAt: new Date(),
        canvasSize: { width: 1024, height: 768 },
        metadata: { sessionDuration: 120 },
        submitted: false,
        submissionId: null,
        save: jest.fn().mockResolvedValue(true),
      };

      s3Service.uploadLMSContent.mockResolvedValue({
        success: true,
        url: galleryItem.fileUrl,
        s3Key: 'lms/artweaver.jpg',
      });
      ArtGallery.create.mockResolvedValue(galleryItem);
      Course.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: courseId }),
        }),
      });
      Submission.create.mockResolvedValue({ _id: submissionId, status: 'pending' });

      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

      const req = mockRequest({
        params: { studentId },
        body: {
          imageData: `data:image/jpeg;base64,${Buffer.from('jpeg-data').toString('base64')}`,
          title: 'ArtWeaver Drawing',
          sessionDuration: 120,
        },
      });
      const res = mockResponse();

      await artController.submitArtweaverDrawing(req, res);

      expect(Submission.create).toHaveBeenCalledWith(expect.objectContaining({
        studentId,
        courseId,
        submissionType: 'art',
        status: 'pending',
        fileUrl: galleryItem.fileUrl,
      }));
      expect(galleryItem.submitted).toBe(true);
      expect(galleryItem.submissionId).toEqual(submissionId);
      expect(galleryItem.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        artwork: expect.objectContaining({ submitted: true, reviewStatus: 'pending' }),
      }));

      fs.writeFileSync.mockRestore();
      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });
  });

  // ==================== getGallery ====================
  describe('getGallery', () => {
    it('should return gallery items', async () => {
      ArtGallery.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: new mongoose.Types.ObjectId(),
                title: 'Art 1',
                fileUrl: 'url',
                createdAt: new Date(),
                canvasSize: { width: 800, height: 600 },
                metadata: { sessionDuration: 20 },
                submitted: false,
              },
            ]),
          }),
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await artController.getGallery(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors with 500', async () => {
      ArtGallery.find.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await artController.getGallery(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== deleteGalleryItem ====================
  describe('deleteGalleryItem', () => {
    it('should return 404 if item not found', async () => {
      ArtGallery.findOne.mockResolvedValue(null);

      const req = mockRequest({
        params: {
          studentId: 'sid',
          artworkId: new mongoose.Types.ObjectId().toString(),
        },
      });
      const res = mockResponse();
      await artController.deleteGalleryItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete item from S3 and DB', async () => {
      const item = {
        _id: new mongoose.Types.ObjectId(),
        s3Key: 'lms/art.jpg',
      };
      ArtGallery.findOne.mockResolvedValue(item);
      s3Service.deleteLMSContent.mockResolvedValue({ success: true });
      ArtGallery.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = mockRequest({
        params: { studentId: 'sid', artworkId: item._id.toString() },
      });
      const res = mockResponse();
      await artController.deleteGalleryItem(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(s3Service.deleteLMSContent).toHaveBeenCalledWith('lms/art.jpg');
    });
  });

  // ==================== getActiveCompetition ====================
  describe('getActiveCompetition', () => {
    it('should return null when no competition active', async () => {
      ArtCompetition.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await artController.getActiveCompetition(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, competition: null })
      );
    });

    it('should return competition with leaderboard', async () => {
      ArtCompetition.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            theme: 'Animals',
            description: 'Draw an animal',
            deadline: new Date(),
            status: 'active',
            prize: '100 coins',
            entries: [
              {
                student: { firstName: 'Alice', lastName: 'B' },
                fileUrl: 'art1.jpg',
                title: 'Cat',
                votes: 10,
              },
            ],
          }),
        }),
      });

      const req = mockRequest({ params: { studentId: 'sid' } });
      const res = mockResponse();
      await artController.getActiveCompetition(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          competition: expect.objectContaining({
            theme: 'Animals',
            leaderboard: expect.any(Array),
          }),
        })
      );
    });
  });
});
