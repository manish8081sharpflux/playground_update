const { default: mongoose } = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    healthCheckupDate: { type: Date },
    nextActionDate: { type: Date },
    vaccinations: [{ type: String }],
    medicalHistory: [
      {
        name: { type: String }, // Name of the medical problem
        attachmentURL: { type: String },
        contentType: { type: String },
        description: { type: String },
        date: { type: Date },
        caseId: { type: String },
        doctorsName: { type: String },
        hospitalName: { type: String },
        currentStatus: {
          status: { type: String },
          notes: { type: String },
          date: { type: Date },
          statusHistory: [
            {
              status: { type: String },
              notes: { type: String },
              date: { type: Date },
            },
          ],
        },
        prescriptions: [
          {
            url: { type: String },
            name: { type: String },
            date: { type: Date },
          },
        ],
        otherAttachments: [
          {
            url: { type: String },
            name: { type: String },
            date: { type: Date },
          },
        ],
      },
    ],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const MedicalRecord = mongoose.models.MedicalRecord || mongoose.model("MedicalRecord", medicalRecordSchema);

module.exports = MedicalRecord;
