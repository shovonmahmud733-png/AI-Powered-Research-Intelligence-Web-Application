import { NextResponse } from 'next/server';
import { getStrictSessionUser, comparePassword, hashPassword } from '../../../../lib/auth/session';
import { db } from '../../../../lib/db';
import { UserPreferences } from '../../../../lib/db/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = getStrictSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: No active academic session' }, { status: 401 });
  }

  // Calculate real researcher statistics from actual database records
  const userProjects = db.getUserProjects(user.id);
  const accessibleProjects = db.getProjects(user.id);

  let paperCount = 0;
  let evidenceCount = 0;
  let noteCount = 0;
  let experimentCount = 0;
  let gapCount = 0;

  for (const proj of accessibleProjects) {
    paperCount += db.getPapers(proj.id).length;
    evidenceCount += db.getEvidence(proj.id).length;
    noteCount += db.getNotes(proj.id).length;
    experimentCount += db.getExperiments(proj.id).length;
    gapCount += db.getGaps(proj.id).length;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      fieldOfStudy: user.fieldOfStudy,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences || {
        theme: 'dark',
        defaultScope: 'project',
        autoSaveNotes: true,
        citationFormat: 'apa',
        aiAssistanceDefault: true,
        streamAiResponses: true,
      },
      createdAt: user.createdAt,
      stats: {
        ownedProjectsCount: userProjects.length,
        accessibleProjectsCount: accessibleProjects.length,
        paperCount,
        evidenceCount,
        noteCount,
        experimentCount,
        gapCount,
      },
    },
  });
}

export async function PUT(req: Request) {
  const user = getStrictSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, institution, fieldOfStudy, avatarUrl, preferences, currentPassword, newPassword } = body;

    const updates: any = {};

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (institution !== undefined) {
      updates.institution = institution.trim();
    }

    if (fieldOfStudy !== undefined) {
      updates.fieldOfStudy = fieldOfStudy.trim();
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl.trim();
    }

    if (preferences !== undefined && typeof preferences === 'object') {
      updates.preferences = {
        ...(user.preferences || {}),
        ...preferences,
      };
    }

    // Handle password change securely
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      if (!comparePassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      updates.passwordHash = hashPassword(newPassword);
    }

    const updatedUser = db.updateUser(user.id, updates);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        institution: updatedUser.institution,
        fieldOfStudy: updatedUser.fieldOfStudy,
        avatarUrl: updatedUser.avatarUrl,
        preferences: updatedUser.preferences,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = getStrictSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  if (user.id === 'usr_demo_researcher_01') {
    return NextResponse.json(
      { error: 'The demo researcher account cannot be deleted' },
      { status: 400 }
    );
  }

  const deleted = db.deleteUser(user.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
  }

  const response = NextResponse.json({ success: true, message: 'Account successfully deactivated' });
  response.cookies.delete('auth_token');
  return response;
}

export async function POST(req: Request) {
  // Logout
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return response;
}
