// backend/models/ArtCompetition.js
const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Untitled Entry',
    maxlength: 200,
  },
  votes: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const ArtCompetitionSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'judging', 'completed'],
      default: 'upcoming',
      index: true,
    },
    prize: {
      first: { type: Number, default: 100 },
      second: { type: Number, default: 50 },
      third: { type: Number, default: 25 },
    },
    rules: {
      type: [String],
      default: [],
    },
    judging: {
      criteria: { type: [String], default: [] },
      judges: { type: [String], default: [] },
    },
    entries: [EntrySchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ArtCompetitionSchema.index({ status: 1, deadline: -1 });

// Virtual: total submission count
ArtCompetitionSchema.virtual('totalSubmissions').get(function () {
  return this.entries?.length || 0;
});

// Virtual: leaderboard (sorted by votes desc)
ArtCompetitionSchema.virtual('leaderboard').get(function () {
  if (!this.entries || this.entries.length === 0) return [];
  return [...this.entries]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10)
    .map((entry, idx) => ({
      rank: idx + 1,
      studentId: entry.student,
      artworkUrl: entry.fileUrl,
      artworkTitle: entry.title,
      votes: entry.votes,
    }));
});

const ArtCompetition =
  mongoose.models.ArtCompetition ||
  mongoose.model('ArtCompetition', ArtCompetitionSchema);

module.exports = ArtCompetition;
