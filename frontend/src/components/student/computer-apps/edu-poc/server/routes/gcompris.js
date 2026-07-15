const router     = require('express').Router();
const GameLog    = require('../models/GameLog');
const CoinWallet = require('../models/CoinWallet');
const CoinConfig = require('../models/CoinConfig');
const { protect } = require('../middleware/auth');

// POST /api/gcompris/sync
router.post('/sync', protect, async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const rec of records) {
      const durationMs = rec.durationMs ||
        (rec.endTime && rec.startTime
          ? new Date(rec.endTime) - new Date(rec.startTime) : 0);

      const config = await CoinConfig.findOne({
        activityName: rec.activityName,
        level:        rec.level || 1,
      });
      const coins = config ? config.coins : 0;

      const log = await GameLog.create({
        userId:        req.user._id,
        activityName:  rec.activityName,
        activityTitle: rec.activityTitle ||
                       rec.activityName.replace(/_/g, ' '),
        level:         rec.level || 1,
        startTime:     rec.startTime,
        endTime:       rec.endTime,
        durationMs,
        score:         rec.score || 0,
        passed:        (rec.score || 0) >= 60,
        coinsAwarded:  coins,
        sessionId:     rec.sessionId || null,
      });

      if (coins > 0) {
        await CoinWallet.findOneAndUpdate(
          { userId: req.user._id },
          {
            $inc: { totalCoins: coins },
            $push: {
              transactions: {
                type:      'earn',
                amount:    coins,
                reason:    `${log.activityTitle} · level ${log.level}`,
                gameLogId: log._id,
              },
            },
          },
          { upsert: true, new: true }
        );
      }

      results.push({ logId: log._id, coinsAwarded: coins });
    }

    res.json({ synced: results.length, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/gcompris/result — called by launch.vbs after GCompris closes
router.post('/result', protect, async (req, res) => {
  try {
    const { sessionId, activityName, durationMs, score, level, passed, coinsAwarded } = req.body;
    const userId = req.user._id;

    const log = await GameLog.create({
      userId,
      activityName,
      activityTitle: activityName.replace(/_/g, ' '),
      level:         level || 1,
      startTime:     new Date(Date.now() - durationMs),
      endTime:       new Date(),
      durationMs,
      score:         score || 0,
      passed:        passed || false,
      coinsAwarded:  coinsAwarded || 0,
      sessionId,
    });

    if (coinsAwarded > 0) {
      await CoinWallet.findOneAndUpdate(
        { userId },
        {
          $inc: { totalCoins: coinsAwarded },
          $push: {
            transactions: {
              type:      'earn',
              amount:    coinsAwarded,
              reason:    `${log.activityTitle} · level ${log.level}`,
              gameLogId: log._id,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/gcompris/latest/:sessionId — polled by React overlay every 3s
router.get('/latest/:sessionId', protect, async (req, res) => {
  try {
    const log = await GameLog.findOne({
      userId:    req.user._id,
      sessionId: req.params.sessionId,
    }).sort('-createdAt');

    if (!log) return res.status(404).json({ message: 'Not ready' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/gcompris/logs
router.get('/logs', protect, async (req, res) => {
  try {
    const logs = await GameLog.find({ userId: req.user._id })
      .sort('-createdAt').limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/gcompris/wallet
router.get('/wallet', protect, async (req, res) => {
  try {
    let wallet = await CoinWallet.findOne({ userId: req.user._id });
    if (!wallet) wallet = { totalCoins: 0, transactions: [] };
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET /api/gcompris/lastlevel/:activity
// Returns the highest level the student reached for this activity
router.get('/lastlevel/:activity', protect, async (req, res) => {
  try {
    const log = await GameLog.findOne({
      userId:       req.user._id,
      activityName: req.params.activity,
    }).sort('-level -createdAt');
    res.send(String(log ? log.level : 1));
  } catch (err) {
    res.status(500).send('1');
  }
});

// GET /api/gcompris/admin/students — all students game summary (admin only)
router.get('/admin/students', protect, async (req, res) => {
  try {
    const logs = await GameLog.find()
      .populate('userId', 'name email')
      .sort('-createdAt');

    const wallets = await CoinWallet.find()
      .populate('userId', 'name email');

    // Group logs by student
    const studentMap = {};
    for (const log of logs) {
      if (!log.userId) continue;
      const uid = log.userId._id.toString();
      if (!studentMap[uid]) {
        studentMap[uid] = {
          _id:        uid,
          name:       log.userId.name,
          email:      log.userId.email,
          totalCoins: 0,
          totalGames: 0,
          activities: {},
          recentLogs: [],
        };
      }
      studentMap[uid].totalGames += 1;
      studentMap[uid].recentLogs.push(log);
      const act = log.activityName;
      if (!studentMap[uid].activities[act]) {
        studentMap[uid].activities[act] = { sessions: 0, totalMs: 0 };
      }
      studentMap[uid].activities[act].sessions += 1;
      studentMap[uid].activities[act].totalMs  += log.durationMs || 0;
    }

    // Attach coin totals
    for (const w of wallets) {
      if (!w.userId) continue;
      const uid = w.userId._id.toString();
      if (studentMap[uid]) studentMap[uid].totalCoins = w.totalCoins;
    }

    res.json(Object.values(studentMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
  });

module.exports = router;