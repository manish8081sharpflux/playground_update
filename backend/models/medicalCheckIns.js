const mongoose = require("mongoose");

const medicalCheckInSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Sprint6-Story-3-AC1: Temperature field is optional (not all check-ins need temperature)
    temperature: { type: Number },
    date: { type: Date, required: true },
    healthStatus: {
      type: String,
      enum: ["normal", "important", "critical"],
      default: "normal",
    },
    notes: { type: String },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // NEW FIELDS - Medical Check-in Enhancement

    // Symptoms section (Field #3)
    symptoms: {
      type: [String],
      default: [],
      enum: [
        "cough_cold",
        "fever",
        "stomach_ache",
        "headache",
        "injury",
        "other",
        "",
      ],
    },
    customSymptom: {
      type: String,
      default: "",
    },

    // Sprint6-Story-3-AC5: Multiple Doctor Visits (changed from single doctorVisit object to array)
    doctorVisits: [
      {
        doctorName: { type: String, default: "" },
        hospitalName: { type: String, default: "" },
        visitDate: { type: Date },
        prescriptionFiles: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            fileSize: { type: Number },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        testDetails: { type: String, default: "" },
        testResultFiles: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            fileSize: { type: Number },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        conclusion: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // DEPRECATED: Keep for backward compatibility during migration
    doctorVisit: {
      doctorName: { type: String, default: "" },
      hospitalName: { type: String, default: "" },
      visitDate: { type: Date },
      prescriptionFiles: [
        {
          fileName: { type: String },
          fileUrl: { type: String },
          fileType: { type: String },
          fileSize: { type: Number },
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      testDetails: { type: String, default: "" },
      testResultFiles: [
        {
          fileName: { type: String },
          fileUrl: { type: String },
          fileType: { type: String },
          fileSize: { type: Number },
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      conclusion: { type: String, default: "" },
    },

    // Sprint6-Story-3-AC6-AC7: Multiple Follow-ups with file uploads
    followUps: [
      {
        followUpDate: { type: Date },
        hospital: { type: String, default: "" },
        doctor: { type: String, default: "" },
        assignedCoaches: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        status: {
          type: String,
          enum: ["active", "inactive", "completed", ""],
          default: "",
        },
        // AC7: File uploads for follow-ups
        descriptionFiles: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            fileSize: { type: Number },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        testResultFiles: [
          {
            fileName: { type: String },
            fileUrl: { type: String },
            fileType: { type: String },
            fileSize: { type: Number },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
        notes: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
        // Future integration fields (commented out for now)
        // calendarEventId: { type: String },
        // whatsappNotificationSent: { type: Boolean, default: false },
        // remindersSent: [{ date: Date, type: String }]
      },
    ],

    // DEPRECATED: Keep for backward compatibility during migration
    followUp: {
      followUpDate: { type: Date },
      hospital: { type: String, default: "" },
      doctor: { type: String, default: "" },
      assignedCoaches: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      status: {
        type: String,
        enum: ["active", "inactive", ""],
        default: "",
      },
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

// Indexes for performance - Story 6.7: Missing Database Indexes
medicalCheckInSchema.index({ studentId: 1 });
medicalCheckInSchema.index({ healthStatus: 1 });
medicalCheckInSchema.index({ studentId: 1, date: -1 }); // Student health record lookup + date sorting
medicalCheckInSchema.index({ createdAt: -1 }); // Sorting by creation date

const MedicalCheckIn = mongoose.models.medical_check_ins || mongoose.model(
  "medical_check_ins",
  medicalCheckInSchema
);

module.exports = MedicalCheckIn;
