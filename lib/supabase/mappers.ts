import { Application, ChatConversation, ChatMessage, Job, Report, User } from '@/lib/types'

type AnyRecord = Record<string, any>

export function mapUser(row: AnyRecord): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || undefined,
    phone: row.phone || row.phone_number,
    phoneNumber: row.phone_number || row.phone,
    role: row.role,
    createdAt: row.created_at,
    profileCompleted: !!row.profile_completed,
    trustScore: Number(row.trust_score || 50),
    trustLevel: row.trust_level || 'basic',
    isVerified: !!row.is_verified,
    companyName: row.company_name || undefined,
    companyDescription: row.company_description || undefined,
    skills: row.skills || [],
  }
}

export function mapJob(row: AnyRecord): Job {
  const pay = Number(row.pay ?? row.pay_amount ?? 0)
  const timing = row.timing || row.duration || 'Flexible'

  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    category: row.category,
    requiredSkills: row.required_skills || [],
    location: row.location,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    pay,
    payAmount: Number(row.pay_amount ?? pay),
    payType: row.pay_type || 'hourly',
    paymentStatus: row.payment_status || 'pending',
    escrowAmount: row.escrow_amount || undefined,
    escrowRequired: !!row.escrow_required,
    timing,
    duration: row.duration || timing,
    experienceRequired: row.experience_required || 'entry',
    requirements: row.requirements || undefined,
    benefits: row.benefits || undefined,
    slots: row.slots || undefined,
    startDate: row.start_date || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    applicationCount: Number(row.application_count || 0),
    views: Number(row.views || 0),
    jobMode: row.job_mode || 'local',
    jobNature: row.job_nature || 'non-technical',
  }
}

export function mapApplication(row: AnyRecord): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    workerId: row.worker_id,
    status: row.status,
    matchScore: Number(row.match_score || 0),
    coverMessage: row.cover_message || undefined,
    coverLetter: row.cover_letter || row.cover_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapConversation(row: AnyRecord): ChatConversation {
  return {
    id: row.id,
    participants: row.participants || [row.worker_id, row.employer_id].filter(Boolean),
    jobId: row.job_id || undefined,
    applicationId: row.application_id || undefined,
    updatedAt: row.updated_at || row.created_at,
    lastMessage: row.last_message
      ? {
          id: row.last_message.id,
          senderId: row.last_message.sender_id,
          message: row.last_message.message,
          createdAt: row.last_message.created_at,
          read: !!row.last_message.read,
        }
      : undefined,
  }
}

export function mapMessage(row: AnyRecord): ChatMessage {
  return {
    id: row.id,
    sessionId: row.conversation_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    message: row.message,
    createdAt: row.created_at,
    isRead: !!row.read,
    read: !!row.read,
  }
}

export function mapReport(row: AnyRecord): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedId: row.reported_id || undefined,
    reportedUserId: row.reported_user_id || row.reported_id || undefined,
    reportedJobId: row.reported_job_id || undefined,
    type: row.type || undefined,
    reason: row.reason,
    description: row.description || row.reason,
    status: row.status,
    resolution: row.resolution || undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  }
}
