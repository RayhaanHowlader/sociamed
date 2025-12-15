import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { resetToken, newPassword } = await request.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: 'Reset token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const db = await getDb();
    const resetOtps = db.collection('resetOtps');
    const users = db.collection('users');

    // Find the verified OTP record
    const otpRecord = await resetOtps.findOne({
      _id: new ObjectId(resetToken),
      verified: true,
      used: false,
      expiresAt: { $gt: new Date() }, // Still not expired
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Find the user
    const user = await users.findOne({ email: otpRecord.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          passwordHash,
          updatedAt: new Date()
        } 
      }
    );

    // Mark OTP as used
    await resetOtps.updateOne(
      { _id: otpRecord._id },
      { $set: { used: true, usedAt: new Date() } }
    );

    // Clean up old reset OTPs for this email
    await resetOtps.deleteMany({
      email: otpRecord.email,
      _id: { $ne: otpRecord._id }
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}