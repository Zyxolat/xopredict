import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_build";
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "XOLAT <noreply@xopredict.com>";

/**
 * Send a 6-digit OTP for email verification during registration.
 */
export async function sendVerificationOTP(
  email: string,
  otp: string
): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your XOLAT account",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0a0d; color: #f4eef8; border-radius: 16px;">
        <h1 style="color: #d5a7ff; font-size: 28px; margin: 0 0 8px;">⬡ XOLAT</h1>
        <p style="color: #a79cae; font-size: 12px; letter-spacing: 2px; margin: 0 0 24px;">PREDICTION ARENA</p>
        <p style="font-size: 15px; line-height: 1.6;">Welcome to XOLAT! Enter this verification code to activate your account:</p>
        <div style="background: #1c1429; border: 1px solid rgba(213,167,255,0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #d5a7ff; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #8e8892;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="font-size: 11px; color: #6e6878;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send a 6-digit OTP for password reset.
 */
export async function sendPasswordResetOTP(
  email: string,
  otp: string
): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your XOLAT password",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0a0d; color: #f4eef8; border-radius: 16px;">
        <h1 style="color: #d5a7ff; font-size: 28px; margin: 0 0 8px;">⬡ XOLAT</h1>
        <p style="color: #a79cae; font-size: 12px; letter-spacing: 2px; margin: 0 0 24px;">PASSWORD RESET</p>
        <p style="font-size: 15px; line-height: 1.6;">Enter this code to reset your password:</p>
        <div style="background: #1c1429; border: 1px solid rgba(213,167,255,0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #d5a7ff; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #8e8892;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;" />
        <p style="font-size: 11px; color: #6e6878;">If you didn't request a password reset, please secure your account immediately.</p>
      </div>
    `,
  });
}

/**
 * Send notification when a wallet is linked to an account.
 */
export async function sendWalletLinkedNotification(
  email: string,
  walletAddress: string
): Promise<void> {
  const resend = getResendClient();
  const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Wallet linked to your XOLAT account",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0a0d; color: #f4eef8; border-radius: 16px;">
        <h1 style="color: #d5a7ff; font-size: 28px; margin: 0 0 24px;">⬡ XOLAT</h1>
        <p style="font-size: 15px; line-height: 1.6;">A new wallet has been linked to your account:</p>
        <div style="background: #1c1429; border: 1px solid rgba(76,228,125,0.3); border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 16px; font-weight: bold; color: #4ce47d; font-family: monospace;">${shortAddr}</span>
        </div>
        <p style="font-size: 13px; color: #8e8892;">If you did not link this wallet, please secure your account immediately.</p>
      </div>
    `,
  });
}

/**
 * Send notification when password is changed.
 */
export async function sendPasswordChangedNotification(
  email: string
): Promise<void> {
  const resend = getResendClient();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your XOLAT password was changed",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0b0a0d; color: #f4eef8; border-radius: 16px;">
        <h1 style="color: #d5a7ff; font-size: 28px; margin: 0 0 24px;">⬡ XOLAT</h1>
        <p style="font-size: 15px; line-height: 1.6;">Your password was successfully changed.</p>
        <p style="font-size: 13px; color: #8e8892;">If you did not make this change, please reset your password immediately and contact support.</p>
      </div>
    `,
  });
}
