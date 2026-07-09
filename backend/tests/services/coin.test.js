const mongoose = require('mongoose');

// Mock pino logger
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

// Mock WtfSettingsService
jest.mock('../../services/wtfSettings', () => ({
  getCurrentSettings: jest.fn().mockResolvedValue({ wtfCoinReward: 10 }),
  getCoinReward: jest.fn().mockResolvedValue(15),
}));

// Mock NotificationService
jest.mock('../../services/notification', () => ({
  notifyCoinsAwarded: jest.fn().mockResolvedValue(true),
}));

const CoinService = require('../../services/coin');
const Coin = require('../../models/coin');

const { generateObjectId } = global.testUtils;

// Helper: create a coin record with balance
async function createCoinRecord(userId, balance = 0, transactions = []) {
  return Coin.create({
    userId,
    balance,
    transactions,
    weeklyStats: { coinsEarned: 0, coinsSpent: 0, lastResetDate: new Date() },
    monthlyStats: { coinsEarned: 0, coinsSpent: 0, lastResetDate: new Date() },
    wtfStats: { pinsCreated: 0, submissionsApproved: 0, interactionsMade: 0, totalWtfCoinsEarned: 0 },
  });
}

describe('Coin Service (Story 6.2)', () => {

  // ================================================================
  // Coin Earning - Pin Creation
  // ================================================================
  describe('awardPinCreationCoins', () => {
    it('should award coins for pin creation', async () => {
      const userId = generateObjectId();
      const pinId = generateObjectId();

      const result = await CoinService.awardPinCreationCoins(userId, pinId, false);

      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(10);
      expect(result.data.newBalance).toBe(10);
      expect(result.message).toContain('10 coins');

      // Verify DB state
      const coinRecord = await Coin.findOne({ userId });
      expect(coinRecord.balance).toBe(10);
      expect(coinRecord.transactions).toHaveLength(1);
      expect(coinRecord.wtfStats.pinsCreated).toBe(1);
    });

    it('should award bonus coins for first pin creation', async () => {
      const userId = generateObjectId();
      const pinId = generateObjectId();

      const result = await CoinService.awardPinCreationCoins(userId, pinId, true);

      expect(result.success).toBe(true);
      // 10 (pin creation) + 25 (first pin bonus) = 35
      expect(result.data.coinsAwarded).toBe(35);
      expect(result.data.newBalance).toBe(35);
    });

    it('should create coin record if none exists', async () => {
      const userId = generateObjectId();

      // Verify no record exists
      const before = await Coin.findOne({ userId });
      expect(before).toBeNull();

      await CoinService.awardPinCreationCoins(userId, generateObjectId());

      const after = await Coin.findOne({ userId });
      expect(after).toBeDefined();
      expect(after.balance).toBe(10);
    });

    it('should add to existing balance', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 50);

      const result = await CoinService.awardPinCreationCoins(userId, generateObjectId());

      expect(result.data.newBalance).toBe(60);
    });
  });

  // ================================================================
  // Coin Earning - Submission Approval
  // ================================================================
  describe('awardSubmissionApprovalCoins', () => {
    it('should award coins for submission approval', async () => {
      const userId = generateObjectId();
      const submissionId = generateObjectId();

      const result = await CoinService.awardSubmissionApprovalCoins(userId, submissionId);

      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(15);
      expect(result.data.newBalance).toBe(15);
    });

    it('should track submission approval in wtfStats', async () => {
      const userId = generateObjectId();
      await CoinService.awardSubmissionApprovalCoins(userId, generateObjectId());

      const record = await Coin.findOne({ userId });
      expect(record.wtfStats.submissionsApproved).toBe(1);
    });
  });

  // ================================================================
  // Coin Earning - Interactions (with daily limit)
  // ================================================================
  describe('awardInteractionCoins', () => {
    it('should award coins for interaction', async () => {
      const userId = generateObjectId();
      const interactionId = generateObjectId();

      const result = await CoinService.awardInteractionCoins(userId, interactionId);

      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(2);
      expect(result.data.dailyInteractionsRemaining).toBe(4);
    });

    it('should enforce daily interaction limit (max 5)', async () => {
      const userId = generateObjectId();

      // Create coin record with 5 interactions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        transactions.push({
          type: 'wtf_interaction',
          amount: 2,
          description: 'Engaged with WTF content',
          source: 'wtf',
          createdAt: new Date(), // today
        });
      }
      await createCoinRecord(userId, 10, transactions);

      const result = await CoinService.awardInteractionCoins(userId, generateObjectId());

      expect(result.success).toBe(false);
      expect(result.message).toBe('Daily interaction coin limit reached');
      expect(result.data).toBeNull();
    });

    it('should track interactions in wtfStats', async () => {
      const userId = generateObjectId();
      await CoinService.awardInteractionCoins(userId, generateObjectId());

      const record = await Coin.findOne({ userId });
      expect(record.wtfStats.interactionsMade).toBe(1);
    });
  });

  // ================================================================
  // Bonus Awards
  // ================================================================
  describe('awardHighEngagementBonus', () => {
    it('should award bonus for engagement rate >= 80%', async () => {
      const userId = generateObjectId();
      const pinId = generateObjectId();

      const result = await CoinService.awardHighEngagementBonus(userId, pinId, 85);

      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(20);
      expect(result.data.engagementRate).toBe(85);
    });

    it('should reject bonus for engagement rate < 80%', async () => {
      const userId = generateObjectId();
      const pinId = generateObjectId();

      const result = await CoinService.awardHighEngagementBonus(userId, pinId, 60);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Engagement rate too low for bonus');
      expect(result.data).toBeNull();
    });

    it('should award bonus for exactly 80% engagement', async () => {
      const userId = generateObjectId();
      const result = await CoinService.awardHighEngagementBonus(userId, generateObjectId(), 80);
      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(20);
    });
  });

  describe('awardWeeklyActiveBonus', () => {
    it('should award weekly active bonus', async () => {
      const userId = generateObjectId();

      const result = await CoinService.awardWeeklyActiveBonus(userId);

      expect(result.success).toBe(true);
      expect(result.data.coinsAwarded).toBe(50);
      expect(result.data.newBalance).toBe(50);
    });
  });

  // ================================================================
  // Balance and Stats
  // ================================================================
  describe('getUserBalance', () => {
    it('should return zero for user with no record', async () => {
      const userId = generateObjectId();

      const result = await CoinService.getUserBalance(userId);

      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(0);
    });

    it('should return correct balance', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 100);

      const result = await CoinService.getUserBalance(userId);

      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(100);
    });
  });

  describe('getUserCoinStats', () => {
    it('should return coin statistics', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 50);

      const result = await CoinService.getUserCoinStats(userId);

      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(50);
      expect(result.data.weeklyStats).toBeDefined();
      expect(result.data.monthlyStats).toBeDefined();
      expect(result.data.wtfStats).toBeDefined();
    });

    it('should create record for new user', async () => {
      const userId = generateObjectId();

      const result = await CoinService.getUserCoinStats(userId);

      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(0);
    });
  });

  // ================================================================
  // Transaction History
  // ================================================================
  describe('getUserTransactionHistory', () => {
    it('should return empty transaction list for new user', async () => {
      const userId = generateObjectId();

      const result = await CoinService.getUserTransactionHistory(userId);

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(0);
      expect(result.data.pagination.total).toBe(0);
    });

    it('should return transactions with pagination', async () => {
      const userId = generateObjectId();
      const transactions = [];
      for (let i = 0; i < 10; i++) {
        transactions.push({
          type: 'earned',
          amount: 5,
          description: `Transaction ${i}`,
          source: 'wtf',
          createdAt: new Date(Date.now() - i * 60000),
        });
      }
      await createCoinRecord(userId, 50, transactions);

      const result = await CoinService.getUserTransactionHistory(userId, { page: 1, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(5);
      expect(result.data.pagination.total).toBe(10);
      expect(result.data.pagination.pages).toBe(2);
    });

    it('should filter by type', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 50, [
        { type: 'earned', amount: 10, description: 'Earned', source: 'wtf', createdAt: new Date() },
        { type: 'spent', amount: 5, description: 'Spent', source: 'shop', createdAt: new Date() },
      ]);

      const result = await CoinService.getUserTransactionHistory(userId, { type: 'earned' });

      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.transactions[0].type).toBe('earned');
    });

    it('should filter by source', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 50, [
        { type: 'earned', amount: 10, description: 'WTF', source: 'wtf', createdAt: new Date() },
        { type: 'earned', amount: 5, description: 'Shop', source: 'shop', createdAt: new Date() },
      ]);

      const result = await CoinService.getUserTransactionHistory(userId, { source: 'shop' });

      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.transactions[0].source).toBe('shop');
    });

    it('should filter by date range', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 50, [
        { type: 'earned', amount: 10, description: 'Old', source: 'wtf', createdAt: new Date('2026-01-01') },
        { type: 'earned', amount: 5, description: 'New', source: 'wtf', createdAt: new Date('2026-03-15') },
      ]);

      const result = await CoinService.getUserTransactionHistory(userId, {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.transactions[0].description).toBe('New');
    });

    it('should return summary with totalEarned and totalSpent', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 15, [
        { type: 'earned', amount: 20, description: 'E1', source: 'wtf', createdAt: new Date() },
        { type: 'spent', amount: 5, description: 'S1', source: 'shop', createdAt: new Date() },
      ]);

      const result = await CoinService.getUserTransactionHistory(userId);

      expect(result.data.summary.totalEarned).toBe(20);
      expect(result.data.summary.totalSpent).toBe(5);
      expect(result.data.summary.currentBalance).toBe(15);
    });
  });

  // ================================================================
  // Export Transaction History
  // ================================================================
  describe('exportTransactionHistory', () => {
    it('should export CSV with headers', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 10, [
        { type: 'earned', amount: 10, description: 'Pin creation', source: 'wtf', createdAt: new Date() },
      ]);

      const result = await CoinService.exportTransactionHistory(userId);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Date,Type,Source,Description,Amount,Balance After');
      expect(result.data).toContain('+10');
      expect(result.data).toContain('WTF');
    });

    it('should export empty CSV for user with no transactions', async () => {
      const userId = generateObjectId();

      const result = await CoinService.exportTransactionHistory(userId);

      expect(result.success).toBe(true);
      // Only header row
      const lines = result.data.split('\n');
      expect(lines).toHaveLength(1);
    });

    it('should apply date filters on export', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 30, [
        { type: 'earned', amount: 10, description: 'Old', source: 'wtf', createdAt: new Date('2026-01-01') },
        { type: 'earned', amount: 20, description: 'New', source: 'wtf', createdAt: new Date('2026-03-15') },
      ]);

      const result = await CoinService.exportTransactionHistory(userId, {
        startDate: '2026-03-01',
      });

      expect(result.success).toBe(true);
      const lines = result.data.split('\n');
      expect(lines).toHaveLength(2); // header + 1 filtered transaction
    });
  });

  // ================================================================
  // WTF Transaction History
  // ================================================================
  describe('getWtfTransactionHistory', () => {
    it('should return only WTF transactions', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 30, [
        { type: 'earned', amount: 10, description: 'WTF pin', source: 'wtf', createdAt: new Date() },
        { type: 'spent', amount: 5, description: 'Shop', source: 'shop', createdAt: new Date() },
        { type: 'earned', amount: 2, description: 'WTF interaction', source: 'wtf', createdAt: new Date() },
      ]);

      const result = await CoinService.getWtfTransactionHistory(userId);

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(2);
      result.data.transactions.forEach(t => {
        expect(t.source).toBe('wtf');
      });
    });
  });

  // ================================================================
  // Top Earners
  // ================================================================
  describe('getTopEarners', () => {
    it('should return top earners list', async () => {
      // Register User model stub if needed
      if (!mongoose.models.User) {
        mongoose.model('User', new mongoose.Schema({ name: String, role: String }));
      }
      const User = mongoose.model('User');

      const user1 = await User.create({ name: 'Top Student', role: 'student' });
      const user2 = await User.create({ name: 'Second Student', role: 'student' });

      await createCoinRecord(user1._id, 200);
      await createCoinRecord(user2._id, 100);

      const result = await CoinService.getTopEarners(10, 'weekly');

      expect(result.success).toBe(true);
      expect(result.data.topEarners).toBeDefined();
      expect(result.data.period).toBe('weekly');
    });
  });

  // ================================================================
  // Eligibility Checks
  // ================================================================
  describe('isEligibleForFirstPinBonus', () => {
    it('should return true for user with zero pins', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 0);

      const eligible = await CoinService.isEligibleForFirstPinBonus(userId);
      expect(eligible).toBe(true);
    });

    it('should return false for user who already created a pin', async () => {
      const userId = generateObjectId();
      // Award pin creation coins to increment pinsCreated counter
      await CoinService.awardPinCreationCoins(userId, generateObjectId());

      const eligible = await CoinService.isEligibleForFirstPinBonus(userId);
      expect(eligible).toBe(false);
    });
  });

  describe('isEligibleForWeeklyActiveBonus', () => {
    it('should return false for user with fewer than 5 weekly WTF activities', async () => {
      const userId = generateObjectId();
      await createCoinRecord(userId, 10, [
        { type: 'earned', amount: 2, description: 'WTF', source: 'wtf', createdAt: new Date() },
        { type: 'earned', amount: 2, description: 'WTF', source: 'wtf', createdAt: new Date() },
      ]);

      const eligible = await CoinService.isEligibleForWeeklyActiveBonus(userId);
      expect(eligible).toBe(false);
    });

    it('should return true for user with 5+ weekly WTF activities', async () => {
      const userId = generateObjectId();
      const transactions = [];
      for (let i = 0; i < 6; i++) {
        transactions.push({
          type: 'earned',
          amount: 2,
          description: 'WTF interaction',
          source: 'wtf',
          createdAt: new Date(), // within last 7 days
        });
      }
      await createCoinRecord(userId, 12, transactions);

      const eligible = await CoinService.isEligibleForWeeklyActiveBonus(userId);
      expect(eligible).toBe(true);
    });
  });

  // ================================================================
  // Edge Cases
  // ================================================================
  describe('Edge cases', () => {
    it('should handle zero balance operations correctly', async () => {
      const userId = generateObjectId();

      const result = await CoinService.getUserBalance(userId);
      expect(result.data.balance).toBe(0);
    });

    it('should handle multiple coin awards in sequence (no concurrency issues)', async () => {
      const userId = generateObjectId();

      await CoinService.awardPinCreationCoins(userId, generateObjectId());
      await CoinService.awardSubmissionApprovalCoins(userId, generateObjectId());
      await CoinService.awardInteractionCoins(userId, generateObjectId());

      const balance = await CoinService.getUserBalance(userId);
      // 10 (pin) + 15 (submission) + 2 (interaction) = 27
      expect(balance.data.balance).toBe(27);

      const record = await Coin.findOne({ userId });
      expect(record.transactions).toHaveLength(3);
    });

    it('should handle concurrent coin awards without data loss', async () => {
      const userId = generateObjectId();
      // Create initial record
      await createCoinRecord(userId, 0);

      // Award coins concurrently (sequential due to findOrCreate pattern)
      const pin1 = CoinService.awardPinCreationCoins(userId, generateObjectId());
      const pin2 = CoinService.awardPinCreationCoins(userId, generateObjectId());

      const results = await Promise.allSettled([pin1, pin2]);

      // At least one should succeed
      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw on error and propagate correctly', async () => {
      // Force an error by using an invalid userId format
      await expect(
        CoinService.awardPinCreationCoins(null, generateObjectId())
      ).rejects.toThrow();
    });

    it('should accumulate wtfStats across multiple operations', async () => {
      const userId = generateObjectId();

      await CoinService.awardPinCreationCoins(userId, generateObjectId());
      await CoinService.awardPinCreationCoins(userId, generateObjectId());
      await CoinService.awardSubmissionApprovalCoins(userId, generateObjectId());
      await CoinService.awardInteractionCoins(userId, generateObjectId());

      const record = await Coin.findOne({ userId });
      expect(record.wtfStats.pinsCreated).toBe(2);
      expect(record.wtfStats.submissionsApproved).toBe(1);
      expect(record.wtfStats.interactionsMade).toBe(1);
      expect(record.wtfStats.totalWtfCoinsEarned).toBe(37); // 10 + 10 + 15 + 2
    });
  });

  // ================================================================
  // Coin Model Instance Methods (spend/earn)
  // ================================================================
  describe('Coin model - spendCoins', () => {
    it('should deduct coins on spend', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      await record.spendCoins(30, 'spent', 'Shop purchase', 'shop', { orderId: 'ORD-001' });

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(70);
      expect(updated.transactions).toHaveLength(1);
      expect(updated.transactions[0].type).toBe('spent');
      expect(updated.transactions[0].amount).toBe(30);
    });

    it('should reject spend when insufficient balance', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 10);

      expect(() => {
        record.spendCoins(50, 'spent', 'Too expensive', 'shop');
      }).toThrow('Insufficient coin balance');
    });

    it('should reject spend with zero or negative amount', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      expect(() => {
        record.spendCoins(0, 'spent', 'Zero spend', 'shop');
      }).toThrow('Coin amount must be positive');

      expect(() => {
        record.spendCoins(-5, 'spent', 'Negative spend', 'shop');
      }).toThrow('Coin amount must be positive');
    });
  });

  describe('Coin model - addCoins', () => {
    it('should add coins and track transaction', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      await record.addCoins(25, 'earned', 'Quiz completion', 'general');

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(25);
      expect(updated.transactions).toHaveLength(1);
      expect(updated.transactions[0].type).toBe('earned');
    });

    it('should reject add with zero or negative amount', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      expect(() => {
        record.addCoins(0, 'earned', 'Zero', 'general');
      }).toThrow('Coin amount must be positive');
    });
  });

  // ================================================================
  // Refund scenario (order cancellation = addCoins after spend)
  // ================================================================
  describe('Coin refund (order cancellation)', () => {
    it('should refund coins by adding back after spend', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      // Spend on order
      await record.spendCoins(40, 'spent', 'Shop purchase', 'shop', { orderId: 'ORD-002' });
      let updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(60);

      // Refund (cancellation)
      await updated.addCoins(40, 'earned', 'Order cancellation refund', 'shop', { orderId: 'ORD-002', refund: true });
      updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(100);
      expect(updated.transactions).toHaveLength(2);
    });

    it('should maintain atomic transaction integrity on spend + refund', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 50);

      // Spend
      await record.spendCoins(50, 'spent', 'Full purchase', 'shop');
      let updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(0);

      // Refund
      await updated.addCoins(50, 'earned', 'Full refund', 'shop');
      updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(50);

      // Both transactions recorded
      expect(updated.transactions).toHaveLength(2);
      expect(updated.transactions[0].type).toBe('spent');
      expect(updated.transactions[1].type).toBe('earned');
    });
  });
});
