import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 })

  // Clear the auth cookie
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}


