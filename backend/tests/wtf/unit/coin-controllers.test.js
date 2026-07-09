
// Mock the service layer
jest.mock("../../../services/wtf");
jest.mock("../../../services/coin");

const WtfService = require("../../../services/wtf");
const {
  awardCoinsForPin,
  awardMilestoneCoins,
  expireOldPins,
} = require("../../../controllers/wtfController");

// Note: DB connection is provided by tests/setup.js (this suite doesn't require DB)

beforeEach(async () => {
  jest.clearAllMocks();
});

describe("Coin Reward Controllers", () => {
  describe("awardCoinsForPin", () => {
    let req, res;

    beforeEach(() => {
      req = {
        params: { pinId: "pin_123" },
        user: { id: "admin_123", name: "Admin User" },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins/pin_123/award-coins"
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      jest.clearAllMocks();
    });

    test("should award coins for pin successfully", async () => {
      const mockPinResult = {
        success: true,
        data: {
          pinId: "pin_123",
          title: "Test Pin",
          contentType: "IMAGE",
          originalAuthor: {
            userId: "student_123",
            type: "STUDENT"
          }
        }
      };

      const mockCoinResult = {
        success: true,
        coinsAwarded: 50,
        message: "50 ISF Coins awarded to student for pinned content"
      };

      WtfService.getPinById = jest.fn().mockResolvedValue(mockPinResult);
      WtfService.awardCoinsForPinnedContent = jest.fn().mockResolvedValue(mockCoinResult);

      await awardCoinsForPin(req, res);

      expect(WtfService.getPinById).toHaveBeenCalledWith("pin_123");
      expect(WtfService.awardCoinsForPinnedContent).toHaveBeenCalledWith(mockPinResult.data);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCoinResult);
    });

    test("should handle pin not found", async () => {
      WtfService.getPinById = jest.fn().mockResolvedValue({
        success: false,
        message: "Pin not found"
      });

      await awardCoinsForPin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Pin not found"
      });
    });

    test("should handle coin award failure", async () => {
      const mockPinResult = {
        success: true,
        data: { pinId: "pin_123", title: "Test Pin" }
      };

      const mockCoinResult = {
        success: false,
        message: "Coin service error"
      };

      WtfService.getPinById = jest.fn().mockResolvedValue(mockPinResult);
      WtfService.awardCoinsForPinnedContent = jest.fn().mockResolvedValue(mockCoinResult);

      await awardCoinsForPin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(mockCoinResult);
    });

    test("should handle service exceptions", async () => {
      WtfService.getPinById = jest.fn().mockRejectedValue(new Error("Service error"));

      await awardCoinsForPin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service error"
      });
    });
  });

  describe("awardMilestoneCoins", () => {
    let req, res;

    beforeEach(() => {
      req = {
        params: { pinId: "pin_123" },
        body: { likeCount: 25, likeType: "total" },
        user: { id: "user_123" },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/pins/pin_123/milestone-coins"
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      jest.clearAllMocks();
    });

    test("should award milestone coins successfully", async () => {
      const mockResult = {
        success: true,
        coinsAwarded: 75,
        message: "75 milestone coins awarded"
      };

      WtfService.awardMilestoneCoins = jest.fn().mockResolvedValue(mockResult);

      await awardMilestoneCoins(req, res);

      expect(WtfService.awardMilestoneCoins).toHaveBeenCalledWith("pin_123", 25, "total");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle milestone coins failure", async () => {
      const mockResult = {
        success: false,
        message: "No milestones reached"
      };

      WtfService.awardMilestoneCoins = jest.fn().mockResolvedValue(mockResult);

      await awardMilestoneCoins(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle service exceptions", async () => {
      WtfService.awardMilestoneCoins = jest.fn().mockRejectedValue(new Error("Service error"));

      await awardMilestoneCoins(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service error"
      });
    });
  });

  describe("expireOldPins", () => {
    let req, res;

    beforeEach(() => {
      req = {
        user: { id: "admin_123" },
        socket: { remoteAddress: "127.0.0.1" },
        method: "POST",
        originalUrl: "/api/v1/wtf/admin/expire-pins"
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      jest.clearAllMocks();
    });

    test("should expire old pins successfully", async () => {
      const mockResult = {
        success: true,
        expiredCount: 5,
        message: "5 pins expired automatically"
      };

      WtfService.expireOldPins = jest.fn().mockResolvedValue(mockResult);

      await expireOldPins(req, res);

      expect(WtfService.expireOldPins).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle expiration failure", async () => {
      const mockResult = {
        success: false,
        message: "Expiration failed"
      };

      WtfService.expireOldPins = jest.fn().mockResolvedValue(mockResult);

      await expireOldPins(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    test("should handle service exceptions", async () => {
      WtfService.expireOldPins = jest.fn().mockRejectedValue(new Error("Service error"));

      await expireOldPins(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Service error"
      });
    });
  });
});