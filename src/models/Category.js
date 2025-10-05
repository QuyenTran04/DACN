const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    parent: { type: Schema.Types.ObjectId, ref: "Category" },
    isActive: { type: Boolean, default: true },

    // icon
    iconUrl: String,
    iconPublicId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
