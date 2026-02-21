// Database types for the Hyperlocal Job Matching Platform

export type UserRole = 'worker' | 'employer' | 'admin';

export type JobType = 'full-time' | 'part-time' | 'gig' | 'freelance';

export type JobStatus = 'draft' | 'active' | 'filled' | 'cancelled' | 'completed';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export type PaymentStatus = 'pending' | 'locked' | 'released' | 'refunded';

export type TrustLevel = 'basic' | 'active' | 'trusted';

export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
  profileCompleted: boolean;
  trustScore: number;
  trustLevel: TrustLevel;
  isVerified: boolean;
}

export interface WorkerProfile {
  userId: string;
  skills: string[];
  availability: string;
  experience?: string;
  categories: string[];
  location?: string;
  profilePictureUrl?: string;
  bio?: string;
}

export interface EmployerProfile {
  userId: string;
  businessName: string;
  organizationName?: string;
  location?: string;
  businessType?: string;
  description?: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  jobType: JobType;
  category: string;
  requiredSkills: string[];
  location: string;
  latitude?: number;
  longitude?: number;
  pay: number;
  paymentStatus: PaymentStatus;
  escrowAmount?: number;
  timing: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
  views: number;
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  status: ApplicationStatus;
  matchScore: number;
  coverMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  applicationId: string;
  workerId: string;
  employerId: string;
  jobId: string;
  isActive: boolean;
  createdAt: string;
  lastMessageAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface Rating {
  id: string;
  jobId: string;
  applicationId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  feedback?: string;
  createdAt: string;
}

export interface TrustScore {
  userId: string;
  score: number;
  level: TrustLevel;
  jobCompletionRate: number;
  averageRating: number;
  totalRatings: number;
  complaintCount: number;
  successfulPayments: number;
  updatedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedJobId?: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'job_match' | 'application' | 'message' | 'payment' | 'rating' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}
