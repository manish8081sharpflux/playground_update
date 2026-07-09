const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

// Mock the service layer
jest.mock("../../../services/wtf");
jest.mock("../../../services/coin");

const WtfService = require("../../../services/wtf");
const {
  createPin,
  getActivePins,
  getPinById,
  updatePin,
  deletePin,
  changePinStatus,
  likePin,
  markPinAsSeen,
  getPinInteractions,
  submitVoiceNote,
  submitArticle,
  getSubmissionsForReview,
  reviewSubmission,
  getWtfAnalytics,
  getInteractionAnalytics,
  getSubmissionAnalytics,
  getStudentSubmissions,
  getStudentInteractionHistory,
  getPinsByAuthor,
  getSubmissionStats,
  getWtfDashboardMetrics,
  getActivePinsCount,
  getWtfTotalEngagement,
  getCoachSuggestionsCount,
  getCoachSuggestions,
  createCoachSuggestion,
  awardCoinsForPin,
  awardMilestoneCoins,
  expireOldPins,
} = require("../../../controllers/wtfController");

let app;

beforeAll(async () => {
  // Create Express app for testing
  app = express();
  app.use(bodyParser.json());
});

// Note: DB connection is provided by tests/setup.js

beforeEach(async () => {
  jest.clearAllMocks();
});

