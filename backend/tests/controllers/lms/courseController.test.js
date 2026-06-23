/**
 * Tests for backend/controllers/lms/admin/courseController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

// Mock models before requiring controller
jest.mock('../../../models/course');
const Course = require('../../../models/course');

const courseController = require('../../../controllers/lms/admin/courseController');
const { mockRequest, mockResponse } = global.testUtils;

// Helper to build a mock course document with Mongoose-like subdoc methods
function buildMockCourse(overrides = {}) {
  const contentItem = {
    _id: new mongoose.Types.ObjectId(),
    type: 'video',
    title: 'Lesson 1',
    description: 'Desc',
    order: 0,
    deleteOne: jest.fn(),
  };
  const chapter = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Chapter 1',
    description: '',
    order: 0,
    contentItems: [contentItem],
    id: jest.fn(),
    deleteOne: jest.fn(),
  };
  chapter.id.mockImplementation((id) =>
    chapter.contentItems.find((i) => i._id.toString() === id?.toString()) || null
  );
  chapter.contentItems.id = chapter.id;

  const mod = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Module 1',
    description: '',
    order: 0,
    chapters: [chapter],
    id: jest.fn(),
    deleteOne: jest.fn(),
  };
  mod.id.mockImplementation((id) =>
    mod.chapters.find((c) => c._id.toString() === id?.toString()) || null
  );
  mod.chapters.id = mod.id;

  const course = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Test Course',
    description: 'A test course',
    category: 'Computer Apps',
    difficultyLevel: 'Beginner',
    thumbnail: 'http://thumb.jpg',
    status: 'draft',
    modules: [mod],
    createdBy: new mongoose.Types.ObjectId(),
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn().mockReturnThis(),
    publish: jest.fn().mockResolvedValue(true),
    archive: jest.fn().mockResolvedValue(true),
    restore: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  course.modules.id = jest.fn((id) =>
    course.modules.find((m) => m._id.toString() === id?.toString()) || null
  );
  course.modules.push = jest.fn((...items) => {
    items.forEach((item) => {
      item._id = item._id || new mongoose.Types.ObjectId();
      course.modules[course.modules.length] = item;
    });
    // Update length
    Object.defineProperty(course.modules, 'length', {
      value: course.modules.filter(Boolean).length + items.length,
      writable: true,
    });
  });
  // Re-assign push to actually push
  course.modules.push = Array.prototype.push.bind(course.modules);
  course.modules.id = jest.fn((id) =>
    Array.from(course.modules).find((m) => m && m._id && m._id.toString() === id?.toString()) || null
  );
  return course;
}

describe('LMS Admin CourseController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getAllCourses ====================
  describe('getAllCourses', () => {
    it('should return all courses with 200', async () => {
      const courses = [
        { toObject: jest.fn().mockReturnValue({ _id: 'c1', title: 'A' }) },
        { toObject: jest.fn().mockReturnValue({ _id: 'c2', title: 'B' }) },
      ];
      Course.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(courses),
        }),
      });

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await courseController.getAllCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, count: 2 })
      );
    });

    it('should apply status filter', async () => {
      Course.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });

      const req = mockRequest({ query: { status: 'published' } });
      const res = mockResponse();
      await courseController.getAllCourses(req, res);

      expect(Course.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should apply search filter', async () => {
      Course.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });

      const req = mockRequest({ query: { search: 'math' } });
      const res = mockResponse();
      await courseController.getAllCourses(req, res);

      expect(Course.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        })
      );
    });

    it('should handle errors with 500', async () => {
      Course.find.mockImplementation(() => { throw new Error('DB error'); });

      const req = mockRequest({ query: {} });
      const res = mockResponse();
      await courseController.getAllCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getCourseById ====================
  describe('getCourseById', () => {
    it('should return 400 for invalid ID', async () => {
      const req = mockRequest({ params: { id: 'not-valid' } });
      const res = mockResponse();
      await courseController.getCourseById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      Course.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const req = mockRequest({ params: { id } });
      const res = mockResponse();
      await courseController.getCourseById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return course with 200', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const course = {
        _id: id,
        title: 'Test',
        toObject: jest.fn().mockReturnValue({ _id: id, title: 'Test' }),
      };
      Course.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(course),
        }),
      });

      const req = mockRequest({ params: { id } });
      const res = mockResponse();
      await courseController.getCourseById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should handle errors with 500', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      Course.findById.mockImplementation(() => { throw new Error('DB'); });

      const req = mockRequest({ params: { id } });
      const res = mockResponse();
      await courseController.getCourseById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== createCourse ====================
  describe('createCourse', () => {
    it('should return 400 if required fields missing', async () => {
      const req = mockRequest({ body: { title: 'X' }, user: { _id: 'u1' } });
      const res = mockResponse();
      await courseController.createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid category', async () => {
      const req = mockRequest({
        body: {
          title: 'C',
          description: 'D',
          category: 'Invalid',
          difficultyLevel: 'Beginner',
        },
        user: { _id: 'u1' },
      });
      const res = mockResponse();
      await courseController.createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid difficulty', async () => {
      const req = mockRequest({
        body: {
          title: 'C',
          description: 'D',
          category: 'Art',
          difficultyLevel: 'Expert',
        },
        user: { _id: 'u1' },
      });
      const res = mockResponse();
      await courseController.createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create course and return 201', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      Course.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = saveMock;
      });

      const req = mockRequest({
        body: {
          title: 'New Course',
          description: 'Desc',
          category: 'Art',
          difficultyLevel: 'Beginner',
        },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await courseController.createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== updateCourse ====================
  describe('updateCourse', () => {
    it('should return 400 for invalid ID', async () => {
      const req = mockRequest({ params: { id: 'bad' }, body: {} });
      const res = mockResponse();
      await courseController.updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      Course.findById.mockResolvedValue(null);

      const req = mockRequest({ params: { id }, body: {} });
      const res = mockResponse();
      await courseController.updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should update allowed fields and return 200', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const course = { _id: id, title: 'Old', save: jest.fn().mockResolvedValue(true) };
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { id },
        body: { title: 'New', unknownField: 'ignored' },
      });
      const res = mockResponse();
      await courseController.updateCourse(req, res);

      expect(course.title).toBe('New');
      expect(course.unknownField).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==================== deleteCourse ====================
  describe('deleteCourse', () => {
    it('should return 400 for invalid ID', async () => {
      const req = mockRequest({ params: { id: 'bad' } });
      const res = mockResponse();
      await courseController.deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when course not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      Course.findByIdAndDelete.mockResolvedValue(null);

      const req = mockRequest({ params: { id } });
      const res = mockResponse();
      await courseController.deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should delete course and return 200', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      Course.findByIdAndDelete.mockResolvedValue({ _id: id });

      const req = mockRequest({ params: { id } });
      const res = mockResponse();
      await courseController.deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== addModule ====================
  describe('addModule', () => {
    it('should return 400 if title missing', async () => {
      const req = mockRequest({ params: { courseId: 'cid' }, body: {} });
      const res = mockResponse();
      await courseController.addModule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if course not found', async () => {
      Course.findById.mockResolvedValue(null);
      const req = mockRequest({
        params: { courseId: new mongoose.Types.ObjectId().toString() },
        body: { title: 'Mod' },
      });
      const res = mockResponse();
      await courseController.addModule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should add module and return 201', async () => {
      const course = buildMockCourse();
      // Reset modules to empty for clean test
      course.modules = [];
      course.modules.push = Array.prototype.push.bind(course.modules);
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: { title: 'New Module', description: 'Desc' },
      });
      const res = mockResponse();
      await courseController.addModule(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(course.save).toHaveBeenCalled();
    });
  });

  // ==================== publishCourse ====================
  describe('publishCourse', () => {
    it('should return 404 if course not found', async () => {
      Course.findById.mockResolvedValue(null);
      const req = mockRequest({ params: { courseId: new mongoose.Types.ObjectId().toString() } });
      const res = mockResponse();
      await courseController.publishCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if validation fails (no thumbnail)', async () => {
      const course = buildMockCourse({ thumbnail: null });
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({ params: { courseId: course._id.toString() } });
      const res = mockResponse();
      await courseController.publishCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should publish valid course and return 200', async () => {
      const course = buildMockCourse();
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({ params: { courseId: course._id.toString() } });
      const res = mockResponse();
      await courseController.publishCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(course.publish).toHaveBeenCalled();
    });
  });

  // ==================== archiveCourse ====================
  describe('archiveCourse', () => {
    it('should archive course and return 200', async () => {
      const course = buildMockCourse();
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: { reason: 'outdated' },
      });
      const res = mockResponse();
      await courseController.archiveCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(course.archive).toHaveBeenCalled();
    });
  });

  // ==================== restoreCourse ====================
  describe('restoreCourse', () => {
    it('should return 400 for invalid restoreToStatus', async () => {
      const req = mockRequest({
        params: { courseId: new mongoose.Types.ObjectId().toString() },
        body: { restoreToStatus: 'invalid' },
      });
      const res = mockResponse();
      await courseController.restoreCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should restore course and return 200', async () => {
      const course = buildMockCourse({ status: 'archived' });
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: { restoreToStatus: 'draft' },
      });
      const res = mockResponse();
      await courseController.restoreCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(course.restore).toHaveBeenCalledWith('draft');
    });
  });

  // ==================== unpublishCourse ====================
  describe('unpublishCourse', () => {
    it('should return 400 if course is not published', async () => {
      const course = buildMockCourse({ status: 'draft', save: jest.fn() });
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: {},
      });
      const res = mockResponse();
      await courseController.unpublishCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should unpublish and return 200', async () => {
      const course = buildMockCourse({ status: 'published', save: jest.fn().mockResolvedValue(true) });
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: {},
      });
      const res = mockResponse();
      await courseController.unpublishCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(course.status).toBe('draft');
    });
  });

  // ==================== duplicateCourse ====================
  describe('duplicateCourse', () => {
    it('should return 404 if course not found', async () => {
      Course.findById.mockResolvedValue(null);

      const req = mockRequest({
        params: { courseId: new mongoose.Types.ObjectId().toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await courseController.duplicateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should duplicate course and return 201', async () => {
      const origData = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Original',
        status: 'published',
        modules: [
          {
            _id: new mongoose.Types.ObjectId(),
            chapters: [
              {
                _id: new mongoose.Types.ObjectId(),
                contentItems: [{ _id: new mongoose.Types.ObjectId() }],
              },
            ],
          },
        ],
      };
      const origCourse = {
        ...origData,
        toObject: jest.fn().mockReturnValue({ ...origData }),
      };
      Course.findById.mockResolvedValue(origCourse);

      const saveMock = jest.fn().mockResolvedValue(true);
      Course.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId();
        this.save = saveMock;
      });

      const req = mockRequest({
        params: { courseId: origData._id.toString() },
        user: { _id: new mongoose.Types.ObjectId() },
      });
      const res = mockResponse();
      await courseController.duplicateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(saveMock).toHaveBeenCalled();
    });
  });

  // ==================== getModulesByCourseId ====================
  describe('getModulesByCourseId', () => {
    it('should return 400 for invalid courseId', async () => {
      const req = mockRequest({ params: { courseId: 'bad' } });
      const res = mockResponse();
      await courseController.getModulesByCourseId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return modules for valid course', async () => {
      const cid = new mongoose.Types.ObjectId().toString();
      Course.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ modules: [{ title: 'M1' }] }),
      });

      const req = mockRequest({ params: { courseId: cid } });
      const res = mockResponse();
      await courseController.getModulesByCourseId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // ==================== getChaptersByModuleId ====================
  describe('getChaptersByModuleId', () => {
    it('should return 400 for invalid moduleId', async () => {
      const req = mockRequest({ params: { moduleId: 'bad' } });
      const res = mockResponse();
      await courseController.getChaptersByModuleId(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if module not found', async () => {
      const mid = new mongoose.Types.ObjectId().toString();
      Course.findOne.mockResolvedValue(null);

      const req = mockRequest({ params: { moduleId: mid } });
      const res = mockResponse();
      await courseController.getChaptersByModuleId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ==================== validateCourseDetailed ====================
  describe('validateCourseDetailed', () => {
    it('should return validation checks for course', async () => {
      const course = buildMockCourse();
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({ params: { courseId: course._id.toString() } });
      const res = mockResponse();
      await courseController.validateCourseDetailed(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          checks: expect.any(Array),
          stats: expect.any(Object),
        })
      );
    });
  });

  // ==================== addContentItem ====================
  describe('addContentItem', () => {
    it('should return 400 if type or title missing', async () => {
      const req = mockRequest({
        params: { courseId: 'c', moduleId: 'm', chapterId: 'ch' },
        body: {},
      });
      const res = mockResponse();
      await courseController.addContentItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid content type', async () => {
      const req = mockRequest({
        params: { courseId: 'c', moduleId: 'm', chapterId: 'ch' },
        body: { type: 'invalid', title: 'T' },
      });
      const res = mockResponse();
      await courseController.addContentItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== reorderItems ====================
  describe('reorderItems', () => {
    it('should return 400 if level or orderedIds missing', async () => {
      const req = mockRequest({
        params: { courseId: new mongoose.Types.ObjectId().toString() },
        body: {},
      });
      const res = mockResponse();
      await courseController.reorderItems(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid level without parentId', async () => {
      const course = buildMockCourse();
      Course.findById.mockResolvedValue(course);

      const req = mockRequest({
        params: { courseId: course._id.toString() },
        body: { level: 'chapter', orderedIds: ['id1'] },
      });
      const res = mockResponse();
      await courseController.reorderItems(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
