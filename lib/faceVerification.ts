/**
 * Face Verification Module
 * 
 * Uses face-api.js for facial recognition and matching.
 * Prevents impersonation during skill assessments with 3-way verification:
 * 1. Profile picture ↔ Selfie (70% threshold)
 * 2. Selfie ↔ Video frames (continuous monitoring)
 * 
 * Models loaded from CDN on first use (~6MB one-time download).
 */

import * as faceapi from 'face-api.js'

// ── Configuration ─────────────────────────────────────────────────────────────

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
const MATCH_THRESHOLD = 0.6  // 70% similarity (lower = more strict, face-api uses euclidean distance)
const MIN_CONFIDENCE = 0.5   // Minimum face detection confidence

let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

// ── Model Loading ─────────────────────────────────────────────────────────────

/**
 * Load face-api.js models from CDN.
 * Only loads once, subsequent calls return immediately.
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      console.log('[FaceVerification] Loading models from CDN...')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),      // Face detection
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),   // Landmark detection
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),  // Face embeddings (128D descriptor)
      ])
      modelsLoaded = true
      console.log('[FaceVerification] ✓ Models loaded successfully')
    } catch (error) {
      console.error('[FaceVerification] Failed to load models:', error)
      throw new Error('Failed to load face recognition models. Check your internet connection.')
    }
  })()

  return loadingPromise
}

// ── Face Descriptor Extraction ───────────────────────────────────────────────

export interface FaceDescriptor {
  descriptor: Float32Array
  confidence: number
  faceCount: number
}

/**
 * Extract face descriptor (embedding) from an image.
 * @param input - HTMLImageElement, HTMLVideoElement, HTMLCanvasElement, or Blob
 * @returns Face descriptor with confidence, or null if no face detected
 */
export async function extractFaceDescriptor(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Blob
): Promise<FaceDescriptor | null> {
  await loadFaceModels()

  try {
    // Convert Blob to HTMLImageElement if needed
    let imageElement = input
    if (input instanceof Blob) {
      const url = URL.createObjectURL(input)
      const img = new Image()
      img.src = url
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
      imageElement = img
      URL.revokeObjectURL(url)
    }

    // Detect all faces with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(imageElement as any)
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (!detections || detections.length === 0) {
      console.warn('[FaceVerification] No face detected in image')
      return null
    }

    if (detections.length > 1) {
      console.warn(`[FaceVerification] Multiple faces detected (${detections.length}). Using the largest/most confident face.`)
      // Use the face with highest detection score
      detections.sort((a, b) => b.detection.score - a.detection.score)
    }

    const bestFace = detections[0]
    const confidence = bestFace.detection.score

    if (confidence < MIN_CONFIDENCE) {
      console.warn(`[FaceVerification] Face confidence too low: ${(confidence * 100).toFixed(1)}%`)
      return null
    }

    if (!bestFace.descriptor) {
      console.warn('[FaceVerification] Failed to extract face descriptor')
      return null
    }

    return {
      descriptor: bestFace.descriptor,
      confidence,
      faceCount: detections.length,
    }
  } catch (error) {
    console.error('[FaceVerification] Face extraction failed:', error)
    return null
  }
}

// ── Face Comparison ───────────────────────────────────────────────────────────

export interface FaceMatchResult {
  isMatch: boolean
  similarity: number       // 0-100% (higher = more similar)
  distance: number         // Euclidean distance (lower = more similar)
  confidence: string       // 'high' | 'medium' | 'low'
  threshold: number        // The threshold used
}

/**
 * Compare two face descriptors and determine if they match.
 * @param descriptor1 - First face descriptor
 * @param descriptor2 - Second face descriptor
 * @param customThreshold - Optional custom threshold (default: 0.6 for 70% match)
 * @returns Match result with similarity percentage
 */
export function compareFaceDescriptors(
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  customThreshold: number = MATCH_THRESHOLD
): FaceMatchResult {
  // Calculate euclidean distance between descriptors
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2)
  
  // Convert distance to similarity percentage (0.6 distance ≈ 70% similarity)
  // face-api.js considers distance < 0.6 as same person
  const similarity = Math.max(0, Math.min(100, (1 - distance) * 100))
  
  const isMatch = distance < customThreshold
  
  // Confidence level based on how far from threshold
  let confidence: 'high' | 'medium' | 'low'
  if (isMatch) {
    confidence = distance < customThreshold * 0.7 ? 'high' : distance < customThreshold * 0.85 ? 'medium' : 'low'
  } else {
    confidence = distance > customThreshold * 1.5 ? 'high' : distance > customThreshold * 1.2 ? 'medium' : 'low'
  }

  return {
    isMatch,
    similarity: Math.round(similarity * 10) / 10,
    distance: Math.round(distance * 1000) / 1000,
    confidence,
    threshold: customThreshold,
  }
}

// ── Convenience Functions ─────────────────────────────────────────────────────

/**
 * Compare two images directly and return match result.
 * @param image1 - First image (profile picture or selfie)
 * @param image2 - Second image (selfie or video frame)
 * @returns Match result, or null if face extraction failed
 */
export async function compareFaceImages(
  image1: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Blob,
  image2: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | Blob,
  customThreshold?: number
): Promise<FaceMatchResult | null> {
  const [face1, face2] = await Promise.all([
    extractFaceDescriptor(image1),
    extractFaceDescriptor(image2),
  ])

  if (!face1) {
    console.error('[FaceVerification] Failed to detect face in first image')
    return null
  }

  if (!face2) {
    console.error('[FaceVerification] Failed to detect face in second image')
    return null
  }

  if (face1.faceCount > 1 || face2.faceCount > 1) {
    console.warn('[FaceVerification] Multiple faces detected in one or both images')
  }

  return compareFaceDescriptors(face1.descriptor, face2.descriptor, customThreshold)
}

/**
 * Load an image from a URL and extract face descriptor.
 * @param imageUrl - URL of the image (e.g., Supabase storage URL)
 * @returns Face descriptor or null if failed
 */
export async function extractFaceFromUrl(imageUrl: string): Promise<FaceDescriptor | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`)
    
    const blob = await response.blob()
    return await extractFaceDescriptor(blob)
  } catch (error) {
    console.error('[FaceVerification] Failed to load image from URL:', error)
    return null
  }
}

/**
 * Capture a still frame from a video element and extract face descriptor.
 * Useful for continuous monitoring during video recording.
 */
export async function extractFaceFromVideo(videoElement: HTMLVideoElement): Promise<FaceDescriptor | null> {
  // Create a canvas to capture current video frame
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  
  return await extractFaceDescriptor(canvas)
}

// ── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Convert a File or Blob to base64 string for storage/transmission.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Capture a still image from webcam/video element as Blob.
 */
export function captureImageFromVideo(videoElement: HTMLVideoElement, quality = 0.9): Blob | null {
  const canvas = document.createElement('canvas')
  canvas.width = videoElement.videoWidth
  canvas.height = videoElement.videoHeight
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
  
  let blob: Blob | null = null
  canvas.toBlob((b) => { blob = b }, 'image/jpeg', quality)
  
  return blob
}

/**
 * Get a readable message for face verification results.
 */
export function getVerificationMessage(result: FaceMatchResult | null): string {
  if (!result) {
    return 'Unable to detect face. Please ensure good lighting and face the camera directly.'
  }

  if (result.isMatch) {
    return `✅ Face verified (${result.similarity}% match, ${result.confidence} confidence)`
  } else {
    return `❌ Face does not match (${result.similarity}% similarity). Please ensure you are the registered user.`
  }
}
