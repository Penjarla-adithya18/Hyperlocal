import { EscrowTransaction } from './types'
import { mockEscrowOps } from './api'

/**
 * Creates a new escrow transaction in 'pending' state.
 * The employer deposits funds before work begins.
 */
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

/** Releases held escrow funds to the worker after job completion. */
export async function releaseEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  return mockEscrowOps.update(transactionId, {
    status: 'released',
    releasedAt: new Date().toISOString(),
  })
}

/** Refunds held escrow funds to the employer (e.g., dispute resolution). */
export async function refundEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  return mockEscrowOps.update(transactionId, {
    status: 'refunded',
    refundedAt: new Date().toISOString(),
  })
}

/** Fetches all escrow transactions for a user by role. */
export async function getTransactionsByUser(userId: string, role: 'worker' | 'employer'): Promise<EscrowTransaction[]> {
  return mockEscrowOps.findByUser(userId, role)
}

/**
 * Calculates a trust score (0-100) from user activity metrics.
 *
 * Breakdown:
 *  - Base:              50 points
 *  - Completed jobs:    up to +20 (2 pts per job, capped)
 *  - Average rating:    up to +25 (proportional to 5-star scale)
 *  - On-time rate:      up to +15 (0.0–1.0 multiplier)
 *  - Disputes:          up to -10 (5 pts per dispute, capped)
 *
 * @param completedJobs  Number of successfully completed jobs
 * @param averageRating  Average star rating (0–5)
 * @param disputes       Number of disputes filed against the user
 * @param onTimeCompletion  Fraction of jobs completed on time (0.0–1.0)
 */
export function calculateTrustScore(
  completedJobs: number,
  averageRating: number,
  disputes: number,
  onTimeCompletion: number
): number {
  let score = 50

  score += Math.min(completedJobs * 2, 20)
  score += (averageRating / 5) * 25
  score += onTimeCompletion * 15
  score -= Math.min(disputes * 5, 10)

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Maps a numeric trust score to a trust level label.
 * Useful for badge rendering and access-control decisions.
 */
export function getTrustLevel(score: number): 'new' | 'active' | 'trusted' {
  if (score >= 80) return 'trusted'
  if (score >= 40) return 'active'
  return 'new'
}
