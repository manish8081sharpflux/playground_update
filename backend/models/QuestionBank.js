const mongoose = require('mongoose');

/**
 * QuestionBank Model - Sprint 2 Epic 02 Story 03
 * Reusable question library for quiz assembly
 *
 * Features:
 * - Store questions for reuse across multiple quizzes
 * - Track usage count and quizzes using each question
 * - Tag-based categorization
 * - Full-text search
 */

const questionBankSchema = new mongoose.Schema({
  // Question Content
  type: {
    type: String,
    enum: ['mcq_single', 'mcq_multiple', 'true_false', 'fill_blank'],
    required: true,
    index: true
  },

  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },

  points: {
    type: Number,
    required: true,
    min: [1, 'Points must be at least 1'],
    max: [100, 'Points cannot exceed 100'],
    default: 5
  },

  explanation: {
    type: String,
    trim: true
  },

  // MCQ fields
  options: [{
    text: String,
    isCorrect: Boolean
  }],

  // True/False field
  correctAnswer: Boolean,

  // Fill-in-Blank fields
  acceptedAnswers: [{
    type: String,
    trim: true
  }],

  caseInsensitive: {
    type: Boolean,
    default: true
  },

  ignoreExtraSpaces: {
    type: Boolean,
    default: true
  },

  // Partial credit for MCQ multiple
  partialCredit: {
    type: Boolean,
    default: false
  },

  // Categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  category: {
    type: String,
    trim: true
  },

  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },

  // Usage Tracking
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },

  usedInQuizzes: [{
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    quizTitle: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
questionBankSchema.index({ questionText: 'text', tags: 'text' });
questionBankSchema.index({ type: 1, difficulty: 1 });
questionBankSchema.index({ tags: 1 });
questionBankSchema.index({ createdBy: 1, createdAt: -1 });

// Methods
questionBankSchema.methods.addUsage = function(quizId, quizTitle) {
  // Check if already tracking this quiz
  const existingUsage = this.usedInQuizzes.find(u => u.quizId.equals(quizId));

  if (!existingUsage) {
    this.usedInQuizzes.push({
      quizId,
      quizTitle,
      addedAt: new Date()
    });
    this.usageCount += 1;
  }

  return this.save();
};

questionBankSchema.methods.removeUsage = function(quizId) {
  this.usedInQuizzes = this.usedInQuizzes.filter(u => !u.quizId.equals(quizId));
  this.usageCount = this.usedInQuizzes.length;
  return this.save();
};

questionBankSchema.methods.toQuizQuestion = function(order) {
  return {
    type: this.type,
    questionText: this.questionText,
    points: this.points,
    explanation: this.explanation,
    options: this.options,
    correctAnswer: this.correctAnswer,
    acceptedAnswers: this.acceptedAnswers,
    caseInsensitive: this.caseInsensitive,
    ignoreExtraSpaces: this.ignoreExtraSpaces,
    partialCredit: this.partialCredit,
    questionBankId: this._id,
    order: order
  };
};

// Static methods
questionBankSchema.statics.searchQuestions = function(searchTerm, filters = {}) {
  const query = { isActive: true };

  // Full-text search
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }

  // Type filter
  if (filters.type && filters.type !== 'all') {
    query.type = filters.type;
  }

  // Tag filter
  if (filters.tag) {
    query.tags = filters.tag;
  }

  // Difficulty filter
  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }

  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }

  return this.find(query)
    .populate('createdBy', 'name email')
    .sort(searchTerm ? { score: { $meta: 'textScore' } } : '-usageCount');
};

questionBankSchema.statics.getMostUsed = function(limit = 10) {
  return this.find({ isActive: true })
    .sort('-usageCount')
    .limit(limit)
    .populate('createdBy', 'name');
};

questionBankSchema.statics.findByTag = function(tag) {
  return this.find({ tags: tag, isActive: true })
    .sort('-usageCount');
};

const QuestionBank = mongoose.models.QuestionBank || mongoose.model("QuestionBank", questionBankSchema);

module.exports = QuestionBank;
