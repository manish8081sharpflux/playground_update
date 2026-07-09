const Coin = require('../../../models/coin');
const User = require('../../../models/user');
const { errorLogger } = require('../../../config/pino-config');

/**
 * Manual Award Controller - Epic 03 Story 03
 * Handles manual coin awards by coaches/admins
 */

/**
 * @desc Award coins to student(s) manually
 * @route POST /api/v2/lms/coach/awards
 * @access Private (Coach/Admin)
 */
exports.awardCoins = async (req, res) => {
    try {
        const { studentIds, amount, reason, category } = req.body;
        const coachId = req.user._id;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Student IDs array is required' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
        }
        if (amount > 100) {
            return res.status(400).json({ success: false, message: 'Amount cannot exceed 100 coins per award' });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason for award is required' });
        }

        // FIX-013: Balagruha authorization — coaches can only award students in their assigned Balagruhas
        const isAdmin = req.user.role === 'admin';

        if (!isAdmin) {
            const coachBalagruhaIds = (req.user.balagruhaIds || []).map(id => id.toString());

            if (coachBalagruhaIds.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You have no assigned Balagruhas.'
                });
            }

            // Look up all target students and verify Balagruha membership
            const students = await User.find({ _id: { $in: studentIds } }).select('_id name balagruhaIds');
            const unauthorizedStudentIds = [];

            for (const sid of studentIds) {
                const student = students.find(s => s._id.toString() === sid.toString());
                if (!student) {
                    // Will be caught later in the per-student loop as 'Student not found'
                    continue;
                }
                const studentBalagruhaIds = (student.balagruhaIds || []).map(id => id.toString());
                const hasOverlap = studentBalagruhaIds.some(id => coachBalagruhaIds.includes(id));
                if (!hasOverlap) {
                    unauthorizedStudentIds.push(sid);
                }
            }

            if (unauthorizedStudentIds.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You do not have Balagruha authority over one or more students.',
                    unauthorizedStudentIds
                });
            }
        }

        const results = [];
        const errors = [];

        // Process awards in parallel promises (or sequential if consistency is critical, parallel is fine here)
        await Promise.all(studentIds.map(async (studentId) => {
            try {
                const student = await User.findById(studentId);
                if (!student) {
                    errors.push({ studentId, message: 'Student not found' });
                    return;
                }

                // Use Coin model static method or instance method
                const coinRecord = await Coin.findOrCreateForUser(studentId);

                const metadata = {
                    awardedBy: coachId,
                    awardType: 'manual',
                    reason: reason
                };

                // Source = 'manual_award' for granular tracking (FIX-027)
                // Description = reason
                await coinRecord.addCoins(
                    amount,
                    'earned',
                    reason,
                    'manual_award',
                    metadata
                );

                results.push({ studentId, name: student.name, amount });
            } catch (err) {
                errorLogger.error({ err: err }, `Error awarding coins to ${studentId}:`);
                errors.push({ studentId, message: err.message });
            }
        }));

        res.json({
            success: true,
            message: `Coins awarded to ${results.length} students.`,
            results,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Manual Award Error:');
        res.status(500).json({
            success: false,
            message: 'Server error while awarding coins',
            error: error.message
        });
    }
};

/**
 * @desc Get award history for the logged-in coach
 * @route GET /api/v2/lms/coach/awards/history
 * @access Private (Coach)
 */
exports.getAwardHistory = async (req, res) => {
    try {
        const coachId = req.user._id;

        // We need to query Coins collections where transactions have metadata.awardedBy == coachId
        // Since Transactions are embedded, we use aggregate or simple find.
        // Aggregate is best to unwind.

        const history = await Coin.aggregate([
            { $match: { "transactions.metadata.awardedBy": coachId } },
            { $unwind: "$transactions" },
            { $match: { "transactions.metadata.awardedBy": coachId } },
            { $sort: { "transactions.createdAt": -1 } },
            { $limit: 100 }, // Recent 100 awards
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "student"
                }
            },
            { $unwind: "$student" },
            {
                $project: {
                    _id: 0,
                    transactionId: "$transactions._id",
                    studentId: "$student._id",
                    studentName: "$student.name",
                    amount: "$transactions.amount",
                    reason: "$transactions.description",
                    category: "$transactions.source",
                    awardedAt: "$transactions.createdAt"
                }
            }
        ]);

        res.json({
            success: true,
            count: history.length,
            history
        });

    } catch (error) {
        errorLogger.error({ err: error }, 'Get Award History Error:');
        res.status(500).json({
            success: false,
            message: 'Server error while fetching award history',
            error: error.message
        });
    }
};
