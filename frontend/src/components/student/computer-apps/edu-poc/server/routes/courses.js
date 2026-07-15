const router  = require('express').Router();
const Course  = require('../models/Course');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/courses  — published courses list
router.get('/', protect, async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select('title description category thumbnail lessons quiz createdAt')
      .lean();
    // Add lesson/question counts
    const result = courses.map(c => ({
      ...c,
      lessonCount: c.lessons.length,
      hasQuiz: !!c.quiz?.questions?.length
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/courses/:id  — full course with content
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/courses  — admin: create course
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/courses/:id  — admin: update
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
