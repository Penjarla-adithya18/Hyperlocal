// lib/api.ts
// Client-side API layer calling Supabase Edge Functions.
// Exports the same interface as the old mockDb so all pages
// only need to change their import path.

import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  Application,
  ChatConversation,
  ChatMessage,
  TrustScore,
  Report,
  EscrowTransaction,
  Notification,
  JobStatus,
  ApplicationStatus,
} from './types'

// ─── Edge-function caller ──────────────────────────────────────────────────

function getEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  }
}

const SESSION_TOKEN_KEY = 'sessionToken'

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_TOKEN_KEY)
}

function setSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, token)
  else localStorage.removeItem(SESSION_TOKEN_KEY)
}

async function call<T>(
  fn: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  params: Record<string, string> = {},
  body?: unknown
): Promise<T> {
  const { url, key } = getEnv()
  const token = getSessionToken()
  const qs = new URLSearchParams(params).toString()
  const endpoint = `${url}/functions/v1/${fn}${qs ? `?${qs}` : ''}`

  const res = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || key}`,
      apikey: key,
    },
    body: method !== 'GET' && body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    if (res.status === 401) {
      setSessionToken(null)
      if (typeof window !== 'undefined') localStorage.removeItem('currentUser')
    }
    const text = await res.text()
    throw new Error(`Edge function ${fn} error ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Type helpers ──────────────────────────────────────────────────────────

type R<T> = { data: T }
type SR = { success: boolean; message: string }
type SRU = { success: boolean; user?: User; token?: string; expiresAt?: string; message: string }

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  fullName: string
  phoneNumber: string
  password: string
  role: User['role']
  businessName?: string
  organizationName?: string
}): Promise<{ success: boolean; user?: User; message: string }> {
  const res = await call<SRU>('auth', 'POST', {}, { action: 'register', ...data })
  if (res.success && res.token) setSessionToken(res.token)
  if (!res.success) setSessionToken(null)
  return { success: res.success, user: res.user, message: res.message }
}

export async function loginUser(
  phoneNumber: string,
  password: string
): Promise<{ success: boolean; user?: User; message: string }> {
  const res = await call<SRU>('auth', 'POST', {}, { action: 'login', phoneNumber, password })
  if (res.success && res.token) setSessionToken(res.token)
  if (!res.success) setSessionToken(null)
  return { success: res.success, user: res.user, message: res.message }
}

export async function resetPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await call<SR>('auth', 'POST', {}, { action: 'reset-password', currentPassword, newPassword })
  // Do NOT clear session — user stays logged in after changing password
  return res
}

export async function forgotPasswordReset(
  phoneNumber: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await call<SR>('auth', 'POST', {}, { action: 'forgot-password', phoneNumber, newPassword })
  return res
}

export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const res = await call<R<User | null>>('auth', 'POST', {}, { action: 'get-user-by-phone', phoneNumber })
  return res.data
}

// ─── Session helpers (localStorage, unchanged) ─────────────────────────────

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  if (!getSessionToken()) return null
  try { return JSON.parse(localStorage.getItem('currentUser') ?? 'null') } catch { return null }
}
export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return
  user ? localStorage.setItem('currentUser', JSON.stringify(user)) : localStorage.removeItem('currentUser')
}
export function logout(): void {
  call<SR>('auth', 'POST', {}, { action: 'logout' }).catch(() => {})
  setCurrentUser(null)
  setSessionToken(null)
}
export function isAuthenticated(): boolean { return getCurrentUser() !== null }
export function getUserPassword(phone: string): string | null {
  void phone
  return null
}
export function setUserPassword(phone: string, password: string): void {
  void phone
  void password
}

// ─── Users ─────────────────────────────────────────────────────────────────

export const mockUserOps = {
  getAll: async (): Promise<User[]> => {
    const res = await call<R<User[]>>('users')
    _usersCache = res.data || []
    return res.data
  },
  findByPhone: async (phoneNumber: string): Promise<User | null> => {
    return getUserByPhone(phoneNumber)
  },
  findById: async (id: string): Promise<User | null> => {
    const res = await call<R<User | null>>('users', 'GET', { id })
    if (res.data) upsertUserCache(res.data)
    return res.data
  },
  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    const res = await call<R<User | null>>('users', 'PATCH', { id }, updates)
    if (res.data) upsertUserCache(res.data)
    return res.data
  },
}

// ─── Worker Profiles ───────────────────────────────────────────────────────

