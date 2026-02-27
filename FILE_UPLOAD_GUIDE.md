# File Upload Integration Guide

This guide explains how to set up and use the file upload functionality in HyperLocal, which uses Supabase Storage for storing chat attachments, profile pictures, and resumes.

## Overview

The file upload system supports:
- **Chat attachments**: Images, PDFs, and documents (up to 5MB)
- **Profile pictures**: User avatars stored publicly
- **Resumes**: Worker resume files stored privately

## Setup

### 1. Run Supabase Migrations

First, update your database schema to support attachments:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/add_chat_attachments.sql

alter table chat_messages
add column if not exists attachment_url text,
add column if not exists attachment_name text,
add column if not exists attachment_type text,
add column if not exists attachment_size integer;

create index if not exists idx_chat_messages_with_attachments 
on chat_messages(conversation_id, created_at desc) 
where attachment_url is not null;
```

### 2. Create Storage Buckets

Run the storage setup script to create buckets and configure policies:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/storage-setup.sql

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('chat-attachments', 'chat-attachments', false),
  ('profile-pictures', 'profile-pictures', true),
  ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- See supabase/storage-setup.sql for full policy configuration
```

### 3. Environment Variables

Ensure your `.env.local` has the Supabase configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Usage

### Chat Attachments

The FileUpload component is integrated into both worker and employer chat pages:

```tsx
import { FileUpload } from '@/components/ui/file-upload'
import { uploadChatAttachment } from '@/lib/supabase/storage'

// In your component
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [uploading, setUploading] = useState(false)

const handleSendMessage = async () => {
  if (selectedFile) {
    const uploadResult = await uploadChatAttachment(
      selectedFile,
      user.id,
      conversationId
    )
    
    // Send message with attachment data
    await db.sendMessage({
      conversationId,
      senderId: user.id,
      message: `Sent ${uploadResult.name}`,
      attachmentUrl: uploadResult.url,
      attachmentName: uploadResult.name,
      attachmentType: uploadResult.type,
      attachmentSize: uploadResult.size,
    })
  }
}

// In your JSX
<FileUpload
  onFileSelect={setSelectedFile}
  onFileRemove={() => setSelectedFile(null)}
  selectedFile={selectedFile}
  accept="image/*,.pdf,.doc,.docx"
  maxSizeMB={5}
  disabled={uploading}
/>
```

### Profile Pictures

Upload user profile pictures:

```tsx
import { uploadProfilePicture } from '@/lib/supabase/storage'

const handleProfilePictureUpload = async (file: File) => {
  const result = await uploadProfilePicture(file, user.id)
  
  // Update user profile with new picture URL
  await updateProfile({
    profilePictureUrl: result.url
  })
}
```

### Resumes

Upload worker resumes:

```tsx
import { uploadResume } from '@/lib/supabase/storage'

const handleResumeUpload = async (file: File) => {
  const result = await uploadResume(file, user.id)
  
  // Update worker profile with resume URL
  await updateWorkerProfile({
    resumeUrl: result.url
  })
}
```

## API Reference

### Storage Functions

#### `uploadFile(bucket, file, userId, folder?)`
Generic file upload function.
- **bucket**: Storage bucket name
- **file**: File object to upload
- **userId**: User ID for organizing files
- **folder**: Optional subfolder within user's folder
- **Returns**: `UploadResult` with URL and path

#### `uploadChatAttachment(file, userId, conversationId)`
Upload a chat attachment.
- **Returns**: `UploadResult` with file metadata

#### `uploadProfilePicture(file, userId)`
Upload a profile picture (deletes existing first).

#### `uploadResume(file, userId)`
Upload a resume file.

#### `getSignedUrl(bucket, path, expiresIn?)`
Get a temporary signed URL for private files.
- **expiresIn**: Expiration in seconds (default: 3600)

#### `downloadFile(bucket, path)`
Download a file as a Blob.

#### `deleteFile(bucket, path)`
Delete a file from storage.

### Utility Functions

#### `formatFileSize(bytes)`
Format byte size for display (e.g., "1.5 MB").

#### `isImageFile(filename)`
Check if file is an image based on extension.

#### `isPdfFile(filename)`
Check if file is a PDF.

#### `getFileExtension(filename)`
Extract file extension from filename.

## Storage Structure

Files are organized by user ID and optional folders:

```
chat-attachments/
  ├── {userId}/
      └── {conversationId}/
          ├── 1234567890-abc123.jpg
          └── 1234567891-def456.pdf

profile-pictures/
  └── {userId}/
      └── 1234567890-abc123.jpg

resumes/
  └── {userId}/
      └── 1234567890-abc123.pdf
```

## Security

### Storage Policies

- **chat-attachments**: Private bucket, users can only upload to their own folders
- **profile-pictures**: Public bucket, anyone can view, users can only modify their own
- **resumes**: Private bucket, users can only access their own files

### File Validation

- Maximum file size: 5MB (configurable via `maxSizeMB` prop)
- Accepted file types: Configurable via `accept` prop
- Default: `image/*,.pdf,.doc,.docx`

### Chat Message Filtering

The chat system filters messages for:
- Email addresses
- Phone numbers
- External platform references (WhatsApp, Telegram, etc.)

**Note**: Attachments bypass text filters but still enforce file size/type restrictions.

## Message Display

Messages with attachments are displayed differently:

- **Images**: Displayed inline with max 200x200px
- **PDFs/Documents**: Shown as downloadable cards with file icon, name, and size
- **Download button**: Opens file in new tab

## Troubleshooting

### Upload Fails

1. Check Supabase Storage quota
2. Verify bucket exists and policies are set
3. Check browser console for CORS errors
4. Ensure file size is within limits

### Image Not Displaying

1. For private buckets, use `getSignedUrl()` instead of direct URL
2. Check image URL is publicly accessible (for profile pictures)
3. Verify file extension is in `isImageFile()` check

### Storage Policies Not Working

1. Run `storage-setup.sql` again
2. Check user is authenticated (policies require `auth.uid()`)
3. Verify folder structure matches policy expectations

## Future Enhancements

- [ ] Image compression before upload
- [ ] Drag-and-drop file upload
- [ ] Multiple file selection
- [ ] Progress bar for large files
- [ ] File preview before upload
- [ ] Thumbnail generation for images
- [ ] Virus scanning integration
- [ ] CDN integration for faster delivery

## Related Files

- `lib/supabase/storage.ts` - Storage utility functions
- `components/ui/file-upload.tsx` - FileUpload component
- `supabase/storage-setup.sql` - Bucket and policy setup
- `supabase/migrations/add_chat_attachments.sql` - Database migration
- `app/worker/chat/page.tsx` - Worker chat with file upload
- `app/employer/chat/page.tsx` - Employer chat with file upload
