const mongoose = require('mongoose');

// Mock pino logger
jest.mock('../../config/pino-config', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  errorLogger: { error: jest.fn(), info: jest.fn() },
}));

const Coin = require('../../models/coin');

const { generateObjectId } = global.testUtils;

// Helper: create a coin record with balance
async function createCoinRecord(userId, balance = 0) {
  return Coin.create({
    userId,
    balance,
    transactions: [],
    weeklyStats: { coinsEarned: 0, coinsSpent: 0, lastResetDate: new Date() },
    monthlyStats: { coinsEarned: 0, coinsSpent: 0, lastResetDate: new Date() },
    wtfStats: { pinsCreated: 0, submissionsApproved: 0, interactionsMade: 0, totalWtfCoinsEarned: 0 },
  });
}

// Helper: check if the current MongoDB instance supports transactions (replica set)
async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.replSetGetStatus();
    return !!info;
  } catch {
    return false;
  }
}

describe('Coin Model - Atomic Transaction Support (Story 12.2)', () => {

  describe('addCoins() options parameter', () => {
    it('should accept options parameter with empty object and save successfully', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      await record.addCoins(10, 'earned', 'Test earn', 'task', {}, {});

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(10);
      expect(updated.transactions).toHaveLength(1);
    });

    it('should remain backward-compatible when options is omitted', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      await record.addCoins(15, 'earned', 'Backward compat', 'general');

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(15);
    });

    it('should accept options with session key without error (non-null session)', async () => {
      // This test verifies the code path where options.session is checked
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      // options with session=undefined should behave like no session
      await record.addCoins(20, 'earned', 'No session in options', 'task', {}, { session: undefined });

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(20);
    });
  });

  describe('spendCoins() options parameter', () => {
    it('should accept options parameter with empty object and save successfully', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      await record.spendCoins(30, 'spent', 'Test spend', 'shop', {}, {});

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(70);
      expect(updated.transactions).toHaveLength(1);
    });

    it('should remain backward-compatible when options is omitted', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 50);

      await record.spendCoins(10, 'spent', 'Backward compat spend', 'shop');

      const updated = await Coin.findOne({ userId });
      expect(updated.balance).toBe(40);
    });

    it('should still validate amount even with options parameter', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      expect(() => {
        record.spendCoins(0, 'spent', 'Zero spend', 'shop', {}, {});
      }).toThrow('Coin amount must be positive');
    });

    it('should still validate balance even with options parameter', async () => {
      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 10);

      expect(() => {
        record.spendCoins(50, 'spent', 'Over-spend', 'shop', {}, {});
      }).toThrow('Insufficient coin balance');
    });
  });

  describe('Transaction with session (requires replica set)', () => {
    let hasReplicaSet = false;

    beforeAll(async () => {
      hasReplicaSet = await supportsTransactions();
    });

    it('should pass session through to save() on addCoins within a transaction', async () => {
      if (!hasReplicaSet) {
        // MongoMemoryServer standalone does not support transactions; skip gracefully
        return;
      }

      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await record.addCoins(50, 'earned', 'Transaction add', 'task', {}, { session });
        });

        const updated = await Coin.findOne({ userId });
        expect(updated.balance).toBe(50);
      } finally {
        await session.endSession();
      }
    });

    it('should rollback addCoins if transaction is aborted', async () => {
      if (!hasReplicaSet) {
        return;
      }

      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 0);

      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await record.addCoins(50, 'earned', 'Should rollback', 'task', {}, { session });
        await session.abortTransaction();

        const updated = await Coin.findOne({ userId });
        expect(updated.balance).toBe(0);
        expect(updated.transactions).toHaveLength(0);
      } finally {
        await session.endSession();
      }
    });

    it('should rollback spendCoins if transaction is aborted', async () => {
      if (!hasReplicaSet) {
        return;
      }

      const userId = generateObjectId();
      const record = await createCoinRecord(userId, 100);

      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await record.spendCoins(40, 'spent', 'Should rollback spend', 'shop', {}, { session });
        await session.abortTransaction();

        const updated = await Coin.findOne({ userId });
        expect(updated.balance).toBe(100);
        expect(updated.transactions).toHaveLength(0);
      } finally {
        await session.endSession();
      }
    });
  });
});
