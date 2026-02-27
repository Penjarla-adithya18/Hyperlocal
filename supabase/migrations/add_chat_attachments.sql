-- Migration: Add attachment support to chat_messages
-- Created: 2026-02-26

-- Add attachment columns to chat_messages table
alter table chat_messages
add column if not exists attachment_url text,
add column if not exists attachment_name text,
add column if not exists attachment_type text,
add column if not exists attachment_size integer;

-- Add index for faster attachment queries
create index if not exists idx_chat_messages_with_attachments 
on chat_messages(conversation_id, created_at desc) 
where attachment_url is not null;
