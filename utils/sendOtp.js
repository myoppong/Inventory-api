// src/utils/sendOtp.js

import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Debug: print SMTP environment variables at startup
console.log("→ SMTP_HOST:", process.env.SMTP_HOST);
console.log("→ SMTP_PORT:", process.env.SMTP_PORT);
console.log("→ SMTP_SECURE:", process.env.SMTP_SECURE);
console.log("→ SMTP_USER:", process.env.SMTP_USER);
console.log("→ SMTP_PASS:", process.env.SMTP_PASS ? "<hidden>" : "<undefined>");

// If either SMTP_USER or SMTP_PASS is missing, we won’t attempt SMTP
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
let mailTransporter = null;

if (SMTP_USER && SMTP_PASS) {
  // Create a reusable transport using SMTPS (port 465)
  mailTransporter = createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,                       // Force SMTPS on port 465
    secure: true,                    // true for port 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // In case of certificate issues—allow fallback
      rejectUnauthorized: false,
    },
  });

  // Verify transporter configuration at startup
  mailTransporter.verify((err, success) => {
    if (err) {
      console.error("❌ SMTP transporter verification failed:", err);
      mailTransporter = null; // Null out transporter so we fallback to console.log
    } else {
      console.log("✅ SMTP transporter verified on SMTPS (port 465)");
    }
  });
} else {
  console.warn("⚠️ SMTP_USER or SMTP_PASS not defined; skipping SMTP setup");
}

// Define an HTML template for OTP emails
function otpEmailTemplate({ fullName, otp, expiresInMinutes = 10 }) {
  return `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Hello ${fullName || 'User'},</h2>
      <p>Your One-Time Password (OTP) is:</p>
      <p style="font-size: 1.5rem; font-weight: bold; letter-spacing: 0.1em;">${otp}</p>
      <p>This code will expire in ${expiresInMinutes} minutes.</p>
      <hr/>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you,<br/>Your App Name</p>
    </div>
  `;
}

// The main function to send OTP via email
export async function sendOTPViaEmail(email, otp, fullName = '') {
  // If transporter is not set up, fallback to console.log
  if (!mailTransporter) {
    console.warn(`⚠️ No SMTP transporter; logging OTP for ${email}: ${otp}`);
    return;
  }

  const html = otpEmailTemplate({ fullName, otp });

  try {
    const info = await mailTransporter.sendMail({
      from: `"Your App Name" <${SMTP_USER}>`,
      to: email,
      subject: 'Your One-Time Password',
      html,
    });
    console.log(`✅ Sent OTP to ${email}. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Failed to send OTP to ${email}:`, err);
    // If sending fails, null out transporter so future attempts also fallback
    mailTransporter = null;
    throw new Error('Unable to send OTP email');
  }
}

// Fallback SMS stub (you can integrate Twilio or similar)
export async function sendOTPViaSMS(phone, otp) {
  console.log(`SMS OTP for ${phone}: ${otp}`);
}
