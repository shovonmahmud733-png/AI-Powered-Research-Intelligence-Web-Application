import fs from 'fs';
import path from 'path';
import {
  User,
  ResearchProject,
  Paper,
  DocumentChunk,
  StructuredPaperAnalysis,
  LiteratureMatrixRow,
  Evidence,
  Contradiction,
  ResearchGap,
  ResearchMemoryItem,
  ResearchNote,
  MLExperiment,
  SystematicReviewItem,
  ChatSession,
  ChatMessage,
} from './types';
import {
  initialUsers,
  initialProjects,
  initialPapers,
  initialChunks,
  initialAnalysis,
  initialMatrix,
  initialEvidence,
  initialContradictions,
  initialGaps,
  initialMemory,
  initialNotes,
  initialExperiments,
  initialSystematicReview,
  initialChatSessions,
  initialChatMessages,
} from './seedData';

export interface DatabaseSchema {
  users: User[];
  projects: ResearchProject[];
  papers: Paper[];
  chunks: DocumentChunk[];
  analysis: StructuredPaperAnalysis[];
  matrix: LiteratureMatrixRow[];
  evidence: Evidence[];
  contradictions: Contradiction[];
  gaps: ResearchGap[];
  memory: ResearchMemoryItem[];
  notes: ResearchNote[];
  experiments: MLExperiment[];
  systematicReview: SystematicReviewItem[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseService {
  private data: DatabaseSchema;
  private isLoaded = false;

  constructor() {
    this.data = this.getDefaultSchema();
    this.load();
  }

  private getDefaultSchema(): DatabaseSchema {
    return {
      users: initialUsers,
      projects: initialProjects,
      papers: initialPapers,
      chunks: initialChunks,
      analysis: initialAnalysis,
      matrix: initialMatrix,
      evidence: initialEvidence,
      contradictions: initialContradictions,
      gaps: initialGaps,
      memory: initialMemory,
      notes: initialNotes,
      experiments: initialExperiments,
      systematicReview: initialSystematicReview,
      chatSessions: initialChatSessions,
      chatMessages: initialChatMessages,
    };
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    if (this.isLoaded) return;
    try {
      this.ensureDir();
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          ...this.getDefaultSchema(),
          ...parsed,
        };
      } else {
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to load database, falling back to seed schema:', err);
      this.data = this.getDefaultSchema();
      this.isLoaded = true;
    }
  }

  private save() {
    try {
      this.ensureDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to file:', err);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    this.load();
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    this.load();
    return this.data.users.find((u) => u.id === id);
  }

  createUser(user: User): User {
    this.load();
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    this.load();
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  // Projects
  getProjects(userId: string): ResearchProject[] {
    this.load();
    return this.data.projects.filter((p) => p.userId === userId || p.isDemo);
  }

  getProjectById(id: string): ResearchProject | undefined {
    this.load();
    return this.data.projects.find((p) => p.id === id);
  }

  createProject(project: ResearchProject): ResearchProject {
    this.load();
    this.data.projects.unshift(project);
    this.save();
    return project;
  }

  updateProject(id: string, updates: Partial<ResearchProject>): ResearchProject | undefined {
    this.load();
    const idx = this.data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.projects[idx] = { ...this.data.projects[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.projects[idx];
  }

  deleteProject(id: string): boolean {
    this.load();
    const before = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== before) {
      this.save();
      return true;
    }
    return false;
  }

  // Papers
  getPapers(projectId: string): Paper[] {
    this.load();
    return this.data.papers.filter((p) => p.projectId === projectId);
  }

  getPaperById(id: string): Paper | undefined {
    this.load();
    return this.data.papers.find((p) => p.id === id);
  }

  getPaperByDoi(doi: string, projectId?: string): Paper | undefined {
    this.load();
    const clean = doi.trim().toLowerCase();
    return this.data.papers.find(
      (p) => p.doi?.toLowerCase() === clean && (!projectId || p.projectId === projectId)
    );
  }

  createPaper(paper: Paper): Paper {
    this.load();
    this.data.papers.unshift(paper);
    this.save();
    return paper;
  }

  updatePaper(id: string, updates: Partial<Paper>): Paper | undefined {
    this.load();
    const idx = this.data.papers.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.papers[idx] = { ...this.data.papers[idx], ...updates };
    this.save();
    return this.data.papers[idx];
  }

  deletePaper(id: string): boolean {
    this.load();
    this.data.papers = this.data.papers.filter((p) => p.id !== id);
    this.data.chunks = this.data.chunks.filter((c) => c.paperId !== id);
    this.data.analysis = this.data.analysis.filter((a) => a.paperId !== id);
    this.data.matrix = this.data.matrix.filter((m) => m.paperId !== id);
    this.data.evidence = this.data.evidence.filter((e) => e.paperId !== id);
    this.save();
    return true;
  }

  // Chunks
  getChunksByPaper(paperId: string): DocumentChunk[] {
    this.load();
    return this.data.chunks.filter((c) => c.paperId === paperId);
  }

  getChunksByProject(projectId: string): DocumentChunk[] {
    this.load();
    const papers = this.getPapers(projectId);
    const paperIds = new Set(papers.map((p) => p.id));
    return this.data.chunks.filter((c) => paperIds.has(c.paperId));
  }

  addChunks(chunks: DocumentChunk[]): void {
    this.load();
    this.data.chunks.push(...chunks);
    this.save();
  }

  // Structured Paper Analysis
  getAnalysisByPaper(paperId: string): StructuredPaperAnalysis | undefined {
    this.load();
    return this.data.analysis.find((a) => a.paperId === paperId);
  }

  saveAnalysis(analysis: StructuredPaperAnalysis): StructuredPaperAnalysis {
    this.load();
    const idx = this.data.analysis.findIndex((a) => a.paperId === analysis.paperId);
    if (idx >= 0) {
      this.data.analysis[idx] = analysis;
    } else {
      this.data.analysis.push(analysis);
    }
    this.save();
    return analysis;
  }

  // Literature Matrix
  getMatrixRows(projectId: string): LiteratureMatrixRow[] {
    this.load();
    return this.data.matrix.filter((m) => m.projectId === projectId);
  }

  saveMatrixRow(row: LiteratureMatrixRow): LiteratureMatrixRow {
    this.load();
    const idx = this.data.matrix.findIndex((m) => m.id === row.id);
    if (idx >= 0) {
      this.data.matrix[idx] = row;
    } else {
      this.data.matrix.push(row);
    }
    this.save();
    return row;
  }

  deleteMatrixRow(id: string): boolean {
    this.load();
    this.data.matrix = this.data.matrix.filter((m) => m.id !== id);
    this.save();
    return true;
  }

  // Evidence
  getEvidence(projectId: string): Evidence[] {
    this.load();
    return this.data.evidence.filter((e) => e.projectId === projectId);
  }

  createEvidence(evidence: Evidence): Evidence {
    this.load();
    this.data.evidence.unshift(evidence);
    this.save();
    return evidence;
  }

  updateEvidence(id: string, updates: Partial<Evidence>): Evidence | undefined {
    this.load();
    const idx = this.data.evidence.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.evidence[idx] = { ...this.data.evidence[idx], ...updates };
    this.save();
    return this.data.evidence[idx];
  }

  deleteEvidence(id: string): boolean {
    this.load();
    this.data.evidence = this.data.evidence.filter((e) => e.id !== id);
    this.save();
    return true;
  }

  // Contradictions
  getContradictions(projectId: string): Contradiction[] {
    this.load();
    return this.data.contradictions.filter((c) => c.projectId === projectId);
  }

  createContradiction(c: Contradiction): Contradiction {
    this.load();
    this.data.contradictions.unshift(c);
    this.save();
    return c;
  }

  deleteContradiction(id: string): boolean {
    this.load();
    this.data.contradictions = this.data.contradictions.filter((c) => c.id !== id);
    this.save();
    return true;
  }

  // Research Gaps
  getGaps(projectId: string): ResearchGap[] {
    this.load();
    return this.data.gaps.filter((g) => g.projectId === projectId);
  }

  createGap(gap: ResearchGap): ResearchGap {
    this.load();
    this.data.gaps.unshift(gap);
    this.save();
    return gap;
  }

  updateGap(id: string, updates: Partial<ResearchGap>): ResearchGap | undefined {
    this.load();
    const idx = this.data.gaps.findIndex((g) => g.id === id);
    if (idx === -1) return undefined;
    this.data.gaps[idx] = { ...this.data.gaps[idx], ...updates };
    this.save();
    return this.data.gaps[idx];
  }

  deleteGap(id: string): boolean {
    this.load();
    this.data.gaps = this.data.gaps.filter((g) => g.id !== id);
    this.save();
    return true;
  }

  // Research Memory
  getMemory(projectId: string): ResearchMemoryItem[] {
    this.load();
    return this.data.memory.filter((m) => m.projectId === projectId);
  }

  createMemory(item: ResearchMemoryItem): ResearchMemoryItem {
    this.load();
    this.data.memory.unshift(item);
    this.save();
    return item;
  }

  deleteMemory(id: string): boolean {
    this.load();
    this.data.memory = this.data.memory.filter((m) => m.id !== id);
    this.save();
    return true;
  }

  // Notes
  getNotes(projectId: string): ResearchNote[] {
    this.load();
    return this.data.notes.filter((n) => n.projectId === projectId);
  }

  getNoteById(id: string): ResearchNote | undefined {
    this.load();
    return this.data.notes.find((n) => n.id === id);
  }

  createNote(note: ResearchNote): ResearchNote {
    this.load();
    this.data.notes.unshift(note);
    this.save();
    return note;
  }

  updateNote(id: string, updates: Partial<ResearchNote>): ResearchNote | undefined {
    this.load();
    const idx = this.data.notes.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    this.data.notes[idx] = { ...this.data.notes[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.notes[idx];
  }

  deleteNote(id: string): boolean {
    this.load();
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    this.save();
    return true;
  }

  // Experiments
  getExperiments(projectId: string): MLExperiment[] {
    this.load();
    return this.data.experiments.filter((e) => e.projectId === projectId);
  }

  createExperiment(exp: MLExperiment): MLExperiment {
    this.load();
    this.data.experiments.unshift(exp);
    this.save();
    return exp;
  }

  updateExperiment(id: string, updates: Partial<MLExperiment>): MLExperiment | undefined {
    this.load();
    const idx = this.data.experiments.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.experiments[idx] = { ...this.data.experiments[idx], ...updates };
    this.save();
    return this.data.experiments[idx];
  }

  deleteExperiment(id: string): boolean {
    this.load();
    this.data.experiments = this.data.experiments.filter((e) => e.id !== id);
    this.save();
    return true;
  }

  // Systematic Review
  getSystematicReview(projectId: string): SystematicReviewItem[] {
    this.load();
    return this.data.systematicReview.filter((s) => s.projectId === projectId);
  }

  saveSystematicReviewItem(item: SystematicReviewItem): SystematicReviewItem {
    this.load();
    const idx = this.data.systematicReview.findIndex(
      (s) => s.projectId === item.projectId && s.paperId === item.paperId
    );
    if (idx >= 0) {
      this.data.systematicReview[idx] = item;
    } else {
      this.data.systematicReview.push(item);
    }
    this.save();
    return item;
  }

  // Research AI Chat Sessions & Messages
  getChatSessions(projectId: string): ChatSession[] {
    this.load();
    if (!this.data.chatSessions) this.data.chatSessions = [];
    return this.data.chatSessions.filter((s) => s.projectId === projectId);
  }

  getChatSessionById(id: string): ChatSession | undefined {
    this.load();
    if (!this.data.chatSessions) this.data.chatSessions = [];
    return this.data.chatSessions.find((s) => s.id === id);
  }

  createChatSession(session: Partial<ChatSession> & { projectId: string; title: string }): ChatSession {
    this.load();
    if (!this.data.chatSessions) this.data.chatSessions = [];
    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: session.id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId: session.projectId,
      title: session.title,
      scope: session.scope || 'project',
      paperId: session.paperId,
      createdAt: session.createdAt || now,
      updatedAt: session.updatedAt || now,
    };
    this.data.chatSessions.unshift(newSession);
    this.save();
    return newSession;
  }

  updateChatSession(id: string, updates: Partial<ChatSession>): ChatSession | undefined {
    this.load();
    if (!this.data.chatSessions) this.data.chatSessions = [];
    const idx = this.data.chatSessions.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.chatSessions[idx] = {
      ...this.data.chatSessions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.chatSessions[idx];
  }

  deleteChatSession(id: string): boolean {
    this.load();
    if (!this.data.chatSessions) this.data.chatSessions = [];
    if (!this.data.chatMessages) this.data.chatMessages = [];
    this.data.chatSessions = this.data.chatSessions.filter((s) => s.id !== id);
    this.data.chatMessages = this.data.chatMessages.filter((m) => m.sessionId !== id);
    this.save();
    return true;
  }

  getChatMessages(sessionId: string): ChatMessage[] {
    this.load();
    if (!this.data.chatMessages) this.data.chatMessages = [];
    return this.data.chatMessages.filter((m) => m.sessionId === sessionId);
  }

  addChatMessage(msg: Partial<ChatMessage> & { sessionId: string; role: 'user' | 'assistant'; content: string }): ChatMessage {
    this.load();
    if (!this.data.chatMessages) this.data.chatMessages = [];
    const now = new Date().toISOString();
    const newMsg: ChatMessage = {
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId: msg.sessionId,
      projectId: msg.projectId,
      role: msg.role,
      content: msg.content,
      modelUsed: msg.modelUsed,
      sources: msg.sources || [],
      interpretationNotes: msg.interpretationNotes,
      unverifiedWarnings: msg.unverifiedWarnings,
      createdAt: msg.createdAt || now,
    };
    this.data.chatMessages.push(newMsg);
    // Update session timestamp
    const session = this.getChatSessionById(newMsg.sessionId);
    if (session) {
      session.updatedAt = now;
    }
    this.save();
    return newMsg;
  }

  clearChatMessages(sessionId: string): boolean {
    this.load();
    if (!this.data.chatMessages) this.data.chatMessages = [];
    this.data.chatMessages = this.data.chatMessages.filter((m) => m.sessionId !== sessionId);
    this.save();
    return true;
  }
}

export const db = new DatabaseService();
