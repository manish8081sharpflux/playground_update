const { default: mongoose } = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    balagruhaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Balagruha",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    date: { type: Date, required: true },
    title: { type: String },
    description: { type: String },
    timeSlot: { type: String },
    dateString: { type: String },
    status: {
      type: String,
      enum: ["pending", "inprogress", "completed", "cancelled"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

scheduleSchema.index(
  { balagruhaId: 1, assignedTo: 1, startTime: 1, endTime: 1, date: 1 },
  { unique: true }
);

const Schedules = mongoose.models.schedules || mongoose.model("schedules", scheduleSchema);
module.exports = Schedules;