export const mockWorkerProfileOps = {
  findByUserId: async (userId: string): Promise<WorkerProfile | null> => {
    const res = await call<R<WorkerProfile | null>>('profiles', 'GET', { userId, role: 'worker' })
    return res.data
  },
  create: async (profile: WorkerProfile): Promise<WorkerProfile> => {
    const res = await call<R<WorkerProfile>>('profiles', 'POST', {}, { ...profile, role: 'worker' })
    return res.data
  },
  update: async (userId: string, updates: Partial<WorkerProfile>): Promise<WorkerProfile | null> => {
    const res = await call<R<WorkerProfile | null>>('profiles', 'PATCH', { userId, role: 'worker' }, updates)
    return res.data
  },
  getAll: async (): Promise<WorkerProfile[]> => {
    // Not needed server-side; return empty list
    return []
  },
}

// ─── Employer Profiles ─────────────────────────────────────────────────────

export const mockEmployerProfileOps = {
  findByUserId: async (userId: string): Promise<EmployerProfile | null> => {
    const res = await call<R<EmployerProfile | null>>('profiles', 'GET', { userId, role: 'employer' })
    return res.data
  },
  create: async (profile: EmployerProfile): Promise<EmployerProfile> => {
    const res = await call<R<EmployerProfile>>('profiles', 'POST', {}, { ...profile, role: 'employer' })
    return res.data
  },
  update: async (userId: string, updates: Partial<EmployerProfile>): Promise<EmployerProfile | null> => {
    const res = await call<R<EmployerProfile | null>>('profiles', 'PATCH', { userId, role: 'employer' }, updates)
    return res.data
  },
  getAll: async (): Promise<EmployerProfile[]> => {
    return []
  },
}

// ─── Jobs ──────────────────────────────────────────────────────────────────

export const mockJobOps = {
  findById: async (id: string): Promise<Job | null> => {
    const res = await call<R<Job | null>>('jobs', 'GET', { id })
    return res.data
  },
  findByEmployerId: async (employerId: string): Promise<Job[]> => {
    const res = await call<R<Job[]>>('jobs', 'GET', { employerId })
    return res.data
  },
  getAll: async (filters?: { status?: JobStatus; category?: string; location?: string }): Promise<Job[]> => {
    const params: Record<string, string> = {}
    if (filters?.status) params.status = filters.status
    if (filters?.category) params.category = filters.category
    if (filters?.location) params.location = filters.location
    const res = await call<R<Job[]>>('jobs', 'GET', params)
    return res.data
  },
  create: async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
    const res = await call<R<Job>>('jobs', 'POST', {}, job)
    return res.data
  },
  update: async (id: string, updates: Partial<Job>): Promise<Job | null> => {
    const res = await call<R<Job | null>>('jobs', 'PATCH', { id }, updates)
    return res.data
  },
  delete: async (id: string): Promise<boolean> => {
    await call<{ success: boolean }>('jobs', 'DELETE', { id })
    return true
  },
}

// ─── Applications ──────────────────────────────────────────────────────────

