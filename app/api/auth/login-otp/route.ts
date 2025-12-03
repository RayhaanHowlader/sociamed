import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import jwt from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables")
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code } = body as { email?: string; code?: string }

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 })
    }

    const db = await getDb()
    const otps = db.collection("loginOtps")
    const users = db.collection("users")

    const otpDoc = await otps.findOne({
      email,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!otpDoc) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 })
    }

    // Mark OTP as used
    await otps.updateOne({ _id: otpDoc._id }, { $set: { used: true, usedAt: new Date() } })

    const user = await users.findOne<{ _id: unknown; email: string; fullName?: string }>({ email })
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 404 })
    }

    const token = jwt.sign(
      {
        sub: user._id,
        email: user.email,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    const response = NextResponse.json({ success: true }, { status: 200 })

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error("OTP login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


