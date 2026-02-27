import { EmployerProfile, WorkerProfile } from './types'

type WorkerProfileLike = Pick<WorkerProfile, 'skills' | 'categories' | 'availability' | 'experience' | 'location'>
type EmployerProfileLike = Pick<EmployerProfile, 'businessName' | 'location' | 'businessType' | 'description'>

function hasText(value?: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function isWorkerProfileComplete(profile: WorkerProfileLike): boolean {
  return (
    profile.skills.length > 0 &&
    profile.categories.length > 0 &&
    hasText(profile.availability) &&
    hasText(profile.experience) &&
    hasText(profile.location)
  )
}

export function getWorkerProfileCompletion(profile: WorkerProfileLike): number {
  const score =
    (profile.skills.length > 0 ? 25 : 0) +
    (profile.categories.length > 0 ? 25 : 0) +
    (hasText(profile.availability) ? 20 : 0) +
    (hasText(profile.experience) ? 20 : 0) +
    (hasText(profile.location) ? 10 : 0)
  return Math.round(score)
}

export function isEmployerProfileComplete(profile: EmployerProfileLike): boolean {
  return (
    hasText(profile.businessName) &&
    hasText(profile.location) &&
    hasText(profile.businessType) &&
    hasText(profile.description)
  )
}

export function getEmployerProfileCompletion(profile: EmployerProfileLike): number {
  const score =
    (hasText(profile.businessName) ? 30 : 0) +
    (hasText(profile.location) ? 25 : 0) +
    (hasText(profile.businessType) ? 20 : 0) +
    (hasText(profile.description) ? 25 : 0)
  return Math.round(score)
}
