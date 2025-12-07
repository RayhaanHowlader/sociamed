import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables")
}

export interface AuthPayload {
  sub: string
  email: string
  fullName?: string
}

export function getUserFromRequest(req: NextRequest): AuthPayload | null {
  const token = req.cookies.get("auth_token")?.value
  if (!token) return null

  try {
    return jwt.verify(token, JWT_SECRET as string) as unknown as AuthPayload
  } catch (error) {
    console.error("Invalid auth token:", error)
    return null
  }
}


