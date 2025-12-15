import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const db = await getDb();
    const otps = db.collection('loginOtps');
    const users = db.collection('users');

    // Find the OTP record
    const otpRecord = await otps.findOne({
      email,
      code: otp,
      used: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Find the user
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Mark OTP as used
    await otps.updateOne(
      { _id: otpRecord._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Generate JWT token
    const tokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET as string);

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        username: user.username,
      },
    }, { status: 200 });

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OTP login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}