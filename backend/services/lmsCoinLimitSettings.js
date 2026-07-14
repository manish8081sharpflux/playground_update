const {
  DEFAULT_LMS_COIN_LIMITS,
  LmsCoinLimitSettings,
} = require('../models/LmsCoinLimitSettings');

const QUALITY_KEYS = ['excellent', 'good', 'needs_improvement'];

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULT_LMS_COIN_LIMITS));

const toPlainTaskTypes = (taskTypes) => {
  if (!taskTypes) return cloneDefaults();
  if (taskTypes instanceof Map) {
    return Object.fromEntries(taskTypes.entries());
  }
  return taskTypes;
};

const getSettings = async () => {
  const settings = await LmsCoinLimitSettings.findOne({ key: 'default' }).lean();
  return {
    taskTypes: settings?.taskTypes
      ? { ...cloneDefaults(), ...toPlainTaskTypes(settings.taskTypes) }
      : cloneDefaults(),
    updatedAt: settings?.updatedAt || null,
    updatedBy: settings?.updatedBy || null,
  };
};

const validateRange = (range, label, previousMax = null) => {
  const min = Number(range?.min);
  const max = Number(range?.max);
  const defaultValue = Number(range?.default);

  if (![min, max, defaultValue].every(Number.isInteger)) {
    throw new Error(`${label} values must be whole numbers`);
  }
  if (min < 0 || max < 0 || defaultValue < 0) {
    throw new Error(`${label} values cannot be negative`);
  }
  if (min > max) {
    throw new Error(`${label} minimum cannot be greater than maximum`);
  }
  if (defaultValue < min || defaultValue > max) {
    throw new Error(`${label} default must be between minimum and maximum`);
  }
  if (previousMax !== null && max >= previousMax) {
    throw new Error(`${label} maximum must be less than the higher quality range`);
  }

  return { min, max, default: defaultValue };
};

const normalizeTaskType = (key, incoming, fallback) => {
  const label = String(incoming?.label || fallback.label || key).trim();
  const keywords = Array.isArray(incoming?.keywords)
    ? incoming.keywords.map(keyword => String(keyword).trim().toLowerCase()).filter(Boolean)
    : fallback.keywords;

  const excellent = validateRange(incoming?.excellent || fallback.excellent, `${label} excellent`);
  const good = validateRange(incoming?.good || fallback.good, `${label} good`, excellent.min);
  const needsImprovement = validateRange(
    incoming?.needs_improvement || fallback.needs_improvement,
    `${label} needs improvement`,
    good.min
  );

  return {
    label,
    keywords,
    excellent,
    good,
    needs_improvement: needsImprovement,
  };
};

const updateSettings = async (taskTypes, updatedBy) => {
  const defaults = cloneDefaults();
  const normalizedTaskTypes = {};

  Object.keys(defaults).forEach((key) => {
    normalizedTaskTypes[key] = normalizeTaskType(key, taskTypes?.[key], defaults[key]);
  });

  const settings = await LmsCoinLimitSettings.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        taskTypes: normalizedTaskTypes,
        updatedBy,
      },
      $setOnInsert: { key: 'default' },
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return {
    taskTypes: toPlainTaskTypes(settings.taskTypes),
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy,
  };
};

const resolveTaskTypeKey = (submission, taskTypes) => {
  const searchableText = [
    submission?.taskTitle,
    submission?.courseTitle,
    submission?.courseId?.title,
    submission?.metadata?.taskType,
    submission?.metadata?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return Object.entries(taskTypes).find(([, config]) =>
    (config.keywords || []).some(keyword => searchableText.includes(keyword.toLowerCase()))
  )?.[0] || 'story';
};

const getRangeForSubmission = async (submission, quality) => {
  const settings = await getSettings();
  const taskTypeKey = resolveTaskTypeKey(submission, settings.taskTypes);
  const taskType = settings.taskTypes[taskTypeKey] || settings.taskTypes.story;
  const rangeQuality = quality === 'outstanding' ? 'excellent' : quality;
  const range = taskType?.[rangeQuality];
  if (!range) {
    return { error: 'Invalid quality rating' };
  }

  return {
    taskTypeKey,
    taskTypeLabel: taskType.label,
    range,
  };
};

module.exports = {
  QUALITY_KEYS,
  getSettings,
  updateSettings,
  getRangeForSubmission,
};
