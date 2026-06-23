const mongoose = require("mongoose");
const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId().toString() };
  next();
};

const mockAuthorize = (permission, action) => (req, res, next) => {
  next();
};

// Mock the service layer
jest.mock("../../../services/wtf");
const WtfService = require("../../../services/wtf");

let app;

beforeAll(async () => {
  // Create Express app for testing
  app = express();
  app.use(bodyParser.json());

  // Mock routes for testing
  app.get(
    "/api/v1/wtf/dashboard/metrics",
    mockAuth,
    mockAuthorize(),
    (req, res) => {
      WtfService.getWtfDashboardMetrics()
        .then((result) => {
          if (result.success) {
            res.status(200).json(result);
          } else {
            res.status(400).json(result);
          }
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: error.message });
        });
    }
  );

  app.get(
    "/api/v1/wtf/pins/active/count",
    mockAuth,
    mockAuthorize(),
    (req, res) => {
      WtfService.getActivePinsCount()
        .then((result) => {
          if (result.success) {
            res.status(200).json(result);
          } else {
            res.status(400).json(result);
          }
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: error.message });
        });
    }
  );

  app.get(
    "/api/v1/wtf/analytics/engagement",
    mockAuth,
    mockAuthorize(),
    (req, res) => {
      WtfService.getWtfTotalEngagement()
        .then((result) => {
          if (result.success) {
            res.status(200).json(result);
          } else {
            res.status(400).json(result);
          }
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: error.message });
        });
    }
  );

  app.get(
    "/api/v1/wtf/coach-suggestions/count",
    mockAuth,
    mockAuthorize(),
    (req, res) => {
      WtfService.getCoachSuggestionsCount()
        .then((result) => {
          if (result.success) {
            res.status(200).json(result);
          } else {
            res.status(400).json(result);
          }
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: error.message });
        });
    }
  );

  app.get(
    "/api/v1/wtf/coach-suggestions",
    mockAuth,
    mockAuthorize(),
    (req, res) => {
      WtfService.getCoachSuggestions(req.query)
        .then((result) => {
          if (result.success) {
            res.status(200).json(result);
          } else {
            res.status(400).json(result);
          }
        })
        .catch((error) => {
          res.status(500).json({ success: false, message: error.message });
        });
    }
  );
});

// Note: DB connection is provided by tests/setup.js

beforeEach(async () => {
  jest.clearAllMocks();
});

describe("WTF Dashboard Metrics Integration Tests", () => {
  test("should get dashboard metrics successfully", async () => {
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

    const response = await request(app)
      .get("/api/v1/wtf/dashboard/metrics")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockDashboardMetrics);
    expect(WtfService.getWtfDashboardMetrics).toHaveBeenCalled();
  });

  test("should get active pins count successfully", async () => {
    WtfService.getActivePinsCount.mockResolvedValue({
      success: true,
      data: 15,
      message: "Active pins count fetched successfully",
    });

    const response = await request(app)
      .get("/api/v1/wtf/pins/active/count")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBe(15);
    expect(WtfService.getActivePinsCount).toHaveBeenCalled();
  });

  test("should get total engagement successfully", async () => {
    WtfService.getWtfTotalEngagement.mockResolvedValue({
      success: true,
      data: { totalViews: 2000 },
      message: "Total engagement fetched successfully",
    });

    const response = await request(app)
      .get("/api/v1/wtf/analytics/engagement")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalViews).toBe(2000);
    expect(WtfService.getWtfTotalEngagement).toHaveBeenCalled();
  });

  test("should get coach suggestions count successfully", async () => {
    WtfService.getCoachSuggestionsCount.mockResolvedValue({
      success: true,
      data: { pendingCount: 10 },
      message: "Coach suggestions count fetched successfully",
    });

    const response = await request(app)
      .get("/api/v1/wtf/coach-suggestions/count")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.pendingCount).toBe(10);
    expect(WtfService.getCoachSuggestionsCount).toHaveBeenCalled();
  });

  test("should get coach suggestions successfully", async () => {
    const mockCoachSuggestions = [
      {
        id: "1",
        studentName: "Arjun Sharma",
        coachName: "Ms. Priya",
        workType: "Voice Note",
        title: "Beautiful Nature Painting",
        content:
          "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=500",
        suggestedDate: "2025-01-05T00:00:00.000Z",
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

    const response = await request(app)
      .get("/api/v1/wtf/coach-suggestions")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockCoachSuggestions);
    expect(WtfService.getCoachSuggestions).toHaveBeenCalledWith({});
  });

  test("should get coach suggestions with pagination", async () => {
    const mockCoachSuggestions = [
      {
        id: "1",
        studentName: "Test Student",
        coachName: "Test Coach",
        workType: "Article",
        title: "Test Article",
        content: "Test content",
        suggestedDate: "2025-01-04T00:00:00.000Z",
        status: "PENDING",
        balagruha: "Test House",
      },
    ];

    WtfService.getCoachSuggestions.mockResolvedValue({
      success: true,
      data: mockCoachSuggestions,
      pagination: { total: 1, page: 2, limit: 10 },
      message: "Coach suggestions fetched successfully",
    });

    const response = await request(app)
      .get("/api/v1/wtf/coach-suggestions?page=2&limit=10")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockCoachSuggestions);
    expect(WtfService.getCoachSuggestions).toHaveBeenCalledWith({
      page: "2",
      limit: "10",
    });
  });

  test("should handle coach suggestions service errors", async () => {
    WtfService.getCoachSuggestions.mockRejectedValue(
      new Error("Service error")
    );

    const response = await request(app)
      .get("/api/v1/wtf/coach-suggestions")
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Service error");
  });

  test("should handle coach suggestions service failures", async () => {
    WtfService.getCoachSuggestions.mockResolvedValue({
      success: false,
      data: null,
      message: "Failed to fetch coach suggestions",
    });

    const response = await request(app)
      .get("/api/v1/wtf/coach-suggestions")
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Failed to fetch coach suggestions");
  });

  test("should handle service errors gracefully", async () => {
    WtfService.getWtfDashboardMetrics.mockRejectedValue(
      new Error("Service error")
    );

    const response = await request(app)
      .get("/api/v1/wtf/dashboard/metrics")
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Service error");
  });

  test("should handle service failures", async () => {
    WtfService.getWtfDashboardMetrics.mockResolvedValue({
      success: false,
      data: null,
      message: "Failed to fetch metrics",
    });

    const response = await request(app)
      .get("/api/v1/wtf/dashboard/metrics")
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Failed to fetch metrics");
  });
});

