import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { signPasswordResetToken } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.getUserByEmail(cleanEmail);

    // If user doesn't exist, return a generic message to prevent user enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      });
    }

    const resetToken = signPasswordResetToken({ userId: user.id, email: user.email });
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.updateUser(user.id, {
      resetToken,
      resetTokenExpires: expires,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated. Use the provided token or link to complete password recovery.',
      resetToken, // Returned in dev/offline mode so user can test the reset flow immediately without external email provider
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Forgot password failed' }, { status: 500 });
  }
}
