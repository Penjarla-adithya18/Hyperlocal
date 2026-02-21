// Mock database for standalone application
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  Application,
  ChatSession,
  ChatMessage,
  Rating,
  TrustScore,
  Report,
  Notification,
  UserRole,
  JobStatus,
  ApplicationStatus,
  PaymentStatus,
} from './types';

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
