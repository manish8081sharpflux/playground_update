const router  = require('express').Router();
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');

// POST /api/sessions/start
router.post('/start', protect, async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    // Close any previously open session for this user/lesson
    await Session.updateMany(
      { userId: req.user._id, lessonId, isActive: true },
      { $set: { isActive: false, endTime: new Date() } }
    );
    const session = await Session.create({ userId: req.user._id, courseId, lessonId });
    res.status(201).json({ sessionId: session._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/sessions/:id/end
router.patch('/:id/end', protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    await session.closeSession();
    res.json({ durationMs: session.durationMs, durationMin: Math.round(session.durationMs / 60000) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions/summary — total time per course for logged-in student
router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await Session.aggregate([
      { $match: { userId: req.user._id, isActive: false } },
      { $group: { _id: '$courseId', totalMs: { $sum: '$durationMs' }, sessionCount: { $sum: 1 } } },
      { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      { $project: { courseId: '$_id', courseTitle: '$course.title', totalMs: 1, sessionCount: 1, totalMin: { $round: [{ $divide: ['$totalMs', 60000] }, 1] } } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