export const mockApplicationOps = {
  findById: async (id: string): Promise<Application | null> => {
    const res = await call<R<Application[]>>('applications', 'GET', {})
    return res.data.find((a) => a.id === id) ?? null
  },
  findByJobId: async (jobId: string): Promise<Application[]> => {
    const res = await call<R<Application[]>>('applications', 'GET', { jobId })
    return res.data
  },
  findByWorkerId: async (workerId: string): Promise<Application[]> => {
    const res = await call<R<Application[]>>('applications', 'GET', { workerId })
    return res.data
  },
  create: async (application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> => {
    const res = await call<R<Application>>('applications', 'POST', {}, application)
    return res.data
  },
  update: async (id: string, updates: Partial<Application>): Promise<Application | null> => {
    const res = await call<R<Application | null>>('applications', 'PATCH', { id }, updates)
    return res.data
  },
}

// ─── Trust Scores ──────────────────────────────────────────────────────────

export const mockTrustScoreOps = {
  findByUserId: async (userId: string): Promise<TrustScore | null> => {
    const res = await call<R<TrustScore | null>>('trust-scores', 'GET', { userId })
    return res.data
  },
  update: async (userId: string, updates: Partial<TrustScore>): Promise<TrustScore | null> => {
    const res = await call<R<TrustScore | null>>('trust-scores', 'PATCH', { userId }, updates)
    return res.data
  },
}

// ─── Reports ───────────────────────────────────────────────────────────────

export const mockReportOps = {
  create: async (report: Omit<Report, 'id' | 'createdAt'>): Promise<Report> => {
    const res = await call<R<Report>>('reports', 'POST', {}, report)
    return res.data
  },
  getAll: async (): Promise<Report[]> => {
    const res = await call<R<Report[]>>('reports')
    return res.data
  },
  update: async (id: string, updates: Partial<Report>): Promise<Report | null> => {
    const res = await call<R<Report | null>>('reports', 'PATCH', { id }, updates)
    return res.data
  },
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const mockNotificationOps = {
  create: async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> => {
    const res = await call<R<Notification>>('notifications', 'POST', {}, notification)
    return res.data
  },
  findByUserId: async (_userId: string): Promise<Notification[]> => {
    // Edge function reads userId from JWT — the _userId param is ignored
    const res = await call<R<Notification[]>>('notifications', 'GET')
    return res.data || []
  },
  markAsRead: async (id: string): Promise<boolean> => {
    await call<R<Notification>>('notifications', 'PATCH', { id })
    return true
  },
  markAllRead: async (): Promise<void> => {
    await call<R<{ ok: boolean }>>('notifications', 'DELETE')
  },
}

// ─── Chat (session-based ops kept for backward compat) ─────────────────────

export const mockChatOps = {
  findSessionsByUserId: async (userId: string) => {
    const res = await call<R<ChatConversation[]>>('chat', 'GET', { type: 'conversations', userId })
    return res.data
  },
  getMessages: async (sessionId: string) => {
    const res = await call<R<ChatMessage[]>>('chat', 'GET', { type: 'messages', conversationId: sessionId })
    return res.data
  },
  sendMessage: async (msg: { sessionId?: string; conversationId?: string; senderId: string; message: string }) => {
    const conversationId = msg.conversationId ?? msg.sessionId ?? ''
    const res = await call<R<ChatMessage>>('chat', 'POST', {}, {
      type: 'message',
      conversationId,
      senderId: msg.senderId,
      message: msg.message,
    })
    return res.data
  },
  createSession: async (session: {
    applicationId: string
    workerId: string
    employerId: string
    jobId: string
    isActive: boolean
  }) => {
    const res = await call<R<ChatConversation>>('chat', 'POST', {}, {
      type: 'conversation',
      participants: [session.workerId, session.employerId],
      workerId: session.workerId,
      employerId: session.employerId,
      jobId: session.jobId,
      applicationId: session.applicationId,
    })
    return res.data
  },
  findSessionByApplicationId: async (applicationId: string) => {
    const res = await call<R<ChatConversation[]>>('chat', 'GET', { type: 'conversations' })
    return res.data.find((c) => c.applicationId === applicationId) ?? null
  },
}

// ─── Escrow ────────────────────────────────────────────────────────────────

export const mockEscrowOps = {
  create: async (transaction: Omit<EscrowTransaction, 'id' | 'createdAt'>): Promise<EscrowTransaction> => {
    const res = await call<R<EscrowTransaction>>('escrow', 'POST', {}, transaction)
    return res.data
  },
  getAll: async (): Promise<EscrowTransaction[]> => {
    const res = await call<R<EscrowTransaction[]>>('escrow')
    return res.data
  },
  update: async (id: string, updates: Partial<EscrowTransaction>): Promise<EscrowTransaction | null> => {
    const res = await call<R<EscrowTransaction | null>>('escrow', 'PATCH', { id }, updates)
    return res.data
  },
  findByUser: async (userId: string, _role: 'worker' | 'employer'): Promise<EscrowTransaction[]> => {
    // The edge function auto-filters by the logged-in user; fetch all and return
    const res = await call<R<EscrowTransaction[]>>('escrow')
    return res.data || []
  },
}

// ─── Ratings ───────────────────────────────────────────────────────────────

export interface Rating {
  id: string
  jobId: string
  applicationId?: string
  fromUserId: string
  toUserId: string
  rating: number
  feedback?: string
  createdAt: string
}

export const mockRatingOps = {
  create: async (payload: {
    jobId: string
    applicationId?: string
    toUserId: string
    rating: number
    feedback?: string
  }): Promise<Rating> => {
    const res = await call<R<Rating>>('ratings', 'POST', {}, payload)
    return res.data
  },
  getByUser: async (userId: string): Promise<Rating[]> => {
    const res = await call<R<Rating[]>>('ratings', 'GET', { userId })
    return res.data || []
  },
}

// ─── WATI WhatsApp Notifications ──────────────────────────────────────────

/**
 * Send a WhatsApp/WATI notification for key platform events.
 * Silently fails — never blocks the main action.
 */
export async function sendWATIAlert(
  action: 'application_accepted' | 'payment_released' | 'job_matched' | 'job_completed',
  phoneNumber: string,
  vars?: Record<string, string>
): Promise<void> {
  try {
    await call('wati', 'POST', {}, { action, phoneNumber, ...vars })
  } catch {
    // Fire-and-forget: never block the UI for notification failures
  }
}


// ─── mockDb facade (drop-in replacement for the old mockDb export) ─────────

// Local in-memory cache for users (used by getUserById which must be sync)
let _usersCache: User[] = []
let _applicationsCache: Application[] = []
let _reportsCache: Report[] = []
let _escrowCache: EscrowTransaction[] = []

function upsertUserCache(user: User): void {
  const index = _usersCache.findIndex((item) => item.id === user.id)
  if (index === -1) _usersCache.push(user)
  else _usersCache[index] = { ..._usersCache[index], ...user }
}

export const mockDb = {
  async getAllUsers(): Promise<User[]> {
    const users = await mockUserOps.getAll()
    _usersCache = users
    return users
  },

  getUserById(userId: string): User | null {
    return _usersCache.find((u) => u.id === userId) ?? null
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return mockUserOps.update(userId, updates)
  },

  async getAllJobs(): Promise<Job[]> {
    return mockJobOps.getAll()
  },

  async getJobsByEmployer(employerId: string): Promise<Job[]> {
    return mockJobOps.findByEmployerId(employerId)
  },

  async getJobById(jobId: string): Promise<Job | null> {
    return mockJobOps.findById(jobId)
  },

  async createJob(payload: Record<string, unknown>): Promise<Job> {
    return mockJobOps.create(payload as unknown as Omit<Job, 'id' | 'createdAt' | 'updatedAt'>)
  },

  async deleteJob(jobId: string): Promise<boolean> {
    return mockJobOps.delete(jobId)
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    return mockJobOps.update(jobId, updates)
  },

  async getAllApplications(): Promise<Application[]> {
    const res = await call<R<Application[]>>('applications', 'GET', {})
    _applicationsCache = res.data || []
    return res.data
  },

  getApplicationsByJob(jobId: string): Application[] {
    // sync version – callers should await getAllApplications first
    return _applicationsCache.filter((application) => application.jobId === jobId)
  },

  async getApplicationsByWorker(workerId: string): Promise<Application[]> {
    return mockApplicationOps.findByWorkerId(workerId)
  },

  async createApplication(payload: Record<string, unknown>): Promise<Application> {
    return mockApplicationOps.create(payload as unknown as Omit<Application, 'id' | 'createdAt' | 'updatedAt'>)
  },

  async getConversationsByUser(userId: string): Promise<ChatConversation[]> {
    const res = await call<R<ChatConversation[]>>('chat', 'GET', { type: 'conversations', userId })
    return res.data
  },

  async getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
    const res = await call<R<ChatMessage[]>>('chat', 'GET', { type: 'messages', conversationId })
    return res.data
  },

  async sendMessage(payload: { conversationId: string; senderId: string; message: string }): Promise<ChatMessage> {
    const res = await call<R<ChatMessage>>('chat', 'POST', {}, { type: 'message', ...payload })
    return res.data
  },

  async createConversation(data: {
    workerId: string
    employerId: string
    jobId: string
    applicationId?: string
    participants: string[]
  }): Promise<ChatConversation> {
    const res = await call<R<ChatConversation>>('chat', 'POST', {}, { type: 'conversation', ...data })
    return res.data
  },

  async findConversationByJob(userId: string, jobId: string): Promise<ChatConversation | null> {
    try {
      const convs = await this.getConversationsByUser(userId)
      return convs.find(c => c.jobId === jobId) ?? null
    } catch { return null }
  },

  async deleteAccount(userId: string): Promise<void> {
    // Use POST with action to avoid 405 from edge functions that don't support DELETE
    await call<{ success: boolean }>('users', 'POST', {}, { action: 'delete', id: userId })
  },

  async getAllReports(): Promise<Report[]> {
    const reports = await mockReportOps.getAll()
    _reportsCache = reports || []
    return reports
  },

  getReportById(reportId: string): Report | null {
    return _reportsCache.find((report) => report.id === reportId) ?? null
  },

  async updateReport(reportId: string, updates: Partial<Report>): Promise<Report | null> {
    return mockReportOps.update(reportId, updates)
  },

  createEscrowTransaction(transaction: Omit<EscrowTransaction, 'id' | 'createdAt'>): EscrowTransaction {
    // For immediate sync usage, return a temp local object and fire-and-forget
    const tmp: EscrowTransaction = {
      ...transaction,
      id: `escrow-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    call<R<EscrowTransaction>>('escrow', 'POST', {}, transaction).catch(console.error)
    return tmp
  },

  getEscrowTransactionById(_id: string): EscrowTransaction | null {
    return _escrowCache.find((transaction) => transaction.id === _id) ?? null
  },

  getAllEscrowTransactions(): EscrowTransaction[] {
    return [..._escrowCache]
  },

  async getAllEscrowTransactionsAsync(): Promise<EscrowTransaction[]> {
    const res = await call<R<EscrowTransaction[]>>('escrow')
    _escrowCache = res.data || []
    return res.data
  },

  // Admin stats
  async getAdminStats() {
    const res = await call<R<Record<string, number>>>('admin', 'GET', { type: 'stats' })
    return res.data
  },
}

