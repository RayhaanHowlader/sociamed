import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection('users');
    const resetOtps = db.collection('resetOtps');

    // Check if user exists
    const user = await users.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with this email exists, you will receive a reset code.' 
      }, { status: 200 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Delete any existing reset OTPs for this email
    await resetOtps.deleteMany({ email });

    // Store the OTP in database
    await resetOtps.insertOne({
      email,
      code: otp,
      used: false,
      expiresAt,
      createdAt: new Date(),
    });

    // Send email with OTP
    const emailSubject = 'Password Reset Code - Nexus';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Nexus</h1>
          <p style="color: #e0f2fe; margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #475569; line-height: 1.6;">
            We received a request to reset your password. Use the code below to reset your password:
          </p>
          
          <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; font-family: monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
            This code will expire in 10 minutes. If you didn't request this reset, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p>This is an automated message from Nexus. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    await sendEmail(email, emailSubject, emailHtml);

    return NextResponse.json({
      success: true,
      message: 'Reset code sent to your email address',
    }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}