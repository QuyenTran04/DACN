const mongoose = require("mongoose");
const { Schema } = mongoose;

const optionSchema = new Schema(
  {
    text: { type: String }, 
    imageUrl: { type: String },
  },
  { _id: false } 
);

const quizSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },
    question: { type: String, required: true },
    imageUrl: { type: String },
    options: {
      type: [optionSchema],
      validate: (v) => Array.isArray(v) && v.length >= 2,
    },
    correctAnswers: {
      type: [String],
      required: true,
      validate: (v) => Array.isArray(v) && v.length >= 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
