const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    },
    completionPercentage: {
        type: Number,
        default: 0
    },
    completedModules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module' // Note: Module is subdoc of Course usually, but we track IDs
    }],
    completedChapters: [{
        type: mongoose.Schema.Types.ObjectId
    }],
    completedItems: [{ // Granular item completion (video matched, quiz passed)
        itemId: {
            type: mongoose.Schema.Types.ObjectId
        },
        itemType: {
            type: String,
            enum: ['video', 'pdf', 'audio', 'image', 'text', 'link', 'quiz', 'task']
        },
        completedAt: {
            type: Date,
            default: Date.now
        },
        score: Number, // For quizzes
        metadata: mongoose.Schema.Types.Mixed // For tool-specific data (Artweaver file, etc)
    }],
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index to ensure one progress record per student per course
studentProgressSchema.index({ student: 1, course: 1 }, { unique: true });

const StudentProgress = mongoose.models.StudentProgress || mongoose.model("StudentProgress", studentProgressSchema);

module.exports = StudentProgress;