describe("WTF Controller Tests", () => {
  describe("Pin Management Controllers", () => {
    test("should create pin successfully", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
        language: "english",
        tags: ["test"],
      };

      const mockCreatedPin = {
        _id: new mongoose.Types.ObjectId(),
        ...pinData,
        status: "active",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      WtfService.createPin.mockResolvedValue({
        success: true,
        data: mockCreatedPin,
        message: "Pin created successfully",
      });

      const req = {
        body: pinData,
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createPin(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedPin,
        message: "Pin created successfully",
      });
      expect(WtfService.createPin).toHaveBeenCalledWith(pinData);
    });

    test("should handle pin creation validation error", async () => {
      const invalidPinData = {
        // Missing required fields
      };

      WtfService.createPin.mockResolvedValue({
        success: false,
        data: null,
        message: "Title and content are required",
      });

      const req = {
        body: invalidPinData,
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createPin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: "Title and content are required",
      });
    });

    test("should get active pins successfully", async () => {
      const mockPins = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Pin 1",
          content: "Content 1",
          type: "text",
          author: new mongoose.Types.ObjectId(),
          status: "active",
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Pin 2",
          content: "Content 2",
          type: "text",
          author: new mongoose.Types.ObjectId(),
          status: "active",
        },
      ];

      WtfService.getActivePinsForStudents.mockResolvedValue({
        success: true,
        data: mockPins,
        pagination: { page: 1, limit: 20, total: 2 },
      });

      const req = {
        query: { page: "1", limit: "20" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/pins",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getActivePins(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPins,
        pagination: { page: 1, limit: 20, total: 2 },
      });
    });

    test("should get pin by ID successfully", async () => {
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
        status: "active",
      };

      WtfService.getPinById.mockResolvedValue({
        success: true,
        data: mockPin,
      });

      const req = {
        params: { pinId: pinId.toString() },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: `/api/v1/wtf/pins/${pinId}`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPinById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPin,
      });
    });

    test("should handle pin not found", async () => {
      const pinId = new mongoose.Types.ObjectId();

      WtfService.getPinById.mockResolvedValue({
        success: false,
        data: null,
        message: "Pin not found",
      });

      const req = {
        params: { pinId: pinId.toString() },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: `/api/v1/wtf/pins/${pinId}`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPinById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: "Pin not found",
      });
    });
  });

  describe("Interaction Controllers", () => {
    test("should like pin successfully", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const likeType = "thumbs_up";

      WtfService.likePin.mockResolvedValue({
        success: true,
        data: { action: "liked", likeType },
      });

      const req = {
        params: { pinId: pinId.toString() },
        body: { likeType },
        user: { id: studentId.toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: `/api/v1/wtf/pins/${pinId}/like`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await likePin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { action: "liked", likeType },
      });
      expect(WtfService.likePin).toHaveBeenCalledWith(
        studentId.toString(),
        pinId.toString(),
        likeType
      );
    });

    test("should mark pin as seen successfully", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const viewDuration = 30;

      WtfService.markPinAsSeen.mockResolvedValue({
        success: true,
        data: { action: "seen", viewDuration },
      });

      const req = {
        params: { pinId: pinId.toString() },
        body: { viewDuration },
        user: { id: studentId.toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: `/api/v1/wtf/pins/${pinId}/seen`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await markPinAsSeen(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { action: "seen", viewDuration },
      });
      expect(WtfService.markPinAsSeen).toHaveBeenCalledWith(
        studentId.toString(),
        pinId.toString(),
        viewDuration
      );
    });

    test("should get pin interactions successfully", async () => {
      const pinId = new mongoose.Types.ObjectId();
      const mockInteractions = [
        {
          _id: new mongoose.Types.ObjectId(),
          studentId: new mongoose.Types.ObjectId(),
          pinId,
          type: "like",
          likeType: "thumbs_up",
        },
        {
          _id: new mongoose.Types.ObjectId(),
          studentId: new mongoose.Types.ObjectId(),
          pinId,
          type: "seen",
        },
      ];

      WtfService.getPinInteractions.mockResolvedValue({
        success: true,
        data: mockInteractions,
      });

      const req = {
        params: { pinId: pinId.toString() },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: `/api/v1/wtf/pins/${pinId}/interactions`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPinInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockInteractions,
      });
    });
  });

  describe("Submission Controllers", () => {
    test("should submit voice note successfully", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const submissionData = {
        title: "Voice Note",
        audioUrl: "https://example.com/audio.mp3",
        audioDuration: 60,
        audioTranscription: "This is a test voice note",
        language: "english",
        tags: ["voice"],
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId(),
        studentId,
        type: "voice",
        ...submissionData,
        status: "pending",
      };

      WtfService.submitVoiceNote.mockResolvedValue({
        success: true,
        data: mockSubmission,
        message: "Voice note submitted successfully",
      });

      const req = {
        body: submissionData,
        user: { id: studentId.toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/submissions/voice",
        get: jest.fn().mockReturnValue("test-user-agent"),
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await submitVoiceNote(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubmission,
        message: "Voice note submitted successfully",
      });
      expect(WtfService.submitVoiceNote).toHaveBeenCalledWith(
        studentId.toString(),
        submissionData
      );
    });

    test("should submit article successfully", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const submissionData = {
        title: "Test Article",
        content: "This is a test article content",
        language: "english",
        tags: ["article"],
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId(),
        studentId,
        type: "article",
        ...submissionData,
        status: "pending",
      };

      WtfService.submitArticle.mockResolvedValue({
        success: true,
        data: mockSubmission,
        message: "Article submitted successfully",
      });

      const req = {
        body: submissionData,
        user: { id: studentId.toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/submissions/article",
        get: jest.fn().mockReturnValue("test-user-agent"),
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await submitArticle(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubmission,
        message: "Article submitted successfully",
      });
      expect(WtfService.submitArticle).toHaveBeenCalledWith(
        studentId.toString(),
        submissionData
      );
    });

    test("should get submissions for review successfully", async () => {
      const mockSubmissions = [
        {
          _id: new mongoose.Types.ObjectId(),
          studentId: new mongoose.Types.ObjectId(),
          type: "article",
          title: "Pending Article",
          content: "Test content",
          status: "pending",
        },
      ];

      WtfService.getSubmissionsForReview.mockResolvedValue({
        success: true,
        data: mockSubmissions,
        pagination: { page: 1, limit: 20, total: 1 },
      });

      const req = {
        query: { page: "1", limit: "20" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/submissions/review",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getSubmissionsForReview(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubmissions,
        pagination: { page: 1, limit: 20, total: 1 },
      });
    });

    test("should review submission successfully", async () => {
      const submissionId = new mongoose.Types.ObjectId();
      const reviewerId = new mongoose.Types.ObjectId();
      const action = "approve";
      const notes = "Great article!";

      const mockReviewedSubmission = {
        _id: submissionId,
        studentId: new mongoose.Types.ObjectId(),
        type: "article",
        title: "Test Article",
        content: "Test content",
        status: "approved",
        reviewNotes: notes,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      };

      WtfService.reviewSubmission.mockResolvedValue({
        success: true,
        data: mockReviewedSubmission,
        message: "Submission reviewed successfully",
      });

      const req = {
        params: { submissionId: submissionId.toString() },
        body: { action, notes },
        user: { id: reviewerId.toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "PUT",
        originalUrl: `/api/v1/wtf/submissions/${submissionId}/review`,
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await reviewSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReviewedSubmission,
        message: "Submission reviewed successfully",
      });
      expect(WtfService.reviewSubmission).toHaveBeenCalledWith(
        submissionId.toString(),
        reviewerId.toString(),
        action,
        notes
      );
    });
  });

  describe("Analytics Controllers", () => {
    test("should get WTF analytics successfully", async () => {
      const mockAnalytics = {
        totalPins: 100,
        activePins: 80,
        totalInteractions: 500,
        totalSubmissions: 50,
        pendingSubmissions: 10,
        approvedSubmissions: 35,
        rejectedSubmissions: 5,
      };

      WtfService.getWtfAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics,
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/analytics",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getWtfAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    test("should get interaction analytics successfully", async () => {
      const mockInteractionAnalytics = {
        totalInteractions: 500,
        likes: 300,
        seen: 200,
        topPerformingPins: [],
      };

      WtfService.getInteractionAnalytics.mockResolvedValue({
        success: true,
        data: mockInteractionAnalytics,
      });

      const req = {
        query: { days: "7" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/analytics/interactions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getInteractionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockInteractionAnalytics,
      });
    });

    test("should get submission analytics successfully", async () => {
      const mockSubmissionAnalytics = {
        totalSubmissions: 50,
        pendingSubmissions: 10,
        approvedSubmissions: 35,
        rejectedSubmissions: 5,
        submissionsByType: {
          article: 30,
          voice: 20,
        },
      };

      WtfService.getSubmissionAnalytics.mockResolvedValue({
        success: true,
        data: mockSubmissionAnalytics,
      });

      const req = {
        query: { days: "30" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/analytics/submissions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getSubmissionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubmissionAnalytics,
      });
    });
  });

  describe("Dashboard Metrics Controllers", () => {
    test("should get WTF dashboard metrics", async () => {
      const mockDashboardMetrics = {
        activePins: 25,
        coachSuggestions: 8,
        studentSubmissions: 12,
        totalEngagement: 1500,
        pendingSuggestions: 8,
        newSubmissions: 12,
        reviewQueueCount: 8,
      };

      WtfService.getWtfDashboardMetrics.mockResolvedValue({
        success: true,
        data: mockDashboardMetrics,
        message: "Dashboard metrics fetched successfully",
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/dashboard/metrics",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getWtfDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDashboardMetrics,
        message: "Dashboard metrics fetched successfully",
      });
    });

    test("should get active pins count", async () => {
      WtfService.getActivePinsCount.mockResolvedValue({
        success: true,
        data: 15,
        message: "Active pins count fetched successfully",
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/pins/active/count",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getActivePinsCount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: 15,
        message: "Active pins count fetched successfully",
      });
    });

    test("should get total engagement", async () => {
      WtfService.getWtfTotalEngagement.mockResolvedValue({
        success: true,
        data: { totalViews: 2000 },
        message: "Total engagement fetched successfully",
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/analytics/engagement",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getWtfTotalEngagement(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { totalViews: 2000 },
        message: "Total engagement fetched successfully",
      });
    });

    test("should get coach suggestions count", async () => {
      WtfService.getCoachSuggestionsCount.mockResolvedValue({
        success: true,
        data: { pendingCount: 10 },
        message: "Coach suggestions count fetched successfully",
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/coach-suggestions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCoachSuggestionsCount(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { pendingCount: 10 },
        message: "Coach suggestions count fetched successfully",
      });
    });

    test("should handle dashboard metrics service errors", async () => {
      WtfService.getWtfDashboardMetrics.mockRejectedValue(
        new Error("Service error")
      );

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/dashboard/metrics",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getWtfDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service error",
      });
    });

    test("should handle dashboard metrics service failures", async () => {
      WtfService.getWtfDashboardMetrics.mockResolvedValue({
        success: false,
        data: null,
        message: "Failed to fetch metrics",
      });

      const req = {
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/dashboard/metrics",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getWtfDashboardMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: "Failed to fetch metrics",
      });
    });

    test("should get coach suggestions", async () => {
      const mockCoachSuggestions = [
        {
          id: new mongoose.Types.ObjectId().toString(),
          studentName: "Arjun Sharma",
          coachName: "Ms. Priya",
          workType: "Voice Note",
          title: "Beautiful Nature Painting",
          content:
            "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=500",
          suggestedDate: new Date(),
          status: "PENDING",
          balagruha: "Wisdom House",
        },
      ];

      WtfService.getCoachSuggestions.mockResolvedValue({
        success: true,
        data: mockCoachSuggestions,
        pagination: { total: 1, page: 1, limit: 20 },
        message: "Coach suggestions fetched successfully",
      });

      const req = {
        query: { page: "1", limit: "20" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/coach-suggestions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCoachSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCoachSuggestions,
        pagination: { total: 1, page: 1, limit: 20 },
        message: "Coach suggestions fetched successfully",
      });
    });

    test("should handle coach suggestions service errors", async () => {
      WtfService.getCoachSuggestions.mockRejectedValue(
        new Error("Service error")
      );

      const req = {
        query: { page: "1", limit: "20" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/coach-suggestions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCoachSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service error",
      });
    });

    test("should handle coach suggestions service failures", async () => {
      WtfService.getCoachSuggestions.mockResolvedValue({
        success: false,
        data: null,
        message: "Failed to fetch coach suggestions",
      });

      const req = {
        query: { page: "1", limit: "20" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/coach-suggestions",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCoachSuggestions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: "Failed to fetch coach suggestions",
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle service errors gracefully", async () => {
      WtfService.createPin.mockRejectedValue(
        new Error("Database connection failed")
      );

      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const req = {
        body: pinData,
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createPin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Database connection failed",
      });
    });

    test("should handle missing user authentication", async () => {
      // Mock the service to return an error response
      WtfService.createPin.mockResolvedValue({
        success: false,
        data: null,
        message: "Missing required fields: title, content, type, author",
      });

      const req = {
        body: {
          title: "Test Pin",
          content: "Test content",
          type: "text",
          // Missing author field
        },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createPin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: "Missing required fields: title, content, type, author",
      });
    });

    test("should handle invalid request parameters", async () => {
      const req = {
        params: { pinId: "invalid-id" },
        user: { id: new mongoose.Types.ObjectId().toString() },
        socket: { remoteAddress: "127.0.0.1" },
        method: "GET",
        originalUrl: "/api/v1/wtf/pins/invalid-id",
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPinById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid pin ID format",
      });
    });
  });
});

