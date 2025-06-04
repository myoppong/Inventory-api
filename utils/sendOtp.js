// src/utils/sendOtp.js

import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

//  Create a reusable transport using environment variables
export const mailTransporter = createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

//  Define an HTML template for OTP emails
function otpEmailTemplate({ fullName, otp, expiresInMinutes = 10 }) {
  return `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Hello ${fullName},</h2>
      <p>Your One-Time Password (OTP) is:</p>
      <p style="font-size: 1.5rem; font-weight: bold; letter-spacing: 0.1em;">${otp}</p>
      <p>This code will expire in ${expiresInMinutes} minutes.</p>
      <hr/>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you,<br/>Your Company Name</p>
    </div>
  `;
}

//  The main function to send OTP via email
export async function sendOTPViaEmail(email, otp, fullName = '') {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      '⚠️ SMTP credentials not set; falling back to console.log for email OTP'
    );
    console.log(`OTP for ${email}: ${otp}`);
    return;
  }

  const html = otpEmailTemplate({ fullName, otp });

  try {
    await mailTransporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your One-Time Password',
      html,
    });
    console.log(`✅ Sent OTP to ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send OTP to ${email}:`, err);
    throw new Error('Unable to send OTP email');
  }
}

//  Fallback SMS stub (you can integrate Twilio or similar)
export async function sendOTPViaSMS(phone, otp) {
  // Integrate your SMS provider here. For now, we just log:
  console.log(`SMS OTP for ${phone}: ${otp}`);
}
