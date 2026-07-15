const mongoose = require("mongoose");

// Sprint 1.1 Legacy: FileSchema for backward compatibility
const FileSchema = new mongoose.Schema({
  fileName: String,
  fileType: String,
  fileUrl: String,
});

// Sprint 1.1 Legacy: QuizSchema for backward compatibility
const QuizSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswer: String,
});

// Sprint 2: Enhanced ContentItem Schema (polymorphic)
const ContentItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["video", "pdf", "audio", "image", "text", "link", "quiz", "task"],
    },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true, default: 0 },
    fileUrl: { type: String }, // For video, pdf, audio, image
    metadata: {
      duration: { type: Number }, // For video, audio (seconds)
      fileSize: { type: Number }, // For all file types (bytes)
      pages: { type: Number }, // For PDF
      width: { type: Number }, // For image
      height: { type: Number }, // For image
      language: { type: String }, // For text, video (subtitles)
    },
    // For quiz type
    quizData: {
      questions: [
        {
          question: String,
          options: [String],
          correctAnswer: String,
          points: { type: Number, default: 1 },
        },
      ],
      timeLimit: { type: Number }, // seconds
      passingScore: { type: Number }, // percentage
    },
    // Sprint 2: Reference to standalone Quiz (Story 03)
    quizRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    },
    // For text type
    textContent: { type: String },
    // For link type
    externalUrl: { type: String },
    // For task type
    taskData: {
      instructions: String,
      submissionType: {
        type: String,
        enum: ["file", "text", "video", "audio"],
      },
      maxFileSize: { type: Number }, // MB
    },
    // Sprint 2 Story 04: Translations support
    translations: {
      telugu: {
        title: String,
        description: String,
      },
    },
  },
  { timestamps: true }
);

// Sprint 2: Enhanced Chapter Schema with order and content items
const ChapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true, default: 0 }, // Sprint 2: For drag-and-drop
  // Sprint 1.1 Legacy fields (keep for backward compatibility)
  videoTitle: { type: String },
  videoUrl: { type: String },
  uploadLink: { type: String },
  files: [FileSchema],
  quizzes: [QuizSchema],
  // Sprint 2: New content items
  contentItems: [ContentItemSchema],
  // Sprint 2 Story 04: Translations support
  translations: {
    telugu: {
      title: String,
      description: String,
    },
  },
});

// Sprint 2: Enhanced Module Schema with order
const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true, default: 0 }, // Sprint 2: For drag-and-drop
  chapters: [ChapterSchema],
  // Sprint 2 Story 04: Translations support
  translations: {
    telugu: {
      title: String,
      description: String,
    },
  },
});

// Sprint 2: Enhanced Course Schema
const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    category: {
      type: String,
      enum: ["Computer Apps", "Art", "Spoken English", "Life Skills"],
    },
    duration: { type: String },
    difficultyLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    icon: { type: String, default: "📚" }, // Sprint 2: Emoji icon
    taskType: {
      type: String,
      default: "",
      trim: true,
    },
    thumbnail: { type: String },
    enableCoinReward: { type: Boolean, default: false },
    coinsOnCompletion: { type: Number, default: 0 },
    modules: [ModuleSchema],
    status: {
      type: String,
      enum: ["draft", "published", "archived"], // Sprint 2: Added "archived"
      default: "draft",
    },
    assignedBalagruha: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Balagruha" },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date }, // Sprint 2: Track publish date
    archivedAt: { type: Date }, // Sprint 2: Track archive date
    // Sprint 2: Translations support
    translations: {
      hindi: {
        title: String,
        description: String,
      },
      telugu: {
        title: String,
        description: String,
      },
    },
    // Sprint 2 Story 04: Available languages for this course
    languages: {
      type: [String],
      default: ['en'], // English is always default
      enum: ['en', 'hi', 'te'] // English, Hindi, Telugu
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Sprint 2: Indexes for performance
CourseSchema.index({ status: 1, createdAt: -1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ createdBy: 1 });
CourseSchema.index({ "modules.order": 1 });
CourseSchema.index({ "modules.chapters.order": 1 });

// Sprint 2: Virtual for module count
CourseSchema.virtual("moduleCount").get(function () {
  return this.modules?.length || 0;
});

// Sprint 2: Virtual for total chapter count
CourseSchema.virtual("chapterCount").get(function () {
  if (!this.modules || this.modules.length === 0) return 0;
  return this.modules.reduce(
    (total, module) => total + (module.chapters?.length || 0),
    0
  );
});

// Sprint 2: Virtual for total content item count
CourseSchema.virtual("contentItemCount").get(function () {
  if (!this.modules || this.modules.length === 0) return 0;
  return this.modules.reduce((total, module) => {
    if (!module.chapters || module.chapters.length === 0) return total;
    return (
      total +
      module.chapters.reduce((chTotal, chapter) => {
        return chTotal + (chapter.contentItems?.length || 0);
      }, 0)
    );
  }, 0);
});

// Sprint 2: Instance method to publish course
CourseSchema.methods.publish = async function () {
  this.status = "published";
  this.publishedAt = new Date();
  return await this.save();
};

// Sprint 2: Instance method to archive course
CourseSchema.methods.archive = async function () {
  this.status = "archived";
  this.archivedAt = new Date();
  return await this.save();
};

// Sprint 2: Instance method to restore course
CourseSchema.methods.restore = async function (restoreToStatus = "published") {
  this.status = restoreToStatus;
  this.archivedAt = null;
  return await this.save();
};

// Sprint 2: Static method to find active courses
CourseSchema.statics.findActive = function () {
  return this.find({ status: "published" });
};

// Sprint 2: Static method to find draft courses
CourseSchema.statics.findDrafts = function () {
  return this.find({ status: "draft" });
};

// Sprint 2: Static method to find archived courses
CourseSchema.statics.findArchived = function () {
  return this.find({ status: "archived" });
};

const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

module.exports = Course;
