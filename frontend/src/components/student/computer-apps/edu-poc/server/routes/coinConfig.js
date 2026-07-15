// // server/routes/coinConfig.js  — admin manages coin rules
// const router     = require('express').Router();
// const CoinConfig = require('../models/CoinConfig');
// const { protect, adminOnly } = require('../middleware/auth');

// // GET /api/coin-config
// router.get('/', protect, async (req, res) => {
//   try {
//     const configs = await CoinConfig.find().sort('activityName level');
//     res.json(configs);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // POST /api/coin-config  — create or update
// router.post('/', protect, adminOnly, async (req, res) => {
//   try {
//     const { activityName, activityTitle, level, coins } = req.body;
//     const config = await CoinConfig.findOneAndUpdate(
//       { activityName, level },
//       { activityTitle, coins, createdBy: req.user._id },
//       { upsert: true, new: true, runValidators: true }
//     );
//     res.json(config);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // DELETE /api/coin-config/:id
// router.delete('/:id', protect, adminOnly, async (req, res) => {
//   try {
//     await CoinConfig.findByIdAndDelete(req.params.id);
//     res.json({ deleted: true });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// module.exports = router;

const router     = require('express').Router();
const CoinConfig = require('../models/CoinConfig');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/coin-config
router.get('/', protect, async (req, res) => {
  try {
    const configs = await CoinConfig.find().sort('activityName level');
    res.json(configs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/coin-config  — create or update a rule
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { activityName, activityTitle, level, coins } = req.body;
    const config = await CoinConfig.findOneAndUpdate(
      { activityName, level },
      { activityTitle, coins, createdBy: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(config);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/coin-config/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await CoinConfig.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
