import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { POST as registerPOST } from '../src/app/api/auth/register/route';
import { POST as loginPOST } from '../src/app/api/auth/login/route';
import { GET as meGET, PUT as mePUT, POST as logoutPOST } from '../src/app/api/auth/me/route';
import { POST as forgotPasswordPOST } from '../src/app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '../src/app/api/auth/reset-password/route';
import { GET as projectsGET, POST as projectsPOST } from '../src/app/api/projects/route';
import { GET as projectDetailGET, PUT as projectDetailPUT, DELETE as projectDetailDELETE } from '../src/app/api/projects/[id]/route';
import { GET as papersGET, POST as papersPOST, DELETE as papersDELETE } from '../src/app/api/papers/route';
import { GET as notesGET, POST as notesPOST, PUT as notesPUT, DELETE as notesDELETE } from '../src/app/api/notes/route';
import { GET as evidenceGET, POST as evidencePOST } from '../src/app/api/evidence/route';
import { GET as chatSessionsGET, POST as chatSessionsPOST } from '../src/app/api/chat/sessions/route';
import { signToken } from '../src/lib/auth/session';

describe('User Panel, Authentication & Strict Cross-User Isolation Test Suite', () => {
  const timestamp = Date.now();
  const userAEmail = `researcher_a_${timestamp}@oxford.ac.uk`;
  const userBEmail = `researcher_b_${timestamp}@stanford.edu`;
  const defaultPassword = 'SecureResearchPassword2026!';

  let userA: any = null;
  let userB: any = null;
  let tokenA = '';
  let tokenB = '';
  let projectAId = '';
  let projectBId = '';
  let paperAId = '';
  let noteAId = '';

  // =========================================================================
  // 1. REGISTRATION, LOGIN & SESSION VALIDATION
  // =========================================================================
  describe('1. Authentication: Registration, Validation & Login', () => {
    it('validates password minimum length and rejects short passwords', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass User',
          email: `short_${timestamp}@test.edu`,
          password: 'short',
        }),
      });
      const res = await registerPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/at least 8 characters/i);
    });

    it('successfully registers Researcher A with hashed credentials and returns session token', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Arthur Pendelton',
          email: userAEmail,
          password: defaultPassword,
          institution: 'Oxford Institute of Computational Linguistics',
          fieldOfStudy: 'Dialectal Transformers',
        }),
      });
      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(userAEmail.toLowerCase());
      expect(data.user.name).toBe('Dr. Arthur Pendelton');
      expect(data.token).toBeDefined();

      userA = data.user;
      tokenA = data.token;
    });

    it('rejects duplicate email registration with HTTP 409', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Attempt',
          email: userAEmail,
          password: defaultPassword,
        }),
      });
      const res = await registerPOST(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });

    it('registers Researcher B for cross-user isolation tests', async () => {
      const req = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prof. Beatrice Vance',
          email: userBEmail,
          password: defaultPassword,
          institution: 'Stanford AI Lab',
          fieldOfStudy: 'Speech Synthesis',
        }),
      });
      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      userB = data.user;
      tokenB = data.token;
    });

    it('signs in Researcher A with correct credentials and rejects incorrect credentials', async () => {
      // Wrong password
      const wrongReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: 'WrongPassword123!' }),
      });
      const wrongRes = await loginPOST(wrongReq);
      expect(wrongRes.status).toBe(401);

      // Correct password
      const correctReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: defaultPassword }),
      });
      const correctRes = await loginPOST(correctReq);
      expect(correctRes.status).toBe(200);
      const data = await correctRes.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(userA.id);
    });
  });

  // =========================================================================
  // 2. PROTECTED ROUTES & SESSION EXPIRATION / LOGOUT
  // =========================================================================
  describe('2. Protected Session Access & Logout', () => {
    it('returns 401 Unauthorized for GET /api/auth/me when unauthenticated', async () => {
      const unauthReq = new Request('http://localhost:3000/api/auth/me');
      const res = await meGET(unauthReq);
      expect(res.status).toBe(401);
    });

    it('returns user profile and authorized statistics for GET /api/auth/me with Bearer token', async () => {
      const authReq = new Request('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const res = await meGET(authReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.id).toBe(userA.id);
      expect(data.user.stats).toBeDefined();
      expect(typeof data.user.stats.ownedProjectsCount).toBe('number');
    });

    it('successfully processes logout via POST /api/auth/me', async () => {
      const logoutReq = new Request('http://localhost:3000/api/auth/me', {
        method: 'POST',
      });
      const res = await logoutPOST(logoutReq);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  // =========================================================================
  // 3. PASSWORD RECOVERY & RESET FLOW
  // =========================================================================
  describe('3. Password Recovery & Reset', () => {
    let generatedResetToken = '';

    it('generates a recovery token for an existing registered academic email', async () => {
      const req = new Request('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail }),
      });
      const res = await forgotPasswordPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.resetToken).toBeDefined();
      generatedResetToken = data.resetToken;
    });

    it('resets password with valid recovery token and verifies updated password', async () => {
      const newPassword = 'NewlyUpdatedPassword2026!';
      const req = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: generatedResetToken,
          newPassword,
        }),
      });
      const res = await resetPasswordPOST(req);
      expect(res.status).toBe(200);

      // Verify login with new password succeeds
      const loginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: newPassword }),
      });
      const loginRes = await loginPOST(loginReq);
      expect(loginRes.status).toBe(200);

      // Verify login with old password fails
      const oldLoginReq = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: defaultPassword }),
      });
      const oldLoginRes = await loginPOST(oldLoginReq);
      expect(oldLoginRes.status).toBe(401);
    });
  });

  // =========================================================================
  // 4. PROJECT CREATION & OWNERSHIP
  // =========================================================================
  describe('4. Project Creation & Ownership Scoping', () => {
    it('creates Project A bound strictly to Researcher A', async () => {
      const req = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          title: 'Project A: Oxford Dialect Morphologies',
          description: 'Isolated research on Oxford phonetic representations.',
          researchField: 'Computational Linguistics',
        }),
      });
      const res = await projectsPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.project.userId).toBe(userA.id);
      projectAId = data.project.id;
    });

    it('creates Project B bound strictly to Researcher B', async () => {
      const req = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          title: 'Project B: Stanford Speech Lab',
          description: 'Acoustic waveform analysis.',
          researchField: 'Speech Processing',
        }),
      });
      const res = await projectsPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.project.userId).toBe(userB.id);
      projectBId = data.project.id;
    });

    it('returns only owned projects when ownedOnly=true is requested', async () => {
      const req = new Request('http://localhost:3000/api/projects?ownedOnly=true', {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const res = await projectsGET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      // All returned projects must belong to User A
      data.projects.forEach((p: any) => {
        expect(p.userId).toBe(userA.id);
      });
    });
  });

  // =========================================================================
  // 5. CROSS-USER PROJECT TAMPERING & ISOLATION CHECKS
  // =========================================================================
  describe('5. Cross-User Project Tampering Prevention (Zero-Leakage)', () => {
    it('prevents Researcher B from reading Researcher A private project (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/projects/${projectAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await projectDetailGET(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from modifying Researcher A project (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/projects/${projectAId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({ title: 'Hacked Project Title' }),
      });
      const res = await projectDetailPUT(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from deleting Researcher A project (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/projects/${projectAId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await projectDetailDELETE(req, { params: Promise.resolve({ id: projectAId }) });
      expect(res.status).toBe(403);
    });

    it('prevents deleting the immutable demo project', async () => {
      const req = new Request('http://localhost:3000/api/projects/proj_chatgaiya_sentiment_01', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const res = await projectDetailDELETE(req, { params: Promise.resolve({ id: 'proj_chatgaiya_sentiment_01' }) });
      // Either 400 (cannot delete demo) or 403 (not owner)
      expect([400, 403]).toContain(res.status);
    });
  });

  // =========================================================================
  // 6. PAPERS, NOTES, EVIDENCE & CHAT CROSS-USER ISOLATION
  // =========================================================================
  describe('6. Resource Isolation: Papers, Notes, Evidence & Chat Sessions', () => {
    it('allows Researcher A to add a paper to Project A', async () => {
      const req = new Request('http://localhost:3000/api/papers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          projectId: projectAId,
          title: 'Dialectal Token Fragmentation in Low-Resource Acoustic Encoders',
          authors: ['Pendelton, A.'],
          publicationYear: 2025,
          doi: `10.1016/oxford.${timestamp}`,
        }),
      });
      const res = await papersPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      paperAId = data.paper.id;
    });

    it('prevents Researcher B from reading papers in Project A (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/papers?projectId=${projectAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await papersGET(req);
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from deleting Researcher A paper (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/papers?id=${encodeURIComponent(paperAId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await papersDELETE(req);
      expect(res.status).toBe(403);
    });

    it('allows Researcher A to create a private research note in Project A', async () => {
      const req = new Request('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          projectId: projectAId,
          title: 'Oxford Hypothesis On Morphemes',
          content: 'Acoustic attention preserves dialect morphemes better than subword byte-pair encoding.',
        }),
      });
      const res = await notesPOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      noteAId = data.note.id;
    });

    it('prevents Researcher B from reading notes in Project A (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/notes?projectId=${projectAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await notesGET(req);
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from modifying Researcher A note (HTTP 403)', async () => {
      const req = new Request('http://localhost:3000/api/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          id: noteAId,
          title: 'Tampered Title',
        }),
      });
      const res = await notesPUT(req);
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from reading evidence records in Project A (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/evidence?projectId=${projectAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await evidenceGET(req);
      expect(res.status).toBe(403);
    });

    it('prevents Researcher B from reading chat sessions in Project A (HTTP 403)', async () => {
      const req = new Request(`http://localhost:3000/api/chat/sessions?projectId=${projectAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const res = await chatSessionsGET(req);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. ACCOUNT PREFERENCES PERSISTENCE
  // =========================================================================
  describe('7. Account Preferences & Profile Updates', () => {
    it('updates researcher preferences and verifies persistence', async () => {
      const req = new Request('http://localhost:3000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
        body: JSON.stringify({
          name: 'Prof. Beatrice Vance Ph.D.',
          institution: 'Stanford AI & Acoustics Laboratory',
          preferences: {
            defaultScope: 'paper',
            citationFormat: 'ieee',
          },
        }),
      });
      const res = await mePUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.name).toBe('Prof. Beatrice Vance Ph.D.');
      expect(data.user.preferences.defaultScope).toBe('paper');
      expect(data.user.preferences.citationFormat).toBe('ieee');

      // Verify persisted in GET /api/auth/me
      const checkReq = new Request('http://localhost:3000/api/auth/me', {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const checkRes = await meGET(checkReq);
      const checkData = await checkRes.json();
      expect(checkData.user.name).toBe('Prof. Beatrice Vance Ph.D.');
      expect(checkData.user.preferences.citationFormat).toBe('ieee');
    });
  });
});
