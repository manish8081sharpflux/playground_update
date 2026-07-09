const mongoose = require("mongoose");

const MachineActivityStampSchema = new mongoose.Schema(
  {
    LogID: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    MachineID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    UserID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    LoginTimestamp: {
      type: Date,
      default: Date.now,
    },
    LogoutTimestamp: {
      type: Date,
      default: null,
    },
    SessionDuration: {
      type: Number,
      default: 0,
    },
    CreatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

MachineActivityStampSchema.pre("save", function (next) {
  if (this.LogoutTimestamp && this.LoginTimestamp) {
    this.SessionDuration = Math.floor(
      (this.LogoutTimestamp - this.LoginTimestamp) / 1000
    );
  }
  next();
});

const MachineActivityStamp = mongoose.models.MachineActivityStamp || mongoose.model(
  "MachineActivityStamp",
  MachineActivityStampSchema
);

module.exports = MachineActivityStamp;
