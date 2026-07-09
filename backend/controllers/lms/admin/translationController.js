const Course = require('../../../models/course');
const Quiz = require('../../../models/Quiz');
const mongoose = require('mongoose');
const { errorLogger } = require('../../../config/pino-config');

/**
 * Translation Controller - Sprint 2 Epic 02 Story 04
 * Handles English → Telugu translation management for LMS courses
 * Updated: 2025-10-27 - Added Quiz translation support
 */

/**
 * GET /api/v2/lms/admin/courses/:courseId/translation-progress
 * Get translation progress for a course (including quizzes)
 */
exports.getTranslationProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Calculate course content translation progress
    const courseProgress = calculateTranslationProgress(course);

    // Fetch and calculate quiz translation progress
    const quizzes = await Quiz.find({ course: courseId, status: 'published' });
    const quizProgress = calculateQuizTranslationProgress(quizzes);

    // Combine progress
    const totalItems = courseProgress.totalItems + quizProgress.totalItems;
    const translatedItems = courseProgress.translatedItems + quizProgress.translatedItems;
    const percentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

    const progress = {
      totalItems,
      translatedItems,
      percentage,
      breakdown: {
        ...courseProgress.breakdown,
        quizzes: quizProgress.breakdown
      }
    };

    res.json({
      success: true,
      progress
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching translation progress:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch translation progress',
      error: error.message
    });
  }
};

/**
 * GET /api/v2/lms/admin/courses/:courseId/translatable-items
 * Get list of all translatable items in a course (including quizzes)
 */
