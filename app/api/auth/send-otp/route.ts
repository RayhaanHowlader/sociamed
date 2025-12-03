import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { sendOtpEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const db = await getDb()
    const otps = db.collection("loginOtps")
    const users = db.collection("users")

    const user = await users.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await otps.insertOne({
      email,
      code,
      expiresAt,
      used: false,
      createdAt: new Date(),
    })

    await sendOtpEmail(email, code)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error sending OTP:", error)
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 })
  }
}


