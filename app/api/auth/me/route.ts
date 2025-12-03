import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export const dynamic = "force-dynamic"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables")
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const payload = jwt.verify(token, JWT_SECRET)

    return NextResponse.json(
      {
        authenticated: true,
        user: payload,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}