// ==================== COACH SUGGESTION CONTROLLER TESTS ====================

describe("Coach Suggestion Controllers", () => {
  describe("createCoachSuggestion", () => {
    let req, res;

    beforeEach(() => {
      req = {
        body: {
          title: "Amazing Student Art",
          content: "Student created beautiful artwork",
          type: "image",
          studentName: "John Doe",
          balagruha: "Red House",
          reason: "Outstanding creativity",
        },
        user: {
          id: new mongoose.Types.ObjectId(),
          name: "Coach Smith",
          email: "coach@example.com",
        },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/coach-suggestions",
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      jest.clearAllMocks();
    });

    test("should create coach suggestion successfully", async () => {
      const mockResult = {
        success: true,
        data: {
          id: new mongoose.Types.ObjectId(),
          title: "Amazing Student Art",
          studentName: "John Doe",
          suggestedBy: "Coach Smith",
          status: "PENDING",
          createdAt: new Date(),
        },
        message: "Coach suggestion created successfully",
      };

      WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

      await createCoachSuggestion(req, res);

      expect(WtfService.createCoachSuggestion).toHaveBeenCalledWith({
        ...req.body,
        coachId: req.user.id,
        suggestedBy: req.user.name,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle service failure", async () => {
      const mockResult = {
        success: false,
        message: "Missing required fields",
      };

      WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

      await createCoachSuggestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle service exceptions", async () => {
      const error = new Error("Database error");
      WtfService.createCoachSuggestion.mockRejectedValue(error);

      await createCoachSuggestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Database error",
      });
    });

    test("should use email as fallback for suggestedBy", async () => {
      req.user.name = undefined;

      const mockResult = {
        success: true,
        data: {
          id: new mongoose.Types.ObjectId(),
          title: "Amazing Student Art",
          studentName: "John Doe",
          suggestedBy: "coach@example.com",
          status: "PENDING",
          createdAt: new Date(),
        },
        message: "Coach suggestion created successfully",
      };

      WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

      await createCoachSuggestion(req, res);

      expect(WtfService.createCoachSuggestion).toHaveBeenCalledWith({
        ...req.body,
        coachId: req.user.id,
        suggestedBy: req.user.email,
      });
    });

    test("should use default Coach if no name or email", async () => {
      req.user.name = undefined;
      req.user.email = undefined;

      const mockResult = {
        success: true,
        data: {
          id: new mongoose.Types.ObjectId(),
          title: "Amazing Student Art",
          studentName: "John Doe",
          suggestedBy: "Coach",
          status: "PENDING",
          createdAt: new Date(),
        },
        message: "Coach suggestion created successfully",
      };

      WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

      await createCoachSuggestion(req, res);

      expect(WtfService.createCoachSuggestion).toHaveBeenCalledWith({
        ...req.body,
        coachId: req.user.id,
        suggestedBy: "Coach",
      });
    });

    test("should handle missing user information", async () => {
      req.user = undefined;

      const mockResult = {
        success: true,
        data: {
          id: new mongoose.Types.ObjectId(),
          title: "Amazing Student Art",
          studentName: "John Doe",
          suggestedBy: "Coach",
          status: "PENDING",
          createdAt: new Date(),
        },
        message: "Coach suggestion created successfully",
      };

      WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

      await createCoachSuggestion(req, res);

      expect(WtfService.createCoachSuggestion).toHaveBeenCalledWith({
        ...req.body,
        coachId: undefined,
        suggestedBy: "Coach",
      });
    });
  });
});
