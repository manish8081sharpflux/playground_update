/**
 * Tests for backend/controllers/coinController.js
 * Story 12.4 (FIX-004) — Backend Test Coverage
 */
const mongoose = require('mongoose');

jest.mock('../../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../services/coin');
const CoinService = require('../../../services/coin');

const coinController = require('../../../controllers/coinController');
const { mockRequest, mockResponse } = global.testUtils;

describe('CoinController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getUserBalance ====================
  describe('getUserBalance', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.getUserBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return balance on success', async () => {
      CoinService.getUserBalance.mockResolvedValue({
        success: true,
        data: { balance: 100 },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.getUserBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { balance: 100 } })
      );
      // Check cache-control headers
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
      );
    });

    it('should return 400 on service failure', async () => {
      CoinService.getUserBalance.mockResolvedValue({
        success: false,
        message: 'User not found',
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.getUserBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      CoinService.getUserBalance.mockRejectedValue(new Error('DB'));

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.getUserBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getUserCoinStats ====================
  describe('getUserCoinStats', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      await coinController.getUserCoinStats(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return stats on success', async () => {
      CoinService.getUserCoinStats.mockResolvedValue({
        success: true,
        data: { totalEarned: 500, totalSpent: 100 },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await coinController.getUserCoinStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      CoinService.getUserCoinStats.mockRejectedValue(new Error('DB'));

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await coinController.getUserCoinStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== getUserTransactionHistory ====================
  describe('getUserTransactionHistory', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null, query: {} });
      const res = mockResponse();
      await coinController.getUserTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return transactions on success', async () => {
      CoinService.getUserTransactionHistory.mockResolvedValue({
        success: true,
        data: { transactions: [{ amount: 10 }] },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: { type: 'earned', page: 1, limit: 10 },
      });
      const res = mockResponse();
      await coinController.getUserTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==================== exportTransactionHistory ====================
  describe('exportTransactionHistory', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null, query: {} });
      const res = mockResponse();
      await coinController.exportTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return CSV data on success', async () => {
      const csvData = 'date,amount,type\n2026-01-01,10,earned';
      CoinService.exportTransactionHistory.mockResolvedValue({
        success: true,
        data: csvData,
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: {},
      });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.exportTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalledWith(csvData);
    });

    it('should return 400 on service failure', async () => {
      CoinService.exportTransactionHistory.mockResolvedValue({
        success: false,
        message: 'No data',
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: {},
      });
      const res = mockResponse();
      res.setHeader = jest.fn();
      await coinController.exportTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== getWtfTransactionHistory ====================
  describe('getWtfTransactionHistory', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null, query: {} });
      const res = mockResponse();
      await coinController.getWtfTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return WTF transactions on success', async () => {
      CoinService.getWtfTransactionHistory.mockResolvedValue({
        success: true,
        data: { transactions: [] },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: { limit: '20' },
      });
      const res = mockResponse();
      await coinController.getWtfTransactionHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ==================== getTopEarners ====================
  describe('getTopEarners', () => {
    it('should return top earners', async () => {
      CoinService.getTopEarners.mockResolvedValue({
        success: true,
        data: { topEarners: [{ name: 'Alice', coins: 500 }] },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: { limit: '5', period: 'weekly' },
      });
      const res = mockResponse();
      await coinController.getTopEarners(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      CoinService.getTopEarners.mockRejectedValue(new Error('Aggregate fail'));

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: {},
      });
      const res = mockResponse();
      await coinController.getTopEarners(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== checkFirstPinBonusEligibility ====================
  describe('checkFirstPinBonusEligibility', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      await coinController.checkFirstPinBonusEligibility(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return eligibility status', async () => {
      CoinService.isEligibleForFirstPinBonus.mockResolvedValue(true);

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await coinController.checkFirstPinBonusEligibility(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { isEligible: true },
        })
      );
    });
  });

  // ==================== checkWeeklyActiveBonusEligibility ====================
  describe('checkWeeklyActiveBonusEligibility', () => {
    it('should return 401 if user not authenticated', async () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      await coinController.checkWeeklyActiveBonusEligibility(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return eligible status', async () => {
      CoinService.isEligibleForWeeklyActiveBonus.mockResolvedValue(true);

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await coinController.checkWeeklyActiveBonusEligibility(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return not eligible status', async () => {
      CoinService.isEligibleForWeeklyActiveBonus.mockResolvedValue(false);

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
      });
      const res = mockResponse();
      await coinController.checkWeeklyActiveBonusEligibility(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { eligible: false },
        })
      );
    });
  });

  // ==================== getAllTransactions ====================
  describe('getAllTransactions', () => {
    it('should return all transactions with filters', async () => {
      CoinService.getAllTransactions.mockResolvedValue({
        success: true,
        data: { transactions: [{ amount: 5 }] },
      });

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: { page: '1', limit: '50', type: 'earned' },
      });
      const res = mockResponse();
      await coinController.getAllTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      CoinService.getAllTransactions.mockRejectedValue(new Error('DB'));

      const req = mockRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        query: {},
      });
      const res = mockResponse();
      await coinController.getAllTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
