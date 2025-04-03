import { Schema, model } from "mongoose";
import normalize from "normalize-mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['cashier', 'admin', 'super admin'], required: true },
  },
  {
    timestamps: true,
  }
);

// Apply normalize plugin **before** setting toJSON
userSchema.plugin(normalize);



export const userModel = model("user", userSchema);
