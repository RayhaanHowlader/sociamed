import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    
    // TODO: Implement OTP login logic
    return NextResponse.json({ message: 'OTP login endpoint - not implemented yet' }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}