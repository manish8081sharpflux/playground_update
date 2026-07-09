// Story 13.9 (FIX-024): Coin Economy Health Metrics (FR48)
// Tests for earn-to-spend ratio, coin velocity, and shop conversion rate

const mongoose = require('mongoose');
const AnalyticsService = require('../../services/analytics');
const Coin = require('../../models/coin');

describe('AnalyticsService.getCoinEconomyHealth', () => {
  // Helper to create a coin record with transactions
  const createCoinRecord = async (userId, balance, transactions = []) => {
    const coin = new Coin({
      userId,
      balance,
      transactions,
    });
    return coin.save();
  };

  const makeTransaction = (type, amount, source = 'general', daysAgo = 0) => ({
    type,
    amount,
    description: `Test ${type}`,
    source,
    metadata: {},
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  });

  it('should return all three required metrics in the response', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createCoinRecord(userId, 100, [
      makeTransaction('earned', 200, 'task', 5),
      makeTransaction('spent', 100, 'shop', 3),
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // Verify all three FR48 metrics exist
    expect(result).toHaveProperty('earnedVsSpentRatio');
    expect(result).toHaveProperty('coinVelocity');
    expect(result).toHaveProperty('shopConversionRate');
  });

  it('should compute earn-to-spend ratio as totalEarned / totalSpent', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createCoinRecord(userId, 100, [
      makeTransaction('earned', 300, 'task', 2),
      makeTransaction('spent', 150, 'shop', 1),
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // 300 / 150 = 2.0
    expect(result.earnedVsSpentRatio).toBe(2);
    expect(result.totalEarned).toBe(300);
    expect(result.totalSpent).toBe(150);
  });

  it('should return 0 earn-to-spend ratio when nothing is spent', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createCoinRecord(userId, 100, [
      makeTransaction('earned', 100, 'task', 1),
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    expect(result.earnedVsSpentRatio).toBe(0);
  });

  it('should compute coin velocity as coins transacted per active user per day', async () => {
    // Two users, each with transactions on distinct days in last 30 days
    const user1 = new mongoose.Types.ObjectId();
    const user2 = new mongoose.Types.ObjectId();

    // User1: 100 earned on day 5, 50 spent on day 3 => total 150
    await createCoinRecord(user1, 50, [
      makeTransaction('earned', 100, 'task', 5),
      makeTransaction('spent', 50, 'shop', 3),
    ]);

    // User2: 200 earned on day 5 => total 200
    await createCoinRecord(user2, 200, [
      makeTransaction('earned', 200, 'task', 5),
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // Total transacted in last 30 days = 100 + 50 + 200 = 350
    // Active users = 2
    // Distinct active days = 2 (day 5 and day 3)
    // Velocity = 350 / 2 / 2 = 87.5
    expect(result.coinVelocity).toBe(87.5);
    expect(result.activeUsersLast30Days).toBe(2);
  });

  it('should compute shop conversion rate as users who purchased / total users with coins', async () => {
    const user1 = new mongoose.Types.ObjectId();
    const user2 = new mongoose.Types.ObjectId();
    const user3 = new mongoose.Types.ObjectId();

    // User1 has a shop purchase
    await createCoinRecord(user1, 50, [
      makeTransaction('earned', 100, 'task', 5),
      makeTransaction('spent', 50, 'shop', 3),
    ]);

    // User2 has only earnings, never purchased from shop
    await createCoinRecord(user2, 200, [
      makeTransaction('earned', 200, 'task', 5),
    ]);

    // User3 has a non-shop spend (e.g., penalty)
    await createCoinRecord(user3, 80, [
      makeTransaction('earned', 100, 'task', 5),
      makeTransaction('spent', 20, 'general', 2),
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // 1 user purchased from shop / 3 total users with coins = 0.3333
    expect(result.shopConversionRate).toBeCloseTo(0.3333, 3);
    expect(result.usersWhoPurchased).toBe(1);
    expect(result.totalAccounts).toBe(3);
  });

  it('should return zeros when no coin records exist', async () => {
    const result = await AnalyticsService.getCoinEconomyHealth();

    expect(result.earnedVsSpentRatio).toBe(0);
    expect(result.coinVelocity).toBe(0);
    expect(result.shopConversionRate).toBe(0);
    expect(result.totalAccounts).toBe(0);
    expect(result.totalEarned).toBe(0);
    expect(result.totalSpent).toBe(0);
    expect(result.activeUsersLast30Days).toBe(0);
    expect(result.usersWhoPurchased).toBe(0);
  });

  it('should not count transactions older than 30 days for velocity', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createCoinRecord(userId, 100, [
      makeTransaction('earned', 500, 'task', 45), // older than 30 days
      makeTransaction('earned', 50, 'task', 2),   // within 30 days
    ]);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // Only the recent 50-coin transaction counts for velocity
    // 1 active user, 1 active day => velocity = 50/1/1 = 50
    expect(result.coinVelocity).toBe(50);
    expect(result.activeUsersLast30Days).toBe(1);

    // But earn-to-spend ratio uses ALL transactions
    expect(result.totalEarned).toBe(550);
  });

  it('should include appropriate warnings for low velocity and conversion', async () => {
    // Create 12 users with coins but no shop purchases and low activity
    const promises = [];
    for (let i = 0; i < 12; i++) {
      const uid = new mongoose.Types.ObjectId();
      promises.push(
        createCoinRecord(uid, 10, [
          makeTransaction('earned', 10, 'task', 1),
        ])
      );
    }
    await Promise.all(promises);

    const result = await AnalyticsService.getCoinEconomyHealth();

    // Velocity: total 120 transacted / 12 users / 1 day = 10 per user per day
    // No shop purchases at all => conversion = 0/12 = 0
    expect(result.warnings).toContain(
      'Shop conversion rate is low - many students have coins but never purchased'
    );
  });
});
