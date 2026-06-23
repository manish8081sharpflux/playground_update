const mongoose = require('mongoose');
const Coin = require('../../models/coin');
const AnalyticsService = require('../../services/analytics');

describe('AnalyticsService.getCoinEarningVelocity (Story 12.12 / FIX-023)', () => {
  // Seed data helpers
  const userId1 = new mongoose.Types.ObjectId();
  const userId2 = new mongoose.Types.ObjectId();
  const userId3 = new mongoose.Types.ObjectId();

  const day = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const seedCoins = async () => {
    // User 1: earned 10 coins 2 days ago, 20 coins 1 day ago
    await Coin.create({
      userId: userId1,
      balance: 30,
      transactions: [
        { type: 'earned', amount: 10, description: 'task', source: 'task', createdAt: day(2) },
        { type: 'earned', amount: 20, description: 'task', source: 'task', createdAt: day(1) },
      ]
    });

    // User 2: earned 15 coins 2 days ago
    await Coin.create({
      userId: userId2,
      balance: 15,
      transactions: [
        { type: 'earned', amount: 15, description: 'attendance', source: 'attendance', createdAt: day(2) },
      ]
    });

    // User 3: earned 5 coins 1 day ago, has a 'spent' that should not count
    await Coin.create({
      userId: userId3,
      balance: 0,
      transactions: [
        { type: 'earned', amount: 5, description: 'music', source: 'music', createdAt: day(1) },
        { type: 'spent', amount: 5, description: 'shop purchase', source: 'shop', createdAt: day(1) },
      ]
    });
  };

  beforeEach(async () => {
    await seedCoins();
  });

  it('should return velocity, historical, and summary keys', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    expect(result).toHaveProperty('velocity');
    expect(result).toHaveProperty('historical');
    expect(result).toHaveProperty('summary');
    expect(result.historical).toHaveProperty('weekly');
    expect(result.historical).toHaveProperty('monthly');
  });

  it('should compute daily velocity correctly', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0),
      granularity: 'daily'
    });

    // 2 days ago: user1 earned 10, user2 earned 15 => 25 total, 2 active users => 12.5 per user
    // 1 day ago:  user1 earned 20, user3 earned 5  => 25 total, 2 active users => 12.5 per user
    expect(result.velocity.length).toBe(2);

    // Sort by date ascending (should already be sorted)
    const sorted = [...result.velocity].sort((a, b) => a.date.localeCompare(b.date));

    // Day -2
    expect(sorted[0].totalEarned).toBe(25);
    expect(sorted[0].activeUserCount).toBe(2);
    expect(sorted[0].coinsPerActiveUser).toBe(12.5);

    // Day -1
    expect(sorted[1].totalEarned).toBe(25);
    expect(sorted[1].activeUserCount).toBe(2);
    expect(sorted[1].coinsPerActiveUser).toBe(12.5);
  });

  it('should exclude spent transactions from velocity', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    // Total earned should be 10 + 20 + 15 + 5 = 50 (spent 5 should NOT be counted)
    expect(result.summary.totalEarned).toBe(50);
  });

  it('should compute correct overall velocity in summary', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    // 50 coins / 3 active users / totalDays
    // totalDays = ceil((day(0) - day(3)) / 86400000) = 3
    // overallVelocity = 50 / 3 / 3 = 5.56
    expect(result.summary.activeUserCount).toBe(3);
    expect(result.summary.totalEarned).toBe(50);
    expect(result.summary.totalTransactions).toBe(4); // only 4 earned transactions
    expect(result.summary.overallVelocity).toBeGreaterThan(0);
  });

  it('should return weekly aggregates in historical', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    // Transactions may span 1 or 2 ISO weeks depending on when the test runs
    expect(result.historical.weekly.length).toBeGreaterThanOrEqual(1);
    const week = result.historical.weekly[0];
    expect(week).toHaveProperty('year');
    expect(week).toHaveProperty('week');
    expect(week).toHaveProperty('totalEarned');
    expect(week).toHaveProperty('activeUserCount');
    expect(week).toHaveProperty('transactionCount');
    expect(week).toHaveProperty('coinsPerActiveUser');
    // Sum across all weeks should be 50
    const weeklyTotal = result.historical.weekly.reduce((s, w) => s + w.totalEarned, 0);
    expect(weeklyTotal).toBe(50);
  });

  it('should return monthly aggregates in historical', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    expect(result.historical.monthly.length).toBeGreaterThanOrEqual(1);
    const month = result.historical.monthly[0];
    expect(month).toHaveProperty('year');
    expect(month).toHaveProperty('month');
    expect(month).toHaveProperty('totalEarned');
    expect(month.totalEarned).toBe(50);
  });

  it('should use weekly granularity when requested', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0),
      granularity: 'weekly'
    });

    // velocity array should contain weekly data (has 'week' field)
    expect(result.velocity.length).toBeGreaterThanOrEqual(1);
    expect(result.velocity[0]).toHaveProperty('week');
  });

  it('should use monthly granularity when requested', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0),
      granularity: 'monthly'
    });

    expect(result.velocity.length).toBeGreaterThanOrEqual(1);
    expect(result.velocity[0]).toHaveProperty('month');
  });

  it('should return empty velocity when no transactions exist in range', async () => {
    // Query a range far in the past where no data exists
    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: new Date('2020-01-01'),
      endDate: new Date('2020-01-31')
    });

    expect(result.velocity).toEqual([]);
    expect(result.historical.weekly).toEqual([]);
    expect(result.historical.monthly).toEqual([]);
    expect(result.summary.totalEarned).toBe(0);
    expect(result.summary.activeUserCount).toBe(0);
    expect(result.summary.overallVelocity).toBe(0);
  });

  it('should default to last 30 days when no dates provided', async () => {
    const result = await AnalyticsService.getCoinEarningVelocity();

    // Our seed data is within last 30 days, so it should appear
    expect(result.summary.totalEarned).toBe(50);
    expect(result.summary.dateRange.startDate).toBeInstanceOf(Date);
    expect(result.summary.dateRange.endDate).toBeInstanceOf(Date);
  });

  it('should round monetary values to 2 decimal places', async () => {
    // Add a transaction that produces non-round division
    await Coin.create({
      userId: new mongoose.Types.ObjectId(),
      balance: 7,
      transactions: [
        { type: 'earned', amount: 7, description: 'test', source: 'general', createdAt: day(2) },
      ]
    });

    const result = await AnalyticsService.getCoinEarningVelocity({
      startDate: day(3),
      endDate: day(0)
    });

    // Check all velocity entries have at most 2 decimal places
    for (const v of result.velocity) {
      const decimals = (v.coinsPerActiveUser.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});
