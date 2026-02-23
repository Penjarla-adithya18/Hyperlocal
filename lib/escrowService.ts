import { EscrowTransaction } from './types'
import { mockEscrowOps } from './api'

export async function createEscrowTransaction(
  jobId: string,
  employerId: string,
  workerId: string,
  amount: number
): Promise<EscrowTransaction> {
  return mockEscrowOps.create({
    jobId,
    employerId,
    workerId,
    amount,
    status: 'pending'
  })
}

export async function releaseEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  return mockEscrowOps.update(transactionId, {
    status: 'released',
    releasedAt: new Date().toISOString(),
  })
}

export async function refundEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  return mockEscrowOps.update(transactionId, {
    status: 'refunded',
    refundedAt: new Date().toISOString(),
  })
}

export async function getTransactionsByUser(userId: string, role: 'worker' | 'employer'): Promise<EscrowTransaction[]> {
  return mockEscrowOps.findByUser(userId, role)
}

export function calculateTrustScore(
  completedJobs: number,
  averageRating: number,
  disputes: number,
  onTimeCompletion: number
): number {
  let score = 50 // Base score

  // Completed jobs contribution (max 20 points)
  score += Math.min(completedJobs * 2, 20)

  // Rating contribution (max 25 points)
  score += (averageRating / 5) * 25

  // On-time completion rate (max 15 points)
  score += onTimeCompletion * 15

  // Deduct for disputes (max -10 points)
  score -= Math.min(disputes * 5, 10)

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)))
}
