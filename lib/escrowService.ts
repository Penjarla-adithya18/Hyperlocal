import { EscrowTransaction } from './types'
import { mockDb } from './mockDb'

export async function createEscrowTransaction(
  jobId: string,
  employerId: string,
  workerId: string,
  amount: number
): Promise<EscrowTransaction> {
  return mockDb.createEscrowTransaction({
    jobId,
    employerId,
    workerId,
    amount,
    status: 'pending'
  })
}

export async function releaseEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  const transaction = mockDb.getEscrowTransactionById(transactionId)
  if (!transaction || transaction.status !== 'held') {
    throw new Error('Invalid transaction or transaction not held')
  }

  transaction.status = 'released'
  transaction.releasedAt = new Date().toISOString()
  
  return transaction
}

export async function refundEscrowPayment(transactionId: string): Promise<EscrowTransaction | null> {
  const transaction = mockDb.getEscrowTransactionById(transactionId)
  if (!transaction || transaction.status !== 'held') {
    throw new Error('Invalid transaction or transaction not held')
  }

  transaction.status = 'refunded'
  transaction.refundedAt = new Date().toISOString()
  
  return transaction
}

export async function getTransactionsByUser(userId: string, role: 'worker' | 'employer'): Promise<EscrowTransaction[]> {
  const allTransactions = mockDb.getAllEscrowTransactions()
  
  if (role === 'worker') {
    return allTransactions.filter(t => t.workerId === userId)
  } else {
    return allTransactions.filter(t => t.employerId === userId)
  }
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
