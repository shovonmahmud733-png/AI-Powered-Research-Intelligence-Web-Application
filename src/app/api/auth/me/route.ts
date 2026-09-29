import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(req: Request) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      fieldOfStudy: user.fieldOfStudy,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function POST(req: Request) {
  // Logout
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
