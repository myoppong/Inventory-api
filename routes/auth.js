// src/routes/auth.js
import Router from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { userModel } from "../models/user.js";
import { otpModel }  from "../models/otpModel.js";
import { sendOTPViaEmail } from "../utils/sendOtp.js";

const authRouter = Router();

/**
 * POST /auth/forgot-password
 * Body: { email }
 * → Generate 6-digit OTP, store in DB with 10-min expiry, send via email.
 */
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    // 1. Check if user exists
    const user = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // For security, do not reveal “no such user.” Just say “OTP sent” anyway.
      return res.json({ message: "If that email exists, an OTP has been sent." });
    }

    // 2. Generate 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 3. Delete any existing OTPs for this email (cleanup)
    await otpModel.deleteMany({ email: user.email });

    // 4. Calculate expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 5. Save OTP to DB
    await otpModel.create({
      email: user.email,
      otp,
      expiresAt,
    });

    // 6. Send OTP via email
    await sendOTPViaEmail(user.email, otp, user.username);

    return res.json({ message: "If that email exists, an OTP has been sent." });
  } catch (err) {
    console.error("Forgot Password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { email, otp }
 * → Check OTP exists, not expired, and matches.
 *    If valid → respond 200; else 400 with message.
 */
authRouter.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required." });

    const record = await otpModel.findOne({ email: email.toLowerCase().trim(), otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (new Date() > record.expiresAt) {
      // Delete expired record
      await otpModel.deleteMany({ email: email.toLowerCase().trim() });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // If it reaches here, OTP is valid & not expired. Do NOT delete here—wait until reset.
    return res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * POST /auth/reset-password
 * Body: { email, otp, password }
 * → Check OTP again (valid + not expired), then hash new password and update user.
 *    Finally, delete OTP record so it cannot be reused.
 */
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and new password are required." });
    }

    // 1. Find OTP record
    const record = await otpModel.findOne({ email: email.toLowerCase().trim(), otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP." });
    }
    if (new Date() > record.expiresAt) {
      await otpModel.deleteMany({ email: email.toLowerCase().trim() });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // 2. Hash new password
    const hashed = await bcrypt.hash(password, 12);

    // 3. Update user’s password
    const user = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    user.password = hashed;
    await user.save();

    // 4. Delete all OTPs for this email
    await otpModel.deleteMany({ email: email.toLowerCase().trim() });

    return res.json({ message: "Password has been successfully reset." });
  } catch (err) {
    console.error("Reset Password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default authRouter;
