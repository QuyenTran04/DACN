const mongoose = require("mongoose");
const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true },
    price: { type: Number, default: 0, min: 0 },
    imageUrl: String,
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
