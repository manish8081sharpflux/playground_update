const User = require('../../../models/user');
const StudentProgress = require('../../../models/StudentProgress');
const Coin = require('../../../models/coin');
const CourseAssignment = require('../../../models/CourseAssignment');
const mongoose = require('mongoose');
const { errorLogger } = require('../../../config/pino-config');

/**
 * Coach Reports Controller - Epic 03 Story 04
 * Handles analytics and reporting for coaches
 * FIX-011: All queries scoped to coach's Balagruha students
 */

/**
 * Helper: Get student IDs belonging to the coach's Balagruhas
 */
async function getBalagruhaStudentIds(coachBalagruhaIds) {
    if (!coachBalagruhaIds || coachBalagruhaIds.length === 0) {
        return [];
    }
    const students = await User.find({
        role: 'student',
        balagruhaIds: { $in: coachBalagruhaIds }
    }).select('_id');
    return students.map(s => s._id);
}

/**
 * @desc Get overview stats for coach dashboard
 * @route GET /api/v2/lms/coach/reports/overview
 * @access Private (Coach)
 */
exports.getOverviewStats = async (req, res) => {
    try {
        const coachId = req.user._id;
        const coachBalagruhaIds = req.user.balagruhaIds || [];

        // Scope students to coach's Balagruhas
        const studentIds = await getBalagruhaStudentIds(coachBalagruhaIds);
        const studentsCount = studentIds.length;

        // Calculate total coins distributed by this coach
        const coinsDistributedAgg = await Coin.aggregate([
            { $unwind: "$transactions" },
            { $match: { "transactions.metadata.awardedBy": coachId } },
            { $group: { _id: null, total: { $sum: "$transactions.amount" } } }
        ]);
        const totalCoinsDistributed = coinsDistributedAgg[0]?.total || 0;

        // Active Courses Count (Assignments by this coach)
        const activeAssignments = await CourseAssignment.countDocuments({ assignedBy: coachId, status: 'active' });

        // Scoped engagement metrics from StudentProgress for balagruha students
        const completions = await StudentProgress.aggregate([
            { $match: { student: { $in: studentIds } } },
            { $unwind: "$completedItems" },
            { $count: "totalCompletions" }
        ]);
        const totalActivitiesCompleted = completions[0]?.totalCompletions || 0;

        res.json({
            success: true,
            stats: {
                totalStudents: studentsCount,
                totalCoinsAwarded: totalCoinsDistributed,
                activeAssignments,
                totalActivitiesCompleted
            }
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Coach Overview Stats Error:');
        res.status(500).json({
            success: false,
            message: 'Server error fetching stats',
            error: error.message
        });
    }
};

/**
 * @desc Get Student Leaderboard (scoped to coach's Balagruha)
 * @route GET /api/v2/lms/coach/reports/leaderboard
 * @access Private (Coach)
 */
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 10, period = 'weekly' } = req.query;
        const coachBalagruhaIds = req.user.balagruhaIds || [];

        // Get scoped student IDs
        const studentIds = await getBalagruhaStudentIds(coachBalagruhaIds);

        if (studentIds.length === 0) {
            return res.json({
                success: true,
                period,
                leaderboard: []
            });
        }

        // Build date filter based on period
        const now = new Date();
        let dateFilter = {};
        if (period === 'weekly') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter = { $gte: weekAgo };
        } else if (period === 'monthly') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter = { $gte: monthAgo };
        }
        // 'all' or unrecognized period => no date filter

        const pipeline = [
            { $match: { userId: { $in: studentIds } } },
            { $unwind: "$transactions" },
        ];

        if (dateFilter.$gte) {
            pipeline.push({ $match: { "transactions.date": dateFilter } });
        }

        pipeline.push(
            { $group: { _id: "$userId", totalCoins: { $sum: "$transactions.amount" } } },
            { $sort: { totalCoins: -1 } },
            { $limit: parseInt(limit) },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 1,
                totalCoins: 1,
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                name: "$user.name"
            }}
        );

        const leaderboard = await Coin.aggregate(pipeline);

        res.json({
            success: true,
            period,
            leaderboard
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Leaderboard Error:');
        res.status(500).json({
            success: false,
            message: 'Server error fetching leaderboard',
            error: error.message
        });
    }
};

