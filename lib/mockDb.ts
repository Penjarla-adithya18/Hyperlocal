// Mock database for standalone application
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  Application,
  ChatConversation,
  ChatSession,
  ChatMessage,
  Rating,
  TrustScore,
  Report,
  Notification,
  EscrowTransaction,
  UserRole,
  JobStatus,
  ApplicationStatus,
  PaymentStatus,
} from './types';
import { getSupabaseBrowserClient } from './supabase/client';
import {
  mapApplication,
  mapConversation,
  mapJob,
  mapMessage,
  mapReport,
  mapUser,
} from './supabase/mappers';

// In-memory storage
let users: User[] = [];
let workerProfiles: WorkerProfile[] = [];
let employerProfiles: EmployerProfile[] = [];
let jobs: Job[] = [];
let applications: Application[] = [];
let chatSessions: ChatSession[] = [];
let chatMessages: ChatMessage[] = [];
let ratings: Rating[] = [];
let trustScores: TrustScore[] = [];
let reports: Report[] = [];
let notifications: Notification[] = [];
let escrowTransactions: EscrowTransaction[] = [];

// Initialize with sample data
export function initializeMockData() {
  // Create admin user
  const adminUser: User = {
    id: 'admin-1',
    fullName: 'Admin User',
    phoneNumber: '9999999999',
    role: 'admin',
    createdAt: new Date().toISOString(),
    profileCompleted: true,
    trustScore: 100,
    trustLevel: 'trusted',
    isVerified: true,
  };

  // Create sample workers
  const worker1: User = {
    id: 'worker-1',
    fullName: 'Rajesh Kumar',
    phoneNumber: '9876543210',
    role: 'worker',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    profileCompleted: true,
    trustScore: 85,
    trustLevel: 'trusted',
    isVerified: true,
  };

  const worker2: User = {
    id: 'worker-2',
    fullName: 'Priya Sharma',
    phoneNumber: '9876543211',
    role: 'worker',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    profileCompleted: true,
    trustScore: 78,
    trustLevel: 'active',
    isVerified: true,
  };

  // Create sample employers
  const employer1: User = {
    id: 'employer-1',
    fullName: 'Amit Patel',
    phoneNumber: '9876543212',
    role: 'employer',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    profileCompleted: true,
    trustScore: 92,
    trustLevel: 'trusted',
    isVerified: true,
  };

  users = [adminUser, worker1, worker2, employer1];

  // Worker profiles
  workerProfiles = [
    {
      userId: 'worker-1',
      skills: ['Cleaning', 'Customer Service', 'Hospitality'],
      availability: 'Full-time',
      experience: 'Worked in hotels for 5 years',
      categories: ['Hospitality', 'Cleaning'],
      location: 'Vijayawada, Andhra Pradesh',
      bio: 'Experienced hotel worker with excellent customer service skills',
    },
    {
      userId: 'worker-2',
      skills: ['Cooking', 'Food Preparation', 'Kitchen Management'],
      availability: 'Part-time',
      experience: 'Home cook with 3 years experience',
      categories: ['Cooking', 'Food Service'],
      location: 'Guntur, Andhra Pradesh',
      bio: 'Skilled cook specializing in South Indian cuisine',
    },
  ];

  // Employer profiles
  employerProfiles = [
    {
      userId: 'employer-1',
      businessName: 'Patel Restaurant',
      location: 'Vijayawada, Andhra Pradesh',
      businessType: 'Restaurant',
      description: 'Family restaurant serving authentic Indian cuisine',
    },
  ];

  // Sample jobs
  jobs = [
    {
      id: 'job-1',
      employerId: 'employer-1',
      title: 'Part-time Waiter Needed',
      description: 'Looking for a friendly waiter for evening shifts',
      jobType: 'part-time',
      category: 'Hospitality',
      requiredSkills: ['Customer Service', 'Communication'],
      location: 'Vijayawada, Andhra Pradesh',
      pay: 300,
      paymentStatus: 'locked',
      escrowAmount: 300,
      timing: 'Evening shift (5 PM - 10 PM)',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      applicationCount: 3,
      views: 45,
    },
    {
      id: 'job-2',
      employerId: 'employer-1',
      title: 'Cook Required for Restaurant',
      description: 'Need experienced cook for South Indian dishes',
      jobType: 'full-time',
      category: 'Cooking',
      requiredSkills: ['Cooking', 'Food Preparation', 'Kitchen Management'],
      location: 'Vijayawada, Andhra Pradesh',
      pay: 15000,
      paymentStatus: 'locked',
      escrowAmount: 15000,
      timing: 'Full day (9 AM - 9 PM)',
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      applicationCount: 5,
      views: 67,
    },
  ];

  // Trust scores
  trustScores = [
    {
      userId: 'worker-1',
      score: 85,
      level: 'trusted',
      jobCompletionRate: 95,
      averageRating: 4.5,
      totalRatings: 12,
      complaintCount: 0,
      successfulPayments: 12,
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'employer-1',
      score: 92,
      level: 'trusted',
      jobCompletionRate: 100,
      averageRating: 4.8,
      totalRatings: 8,
      complaintCount: 0,
      successfulPayments: 8,
      updatedAt: new Date().toISOString(),
    },
  ];

  escrowTransactions = [
    {
      id: `escrow-${Date.now()}`,
      jobId: 'job-1',
      employerId: 'employer-1',
      workerId: 'worker-1',
      amount: 300,
      status: 'held',
      createdAt: new Date().toISOString(),
    },
  ];
}

