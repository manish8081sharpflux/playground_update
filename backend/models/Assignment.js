const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Coach ID
        required: true
    },
    targetType: {
        type: String,
        enum: ['balagruha', 'student'],
        required: true
    },
    targetIds: [{
        type: mongoose.Schema.Types.ObjectId, // Balagruha IDs or Student User IDs
        required: true
    }],
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    notificationSettings: {
        email: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Safe model definition to prevent OverwriteModelError
const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
