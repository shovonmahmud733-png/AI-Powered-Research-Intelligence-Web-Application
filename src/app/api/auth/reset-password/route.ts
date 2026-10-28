import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { verifyPasswordResetToken, hashPassword } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const payload = verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Password reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    const user = db.getUserById(payload.userId);
    if (!user || user.resetToken !== token) {
      return NextResponse.json(
        { error: 'Password reset token is invalid or has already been consumed' },
        { status: 400 }
      );
    }

    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      return NextResponse.json(
        { error: 'Password reset token has expired' },
        { status: 400 }
      );
    }

    // Update password and clear resetToken
    db.updateUser(user.id, {
      passwordHash: hashPassword(newPassword),
      resetToken: undefined,
      resetTokenExpires: undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated. You may now sign in with your new credentials.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
