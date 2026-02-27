-- Supabase Storage bucket setup for HyperLocal
-- Run in Supabase SQL editor

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('chat-attachments', 'chat-attachments', false),
  ('profile-pictures', 'profile-pictures', true),
  ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Storage policies for chat-attachments bucket
-- Allow authenticated users to upload files
create policy "Authenticated users can upload chat attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own chat attachments
create policy "Users can read their own chat attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users involved in a conversation to read attachments
-- This would require a more complex policy checking conversation participants
-- For now, we'll handle access control at the application level

-- Storage policies for profile-pictures bucket (public)
create policy "Anyone can view profile pictures"
on storage.objects for select
to public
using (bucket_id = 'profile-pictures');

create policy "Authenticated users can upload their profile picture"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-pictures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own profile picture"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-pictures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own profile picture"
on storage.objects for delete
to authenticated
using (bucket_id = 'profile-pictures' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for resumes bucket (private)
create policy "Authenticated workers can upload their resume"
on storage.objects for insert
to authenticated
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read their own resume"
on storage.objects for select
to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own resume"
on storage.objects for update
to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own resume"
on storage.objects for delete
to authenticated
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