exports.getTranslatableItems = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status, type, search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Build translatable items list from course
    const courseItems = buildTranslatableItemsList(course);

    // Fetch quizzes and build quiz items list
    const quizzes = await Quiz.find({ course: courseId, status: 'published' });
    const quizItems = buildQuizTranslatableItemsList(quizzes, course);

    // Combine all items
    const items = [...courseItems, ...quizItems];

    // Apply filters
    let filteredItems = items;

    if (status && status !== 'all') {
      filteredItems = filteredItems.filter(item => item.translationStatus === status);
    }

    if (type && type !== 'all') {
      filteredItems = filteredItems.filter(item => item.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.english.title?.toLowerCase().includes(searchLower) ||
        item.telugu.title?.toLowerCase().includes(searchLower) ||
        item.english.description?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      items: filteredItems,
      total: filteredItems.length
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error fetching translatable items:');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch translatable items',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/translate/:itemId
 * Save translation for a specific item (including quizzes)
 */
exports.saveTranslation = async (req, res) => {
  try {
    const { courseId, itemId } = req.params;
    const { translations, markAsTranslated } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if this is a quiz translation
    if (itemId.startsWith('quiz-')) {
      const updated = await updateQuizTranslation(itemId, translations, markAsTranslated);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Quiz or question not found'
        });
      }

      // Get updated progress including quizzes
      const course = await Course.findById(courseId);
      const courseProgress = calculateTranslationProgress(course);
      const quizzes = await Quiz.find({ course: courseId, status: 'published' });
      const quizProgress = calculateQuizTranslationProgress(quizzes);

      const totalItems = courseProgress.totalItems + quizProgress.totalItems;
      const translatedItems = courseProgress.translatedItems + quizProgress.translatedItems;
      const percentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

      const progress = {
        totalItems,
        translatedItems,
        percentage,
        breakdown: {
          ...courseProgress.breakdown,
          quizzes: quizProgress.breakdown
        }
      };

      return res.json({
        success: true,
        message: 'Quiz translation saved successfully',
        progress
      });
    }

    // Otherwise, it's a course content item
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Parse itemId to determine item type and location
    // Format: "course" | "module-{moduleId}" | "chapter-{moduleId}-{chapterId}" | "content-{moduleId}-{chapterId}-{contentId}"
    const updated = updateTranslation(course, itemId, translations, markAsTranslated);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    await course.save();

    // Get updated progress
    const courseProgress = calculateTranslationProgress(course);
    const quizzes = await Quiz.find({ course: courseId, status: 'published' });
    const quizProgress = calculateQuizTranslationProgress(quizzes);

    const totalItems = courseProgress.totalItems + quizProgress.totalItems;
    const translatedItems = courseProgress.translatedItems + quizProgress.translatedItems;
    const percentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

    const progress = {
      totalItems,
      translatedItems,
      percentage,
      breakdown: {
        ...courseProgress.breakdown,
        quizzes: quizProgress.breakdown
      }
    };

    res.json({
      success: true,
      message: 'Translation saved successfully',
      progress
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error saving translation:');
    res.status(500).json({
      success: false,
      message: 'Failed to save translation',
      error: error.message
    });
  }
};

/**
 * PUT /api/v2/lms/admin/courses/:courseId/publish-translations
 * Publish all translations for a course
 * Updates course.languages field to include Telugu
 */
exports.publishTranslations = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Add Telugu to languages array if not already present
    if (!course.languages) {
      course.languages = ['en'];
    }

    if (!course.languages.includes('te')) {
      course.languages.push('te');
    }

    // Also update quizzes for this course to include Telugu language
    await Quiz.updateMany(
      { course: courseId },
      { $addToSet: { languages: 'te' } }
    );

    await course.save();

    // Calculate updated progress
    const courseProgress = calculateTranslationProgress(course);
    const quizzes = await Quiz.find({ course: courseId, status: 'published' });
    const quizProgress = calculateQuizTranslationProgress(quizzes);

    const totalItems = courseProgress.totalItems + quizProgress.totalItems;
    const translatedItems = courseProgress.translatedItems + quizProgress.translatedItems;
    const percentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

    const progress = {
      totalItems,
      translatedItems,
      percentage,
      breakdown: {
        ...courseProgress.breakdown,
        quizzes: quizProgress.breakdown
      }
    };

    res.json({
      success: true,
      message: 'Translations published successfully! Telugu is now available for students.',
      progress,
      languages: course.languages
    });

  } catch (error) {
    errorLogger.error({ err: error }, 'Error publishing translations:');
    res.status(500).json({
      success: false,
      message: 'Failed to publish translations',
      error: error.message
    });
  }
};

// ================== HELPER FUNCTIONS ==================

/**
 * Calculate translation progress for a course
 * Note: This is a synchronous calculation that doesn't include quiz progress
 * For quiz progress, call getQuizProgress separately
 */
