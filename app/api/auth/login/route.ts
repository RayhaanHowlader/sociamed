import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables")
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("[LOGIN] Login request received at", new Date().toISOString())
  
  try {
    console.log("[LOGIN] Parsing request body...")
    const body = await req.json()
    const { email, password } = body as { email?: string; password?: string }
    console.log("[LOGIN] Request body parsed. Email:", email ? `${email.substring(0, 3)}***` : "missing")

    if (!email || !password) {
      console.log("[LOGIN] Validation failed: Missing email or password")
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    console.log("[LOGIN] Connecting to database...")
    const db = await getDb()
    const users = db.collection("users")
    console.log("[LOGIN] Database connection established")

    console.log("[LOGIN] Searching for user with email:", email ? `${email.substring(0, 3)}***` : "missing")
    const user = await users.findOne<{ _id: unknown; email: string; fullName?: string; passwordHash?: string }>({
      email,
    })

    if (!user || !user.passwordHash) {
      console.log("[LOGIN] User not found or missing password hash")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    console.log("[LOGIN] User found. User ID:", user._id ? String(user._id).substring(0, 8) + "***" : "missing")

    console.log("[LOGIN] Verifying password...")
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      console.log("[LOGIN] Password verification failed")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    console.log("[LOGIN] Password verified successfully")

    // Convert _id to string to ensure proper serialization in production
    const userId = user._id ? String(user._id) : null
    if (!userId) {
      console.error("[LOGIN] ERROR: User ID is missing after conversion")
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
    console.log("[LOGIN] User ID converted to string:", userId.substring(0, 8) + "***")

    console.log("[LOGIN] Generating JWT token...")
    const token = jwt.sign(
      {
        sub: userId,
        email: user.email,
        fullName: user.fullName,
      },
      JWT_SECRET as string,
      { expiresIn: "7d" },
    )
    console.log("[LOGIN] JWT token generated successfully")

    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200 },
    )

    console.log("[LOGIN] Setting auth cookie. Secure:", process.env.NODE_ENV === "production")
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    console.log("[LOGIN] Auth cookie set successfully")

    const duration = Date.now() - startTime
    console.log("[LOGIN] Login successful. Duration:", duration, "ms")
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("[LOGIN] ERROR occurred after", duration, "ms")
    
    // Log detailed error for debugging in production
    console.error("[LOGIN] Error type:", error instanceof Error ? error.constructor.name : typeof error)
    console.error("[LOGIN] Error message:", error instanceof Error ? error.message : String(error))
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // In production, log more details but don't expose them to client
    console.error("[LOGIN] Full error details:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      duration: duration + "ms",
    })
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