// User operations
export const mockUserOps = {
  findByPhone: async (phoneNumber: string): Promise<User | null> => {
    await delay(300);
    return users.find((u) => u.phoneNumber === phoneNumber) || null;
  },

  findById: async (id: string): Promise<User | null> => {
    await delay(200);
    return users.find((u) => u.id === id) || null;
  },

  create: async (user: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    await delay(400);
    const newUser: User = {
      ...user,
      id: `${user.role}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);

    // Initialize trust score
    trustScores.push({
      userId: newUser.id,
      score: 50,
      level: 'basic',
      jobCompletionRate: 0,
      averageRating: 0,
      totalRatings: 0,
      complaintCount: 0,
      successfulPayments: 0,
      updatedAt: new Date().toISOString(),
    });

    return newUser;
  },

  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    await delay(300);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    return users[index];
  },

  getAll: async (): Promise<User[]> => {
    await delay(300);
    return [...users];
  },
};

// Worker profile operations
export const mockWorkerProfileOps = {
  findByUserId: async (userId: string): Promise<WorkerProfile | null> => {
    await delay(200);
    return workerProfiles.find((p) => p.userId === userId) || null;
  },

  create: async (profile: WorkerProfile): Promise<WorkerProfile> => {
    await delay(300);
    workerProfiles.push(profile);
    return profile;
  },

  update: async (
    userId: string,
    updates: Partial<WorkerProfile>
  ): Promise<WorkerProfile | null> => {
    await delay(300);
    const index = workerProfiles.findIndex((p) => p.userId === userId);
    if (index === -1) return null;

    workerProfiles[index] = { ...workerProfiles[index], ...updates };
    return workerProfiles[index];
  },

  getAll: async (): Promise<WorkerProfile[]> => {
    await delay(300);
    return [...workerProfiles];
  },
};

// Employer profile operations
export const mockEmployerProfileOps = {
  findByUserId: async (userId: string): Promise<EmployerProfile | null> => {
    await delay(200);
    return employerProfiles.find((p) => p.userId === userId) || null;
  },

  create: async (profile: EmployerProfile): Promise<EmployerProfile> => {
    await delay(300);
    employerProfiles.push(profile);
    return profile;
  },

  update: async (
    userId: string,
    updates: Partial<EmployerProfile>
  ): Promise<EmployerProfile | null> => {
    await delay(300);
    const index = employerProfiles.findIndex((p) => p.userId === userId);
    if (index === -1) return null;

    employerProfiles[index] = { ...employerProfiles[index], ...updates };
    return employerProfiles[index];
  },

  getAll: async (): Promise<EmployerProfile[]> => {
    await delay(300);
    return [...employerProfiles];
  },
};

// Job operations
export const mockJobOps = {
  findById: async (id: string): Promise<Job | null> => {
    await delay(200);
    return jobs.find((j) => j.id === id) || null;
  },

  findByEmployerId: async (employerId: string): Promise<Job[]> => {
    await delay(300);
    return jobs.filter((j) => j.employerId === employerId);
  },

  getAll: async (filters?: {
    status?: JobStatus;
    category?: string;
    location?: string;
  }): Promise<Job[]> => {
    await delay(300);
    let filtered = [...jobs];

    if (filters?.status) {
      filtered = filtered.filter((j) => j.status === filters.status);
    }
    if (filters?.category) {
      filtered = filtered.filter((j) => j.category === filters.category);
    }
    if (filters?.location) {
      filtered = filtered.filter((j) =>
        j.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  create: async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
    await delay(400);
    const newJob: Job = {
      ...job,
      id: `job-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    jobs.push(newJob);
    return newJob;
  },

  update: async (id: string, updates: Partial<Job>): Promise<Job | null> => {
    await delay(300);
    const index = jobs.findIndex((j) => j.id === id);
    if (index === -1) return null;

    jobs[index] = {
      ...jobs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return jobs[index];
  },

  delete: async (id: string): Promise<boolean> => {
    await delay(300);
    const index = jobs.findIndex((j) => j.id === id);
    if (index === -1) return false;

    jobs.splice(index, 1);
    return true;
  },
};

// Application operations
export const mockApplicationOps = {
  findById: async (id: string): Promise<Application | null> => {
    await delay(200);
    return applications.find((a) => a.id === id) || null;
  },

  findByJobId: async (jobId: string): Promise<Application[]> => {
    await delay(300);
    return applications.filter((a) => a.jobId === jobId);
  },

  findByWorkerId: async (workerId: string): Promise<Application[]> => {
    await delay(300);
    return applications.filter((a) => a.workerId === workerId);
  },

  create: async (
    application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Application> => {
    await delay(400);
    const newApp: Application = {
      ...application,
      id: `app-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    applications.push(newApp);

    // Update job application count
    const jobIndex = jobs.findIndex((j) => j.id === application.jobId);
    if (jobIndex !== -1) {
      jobs[jobIndex].applicationCount += 1;
    }

    return newApp;
  },

  update: async (
    id: string,
    updates: Partial<Application>
  ): Promise<Application | null> => {
    await delay(300);
    const index = applications.findIndex((a) => a.id === id);
    if (index === -1) return null;

    applications[index] = {
      ...applications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return applications[index];
  },
};

// Chat operations
export const mockChatOps = {
  findSessionById: async (id: string): Promise<ChatSession | null> => {
    await delay(200);
    return chatSessions.find((s) => s.id === id) || null;
  },

  findSessionByApplicationId: async (
    applicationId: string
  ): Promise<ChatSession | null> => {
    await delay(200);
    return chatSessions.find((s) => s.applicationId === applicationId) || null;
  },

  findSessionsByUserId: async (userId: string): Promise<ChatSession[]> => {
    await delay(300);
    return chatSessions.filter(
      (s) => s.workerId === userId || s.employerId === userId
    );
  },

  createSession: async (
    session: Omit<ChatSession, 'id' | 'createdAt'>
  ): Promise<ChatSession> => {
    await delay(300);
    const newSession: ChatSession = {
      ...session,
      id: `chat-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    chatSessions.push(newSession);
    return newSession;
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    await delay(300);
    return chatMessages
      .filter((m) => m.sessionId === sessionId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  },

  sendMessage: async (
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> => {
    await delay(300);
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    };
    chatMessages.push(newMessage);

    // Update session last message time
    const sessionIndex = chatSessions.findIndex(
      (s) => s.id === message.sessionId
    );
    if (sessionIndex !== -1) {
      chatSessions[sessionIndex].lastMessageAt = new Date().toISOString();
    }

    return newMessage;
  },
};

// Rating operations
export const mockRatingOps = {
  create: async (rating: Omit<Rating, 'id' | 'createdAt'>): Promise<Rating> => {
    await delay(300);
    const newRating: Rating = {
      ...rating,
      id: `rating-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    ratings.push(newRating);

    // Update trust score
    updateTrustScore(rating.toUserId);

    return newRating;
  },

  findByUserId: async (userId: string): Promise<Rating[]> => {
    await delay(300);
    return ratings.filter((r) => r.toUserId === userId);
  },

  findByJobId: async (jobId: string): Promise<Rating[]> => {
    await delay(300);
    return ratings.filter((r) => r.jobId === jobId);
  },
};

// Trust score operations
export const mockTrustScoreOps = {
  findByUserId: async (userId: string): Promise<TrustScore | null> => {
    await delay(200);
    return trustScores.find((t) => t.userId === userId) || null;
  },

  update: async (
    userId: string,
    updates: Partial<TrustScore>
  ): Promise<TrustScore | null> => {
    await delay(300);
    const index = trustScores.findIndex((t) => t.userId === userId);
    if (index === -1) return null;

    trustScores[index] = {
      ...trustScores[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return trustScores[index];
  },
};

// Report operations
export const mockReportOps = {
  create: async (report: Omit<Report, 'id' | 'createdAt'>): Promise<Report> => {
    await delay(300);
    const newReport: Report = {
      ...report,
      id: `report-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    reports.push(newReport);
    return newReport;
  },

  getAll: async (): Promise<Report[]> => {
    await delay(300);
    return [...reports].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  update: async (id: string, updates: Partial<Report>): Promise<Report | null> => {
    await delay(300);
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) return null;

    reports[index] = { ...reports[index], ...updates };
    return reports[index];
  },
};

// Notification operations
export const mockNotificationOps = {
  create: async (
    notification: Omit<Notification, 'id' | 'createdAt'>
  ): Promise<Notification> => {
    await delay(200);
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    notifications.push(newNotif);
    return newNotif;
  },

  findByUserId: async (userId: string): Promise<Notification[]> => {
    await delay(300);
    return notifications
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  markAsRead: async (id: string): Promise<boolean> => {
    await delay(200);
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) return false;

    notifications[index].isRead = true;
    return true;
  },
};

// Helper functions
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateTrustScore(userId: string) {
  const userRatings = ratings.filter((r) => r.toUserId === userId);
  if (userRatings.length === 0) return;

  const avgRating =
    userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

  const index = trustScores.findIndex((t) => t.userId === userId);
  if (index !== -1) {
    trustScores[index].averageRating = avgRating;
    trustScores[index].totalRatings = userRatings.length;
    trustScores[index].score = Math.min(
      100,
      50 + avgRating * 10 + userRatings.length * 2
    );

    // Update trust level
    if (trustScores[index].score >= 80) {
      trustScores[index].level = 'trusted';
    } else if (trustScores[index].score >= 60) {
      trustScores[index].level = 'active';
    }

    trustScores[index].updatedAt = new Date().toISOString();
  }
}

// Initialize on module load
if (users.length === 0) {
  initializeMockData();
}

function normalizeUser(user: User): User {
  const profile = user.role === 'employer'
    ? employerProfiles.find((p) => p.userId === user.id)
    : workerProfiles.find((p) => p.userId === user.id);

  return {
    ...user,
    phone: user.phoneNumber,
    email: user.email || `${user.phoneNumber}@hyperlocal.test`,
    companyName: user.companyName || (user.role === 'employer' ? (profile as EmployerProfile | undefined)?.businessName : undefined),
    companyDescription:
      user.companyDescription ||
      (user.role === 'employer' ? (profile as EmployerProfile | undefined)?.description : undefined),
    skills: user.skills || (user.role === 'worker' ? (profile as WorkerProfile | undefined)?.skills || [] : []),
  };
}

function normalizeJob(job: Job): Job {
  return {
    ...job,
    payAmount: job.payAmount ?? job.pay,
    payType: job.payType ?? (job.jobType === 'gig' ? 'fixed' : 'hourly'),
    duration: job.duration ?? job.timing,
    experienceRequired: job.experienceRequired ?? 'entry',
    escrowRequired: job.escrowRequired ?? job.paymentStatus === 'locked',
  };
}

function normalizeApplication(application: Application): Application {
  return {
    ...application,
    coverLetter: application.coverLetter ?? application.coverMessage,
  };
}

function mapSessionToConversation(session: ChatSession): ChatConversation {
  const sessionMessages = chatMessages
    .filter((m) => m.sessionId === session.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const last = sessionMessages[0];
  return {
    id: session.id,
    participants: [session.workerId, session.employerId],
    jobId: session.jobId,
    applicationId: session.applicationId,
    updatedAt: session.lastMessageAt || session.createdAt,
    lastMessage: last
      ? {
          id: last.id,
          senderId: last.senderId,
          message: last.message,
          createdAt: last.createdAt,
          read: !!last.isRead,
        }
      : undefined,
  };
}

const useSupabaseBackend =
  typeof globalThis !== 'undefined' &&
  (globalThis as any)?.process?.env?.NEXT_PUBLIC_USE_SUPABASE === 'true';

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  if (!useSupabaseBackend) {
    throw new Error('Supabase backend is disabled');
  }

  const supabase = getSupabaseBrowserClient();
  const method = (init?.method || 'GET').toUpperCase();
  const [path, queryString] = input.split('?');
  const params = new URLSearchParams(queryString || '');
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;

  if (path === '/api/users' && method === 'GET') {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(mapUser) } as T;
  }

  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && method === 'PATCH') {
    const userId = userMatch[1];
    const payload: Record<string, any> = {};
    if (body?.fullName !== undefined) payload.full_name = body.fullName;
    if (body?.phoneNumber !== undefined) payload.phone_number = body.phoneNumber;
    if (body?.role !== undefined) payload.role = body.role;
    if (body?.profileCompleted !== undefined) payload.profile_completed = body.profileCompleted;
    if (body?.trustScore !== undefined) payload.trust_score = body.trustScore;
    if (body?.trustLevel !== undefined) payload.trust_level = body.trustLevel;
    if (body?.isVerified !== undefined) payload.is_verified = body.isVerified;
    if (body?.companyName !== undefined) payload.company_name = body.companyName;
    if (body?.companyDescription !== undefined) payload.company_description = body.companyDescription;
    if (body?.skills !== undefined) payload.skills = body.skills;
    if (body?.email !== undefined) payload.email = body.email;

    const { data, error } = await supabase.from('users').update(payload).eq('id', userId).select('*').maybeSingle();
    if (error) throw error;
    return { data: data ? mapUser(data) : null } as T;
  }

  if (path === '/api/jobs' && method === 'GET') {
    const employerId = params.get('employerId');
    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (employerId) {
      query = query.eq('employer_id', employerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(mapJob) } as T;
  }

  if (path === '/api/jobs' && method === 'POST') {
    const payload = {
      employer_id: body.employerId,
      title: body.title,
      description: body.description,
      job_type: body.jobType || (body.payType === 'fixed' ? 'gig' : 'part-time'),
      category: body.category,
      required_skills: body.requiredSkills || [],
      location: body.location,
      pay: Number(body.pay ?? body.payAmount ?? 0),
      pay_amount: Number(body.payAmount ?? body.pay ?? 0),
      pay_type: body.payType || 'hourly',
      payment_status: body.escrowRequired ? 'locked' : 'pending',
      escrow_amount: body.escrowRequired ? Number(body.payAmount ?? body.pay ?? 0) : null,
      escrow_required: !!body.escrowRequired,
      timing: body.timing || body.duration || 'Flexible',
      duration: body.duration || body.timing || 'Flexible',
      experience_required: body.experienceRequired || 'entry',
      requirements: body.requirements || null,
      benefits: body.benefits || null,
      slots: body.slots || 1,
      start_date: body.startDate || null,
      status: body.status || 'active',
      application_count: 0,
      views: 0,
    };

    const { data, error } = await supabase.from('jobs').insert(payload).select('*').single();
    if (error) throw error;
    return { data: mapJob(data) } as T;
  }

  const jobMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (jobMatch && method === 'GET') {
    const jobId = jobMatch[1];
    const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
    if (error) throw error;
    return { data: data ? mapJob(data) : null } as T;
  }

  if (jobMatch && method === 'DELETE') {
    const jobId = jobMatch[1];
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) throw error;
    return { success: true } as T;
  }

  if (jobMatch && method === 'PATCH') {
    const jobId = jobMatch[1];
    const payload: Record<string, any> = {};
    if (body?.title !== undefined) payload.title = body.title;
    if (body?.description !== undefined) payload.description = body.description;
    if (body?.jobType !== undefined) payload.job_type = body.jobType;
    if (body?.category !== undefined) payload.category = body.category;
    if (body?.requiredSkills !== undefined) payload.required_skills = body.requiredSkills;
    if (body?.location !== undefined) payload.location = body.location;
    if (body?.pay !== undefined) payload.pay = body.pay;
    if (body?.payAmount !== undefined) payload.pay_amount = body.payAmount;
    if (body?.payType !== undefined) payload.pay_type = body.payType;
    if (body?.paymentStatus !== undefined) payload.payment_status = body.paymentStatus;
    if (body?.escrowAmount !== undefined) payload.escrow_amount = body.escrowAmount;
    if (body?.escrowRequired !== undefined) payload.escrow_required = body.escrowRequired;
    if (body?.timing !== undefined) payload.timing = body.timing;
    if (body?.duration !== undefined) payload.duration = body.duration;
    if (body?.experienceRequired !== undefined) payload.experience_required = body.experienceRequired;
    if (body?.requirements !== undefined) payload.requirements = body.requirements;
    if (body?.benefits !== undefined) payload.benefits = body.benefits;
    if (body?.slots !== undefined) payload.slots = body.slots;
    if (body?.startDate !== undefined) payload.start_date = body.startDate;
    if (body?.status !== undefined) payload.status = body.status;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('jobs').update(payload).eq('id', jobId).select('*').maybeSingle();
    if (error) throw error;
    return { data: data ? mapJob(data) : null } as T;
  }

  if (path === '/api/applications' && method === 'GET') {
    const workerId = params.get('workerId');
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(mapApplication) } as T;
  }

  if (path === '/api/applications' && method === 'POST') {
    const payload = {
      job_id: body.jobId,
      worker_id: body.workerId,
      status: body.status || 'pending',
      match_score: Number(body.matchScore || 0),
      cover_message: body.coverMessage || body.coverLetter || null,
      cover_letter: body.coverLetter || null,
    };

    const { data, error } = await supabase.from('applications').insert(payload).select('*').single();
    if (error) throw error;
    return { data: mapApplication(data) } as T;
  }

  if (path === '/api/chat/conversations' && method === 'GET') {
    const userId = params.get('userId');
    let query = supabase.from('chat_conversations').select('*').order('updated_at', { ascending: false });
    if (userId) {
      query = query.contains('participants', [userId]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const conversations = data || [];
    if (conversations.length === 0) {
      return { data: [] } as T;
    }

    const conversationIds = conversations.map((conversation: any) => conversation.id);
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    const latestByConversation = new Map<string, any>();
    for (const message of messages || []) {
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    }

    return {
      data: conversations.map((conversation: any) =>
        mapConversation({
          ...conversation,
          last_message: latestByConversation.get(conversation.id),
        })
      ),
    } as T;
  }

  if (path === '/api/chat/messages' && method === 'GET') {
    const conversationId = params.get('conversationId');
    if (!conversationId) {
      return { data: [] } as T;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data || []).map(mapMessage) } as T;
  }

  if (path === '/api/chat/messages' && method === 'POST') {
    const payload = {
      conversation_id: body.conversationId,
      sender_id: body.senderId,
      message: body.message,
      read: false,
    };

    const { data, error } = await supabase.from('chat_messages').insert(payload).select('*').single();
    if (error) throw error;

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.conversationId);

    return { data: mapMessage(data) } as T;
  }

  if (path === '/api/reports' && method === 'GET') {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(mapReport) } as T;
  }

  const reportMatch = path.match(/^\/api\/reports\/([^/]+)$/);
  if (reportMatch && method === 'PATCH') {
    const reportId = reportMatch[1];
    const payload: Record<string, any> = {};
    if (body?.status !== undefined) payload.status = body.status;
    if (body?.resolution !== undefined) payload.resolution = body.resolution;
    if (body?.reason !== undefined) payload.reason = body.reason;
    if (body?.description !== undefined) payload.description = body.description;
    if (body?.type !== undefined) payload.type = body.type;
    if (body?.reportedId !== undefined) payload.reported_id = body.reportedId;
    if (body?.reportedUserId !== undefined) payload.reported_user_id = body.reportedUserId;
    if (body?.reportedJobId !== undefined) payload.reported_job_id = body.reportedJobId;
    if (body?.resolvedAt !== undefined) payload.resolved_at = body.resolvedAt;
    if (!payload.resolved_at && (body?.status === 'resolved' || body?.status === 'dismissed')) {
      payload.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('reports').update(payload).eq('id', reportId).select('*').maybeSingle();
    if (error) throw error;
    return { data: data ? mapReport(data) : null } as T;
  }

  if (path === '/api/escrow' && method === 'GET') {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return {
      data: (data || []).map((row: any) => ({
        id: row.id,
        jobId: row.job_id,
        employerId: row.employer_id,
        workerId: row.worker_id,
        amount: Number(row.amount || 0),
        status: row.status,
        createdAt: row.created_at,
        releasedAt: row.released_at || undefined,
        refundedAt: row.refunded_at || undefined,
      })),
    } as T;
  }

  throw new Error(`Unsupported Supabase API route: ${method} ${input}`);
}

export const mockDb = {
  async getAllUsers(): Promise<User[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: User[] }>('/api/users');
      users = (result.data || []) as User[];
      return result.data;
    }
    const allUsers = await mockUserOps.getAll();
    return allUsers.map(normalizeUser);
  },

  getUserById(userId: string): User | null {
    const user = users.find((u) => u.id === userId);
    return user ? normalizeUser(user) : null;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: User | null }>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!result.data) return null;
      const index = users.findIndex((u) => u.id === userId);
      if (index !== -1) {
        users[index] = result.data;
      }
      return result.data;
    }

    const updated = await mockUserOps.update(userId, updates);
    return updated ? normalizeUser(updated) : null;
  },

  async getAllJobs(): Promise<Job[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Job[] }>('/api/jobs');
      return result.data;
    }
    const allJobs = await mockJobOps.getAll();
    return allJobs.map(normalizeJob);
  },

  async getJobsByEmployer(employerId: string): Promise<Job[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Job[] }>(`/api/jobs?employerId=${employerId}`);
      return result.data;
    }
    const employerJobs = await mockJobOps.findByEmployerId(employerId);
    return employerJobs.map(normalizeJob);
  },

  async getJobById(jobId: string): Promise<Job | null> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Job | null }>(`/api/jobs/${jobId}`);
      return result.data;
    }
    const job = await mockJobOps.findById(jobId);
    return job ? normalizeJob(job) : null;
  },

  async createJob(payload: Record<string, any>): Promise<Job> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Job }>('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result.data;
    }

    const job = await mockJobOps.create({
      employerId: payload.employerId,
      title: payload.title,
      description: payload.description,
      jobType:
        payload.payType === 'fixed'
          ? 'gig'
          : payload.duration?.toLowerCase().includes('month')
          ? 'full-time'
          : 'part-time',
      category: payload.category || 'Other',
      requiredSkills: payload.requiredSkills || [],
      location: payload.location || '',
      pay: Number(payload.payAmount || payload.pay || 0),
      paymentStatus: payload.escrowRequired ? 'locked' : 'pending',
      escrowAmount: payload.escrowRequired ? Number(payload.payAmount || payload.pay || 0) : undefined,
      timing: payload.duration || payload.timing || 'Flexible',
      status: payload.status || 'active',
      applicationCount: 0,
      views: 0,
      payAmount: Number(payload.payAmount || payload.pay || 0),
      payType: payload.payType || 'hourly',
      duration: payload.duration || payload.timing || 'Flexible',
      experienceRequired: payload.experienceRequired || 'entry',
      requirements: payload.requirements,
      benefits: payload.benefits,
      escrowRequired: !!payload.escrowRequired,
      slots: payload.slots,
      startDate: payload.startDate,
    });

    return normalizeJob(job);
  },

  async deleteJob(jobId: string): Promise<boolean> {
    if (useSupabaseBackend) {
      await apiFetch('/api/jobs/' + jobId, { method: 'DELETE' });
      return true;
    }
    return mockJobOps.delete(jobId);
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Job | null }>(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return result.data;
    }

    const updated = await mockJobOps.update(jobId, updates);
    return updated ? normalizeJob(updated) : null;
  },

  async getAllApplications(): Promise<Application[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Application[] }>('/api/applications');
      applications = result.data || [];
      return applications.map(normalizeApplication);
    }

    const all = [...applications];
    return all.map(normalizeApplication);
  },

  getApplicationsByJob(jobId: string): Application[] {
    return applications.filter((a) => a.jobId === jobId).map(normalizeApplication);
  },

  async getApplicationsByWorker(workerId: string): Promise<Application[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Application[] }>(`/api/applications?workerId=${workerId}`);
      return result.data;
    }
    const workerApps = await mockApplicationOps.findByWorkerId(workerId);
    return workerApps.map(normalizeApplication);
  },

  async createApplication(payload: Record<string, any>): Promise<Application> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Application }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result.data;
    }

    const created = await mockApplicationOps.create({
      jobId: payload.jobId,
      workerId: payload.workerId,
      status: payload.status || 'pending',
      matchScore: payload.matchScore ?? 0,
      coverMessage: payload.coverLetter || payload.coverMessage,
      coverLetter: payload.coverLetter,
    });

    return normalizeApplication(created);
  },

  async getConversationsByUser(userId: string): Promise<ChatConversation[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: ChatConversation[] }>(`/api/chat/conversations?userId=${userId}`);
      return result.data;
    }

    const sessions = await mockChatOps.findSessionsByUserId(userId);
    return sessions.map(mapSessionToConversation);
  },

  async getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: ChatMessage[] }>(`/api/chat/messages?conversationId=${conversationId}`);
      return result.data;
    }

    const messages = await mockChatOps.getMessages(conversationId);
    return messages.map((message) => ({
      ...message,
      conversationId: message.sessionId,
      read: !!message.isRead,
    }));
  },

  async sendMessage(payload: { conversationId: string; senderId: string; message: string }): Promise<ChatMessage> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: ChatMessage }>('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return result.data;
    }

    const created = await mockChatOps.sendMessage({
      sessionId: payload.conversationId,
      senderId: payload.senderId,
      message: payload.message,
      isRead: false,
    });

    return {
      ...created,
      conversationId: created.sessionId,
      read: !!created.isRead,
    };
  },

  async getAllReports(): Promise<Report[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Report[] }>('/api/reports');
      reports = result.data || [];
      return result.data;
    }
    return [...reports];
  },

  getReportById(reportId: string): Report | null {
    return reports.find((report) => report.id === reportId) || null;
  },

  async updateReport(reportId: string, updates: Partial<Report>): Promise<Report | null> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: Report | null }>(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (!result.data) return null;
      reports = reports.map((report) => (report.id === reportId ? { ...report, ...result.data } : report));
      return result.data;
    }

    const report = reports.find((item) => item.id === reportId);
    if (!report) return null;
    Object.assign(report, updates);
    return report;
  },

  createEscrowTransaction(transaction: Omit<EscrowTransaction, 'id' | 'createdAt'>): EscrowTransaction {
    const created: EscrowTransaction = {
      ...transaction,
      id: `escrow-${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
    };
    escrowTransactions.push(created);
    return created;
  },

  getEscrowTransactionById(transactionId: string): EscrowTransaction | null {
    return escrowTransactions.find((transaction) => transaction.id === transactionId) || null;
  },

  getAllEscrowTransactions(): EscrowTransaction[] {
    return [...escrowTransactions];
  },

  async getAllEscrowTransactionsAsync(): Promise<EscrowTransaction[]> {
    if (useSupabaseBackend) {
      const result = await apiFetch<{ data: EscrowTransaction[] }>('/api/escrow');
      escrowTransactions = result.data || [];
      return escrowTransactions;
    }
    return [...escrowTransactions];
  },
};
