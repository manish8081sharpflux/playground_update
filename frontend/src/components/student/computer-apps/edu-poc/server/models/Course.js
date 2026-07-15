const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  options:       [{ type: String }],
  correctIndex:  { type: Number, required: true },
  explanation:   { type: String }
});

const quizSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  questions: [questionSchema],
  passMark:  { type: Number, default: 60 }
});

const lessonSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  content: { type: String, required: true },   // rich text / markdown
  order:   { type: Number, required: true },
  readTimeMinutes: { type: Number, default: 5 }
});

const courseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  thumbnail:   { type: String },
  category:    { type: String },
  lessons:     [lessonSchema],
  quiz:        quizSchema,
  isPublished: { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