/**
 * @desc Get per-course completion rates for coach's assignments
 * @route GET /api/v2/lms/coach/reports/course-completion
 * @access Private (Coach)
 */
exports.getCourseCompletionRates = async (req, res) => {
    try {
        const coachId = req.user._id;
        const coachBalagruhaIds = req.user.balagruhaIds || [];

        // Get scoped student IDs
        const studentIds = await getBalagruhaStudentIds(coachBalagruhaIds);

        // Get active assignments by this coach
        const assignments = await CourseAssignment.find({
            assignedBy: coachId,
            status: 'active'
        }).populate('courseId', 'title category thumbnail');

        // Get distinct course IDs from assignments
        const courseIds = [...new Set(assignments.map(a => a.courseId?._id?.toString()).filter(Boolean))];

        if (courseIds.length === 0 || studentIds.length === 0) {
            return res.json({
                success: true,
                courseCompletionRates: []
            });
        }

        // Get progress records for scoped students in assigned courses
        const progressRecords = await StudentProgress.find({
            student: { $in: studentIds },
            course: { $in: courseIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        // Build per-course completion map
        const courseMap = {};
        for (const assignment of assignments) {
            const cid = assignment.courseId?._id?.toString();
            if (!cid) continue;
            if (!courseMap[cid]) {
                courseMap[cid] = {
                    courseId: cid,
                    courseTitle: assignment.courseId?.title || 'Unknown',
                    courseCategory: assignment.courseId?.category || null,
                    totalStudents: studentIds.length,
                    studentsStarted: 0,
                    studentsCompleted: 0,
                    completionRate: 0
                };
            }
        }

        // Tally progress per course
        for (const prog of progressRecords) {
            const cid = prog.course.toString();
            if (!courseMap[cid]) continue;
            if (prog.status === 'completed') {
                courseMap[cid].studentsCompleted++;
                courseMap[cid].studentsStarted++;
            } else if (prog.status === 'in_progress') {
                courseMap[cid].studentsStarted++;
            }
        }

        // Calculate completion rates
        const courseCompletionRates = Object.values(courseMap).map(c => ({
            ...c,
            completionRate: c.totalStudents > 0
                ? Math.round((c.studentsCompleted / c.totalStudents) * 100)
                : 0
        }));

        res.json({
            success: true,
            courseCompletionRates
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Course Completion Rates Error:');
        res.status(500).json({
            success: false,
            message: 'Server error fetching course completion rates',
            error: error.message
        });
    }
};

/**
 * @desc Get detailed analytics for a specific course (FR21)
 * @route GET /api/v2/lms/coach/reports/course/:courseId
 * @access Private (Coach)
 */
exports.getCourseDetail = async (req, res) => {
    try {
        const { courseId } = req.params;
        const coachBalagruhaIds = req.user.balagruhaIds || [];

        const studentIds = await getBalagruhaStudentIds(coachBalagruhaIds);

        if (studentIds.length === 0) {
            return res.json({
                success: true,
                courseId,
                stats: { totalStudents: 0, completionRate: 0, avgScore: 0, studentsStarted: 0, studentsCompleted: 0 }
            });
        }

        // Get progress for this course across balagruha students
        const progressRecords = await StudentProgress.find({
            student: { $in: studentIds },
            course: new mongoose.Types.ObjectId(courseId)
        }).populate('student', 'name');

        let totalCompletion = 0;
        let totalScore = 0;
        let scoreCount = 0;
        let studentsStarted = 0;
        let studentsCompleted = 0;

        const studentDetails = [];
        for (const prog of progressRecords) {
            const completion = prog.completionPercentage || 0;
            totalCompletion += completion;

            if (prog.status === 'completed') {
                studentsCompleted++;
                studentsStarted++;
            } else if (prog.status === 'in_progress') {
                studentsStarted++;
            }

            if (prog.quizScore !== undefined && prog.quizScore !== null) {
                totalScore += prog.quizScore;
                scoreCount++;
            }

            studentDetails.push({
                studentId: prog.student?._id,
                studentName: prog.student?.name,
                completionPercentage: completion,
                status: prog.status,
                quizScore: prog.quizScore || null,
                lastActivity: prog.updatedAt
            });
        }

        const completionRate = studentIds.length > 0
            ? Math.round((studentsCompleted / studentIds.length) * 100)
            : 0;
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

        res.json({
            success: true,
            courseId,
            stats: {
                totalStudents: studentIds.length,
                studentsStarted,
                studentsCompleted,
                completionRate,
                avgScore,
            },
            students: studentDetails.sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Course Detail Report Error:');
        res.status(500).json({
            success: false,
            message: 'Server error fetching course detail',
            error: error.message
        });
    }
};

/**
 * @desc Identify slow learners (students below average progress)
 * @route GET /api/v2/lms/coach/reports/slow-learners
 * @access Private (Coach)
 */
exports.getSlowLearners = async (req, res) => {
    try {
        const { threshold } = req.query;
        const coachBalagruhaIds = req.user.balagruhaIds || [];

        // Get scoped student IDs
        const studentIds = await getBalagruhaStudentIds(coachBalagruhaIds);

        if (studentIds.length === 0) {
            return res.json({
                success: true,
                averageCompletion: 0,
                threshold: 0,
                slowLearners: []
            });
        }

        // Get all progress records for balagruha students
        const progressRecords = await StudentProgress.find({
            student: { $in: studentIds }
        }).populate('student', 'firstName lastName name')
          .populate('course', 'title category');

        // Build per-student average completion
        const studentProgressMap = {};
        for (const prog of progressRecords) {
            const sid = prog.student?._id?.toString();
            if (!sid) continue;
            if (!studentProgressMap[sid]) {
                studentProgressMap[sid] = {
                    studentId: sid,
                    firstName: prog.student?.firstName || null,
                    lastName: prog.student?.lastName || null,
                    name: prog.student?.name || null,
                    courses: [],
                    totalCompletion: 0,
                    courseCount: 0
                };
            }
            studentProgressMap[sid].courses.push({
                courseId: prog.course?._id?.toString(),
                courseTitle: prog.course?.title || 'Unknown',
                completionPercentage: prog.completionPercentage || 0,
                status: prog.status
            });
            studentProgressMap[sid].totalCompletion += (prog.completionPercentage || 0);
            studentProgressMap[sid].courseCount++;
        }

        // Calculate average completion per student
        const studentAverages = Object.values(studentProgressMap).map(s => ({
            ...s,
            averageCompletion: s.courseCount > 0
                ? Math.round(s.totalCompletion / s.courseCount)
                : 0
        }));

        // Calculate overall average across all students
        const overallAverage = studentAverages.length > 0
            ? Math.round(studentAverages.reduce((sum, s) => sum + s.averageCompletion, 0) / studentAverages.length)
            : 0;

        // Use explicit threshold if provided, otherwise use overall average
        const effectiveThreshold = threshold !== undefined
            ? parseInt(threshold)
            : overallAverage;

        // Filter slow learners: below the threshold
        const slowLearners = studentAverages
            .filter(s => s.averageCompletion < effectiveThreshold)
            .sort((a, b) => a.averageCompletion - b.averageCompletion)
            .map(({ totalCompletion, courseCount, ...rest }) => rest);

        res.json({
            success: true,
            averageCompletion: overallAverage,
            threshold: effectiveThreshold,
            slowLearners
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Slow Learners Error:');
        res.status(500).json({
            success: false,
            message: 'Server error identifying slow learners',
            error: error.message
        });
    }
};