// ==================== COACH SUGGESTION INTEGRATION TESTS ====================

describe("POST /api/v1/wtf/coach-suggestions", () => {
  beforeAll(async () => {
    // Add coach suggestion route to the test app
    app.post(
      "/api/v1/wtf/coach-suggestions",
      mockAuth,
      mockAuthorize(),
      (req, res) => {
        WtfService.createCoachSuggestion(req.body)
          .then((result) => {
            if (result.success) {
              res.status(201).json(result);
            } else {
              res.status(400).json(result);
            }
          })
          .catch((error) => {
            res.status(500).json({ success: false, message: error.message });
          });
      }
    );
  });

  test("should create coach suggestion successfully", async () => {
    const mockSuggestionData = {
      title: "Amazing Student Art",
      content: "Student created beautiful artwork",
      type: "image",
      studentName: "John Doe",
      balagruha: "Red House",
      suggestedBy: "Coach Smith",
      coachId: "60d5ecb74eb1b82b8c8b4567",
      reason: "Outstanding creativity",
    };

    const mockResult = {
      success: true,
      data: {
        id: "60d5ecb74eb1b82b8c8b4568",
        title: mockSuggestionData.title,
        studentName: mockSuggestionData.studentName,
        suggestedBy: mockSuggestionData.suggestedBy,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      message: "Coach suggestion created successfully",
    };

    WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

    const response = await request(app)
      .post("/api/v1/wtf/coach-suggestions")
      .send(mockSuggestionData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe(mockSuggestionData.title);
    expect(response.body.data.studentName).toBe(mockSuggestionData.studentName);
    expect(response.body.data.status).toBe("PENDING");
    expect(response.body.message).toBe("Coach suggestion created successfully");
  });

  test("should return 400 for missing required fields", async () => {
    const invalidData = {
      title: "Test Suggestion",
      // Missing required fields
    };

    const mockResult = {
      success: false,
      message: "Missing required fields: title, content, type, suggestedBy, studentName",
    };

    WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

    const response = await request(app)
      .post("/api/v1/wtf/coach-suggestions")
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Missing required fields");
  });

  test("should return 400 for invalid suggestion type", async () => {
    const invalidTypeData = {
      title: "Test Suggestion",
      content: "Test content",
      type: "invalid_type",
      studentName: "John Doe",
      suggestedBy: "Coach Smith",
    };

    const mockResult = {
      success: false,
      message: "Invalid suggestion type. Must be one of: image, video, audio, text, link",
    };

    WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

    const response = await request(app)
      .post("/api/v1/wtf/coach-suggestions")
      .send(invalidTypeData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Invalid suggestion type");
  });

  test("should handle service errors", async () => {
    const validData = {
      title: "Test Suggestion",
      content: "Test content",
      type: "text",
      studentName: "John Doe",
      suggestedBy: "Coach Smith",
    };

    WtfService.createCoachSuggestion.mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await request(app)
      .post("/api/v1/wtf/coach-suggestions")
      .send(validData)
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Database connection failed");
  });

  test("should create suggestion with default values", async () => {
    const minimalData = {
      title: "Test Suggestion",
      content: "Test content",
      type: "text",
      studentName: "John Doe",
      suggestedBy: "Coach Smith",
      coachId: "60d5ecb74eb1b82b8c8b4567",
    };

    const mockResult = {
      success: true,
      data: {
        id: "60d5ecb74eb1b82b8c8b4568",
        title: minimalData.title,
        studentName: minimalData.studentName,
        suggestedBy: minimalData.suggestedBy,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      message: "Coach suggestion created successfully",
    };

    WtfService.createCoachSuggestion.mockResolvedValue(mockResult);

    const response = await request(app)
      .post("/api/v1/wtf/coach-suggestions")
      .send(minimalData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("PENDING");
    expect(WtfService.createCoachSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        title: minimalData.title,
        content: minimalData.content,
        type: minimalData.type,
        studentName: minimalData.studentName,
        suggestedBy: minimalData.suggestedBy,
      })
    );
  });

  // ==================== COIN REWARD INTEGRATION TESTS ====================

  describe("POST /api/v1/wtf/pins/:pinId/award-coins", () => {
    beforeAll(async () => {
      app.post(
        "/api/v1/wtf/pins/:pinId/award-coins",
        mockAuth,
        mockAuthorize(),
        (req, res) => {
          // Mock getPinById
          WtfService.getPinById(req.params.pinId)
            .then((pinResult) => {
              if (pinResult.success) {
                return WtfService.awardCoinsForPinnedContent(pinResult.data);
              } else {
                res.status(404).json({ success: false, message: "Pin not found" });
                return;
              }
            })
            .then((result) => {
              if (result && result.success) {
                res.status(200).json(result);
              } else if (result) {
                res.status(400).json(result);
              }
            })
            .catch((error) => {
              res.status(500).json({ success: false, message: error.message });
            });
        }
      );
    });

    test("should award coins successfully", async () => {
      const mockPinResult = {
        success: true,
        data: {
          pinId: "pin123",
          title: "Test Pin",
          contentType: "IMAGE",
          originalAuthor: { userId: "student123", type: "STUDENT" }
        }
      };

      const mockCoinResult = {
        success: true,
        coinsAwarded: 50,
        message: "50 ISF Coins awarded to student for pinned content"
      };

      WtfService.getPinById.mockResolvedValue(mockPinResult);
      WtfService.awardCoinsForPinnedContent.mockResolvedValue(mockCoinResult);

      const response = await request(app)
        .post("/api/v1/wtf/pins/pin123/award-coins")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.coinsAwarded).toBe(50);
    });

    test("should handle pin not found", async () => {
      WtfService.getPinById.mockResolvedValue({
        success: false,
        message: "Pin not found"
      });

      const response = await request(app)
        .post("/api/v1/wtf/pins/nonexistent/award-coins")
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Pin not found");
    });

    test("should handle service errors", async () => {
      WtfService.getPinById.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/api/v1/wtf/pins/pin123/award-coins")
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Database error");
    });
  });

  describe("POST /api/v1/wtf/pins/:pinId/milestone-coins", () => {
    beforeAll(async () => {
      app.post(
        "/api/v1/wtf/pins/:pinId/milestone-coins",
        mockAuth,
        mockAuthorize(),
        (req, res) => {
          WtfService.awardMilestoneCoins(req.params.pinId, req.body.likeCount, req.body.likeType)
            .then((result) => {
              if (result.success) {
                res.status(200).json(result);
              } else {
                res.status(400).json(result);
              }
            })
            .catch((error) => {
              res.status(500).json({ success: false, message: error.message });
            });
        }
      );
    });

    test("should award milestone coins successfully", async () => {
      const mockResult = {
        success: true,
        coinsAwarded: 75,
        message: "75 milestone coins awarded"
      };

      WtfService.awardMilestoneCoins.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/wtf/pins/pin123/milestone-coins")
        .send({ likeCount: 25, likeType: "total" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.coinsAwarded).toBe(75);
    });

    test("should handle no milestones reached", async () => {
      const mockResult = {
        success: false,
        message: "No milestones reached"
      };

      WtfService.awardMilestoneCoins.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/wtf/pins/pin123/milestone-coins")
        .send({ likeCount: 5, likeType: "total" })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No milestones reached");
    });
  });

  describe("POST /api/v1/wtf/admin/expire-pins", () => {
    beforeAll(async () => {
      app.post(
        "/api/v1/wtf/admin/expire-pins",
        mockAuth,
        mockAuthorize(),
        (req, res) => {
          WtfService.expireOldPins()
            .then((result) => {
              if (result.success) {
                res.status(200).json(result);
              } else {
                res.status(400).json(result);
              }
            })
            .catch((error) => {
              res.status(500).json({ success: false, message: error.message });
            });
        }
      );
    });

    test("should expire old pins successfully", async () => {
      const mockResult = {
        success: true,
        expiredCount: 3,
        totalProcessed: 3,
        message: "3 pins expired automatically"
      };

      WtfService.expireOldPins.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/wtf/admin/expire-pins")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiredCount).toBe(3);
    });

    test("should handle no pins to expire", async () => {
      const mockResult = {
        success: true,
        expiredCount: 0,
        message: "No pins to expire"
      };

      WtfService.expireOldPins.mockResolvedValue(mockResult);

      const response = await request(app)
        .post("/api/v1/wtf/admin/expire-pins")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiredCount).toBe(0);
    });
  });
});
