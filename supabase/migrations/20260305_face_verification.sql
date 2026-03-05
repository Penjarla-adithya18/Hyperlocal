-- Face Verification for Skill Assessments
-- Adds selfie verification fields to prevent impersonation during skill tests
-- Created: March 5, 2026

-- Add verification fields to skill_assessments table
ALTER TABLE skill_assessments
ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT,
ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_match_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS verification_timestamp TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN skill_assessments.verification_selfie_url IS 'Pre-test selfie URL for identity verification (30-day TTL)';
COMMENT ON COLUMN skill_assessments.face_verified IS 'Whether face was successfully verified against profile picture';
COMMENT ON COLUMN skill_assessments.verification_match_score IS 'Face match similarity score (0-100%)';
COMMENT ON COLUMN skill_assessments.verification_timestamp IS 'When face verification was performed';

-- Create storage bucket for verification selfies if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-selfies', 'verification-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Workers can upload their own verification selfies
CREATE POLICY IF NOT EXISTS "Workers can upload their verification selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-selfies' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Service role can read/delete (for cleanup)
CREATE POLICY IF NOT EXISTS "Service role can manage verification selfies"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'verification-selfies');

-- Storage policy: Workers can read their own selfies (for disputes)
CREATE POLICY IF NOT EXISTS "Workers can read their own verification selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-selfies' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policy: Admins can read all  verification selfies (for reviews)
CREATE POLICY IF NOT EXISTS "Admins can read all verification selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-selfies' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_skill_assessments_face_verified
ON skill_assessments(worker_id, face_verified)
WHERE face_verified = true;

COMMENT ON INDEX idx_skill_assessments_face_verified IS 'Index for finding verified assessments by worker';
