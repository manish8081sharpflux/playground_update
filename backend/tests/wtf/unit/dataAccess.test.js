const mongoose = require("mongoose");
const {
  createWtfPin,
  getActivePins,
  getWtfPinById,
  updateWtfPin,
  deleteWtfPin,
  updatePinStatus,
  getPinsByAuthor,
  getExpiredPins,
  getPinsForFifoManagement,
  updateEngagementMetrics,
  getPinAnalytics,
  getWtfAnalytics,
  bulkUpdatePinStatus,
} = require("../../../data-access/wtfPin");

const {
  createInteraction,
  getInteractionById,
  getStudentPinInteractions,
  hasStudentInteracted,
  getPinInteractionCounts,
  getStudentInteractionHistory,
  getRecentInteractions,
  deleteInteraction,
  updateInteraction,
  getInteractionAnalytics,
  bulkCreateInteractions,
  getTopPerformingPins,
} = require("../../../data-access/wtfStudentInteraction");

const {
  createWtfSubmission,
  getWtfSubmissionById,
  getPendingSubmissions,
  getStudentSubmissions,
  updateWtfSubmission,
  deleteWtfSubmission,
  approveSubmission,
  rejectSubmission,
  archiveSubmission,
  getSubmissionsByType,
  getSubmissionStats,
  getRecentSubmissions,
  getSubmissionAnalytics,
  bulkUpdateSubmissionStatus,
  getSubmissionsNeedingReview,
} = require("../../../data-access/wtfSubmission");

// Note: DB connection is provided by tests/setup.js

beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe("WTF Pin Data Access Tests", () => {
  describe("CRUD Operations", () => {
    test("should create a new pin", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
        language: "english",
        tags: ["test"],
      };

      const result = await createWtfPin(pinData);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Test Pin");
      expect(result.data.status).toBe("active");
    });

    test("should get active pins with pagination", async () => {
      const authorId = new mongoose.Types.ObjectId();

      // Create multiple pins
      for (let i = 0; i < 5; i++) {
        await createWtfPin({
          title: `Pin ${i}`,
          content: `Content ${i}`,
          type: "text",
          author: authorId,
          language: "english",
        });
      }

      const result = await getActivePins({ page: 1, limit: 3 });
      expect(result.success).toBe(true);
      expect(result.data.pins.length).toBe(3);
      expect(result.data.pagination).toBeDefined();
    });

    test("should get pin by ID", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const createdPin = await createWtfPin(pinData);
      const result = await getWtfPinById(createdPin.data._id);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Test Pin");
    });

    test("should update pin", async () => {
      const pinData = {
        title: "Original Title",
        content: "Original content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const createdPin = await createWtfPin(pinData);
      const updateData = { title: "Updated Title" };
      const result = await updateWtfPin(createdPin.data._id, updateData);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Updated Title");
    });

    test("should delete pin", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const createdPin = await createWtfPin(pinData);
      const result = await deleteWtfPin(createdPin.data._id);

      expect(result.success).toBe(true);

      // Verify pin is deleted
      const getResult = await getWtfPinById(createdPin.data._id);
      expect(getResult.success).toBe(false);
    });
  });

  describe("Lifecycle Management", () => {
    test("should update pin status", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const createdPin = await createWtfPin(pinData);
      const result = await updatePinStatus(createdPin.data._id, "unpinned");

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("unpinned");
    });

    test("should get expired pins", async () => {
      const authorId = new mongoose.Types.ObjectId();

      // Create expired pin
      await createWtfPin({
        title: "Expired Pin",
        content: "Test content",
        type: "text",
        author: authorId,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      const result = await getExpiredPins();
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe("Expired Pin");
    });

    test("should get pins for FIFO management", async () => {
      const authorId = new mongoose.Types.ObjectId();

      // Create more than 20 active pins
      for (let i = 0; i < 25; i++) {
        await createWtfPin({
          title: `Pin ${i}`,
          content: `Content ${i}`,
          type: "text",
          author: authorId,
        });
      }

      const result = await getPinsForFifoManagement();
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(5); // Should return pins beyond the 20 limit
    });
  });

  describe("Analytics", () => {
    test("should update engagement metrics", async () => {
      const pinData = {
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: new mongoose.Types.ObjectId(),
      };

      const createdPin = await createWtfPin(pinData);
      const metrics = { likes: 10, seen: 50, shares: 5 };
      const result = await updateEngagementMetrics(
        createdPin.data._id,
        metrics
      );

      expect(result.success).toBe(true);

      const updatedPin = await getWtfPinById(createdPin.data._id);
      expect(updatedPin.data.engagementMetrics.likes).toBe(10);
      expect(updatedPin.data.engagementMetrics.seen).toBe(50);
      expect(updatedPin.data.engagementMetrics.shares).toBe(5);
    });

    test("should get pin analytics", async () => {
      const authorId = new mongoose.Types.ObjectId();

      // Create multiple pins
      for (let i = 0; i < 3; i++) {
        await createWtfPin({
          title: `Pin ${i}`,
          content: `Content ${i}`,
          type: "text",
          author: authorId,
        });
      }

      const result = await getPinsByAuthor(authorId, { page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data.pins.length).toBe(3);
    });
  });
});

