const Counter = require("../models/counter");
const User = require("../models/user");

const COUNTER_ID = "student-user-id";
const FIRST_STUDENT_USER_ID = 1001;

exports.getNextStudentUserId = async () => {
  for (;;) {
    const counter = await Counter.findOneAndUpdate({ _id: COUNTER_ID }, { $inc: { sequence: 1 } }, { new: true }).lean();
    if (counter) return counter.sequence;
    const highestStudent = await User.findOne({ role: "student", userId: { $type: "number" } }).sort({ userId: -1 }).select("userId").lean();
    const seed = Math.max(FIRST_STUDENT_USER_ID - 1, highestStudent?.userId || 0);
    try { await Counter.create({ _id: COUNTER_ID, sequence: seed }); }
    catch (error) { if (error?.code !== 11000) throw error; }
  }
};
