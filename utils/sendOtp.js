// src/utils/sendOtp.js
import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Debug: print SMTP environment variables at startup
// console.log("→ SMTP_HOST:", process.env.SMTP_HOST);
// console.log("→ SMTP_PORT:", process.env.SMTP_PORT);
// console.log("→ SMTP_SECURE:", process.env.SMTP_SECURE);
// console.log("→ SMTP_USER:", process.env.SMTP_USER);
// console.log("→ SMTP_PASS:", process.env.SMTP_PASS ? "<hidden>" : "<undefined>");

// Create a reusable transport using SMTPS on port 465
export const mailTransporter = createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 465,                       // Use 465 for SMTPS
  secure: true,                    // secure=true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Allow fallback in case of certificate issues
    rejectUnauthorized: false
  }
});

// Verify transporter configuration at startup
mailTransporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP transporter verification failed:", err);
  } else {
    console.log("✅ SMTP transporter verified on SMTPS (port 465)");
  }
});

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
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      ' SMTP credentials not set; falling back to console.log for email OTP'
    );
    console.log(`OTP for ${email}: ${otp}`);
    return;
  }

  const html = otpEmailTemplate({ fullName, otp });

  try {
    const info = await mailTransporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your One-Time Password',
      html,
    });
    console.log(` Sent OTP to ${email}. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(` Failed to send OTP to ${email}:`, err);
    throw new Error('Unable to send OTP email');
  }
}

// Fallback SMS stub (you can integrate Twilio or similar)
export async function sendOTPViaSMS(phone, otp) {
  console.log(`SMS OTP for ${phone}: ${otp}`);
}
