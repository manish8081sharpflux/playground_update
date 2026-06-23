const mongoose = require('mongoose');

/**
 * Quiz Model - Sprint 2 Epic 02 Story 03
 * Quiz authoring and management system for LMS
 *
 * Supports:
 * - Multiple question types (MCQ single/multiple, True/False, Fill-in-Blank)
 * - Quiz settings (time limit, passing score, randomization)
 * - Question bank integration
 * - Publishing workflow (draft/published)
 */

const quizSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    minlength: [3, 'Quiz title must be at least 3 characters'],
    maxlength: [200, 'Quiz title cannot exceed 200 characters']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Course Association
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    index: true
  },

  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },

  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    index: true
  },

  // Questions (embedded)
  questions: [{
    type: {
      type: String,
      enum: ['mcq_single', 'mcq_multiple', 'true_false', 'fill_blank'],
      required: true
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

    // Question Bank reference
    questionBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank'
    },

    order: {
      type: Number,
      required: true
    },

    // Sprint 2 Story 04: Question-level translations
    translations: {
      telugu: {
        questionText: String,
        explanation: String,
        options: [{
          text: String
        }]
      }
    }
  }],

  // Quiz Settings
  settings: {
    timeLimit: {
      type: Number, // minutes
      min: [0, 'Time limit cannot be negative'],
      max: [180, 'Time limit cannot exceed 180 minutes']
    },

    noTimeLimit: {
      type: Boolean,
      default: false
    },

    passingScore: {
      type: Number, // percentage
      required: true,
      min: [0, 'Passing score must be between 0-100'],
      max: [100, 'Passing score must be between 0-100'],
      default: 70
    },

    randomizeQuestions: {
      type: Boolean,
      default: false
    },

    randomizeOptions: {
      type: Boolean,
      default: false
    },

    showQuestionsOneAtTime: {
      type: Boolean,
      default: false
    },

    showResults: {
      type: String,
      enum: ['immediate', 'after_all_complete', 'manual'],
      default: 'immediate'
    },

    showScore: {
      type: Boolean,
      default: true
    },

    showCorrectness: {
      type: Boolean,
      default: true
    },

    showAnswers: {
      type: Boolean,
      default: true
    },

    showExplanations: {
      type: Boolean,
      default: true
    },

    maxAttempts: {
      type: Number,
      min: [1, 'Max attempts must be at least 1'],
      max: [10, 'Max attempts cannot exceed 10']
    },

    unlimitedAttempts: {
      type: Boolean,
      default: false
    },

    waitBetweenAttempts: {
      type: Number, // minutes
      min: [0, 'Wait time cannot be negative'],
      max: [1440, 'Wait time cannot exceed 24 hours (1440 minutes)'],
      default: 0
    }
  },

  // Publishing Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },

  publishedAt: Date,

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

  tags: [String],

  usageCount: {
    type: Number,
    default: 0
  },

  // Sprint 2 Story 04: Quiz-level translations
  translations: {
    telugu: {
      title: String,
      description: String
    }
  },

  // Sprint 2 Story 04: Available languages for this quiz
  languages: {
    type: [String],
    default: ['en'], // English is always default
    enum: ['en', 'hi', 'te'] // English, Hindi, Telugu
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
quizSchema.index({ title: 'text', description: 'text' });
quizSchema.index({ status: 1, createdAt: -1 });
quizSchema.index({ course: 1, chapter: 1 });

// Virtuals
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((sum, q) => sum + q.points, 0);
});

quizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Methods
quizSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

quizSchema.methods.unpublish = function() {
  this.status = 'draft';
  this.publishedAt = null;
  return this.save();
};

quizSchema.methods.duplicate = function(userId) {
  const quizData = this.toObject();
  delete quizData._id;
  delete quizData.createdAt;
  delete quizData.updatedAt;
  delete quizData.publishedAt;

  quizData.title = `${quizData.title} - Copy`;
  quizData.status = 'draft';
  quizData.createdBy = userId;
  quizData.usageCount = 0;

  // Remove questionBankId from questions (duplicates are independent)
  quizData.questions = quizData.questions.map(q => {
    const question = { ...q };
    delete question._id;
    delete question.questionBankId;
    return question;
  });

  return new this.constructor(quizData);
};

// Validation
quizSchema.pre('save', function(next) {
  // Validate at least one question for published quizzes
  if (this.status === 'published' && this.questions.length === 0) {
    next(new Error('Published quizzes must have at least one question'));
  }

  // Validate question data based on type
  for (const question of this.questions) {
    if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
      if (!question.options || question.options.length < 2) {
        next(new Error('MCQ questions must have at least 2 options'));
      }

      const correctOptions = question.options.filter(opt => opt.isCorrect);

      if (question.type === 'mcq_single' && correctOptions.length !== 1) {
        next(new Error('MCQ Single Answer must have exactly 1 correct option'));
      }

      if (question.type === 'mcq_multiple' && correctOptions.length < 2) {
        next(new Error('MCQ Multiple Answers must have at least 2 correct options'));
      }
    }

    if (question.type === 'true_false' && question.correctAnswer === undefined) {
      next(new Error('True/False questions must have a correct answer'));
    }

    if (question.type === 'fill_blank') {
      if (!question.questionText.includes('_____')) {
        next(new Error('Fill-in-Blank questions must contain at least one blank (_____))'));
      }

      if (!question.acceptedAnswers || question.acceptedAnswers.length === 0) {
        next(new Error('Fill-in-Blank questions must have at least one accepted answer'));
      }
    }
  }

  next();
});

// Static methods
quizSchema.statics.findPublished = function(filter = {}) {
  return this.find({ ...filter, status: 'published' })
    .populate('course', 'title')
    .populate('chapter', 'title');
};

quizSchema.statics.findByChapter = function(chapterId) {
  return this.find({ chapter: chapterId, status: 'published' })
    .sort('createdAt');
};

const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);

module.exports = Quiz;
