import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const { name, email, password, institution, fieldOfStudy } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 409 });
    }

    const newUser = db.createUser({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email,
      passwordHash: hashPassword(password),
      institution: institution || 'Academic Institution',
      fieldOfStudy: fieldOfStudy || 'Scientific Research',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const token = signToken({ userId: newUser.id, email: newUser.email });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        institution: newUser.institution,
        fieldOfStudy: newUser.fieldOfStudy,
      },
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