function calculateTranslationProgress(course) {
  let totalItems = 0;
  let translatedItems = 0;

  // Course metadata
  totalItems += 2; // title, description
  if (course.translations?.telugu?.title) translatedItems++;
  if (course.translations?.telugu?.description) translatedItems++;

  // Modules
  course.modules.forEach(module => {
    totalItems += 2; // title, description
    if (module.translations?.telugu?.title) translatedItems++;
    if (module.translations?.telugu?.description) translatedItems++;

    // Chapters
    module.chapters.forEach(chapter => {
      totalItems += 2; // title, description
      if (chapter.translations?.telugu?.title) translatedItems++;
      if (chapter.translations?.telugu?.description) translatedItems++;

      // Content items
      chapter.contentItems?.forEach(item => {
        totalItems += 2; // title, description
        if (item.translations?.telugu?.title) translatedItems++;
        if (item.translations?.telugu?.description) translatedItems++;
      });
    });
  });

  const percentage = totalItems > 0 ? Math.round((translatedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    translatedItems,
    percentage,
    breakdown: {
      course: {
        total: 2,
        translated: (course.translations?.telugu?.title ? 1 : 0) +
                    (course.translations?.telugu?.description ? 1 : 0)
      },
      modules: getModuleProgress(course.modules),
      chapters: getChapterProgress(course.modules),
      contentItems: getContentItemProgress(course.modules)
    }
  };
}

function getModuleProgress(modules) {
  let total = 0;
  let translated = 0;

  modules.forEach(module => {
    total += 2;
    if (module.translations?.telugu?.title) translated++;
    if (module.translations?.telugu?.description) translated++;
  });

  return { total, translated };
}

function getChapterProgress(modules) {
  let total = 0;
  let translated = 0;

  modules.forEach(module => {
    module.chapters.forEach(chapter => {
      total += 2;
      if (chapter.translations?.telugu?.title) translated++;
      if (chapter.translations?.telugu?.description) translated++;
    });
  });

  return { total, translated };
}

function getContentItemProgress(modules) {
  let total = 0;
  let translated = 0;

  modules.forEach(module => {
    module.chapters.forEach(chapter => {
      chapter.contentItems?.forEach(item => {
        total += 2;
        if (item.translations?.telugu?.title) translated++;
        if (item.translations?.telugu?.description) translated++;
      });
    });
  });

  return { total, translated };
}

/**
 * Build list of all translatable items in a course
 */
function buildTranslatableItemsList(course) {
  const items = [];

  // Course metadata
  items.push({
    id: 'course',
    type: 'course',
    breadcrumb: 'Course Information',
    english: {
      title: course.title,
      description: course.description
    },
    telugu: {
      title: course.translations?.telugu?.title || '',
      description: course.translations?.telugu?.description || ''
    },
    translationStatus: getTranslationStatus({
      title: course.translations?.telugu?.title,
      description: course.translations?.telugu?.description
    })
  });

  // Modules, Chapters, and Content Items
  course.modules.forEach((module, moduleIndex) => {
    items.push({
      id: `module-${module._id}`,
      type: 'module',
      breadcrumb: `Module ${moduleIndex + 1}: ${module.title}`,
      english: {
        title: module.title,
        description: module.description
      },
      telugu: {
        title: module.translations?.telugu?.title || '',
        description: module.translations?.telugu?.description || ''
      },
      translationStatus: getTranslationStatus({
        title: module.translations?.telugu?.title,
        description: module.translations?.telugu?.description
      })
    });

    module.chapters.forEach((chapter, chapterIndex) => {
      items.push({
        id: `chapter-${module._id}-${chapter._id}`,
        type: 'chapter',
        breadcrumb: `Module ${moduleIndex + 1} > Chapter ${chapterIndex + 1}: ${chapter.title}`,
        english: {
          title: chapter.title,
          description: chapter.description
        },
        telugu: {
          title: chapter.translations?.telugu?.title || '',
          description: chapter.translations?.telugu?.description || ''
        },
        translationStatus: getTranslationStatus({
          title: chapter.translations?.telugu?.title,
          description: chapter.translations?.telugu?.description
        })
      });

      chapter.contentItems?.forEach((item, itemIndex) => {
        items.push({
          id: `content-${module._id}-${chapter._id}-${item._id}`,
          type: 'content',
          breadcrumb: `Module ${moduleIndex + 1} > Chapter ${chapterIndex + 1} > ${item.type}: ${item.title}`,
          english: {
            title: item.title,
            description: item.description
          },
          telugu: {
            title: item.translations?.telugu?.title || '',
            description: item.translations?.telugu?.description || ''
          },
          translationStatus: getTranslationStatus({
            title: item.translations?.telugu?.title,
            description: item.translations?.telugu?.description
          })
        });
      });
    });
  });

  return items;
}

function getTranslationStatus(translations) {
  const hasTitle = translations.title && translations.title.trim().length > 0;
  const hasDescription = translations.description && translations.description.trim().length > 0;

  if (hasTitle && hasDescription) return 'translated';
  if (hasTitle || hasDescription) return 'in_progress';
  return 'untranslated';
}

/**
 * Update translation for a specific item
 */
function updateTranslation(course, itemId, translations, markAsTranslated) {
  const parts = itemId.split('-');
  const itemType = parts[0];

  if (itemType === 'course') {
    if (!course.translations) course.translations = {};
    if (!course.translations.telugu) course.translations.telugu = {};

    course.translations.telugu.title = translations.title;
    course.translations.telugu.description = translations.description;
    return true;
  }

  if (itemType === 'module') {
    const moduleId = parts[1];
    const module = course.modules.id(moduleId);

    if (!module) return false;

    if (!module.translations) module.translations = {};
    if (!module.translations.telugu) module.translations.telugu = {};

    module.translations.telugu.title = translations.title;
    module.translations.telugu.description = translations.description;
    return true;
  }

  if (itemType === 'chapter') {
    const moduleId = parts[1];
    const chapterId = parts[2];
    const module = course.modules.id(moduleId);

    if (!module) return false;

    const chapter = module.chapters.id(chapterId);

    if (!chapter) return false;

    if (!chapter.translations) chapter.translations = {};
    if (!chapter.translations.telugu) chapter.translations.telugu = {};

    chapter.translations.telugu.title = translations.title;
    chapter.translations.telugu.description = translations.description;
    return true;
  }

  if (itemType === 'content') {
    const moduleId = parts[1];
    const chapterId = parts[2];
    const contentId = parts[3];

    const module = course.modules.id(moduleId);
    if (!module) return false;

    const chapter = module.chapters.id(chapterId);
    if (!chapter) return false;

    const content = chapter.contentItems.id(contentId);
    if (!content) return false;

    if (!content.translations) content.translations = {};
    if (!content.translations.telugu) content.translations.telugu = {};

    content.translations.telugu.title = translations.title;
    content.translations.telugu.description = translations.description;
    return true;
  }

  return false;
}

/**
 * Update quiz translation
 * Handles: "quiz-{quizId}" or "quiz-{quizId}-question-{questionId}"
 */
async function updateQuizTranslation(itemId, translations, markAsTranslated) {
  const parts = itemId.split('-');

  if (parts.length === 2) {
    // Format: "quiz-{quizId}" - translating quiz metadata
    const quizId = parts[1];
    const quiz = await Quiz.findById(quizId);

    if (!quiz) return false;

    if (!quiz.translations) quiz.translations = {};
    if (!quiz.translations.telugu) quiz.translations.telugu = {};

    quiz.translations.telugu.title = translations.title;
    quiz.translations.telugu.description = translations.description;

    await quiz.save();
    return true;
  }

  if (parts.length === 4 && parts[2] === 'question') {
    // Format: "quiz-{quizId}-question-{questionId}" - translating quiz question
    const quizId = parts[1];
    const questionId = parts[3];

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return false;

    const question = quiz.questions.id(questionId);
    if (!question) return false;

    if (!question.translations) question.translations = {};
    if (!question.translations.telugu) question.translations.telugu = {};

    question.translations.telugu.questionText = translations.title; // title = questionText
    question.translations.telugu.explanation = translations.description; // description = explanation

    // Handle MCQ options translation
    if ((question.type === 'mcq_single' || question.type === 'mcq_multiple') && translations.options) {
      question.translations.telugu.options = translations.options.map((optionText, index) => ({
        text: optionText,
        isCorrect: question.options[index]?.isCorrect || false
      }));
    }

    await quiz.save();
    return true;
  }

  return false;
}

/**
 * Build list of translatable items from quizzes
 */
function buildQuizTranslatableItemsList(quizzes, course) {
  const items = [];

  quizzes.forEach((quiz, quizIndex) => {
    // Find module/chapter info for breadcrumb
    let breadcrumb = 'Quiz';
    let chapterTitle = '';

    // Try to find which chapter this quiz belongs to
    course.modules.forEach((module, moduleIndex) => {
      module.chapters.forEach((chapter, chapterIndex) => {
        if (chapter._id.toString() === quiz.chapter?.toString()) {
          breadcrumb = `Module ${moduleIndex + 1} > Chapter ${chapterIndex + 1} > Quiz: ${quiz.title}`;
          chapterTitle = chapter.title;
        }
      });
    });

    // Quiz metadata (title and description)
    items.push({
      id: `quiz-${quiz._id}`,
      type: 'quiz',
      subtype: 'metadata',
      breadcrumb: `${breadcrumb}`,
      english: {
        title: quiz.title,
        description: quiz.description || ''
      },
      telugu: {
        title: quiz.translations?.telugu?.title || '',
        description: quiz.translations?.telugu?.description || ''
      },
      translationStatus: getTranslationStatus({
        title: quiz.translations?.telugu?.title,
        description: quiz.translations?.telugu?.description
      })
    });

    // Quiz questions
    quiz.questions.forEach((question, questionIndex) => {
      items.push({
        id: `quiz-${quiz._id}-question-${question._id}`,
        type: 'quiz_question',
        subtype: question.type,
        breadcrumb: `${breadcrumb} > Q${questionIndex + 1}`,
        english: {
          title: question.questionText,
          description: question.explanation || '',
          options: question.options?.map(opt => opt.text) || []
        },
        telugu: {
          title: question.translations?.telugu?.questionText || '',
          description: question.translations?.telugu?.explanation || '',
          options: question.translations?.telugu?.options?.map(opt => opt.text) || []
        },
        translationStatus: getQuizQuestionTranslationStatus(question),
        metadata: {
          questionType: question.type,
          hasExplanation: !!question.explanation,
          optionsCount: question.options?.length || 0
        }
      });
    });
  });

  return items;
}

function getQuizQuestionTranslationStatus(question) {
  const hasQuestionText = question.translations?.telugu?.questionText?.trim().length > 0;
  const hasExplanation = question.explanation ?
    question.translations?.telugu?.explanation?.trim().length > 0 : true;

  // For MCQ questions, check options
  if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
    const optionsCount = question.options?.length || 0;
    const translatedOptionsCount = question.translations?.telugu?.options?.filter(opt => opt.text).length || 0;

    if (hasQuestionText && hasExplanation && translatedOptionsCount === optionsCount) {
      return 'translated';
    } else if (hasQuestionText || translatedOptionsCount > 0) {
      return 'in_progress';
    } else {
      return 'untranslated';
    }
  }

  // For other question types (true/false, fill_blank)
  if (hasQuestionText && hasExplanation) return 'translated';
  if (hasQuestionText) return 'in_progress';
  return 'untranslated';
}

/**
 * Calculate quiz translation progress
 */
function calculateQuizTranslationProgress(quizzes) {
  let totalItems = 0;
  let translatedItems = 0;

  quizzes.forEach(quiz => {
    // Quiz title and description
    totalItems += 2;
    if (quiz.translations?.telugu?.title) translatedItems++;
    if (quiz.translations?.telugu?.description) translatedItems++;

    // Quiz questions
    quiz.questions.forEach(question => {
      // Question text
      totalItems++;
      if (question.translations?.telugu?.questionText) translatedItems++;

      // Explanation (if exists)
      if (question.explanation) {
        totalItems++;
        if (question.translations?.telugu?.explanation) translatedItems++;
      }

      // MCQ options
      if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
        const optionCount = question.options?.length || 0;
        totalItems += optionCount;

        const translatedOptionCount = question.translations?.telugu?.options?.filter(opt => opt.text).length || 0;
        translatedItems += translatedOptionCount;
      }
    });
  });

  return {
    totalItems,
    translatedItems,
    breakdown: {
      total: quizzes.length,
      translated: quizzes.filter(quiz =>
        quiz.translations?.telugu?.title && quiz.translations?.telugu?.description
      ).length
    }
  };
}
