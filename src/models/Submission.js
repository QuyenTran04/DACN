// models/Submission.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const submissionSchema = new Schema(
  {

    student: { type: Schema.Types.ObjectId, ref: "User", required: true },

    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    selected: {
      type: [String],
      required: true,
      validate: (v) => Array.isArray(v) && v.length >= 1,
    },
    isCorrect: { type: Boolean, required: true },
    submittedAt: { type: Date, default: Date.now },
    attemptNumber: { type: Number, default: 1 }, 
    durationSeconds: { type: Number }, 
    correctAnswersSnapshot: { type: [String] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
