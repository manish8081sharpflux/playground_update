const mongoose = require('mongoose');

// Mock analytics service
jest.mock('../../services/analytics', () => ({
  getCoinEarningVelocity: jest.fn(),
}));

const analyticsController = require('../../controllers/analyticsController');
const AnalyticsService = require('../../services/analytics');
const { mockRequest, mockResponse } = global.testUtils;

describe('analyticsController — getCoinEarningVelocity (Story 12.12 / FIX-023)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleVelocityData = {
    velocity: [
      { date: '2026-03-10', totalEarned: 100, activeUserCount: 5, coinsPerActiveUser: 20 },
      { date: '2026-03-11', totalEarned: 150, activeUserCount: 6, coinsPerActiveUser: 25 },
    ],
    historical: {
      weekly: [
        { year: 2026, week: 11, totalEarned: 250, activeUserCount: 8, transactionCount: 15, coinsPerActiveUser: 31.25 }
      ],
      monthly: [
        { year: 2026, month: 3, totalEarned: 250, activeUserCount: 8, transactionCount: 15, coinsPerActiveUser: 31.25 }
      ]
    },
    summary: {
      totalDays: 2,
      totalEarned: 250,
      activeUserCount: 8,
      totalTransactions: 15,
      overallVelocity: 15.63,
      dateRange: {
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-11')
      }
    }
  };

  it('should return velocity data with 200 status on success (no query params)', async () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    AnalyticsService.getCoinEarningVelocity.mockResolvedValue(sampleVelocityData);

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(AnalyticsService.getCoinEarningVelocity).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: undefined,
      granularity: undefined
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: sampleVelocityData
    });
  });

  it('should pass startDate, endDate, and granularity to the service', async () => {
    const req = mockRequest({
      query: {
        startDate: '2026-03-01',
        endDate: '2026-03-15',
        granularity: 'weekly'
      }
    });
    const res = mockResponse();

    AnalyticsService.getCoinEarningVelocity.mockResolvedValue(sampleVelocityData);

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(AnalyticsService.getCoinEarningVelocity).toHaveBeenCalledWith({
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      granularity: 'weekly'
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return 400 for invalid startDate', async () => {
    const req = mockRequest({ query: { startDate: 'not-a-date' } });
    const res = mockResponse();

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(AnalyticsService.getCoinEarningVelocity).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('startDate')
      })
    );
  });

  it('should return 400 for invalid endDate', async () => {
    const req = mockRequest({ query: { endDate: 'bad-date' } });
    const res = mockResponse();

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(AnalyticsService.getCoinEarningVelocity).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('endDate')
      })
    );
  });

  it('should return 400 for invalid granularity', async () => {
    const req = mockRequest({ query: { granularity: 'hourly' } });
    const res = mockResponse();

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(AnalyticsService.getCoinEarningVelocity).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('granularity')
      })
    );
  });

  it('should accept all valid granularity values', async () => {
    AnalyticsService.getCoinEarningVelocity.mockResolvedValue(sampleVelocityData);

    for (const g of ['daily', 'weekly', 'monthly']) {
      const req = mockRequest({ query: { granularity: g } });
      const res = mockResponse();

      await analyticsController.getCoinEarningVelocity(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    }

    expect(AnalyticsService.getCoinEarningVelocity).toHaveBeenCalledTimes(3);
  });

  it('should return 500 if the service throws', async () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    AnalyticsService.getCoinEarningVelocity.mockRejectedValue(new Error('DB connection lost'));

    await analyticsController.getCoinEarningVelocity(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to fetch coin earning velocity analytics',
        error: 'DB connection lost'
      })
    );
  });
});
