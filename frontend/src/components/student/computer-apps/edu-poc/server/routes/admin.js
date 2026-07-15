const router   = require('express').Router();
const User     = require('../models/User');
const Progress = require('../models/Progress');
const Session  = require('../models/Session');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/admin/students  — all students with progress summary
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').lean();

    const results = await Promise.all(students.map(async (student) => {
      // Total time across all courses
      const timeSummary = await Session.aggregate([
        { $match: { userId: student._id, isActive: false } },
        { $group: { _id: null, totalMs: { $sum: '$durationMs' } } }
      ]);
      const totalTimeMin = timeSummary[0] ? Math.round(timeSummary[0].totalMs / 60000) : 0;

      // Avg completion across enrolled courses
      const progRecords = await Progress.find({ userId: student._id });
      const avgCompletion = progRecords.length
        ? Math.round(progRecords.reduce((a, p) => a + p.completionPct, 0) / progRecords.length)
        : 0;

      return {
        ...student,
        totalTimeMin,
        coursesEnrolled: progRecords.length,
        avgCompletion
      };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/students/:id  — single student full detail
router.get('/students/:id', protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const progress = await Progress.find({ userId: req.params.id }).populate('courseId', 'title lessons');
    const sessions = await Session.find({ userId: req.params.id, isActive: false })
      .populate('courseId', 'title')
      .sort('-startTime')
      .limit(50);

    res.json({ student, progress, sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/overview  — platform-wide stats
router.get('/overview', protect, adminOnly, async (req, res) => {
  try {
    const [totalStudents, totalSessions, progData] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Session.countDocuments({ isActive: false }),
      Progress.aggregate([{ $group: { _id: null, avgCompletion: { $avg: '$completionPct' } } }])
    ]);
    res.json({
      totalStudents,
      totalSessions,
      avgCompletion: Math.round(progData[0]?.avgCompletion || 0)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
