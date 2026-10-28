import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { hashPassword, signToken } from '../../../../lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { name, email, password, institution, fieldOfStudy } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid academic or professional email address' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long for research security' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email address already exists' }, { status: 409 });
    }

    const newUser = db.createUser({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      institution: (institution || 'Independent Research Institute').trim(),
      fieldOfStudy: (fieldOfStudy || 'Scientific & Academic Research').trim(),
      preferences: {
        theme: 'dark',
        defaultScope: 'project',
        autoSaveNotes: true,
        citationFormat: 'apa',
        aiAssistanceDefault: true,
        streamAiResponses: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const token = signToken({ userId: newUser.id, email: newUser.email });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          institution: newUser.institution,
          fieldOfStudy: newUser.fieldOfStudy,
          preferences: newUser.preferences,
          createdAt: newUser.createdAt,
        },
        token,
      },
      { status: 201 }
    );

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
