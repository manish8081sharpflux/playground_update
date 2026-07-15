const router     = require('express').Router();
const ArtWork    = require('../models/ArtWork');
const CoinWallet = require('../models/CoinWallet');
const { protect } = require('../middleware/auth');

// ── Coins per points range ────────────────────────────────────────────────────
function calcCoins(points) {
  if (points >= 90) return 20;
  if (points >= 75) return 15;
  if (points >= 60) return 10;
  if (points >= 40) return 5;
  return 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/artweaver/submit
router.post('/submit', protect, async (req, res) => {
  try {
    const { imageData, title, description } = req.body;
    if (!imageData) return res.status(400).json({ message: 'imageData is required' });

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const fileSize   = Math.round((base64Data.length * 3) / 4);

    const artwork = await ArtWork.create({
      userId:      req.user._id,
      title:       title || 'Untitled Drawing',
      description: description || '',
      imageData,
      fileSize,
      status:      'submitted',
    });

    res.status(201).json({ success: true, artwork: _safeArtwork(artwork) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/artweaver/my
router.get('/my', protect, async (req, res) => {
  try {
    const artworks = await ArtWork.find({ userId: req.user._id })
      .sort('-createdAt')
      .select('-imageData');
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/artweaver/my/:id
router.get('/my/:id', protect, async (req, res) => {
  try {
    const artwork = await ArtWork.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/artweaver/my/:id
router.delete('/my/:id', protect, async (req, res) => {
  try {
    const artwork = await ArtWork.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    if (artwork.status === 'evaluated')
      return res.status(400).json({ message: 'Cannot delete an evaluated drawing' });

    await artwork.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// IMPORTANT: /admin/stats and /admin/all MUST come BEFORE /admin/:id
// otherwise Express treats 'stats' and 'all' as the :id parameter
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/artweaver/admin/stats  ← static route FIRST
router.get('/admin/stats', protect, async (req, res) => {
  try {
    const [total, pending, evaluated, totalCoins] = await Promise.all([
      ArtWork.countDocuments(),
      ArtWork.countDocuments({ status: 'submitted' }),
      ArtWork.countDocuments({ status: 'evaluated' }),
      ArtWork.aggregate([
        { $group: { _id: null, total: { $sum: '$coinsAwarded' } } }
      ]),
    ]);
    res.json({
      total,
      pending,
      evaluated,
      totalCoinsAwarded: totalCoins[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/artweaver/admin/all  ← static route SECOND
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const artworks = await ArtWork.find(filter)
      .populate('userId', 'name email')
      .sort('-createdAt')
      .select('-imageData');
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/artweaver/admin/:id  ← dynamic route LAST
router.get('/admin/:id', protect, async (req, res) => {
  try {
    const artwork = await ArtWork.findById(req.params.id)
      .populate('userId', 'name email');
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/artweaver/admin/:id/evaluate
router.post('/admin/:id/evaluate', protect, async (req, res) => {
  try {
    const { points, feedback } = req.body;
    if (points === undefined || points === null)
      return res.status(400).json({ message: 'points is required' });
    if (points < 0 || points > 100)
      return res.status(400).json({ message: 'points must be 0–100' });

    const artwork = await ArtWork.findById(req.params.id);
    if (!artwork) return res.status(404).json({ message: 'Not found' });

    const coins = calcCoins(points);

    artwork.points       = points;
    artwork.feedback     = feedback || '';
    artwork.status       = 'evaluated';
    artwork.evaluatedBy  = req.user._id;
    artwork.evaluatedAt  = new Date();
    artwork.coinsAwarded = coins;
    await artwork.save();

    if (coins > 0) {
      await CoinWallet.findOneAndUpdate(
        { userId: artwork.userId },
        {
          $inc: { totalCoins: coins },
          $push: {
            transactions: {
              type:   'earn',
              amount: coins,
              reason: `Art evaluation: ${artwork.title} · ${points}/100`,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, artwork: _safeArtwork(artwork), coinsAwarded: coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ── Helper: strip imageData from list responses ───────────────────────────────
function _safeArtwork(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.imageData;
  return obj;
}

module.exports = router;