const router   = require('express').Router();
const Progress = require('../models/Progress');
const Course   = require('../models/Course');
const { protect } = require('../middleware/auth');

// GET /api/progress/:courseId
router.get('/:courseId', protect, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user._id, courseId: req.params.courseId });
    res.json(progress || { completedLessons: [], completionPct: 0, quizAttempts: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/progress/:courseId/lesson/:lessonId  — mark lesson complete
router.post('/:courseId/lesson/:lessonId', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let progress = await Progress.findOne({ userId: req.user._id, courseId: req.params.courseId });
    if (!progress) {
      progress = new Progress({ userId: req.user._id, courseId: req.params.courseId });
    }

    const lessonId = req.params.lessonId;
    if (!progress.completedLessons.map(String).includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    const total = course.lessons.length;
    progress.completionPct = total > 0 ? Math.round((progress.completedLessons.length / total) * 100) : 0;
    if (progress.completionPct === 100) progress.completedAt = new Date();

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/progress/:courseId/quiz  — submit quiz attempt
router.post('/:courseId/quiz', protect, async (req, res) => {
  try {
    const { answers } = req.body; // [{ questionIndex, selectedIndex }]
    const course = await Course.findById(req.params.courseId);
    if (!course?.quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { questions, passMark } = course.quiz;
    let correct = 0;
    const gradedAnswers = answers.map(({ questionIndex, selectedIndex }) => {
      const isCorrect = questions[questionIndex]?.correctIndex === selectedIndex;
      if (isCorrect) correct++;
      return { questionIndex, selectedIndex, correct: isCorrect };
    });

    const score  = Math.round((correct / questions.length) * 100);
    const passed = score >= passMark;

    let progress = await Progress.findOne({ userId: req.user._id, courseId: req.params.courseId });
    if (!progress) progress = new Progress({ userId: req.user._id, courseId: req.params.courseId });

    progress.quizAttempts.push({ score, passed, answers: gradedAnswers });
    progress.bestQuizScore = Math.max(progress.bestQuizScore, score);
    await progress.save();

    res.json({ score, passed, correct, total: questions.length, gradedAnswers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
