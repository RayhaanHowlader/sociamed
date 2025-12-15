import nodemailer from "nodemailer"

const host = process.env.EMAIL_HOST
const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587
const user = process.env.EMAIL_USER
const pass = process.env.EMAIL_PASS
const fromEmail = process.env.FROM_EMAIL || user

if (!host || !port || !user || !pass || !fromEmail) {
  // We don't throw here to avoid crashing the dev server if email isn't configured,
  // but the OTP routes will validate and return a helpful error.
  console.warn("Email environment variables are not fully configured. OTP emails may fail.")
}

export function getTransporter() {
  if (!host || !user || !pass) {
    throw new Error("Email is not configured on the server")
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  })
}

export async function sendOtpEmail(to: string, code: string) {
  const transporter = getTransporter()

  const info = await transporter.sendMail({
    from: fromEmail,
    to,
    subject: "Your Nexus login code",
    text: `Your Nexus one-time login code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `<p>Your Nexus one-time login code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:0.3em;">${code}</p>
      <p>This code will expire in 10 minutes.</p>`,
  })

  return info
}

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const transporter = getTransporter()

  const info = await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    text: text || subject,
    html,
  })

  return info
}


