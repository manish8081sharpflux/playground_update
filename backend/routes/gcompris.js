const router = require("express").Router();
const GcomprisGameLog = require("../models/gcomprisGameLog");
const GcomprisCoinWallet = require("../models/gcomprisCoinWallet");
const { authenticate } = require("../middleware/auth");

const MAX_LEVEL = 6;

const titleFromActivity = (activityName = "") =>
  activityName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeLevel = (level) => {
  const numericLevel = Number(level);
  if (!Number.isFinite(numericLevel) || numericLevel < 1) return 1;
  return Math.min(Math.floor(numericLevel), MAX_LEVEL);
};

const defaultCoinsForResult = ({ durationMs = 0, passed = false, coinsAwarded }) => {
  if (Number.isFinite(Number(coinsAwarded))) return Number(coinsAwarded);
  if (!passed || durationMs < 10000) return 0;
  if (durationMs < 60000) return 2;
  if (durationMs < 180000) return 5;
  if (durationMs < 300000) return 8;
  if (durationMs < 600000) return 12;
  return 15;
};

router.post("/result", authenticate, async (req, res) => {
  try {
    const {
      sessionId,
      activityName,
      activityTitle,
      durationMs = 0,
      score = 0,
      level = 1,
      passed = false,
      coinsAwarded,
    } = req.body;

    if (!activityName) {
      return res.status(400).json({ success: false, message: "activityName is required" });
    }

    const attemptedLevel = normalizeLevel(level);
    const resultPassed = Boolean(passed) || Number(score) >= 60;
    const savedLevel = normalizeLevel(resultPassed ? attemptedLevel + 1 : attemptedLevel);
    const numericDuration = Math.max(0, Number(durationMs) || 0);
    const earnedCoins = defaultCoinsForResult({
      durationMs: numericDuration,
      passed: Boolean(passed),
      coinsAwarded,
    });

    const log = await GcomprisGameLog.create({
      userId: req.user._id,
      activityName,
      activityTitle: activityTitle || titleFromActivity(activityName),
      level: savedLevel,
      startTime: new Date(Date.now() - numericDuration),
      endTime: new Date(),
      durationMs: numericDuration,
      score: Number(score) || 0,
      passed: resultPassed,
      coinsAwarded: earnedCoins,
      sessionId,
    });

    if (earnedCoins > 0) {
      await GcomprisCoinWallet.findOneAndUpdate(
        { userId: req.user._id },
        {
          $inc: { totalCoins: earnedCoins },
          $push: {
            transactions: {
              type: "earn",
              amount: earnedCoins,
              reason: `${log.activityTitle} level ${log.level}`,
              gameLogId: log._id,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/latest/:sessionId", authenticate, async (req, res) => {
  try {
    const log = await GcomprisGameLog.findOne({
      userId: req.user._id,
      sessionId: req.params.sessionId,
    }).sort("-createdAt");

    if (!log) return res.status(404).json({ success: false, message: "Not ready" });
    res.json(log);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/logs", authenticate, async (req, res) => {
  try {
    const logs = await GcomprisGameLog.find({ userId: req.user._id })
      .sort("-createdAt")
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/wallet", authenticate, async (req, res) => {
  try {
    const wallet = await GcomprisCoinWallet.findOne({ userId: req.user._id });
    res.json(wallet || { totalCoins: 0, transactions: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/lastlevel/:activity", authenticate, async (req, res) => {
  try {
    const log = await GcomprisGameLog.findOne({
      userId: req.user._id,
      activityName: req.params.activity,
    }).sort("-level -createdAt");

    res.send(String(log ? normalizeLevel(log.level) : 1));
  } catch (error) {
    res.status(500).send("1");
  }
});

module.exports = router;
