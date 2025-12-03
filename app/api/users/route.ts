import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

// Ensure this route is always dynamic so using request.json() is allowed
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, fullName } = body as {
      email?: string
      password?: string
      fullName?: string
    }

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    const users = db.collection("users")

    const existing = await users.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await users.insertOne({
      email,
      fullName,
      passwordHash,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        success: true,
        userId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



