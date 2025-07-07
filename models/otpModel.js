// src/models/otpModel.js
import { Schema, model } from "mongoose";

const otpSchema = new Schema(
  {
    email:      { type: String, required: true },
    otp:        { type: String, required: true },
    expiresAt:  { type: Date, required: true },
  },
  { timestamps: true }
);

export const otpModel = model("otp", otpSchema);
