const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["momo", "vnpay", "stripe"],
      required: true,
    },
    paymentRef: String, 
    metadata: Object, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