describe("WTF Student Interaction Data Access Tests", () => {
  describe("Interaction Management", () => {
    test("should create interaction", async () => {
      const interactionData = {
        studentId: new mongoose.Types.ObjectId(),
        pinId: new mongoose.Types.ObjectId(),
        type: "like",
        likeType: "thumbs_up",
      };

      const result = await createInteraction(interactionData);
      expect(result.success).toBe(true);
      expect(result.data.type).toBe("like");
      expect(result.data.likeType).toBe("thumbs_up");
    });

    test("should check if student has interacted", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();

      const interactionData = {
        studentId,
        pinId,
        type: "like",
        likeType: "thumbs_up",
      };

      await createInteraction(interactionData);
      const result = await hasStudentInteracted(studentId, pinId, "like");

      expect(result.success).toBe(true);
      expect(result.data.hasInteracted).toBe(true);
    });

    test("should get interaction counts", async () => {
      const pinId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      // Create multiple interactions
      await createInteraction({
        studentId,
        pinId,
        type: "like",
        likeType: "thumbs_up",
      });

      await createInteraction({
        studentId: new mongoose.Types.ObjectId(),
        pinId,
        type: "like",
        likeType: "green_heart",
      });

      await createInteraction({
        studentId: new mongoose.Types.ObjectId(),
        pinId,
        type: "seen",
        viewDuration: 30,
      });

      const result = await getPinInteractionCounts(pinId);
      expect(result.success).toBe(true);
      expect(result.data.likes).toBe(2);
      expect(result.data.seen).toBe(1);
    });

    test("should get student interaction history", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();

      // Create multiple interactions
      await createInteraction({
        studentId,
        pinId,
        type: "like",
        likeType: "thumbs_up",
      });

      await createInteraction({
        studentId,
        pinId,
        type: "seen",
        viewDuration: 30,
      });

      const result = await getStudentInteractionHistory(studentId, {
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data.interactions.length).toBe(2);
    });
  });

  describe("Analytics", () => {
    test("should get interaction analytics", async () => {
      const pinId = new mongoose.Types.ObjectId();

      // Create interactions
      for (let i = 0; i < 5; i++) {
        await createInteraction({
          studentId: new mongoose.Types.ObjectId(),
          pinId,
          type: "like",
          likeType: "thumbs_up",
        });
      }

      const result = await getInteractionAnalytics({ days: 7 });
      expect(result.success).toBe(true);
      expect(result.data.totalInteractions).toBe(5);
    });

    test("should get top performing pins", async () => {
      const authorId = new mongoose.Types.ObjectId();

      // Create the pin first
      const createdPin = await createWtfPin({
        title: "Test Pin",
        content: "Test content",
        type: "text",
        author: authorId,
      });

      const pinId = createdPin.data._id;

      // Create multiple interactions for the same pin
      for (let i = 0; i < 10; i++) {
        await createInteraction({
          studentId: new mongoose.Types.ObjectId(),
          pinId,
          type: "like",
          likeType: "thumbs_up",
        });
      }

      const result = await getTopPerformingPins({ limit: 5, days: 30 });
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});

describe("WTF Submission Data Access Tests", () => {
  describe("Submission Management", () => {
    test("should create submission", async () => {
      const submissionData = {
        studentId: new mongoose.Types.ObjectId(),
        type: "article",
        title: "Test Article",
        content: "Test article content",
        language: "english",
        tags: ["test"],
      };

      const result = await createWtfSubmission(submissionData);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe("Test Article");
      expect(result.data.status).toBe("pending");
    });

    test("should get pending submissions", async () => {
      const studentId = new mongoose.Types.ObjectId();

      // Create submissions
      await createWtfSubmission({
        studentId,
        type: "article",
        title: "Pending Article",
        content: "Test content",
      });

      await createWtfSubmission({
        studentId,
        type: "article",
        title: "Approved Article",
        content: "Test content",
        status: "approved",
      });

      const result = await getPendingSubmissions({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data.submissions.length).toBe(1);
      expect(result.data.submissions[0].title).toBe("Pending Article");
    });

    test("should approve submission", async () => {
      const submissionData = {
        studentId: new mongoose.Types.ObjectId(),
        type: "article",
        title: "Test Article",
        content: "Test content",
      };

      const createdSubmission = await createWtfSubmission(submissionData);
      const reviewerId = new mongoose.Types.ObjectId();
      const result = await approveSubmission(
        createdSubmission.data._id,
        reviewerId,
        "Great article!"
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("approved");
      expect(result.data.reviewNotes).toBe("Great article!");
    });

    test("should reject submission", async () => {
      const submissionData = {
        studentId: new mongoose.Types.ObjectId(),
        type: "article",
        title: "Test Article",
        content: "Test content",
      };

      const createdSubmission = await createWtfSubmission(submissionData);
      const reviewerId = new mongoose.Types.ObjectId();
      const result = await rejectSubmission(
        createdSubmission.data._id,
        reviewerId,
        "Needs improvement"
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe("rejected");
      expect(result.data.reviewNotes).toBe("Needs improvement");
    });
  });

  describe("Analytics", () => {
    test("should get submission stats", async () => {
      const studentId = new mongoose.Types.ObjectId();

      // Create submissions with different statuses
      await createWtfSubmission({
        studentId,
        type: "article",
        title: "Pending Article",
        content: "Test content",
      });

      await createWtfSubmission({
        studentId,
        type: "article",
        title: "Approved Article",
        content: "Test content",
        status: "approved",
      });

      await createWtfSubmission({
        studentId,
        type: "article",
        title: "Rejected Article",
        content: "Test content",
        status: "rejected",
      });

      const result = await getSubmissionStats();
      expect(result.success).toBe(true);
      expect(result.data.totalSubmissions).toBe(3);
      expect(result.data.pendingCount).toBe(1);
      expect(result.data.approvedCount).toBe(1);
      expect(result.data.rejectedCount).toBe(1);
    });

    test("should get submission analytics", async () => {
      const studentId = new mongoose.Types.ObjectId();

      // Create multiple submissions
      for (let i = 0; i < 5; i++) {
        await createWtfSubmission({
          studentId,
          type: "article",
          title: `Article ${i}`,
          content: `Content ${i}`,
        });
      }

      const result = await getSubmissionAnalytics({ days: 30 });
      expect(result.success).toBe(true);
      expect(result.data.totalSubmissions).toBe(5);
    });
  });
});
