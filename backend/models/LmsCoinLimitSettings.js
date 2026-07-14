const mongoose = require('mongoose');

const qualityRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    default: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const taskTypeLimitSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    keywords: [{ type: String }],
    excellent: { type: qualityRangeSchema, required: true },
    good: { type: qualityRangeSchema, required: true },
    needs_improvement: { type: qualityRangeSchema, required: true },
  },
  { _id: false }
);

const lmsCoinLimitSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      immutable: true,
    },
    taskTypes: {
      type: Map,
      of: taskTypeLimitSchema,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const DEFAULT_LMS_COIN_LIMITS = {
  story: {
    label: 'Stories',
    keywords: ['story', 'stories'],
    excellent: { min: 40, max: 50, default: 45 },
    good: { min: 25, max: 39, default: 30 },
    needs_improvement: { min: 0, max: 24, default: 10 },
  },
  scene: {
    label: 'Scenes',
    keywords: ['scene', 'scenes'],
    excellent: { min: 24, max: 30, default: 27 },
    good: { min: 15, max: 23, default: 18 },
    needs_improvement: { min: 0, max: 14, default: 5 },
  },
  revision: {
    label: 'Revision',
    keywords: ['revision', 'revise'],
    excellent: { min: 8, max: 10, default: 9 },
    good: { min: 5, max: 7, default: 6 },
    needs_improvement: { min: 0, max: 4, default: 2 },
  },
  poem: {
    label: 'Poem',
    keywords: ['poem', 'poetry', 'recitation'],
    excellent: { min: 40, max: 50, default: 45 },
    good: { min: 25, max: 39, default: 30 },
    needs_improvement: { min: 0, max: 24, default: 10 },
  },
  buddy_system: {
    label: 'Buddy System',
    keywords: ['buddy', 'buddy system'],
    excellent: { min: 24, max: 30, default: 27 },
    good: { min: 15, max: 23, default: 18 },
    needs_improvement: { min: 0, max: 14, default: 5 },
  },
};

const LmsCoinLimitSettings =
  mongoose.models.LmsCoinLimitSettings ||
  mongoose.model('LmsCoinLimitSettings', lmsCoinLimitSettingsSchema);

module.exports = {
  DEFAULT_LMS_COIN_LIMITS,
  LmsCoinLimitSettings,
};
