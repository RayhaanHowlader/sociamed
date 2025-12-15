import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const db = await getDb();
    const resetOtps = db.collection('resetOtps');

    // Find the OTP record
    const otpRecord = await resetOtps.findOne({
      email,
      code: otp,
      used: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Mark OTP as verified (but not used yet - will be used when password is actually reset)
    await resetOtps.updateOne(
      { _id: otpRecord._id },
      { $set: { verified: true, verifiedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: 'Reset code verified successfully',
      resetToken: otpRecord._id.toString(), // Use OTP record ID as reset token
    }, { status: 200 });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}