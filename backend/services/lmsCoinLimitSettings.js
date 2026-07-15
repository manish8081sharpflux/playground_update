const {
  DEFAULT_LMS_COIN_LIMITS,
  LmsCoinLimitSettings,
} = require('../models/LmsCoinLimitSettings');

const QUALITY_KEYS = ['excellent', 'good', 'needs_improvement'];

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULT_LMS_COIN_LIMITS));
const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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
  const label = String(incoming?.label || fallback?.label || key).trim();
  if (!label) {
    throw new Error('Task type label is required');
  }

  const keywords = Array.isArray(incoming?.keywords)
    ? incoming.keywords.map(keyword => String(keyword).trim().toLowerCase()).filter(Boolean)
    : fallback?.keywords;
  const normalizedKeywords = keywords?.length
    ? keywords
    : [label.toLowerCase(), key.replace(/_/g, ' ')];

  const excellent = validateRange(incoming?.excellent || fallback?.excellent, `${label} excellent`);
  const good = validateRange(incoming?.good || fallback?.good, `${label} good`, excellent.min);
  const needsImprovement = validateRange(
    incoming?.needs_improvement || fallback?.needs_improvement,
    `${label} needs improvement`,
    good.min
  );

  return {
    label,
    keywords: [...new Set(normalizedKeywords)],
    excellent,
    good,
    needs_improvement: needsImprovement,
  };
};

const updateSettings = async (taskTypes, updatedBy) => {
  const defaults = cloneDefaults();
  const normalizedTaskTypes = {};
  const incomingTaskTypes = toPlainTaskTypes(taskTypes);
  const taskTypeKeys = new Set([
    ...Object.keys(defaults),
    ...Object.keys(incomingTaskTypes || {}),
  ]);

  taskTypeKeys.forEach((key) => {
    const normalizedKey = toSlug(key);
    if (!normalizedKey) {
      throw new Error('Task type key is required');
    }

    normalizedTaskTypes[normalizedKey] = normalizeTaskType(
      normalizedKey,
      incomingTaskTypes?.[key],
      defaults[normalizedKey]
    );
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
  const explicitTaskType = [
    submission?.courseTaskType,
    submission?.courseId?.taskType,
    submission?.metadata?.taskType,
  ]
    .find((taskType) => taskType && taskTypes[taskType]);

  if (explicitTaskType) {
    return explicitTaskType;
  }

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
