import { supabase as createClient } from './client'

export interface UploadResult {
  url: string
  path: string
  fullPath: string
}

export interface FileMetadata {
  name: string
  type: string
  size: number
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param file - The file to upload
 * @param userId - The user ID for organizing files
 * @param folder - Optional subfolder within the user's folder
 * @returns Upload result with URL and path
 */
export async function uploadFile(
  bucket: string,
  file: File,
  userId: string,
  folder?: string
): Promise<UploadResult> {
  const supabase = createClient

  // Generate unique filename to prevent collisions
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(7)
  const fileExt = file.name.split('.').pop()
  const fileName = `${timestamp}-${randomString}.${fileExt}`

  // Construct path: userId/folder/fileName or userId/fileName
  const path = folder ? `${userId}/${folder}/${fileName}` : `${userId}/${fileName}`

  // Upload file
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL (works for public buckets)
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path,
    fullPath: data.fullPath || data.path,
  }
}

/**
 * Upload a chat attachment
 * @param file - The file to upload
 * @param userId - The user ID
 * @param conversationId - The conversation ID
 * @returns Upload result with URL and metadata
 */
export async function uploadChatAttachment(
  file: File,
  userId: string,
  conversationId: string
): Promise<UploadResult & FileMetadata> {
  const result = await uploadFile('chat-attachments', file, userId, conversationId)

  return {
    ...result,
    name: file.name,
    type: file.type,
    size: file.size,
  }
}

/**
 * Get a signed URL for a private file
 * @param bucket - The storage bucket name
 * @param path - The file path
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Download a file from storage
 * @param bucket - The storage bucket name
 * @param path - The file path
 * @returns Blob data
 */
export async function downloadFile(bucket: string, path: string): Promise<Blob> {
  const supabase = createClient

  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  return data
}

/**
 * Delete a file from storage
 * @param bucket - The storage bucket name
 * @param path - The file path
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Upload a profile picture
 * @param file - The image file
 * @param userId - The user ID
 * @returns Upload result
 */
export async function uploadProfilePicture(file: File, userId: string): Promise<UploadResult> {
  // Delete existing profile picture first
  const supabase = createClient
  const { data: existingFiles } = await supabase.storage
    .from('profile-pictures')
    .list(userId)

  if (existingFiles && existingFiles.length > 0) {
    await Promise.all(
      existingFiles.map((f: { name: string }) => deleteFile('profile-pictures', `${userId}/${f.name}`))
    )
  }

  return uploadFile('profile-pictures', file, userId)
}

/**
 * Upload a resume
 * @param file - The resume file
 * @param userId - The user ID
 * @returns Upload result
 */
export async function uploadResume(file: File, userId: string): Promise<UploadResult> {
  return uploadFile('resumes', file, userId)
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get file extension from filename or URL
 * @param filename - The filename or URL
 * @returns File extension
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Check if file is an image
 * @param filename - The filename or type
 * @returns True if image
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
}

/**
 * Check if file is a PDF
 * @param filename - The filename or type
 * @returns True if PDF
 */
export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === 'pdf'
}
