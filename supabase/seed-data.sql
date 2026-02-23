-- HyperLocal AI Job & Skill Matching Platform - SQL Seed Data
-- Run this file in Supabase SQL Editor to populate the database with real test data
-- Date: 2026-02-23

-- ============================================================================
-- USERS TABLE - Workers and Employers
-- ============================================================================
INSERT INTO users (id, full_name, email, phone_number, role, password_hash, profile_completed, trust_score, trust_level, is_verified, skills, created_at) VALUES
-- Workers
('550e8400-e29b-41d4-a716-446655440001', 'Rajesh Kumar', 'rajesh.kumar@example.com', '+919876543210', 'worker', '$2b$10$example_hash_1', true, 78, 'active', true, ARRAY['cleaning', 'housekeeping', 'cooking']::text[], '2025-12-15T10:30:00Z'),
('550e8400-e29b-41d4-a716-446655440002', 'Priya Sharma', 'priya.sharma@example.com', '+919876543211', 'worker', '$2b$10$example_hash_2', true, 85, 'trusted', true, ARRAY['graphic design', 'social media', 'content writing']::text[], '2025-11-20T14:15:00Z'),
('550e8400-e29b-41d4-a716-446655440003', 'Suresh Patel', 'suresh.patel@example.com', '+919876543212', 'worker', '$2b$10$example_hash_3', true, 72, 'active', true, ARRAY['plumbing', 'electrical', 'carpentry']::text[], '2026-01-05T09:45:00Z'),
('550e8400-e29b-41d4-a716-446655440004', 'Ananya Desai', 'ananya.desai@example.com', '+919876543213', 'worker', '$2b$10$example_hash_4', false, 50, 'basic', true, ARRAY[]::text[], '2026-02-01T11:20:00Z'),
('550e8400-e29b-41d4-a716-446655440005', 'Arjun Singh', 'arjun.singh@example.com', '+919876543214', 'worker', '$2b$10$example_hash_5', true, 88, 'trusted', true, ARRAY['web development', 'app development', 'ui design']::text[], '2025-10-12T16:00:00Z'),
-- Employers
('550e8400-e29b-41d4-a716-446655440050', 'Vijay Reddy', 'vijay.reddy@example.com', '+919876543220', 'employer', '$2b$10$example_hash_50', true, 82, 'active', true, NULL, '2025-08-20T08:30:00Z'),
('550e8400-e29b-41d4-a716-446655440051', 'Meera Nair', 'meera.nair@example.com', '+919876543221', 'employer', '$2b$10$example_hash_51', true, 90, 'trusted', true, NULL, '2025-07-10T12:45:00Z'),
('550e8400-e29b-41d4-a716-446655440052', 'Ashok Kumar', 'ashok.kumar@example.com', '+919876543222', 'employer', '$2b$10$example_hash_52', true, 65, 'basic', true, NULL, '2026-01-15T10:00:00Z');

-- Add company info for employers
UPDATE users SET company_name = 'Reddy''s Consulting', company_description = 'IT consulting and software development' WHERE id = '550e8400-e29b-41d4-a716-446655440050';
UPDATE users SET company_name = 'Nair Hospitality Group', company_description = 'Hotels and event management' WHERE id = '550e8400-e29b-41d4-a716-446655440051';
UPDATE users SET company_name = 'Kumar Home Services', company_description = 'Cleaning and maintenance services' WHERE id = '550e8400-e29b-41d4-a716-446655440052';

-- ============================================================================
-- WORKER PROFILES TABLE
-- ============================================================================
INSERT INTO worker_profiles (user_id, skills, availability, experience, categories, location, bio, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', ARRAY['cleaning', 'housekeeping', 'cooking']::text[], 'Flexible, prefer mornings', '5 years in hospitality sector', ARRAY['cleaning', 'cooking', 'hospitality']::text[], 'Vijayawada', 'Experienced professional ready for gig work', '2025-12-15T10:30:00Z', '2026-02-20T10:00:00Z'),
('550e8400-e29b-41d4-a716-446655440002', ARRAY['graphic design', 'social media', 'content writing']::text[], 'Flexible, can work weekends', '3 years in digital marketing', ARRAY['design', 'marketing', 'content']::text[], 'Visakhapatnam', 'Creative professional with strong design portfolio', '2025-11-20T14:15:00Z', '2026-02-18T14:30:00Z'),
('550e8400-e29b-41d4-a716-446655440003', ARRAY['plumbing', 'electrical', 'carpentry']::text[], 'Available on call', '7 years in construction and maintenance', ARRAY['construction', 'maintenance', 'repairs']::text[], 'Guntur', 'Skilled tradesperson, reliable and punctual', '2026-01-05T09:45:00Z', '2026-02-19T11:00:00Z'),
('550e8400-e29b-41d4-a716-446655440005', ARRAY['web development', 'app development', 'ui design']::text[], 'Flexible, prefer remote work', '4 years in software development', ARRAY['technology', 'programming', 'design']::text[], 'Vijayawada', 'Full-stack developer, open to freelance projects', '2025-10-12T16:00:00Z', '2026-02-21T09:15:00Z');

-- ============================================================================
-- EMPLOYER PROFILES TABLE
-- ============================================================================
INSERT INTO employer_profiles (user_id, business_name, organization_name, location, business_type, description, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440050', 'Reddy''s Consulting', 'Reddy''s IT Solutions Pvt Ltd', 'Vijayawada', 'IT Services', 'Leading IT consulting and software development company', '2025-08-20T08:30:00Z', '2026-02-15T10:00:00Z'),
('550e8400-e29b-41d4-a716-446655440051', 'Nair Hospitality Group', 'Nair Hotels & Events', 'Visakhapatnam', 'Hospitality', 'Premium hotel and event management services', '2025-07-10T12:45:00Z', '2026-02-18T14:00:00Z'),
('550e8400-e29b-41d4-a716-446655440052', 'Kumar Home Services', 'Kumar Services Network', 'Guntur', 'Home Services', 'Professional cleaning and maintenance solutions', '2026-01-15T10:00:00Z', '2026-02-20T11:30:00Z');

-- ============================================================================
-- JOBS TABLE
-- ============================================================================
INSERT INTO jobs (id, employer_id, title, description, job_type, category, required_skills, location, latitude, longitude, pay, pay_amount, pay_type, payment_status, escrow_amount, escrow_required, timing, duration, experience_required, requirements, benefits, slots, start_date, status, application_count, views, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', 'Hotel Room Cleaner', 'Looking for experienced housekeeping staff for our luxury hotel. Must be reliable and detail-oriented.', 'part-time', 'hospitality', ARRAY['cleaning', 'housekeeping', 'customer service']::text[], 'Visakhapatnam, Pink City Complex', 17.6869, 83.2185, 500, 3500, 'daily', 'released', 3500, true, '6:00 AM - 2:00 PM, Mon-Sat', '1 month contract', 'entry', 'High school pass, police verification', 'Meals provided, ID badge', 3, '2026-02-25', 'active', 5, 89, '2026-02-10T10:00:00Z', '2026-02-20T16:30:00Z'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440050', 'Mobile App Development', 'Develop a cross-platform mobile app for our e-commerce platform. Must have React Native or Flutter experience.', 'full-time', 'technology', ARRAY['mobile development', 'react native', 'api integration']::text[], 'Vijayawada, IT Hub', 16.9891, 82.2475, 75000, 75000, 'fixed', 'locked', 75000, true, '9:00 AM - 6:00 PM, Mon-Fri', '3 months', 'intermediate', '3+ years experience, portfolio required', 'Flexible hours, work from home allowed', 1, '2026-03-01', 'active', 12, 234, '2026-02-15T14:30:00Z', '2026-02-21T08:00:00Z'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440052', 'Home Deep Cleaning Service', 'Professional deep cleaning for residential apartments. Includes kitchen, bathrooms, and all bedrooms.', 'gig', 'cleaning', ARRAY['cleaning', 'housekeeping']::text[], 'Guntur, Suryabagh', 16.5889, 80.6245, 2000, 2000, 'fixed', 'pending', 2000, true, 'Flexible, any time', '1 day', 'entry', 'Background check required', 'Supplies provided', 5, '2026-02-28', 'draft', 0, 0, '2026-02-20T09:15:00Z', '2026-02-20T09:15:00Z'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440051', 'Event Coordinator Assistant', 'Assist in organizing corporate events and conferences. Coordinate with vendors and manage logistics.', 'part-time', 'events', ARRAY['event management', 'coordination', 'communication']::text[], 'Visakhapatnam, Convention Center', 17.7009, 83.3173, 300, 2100, 'daily', 'released', 2100, true, 'Flexible, as needed', '2 weeks', 'entry', 'Good communication skills', 'Networking opportunity', 2, '2026-03-10', 'active', 3, 45, '2026-02-18T11:45:00Z', '2026-02-20T12:00:00Z'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440050', 'Graphic Designer for Branding', 'Create brand identity and marketing materials for our startup. Logo, business cards, social media templates.', 'gig', 'design', ARRAY['graphic design', 'ui design', 'branding']::text[], 'Vijayawada, Tech Park', 16.9891, 82.2475, 5000, 5000, 'fixed', 'locked', 5000, true, 'Flexible', '1 week', 'intermediate', 'Portfolio required, Adobe Suite experience', 'Long-term collaboration possible', 1, '2026-02-24', 'active', 8, 156, '2026-02-12T15:20:00Z', '2026-02-17T14:00:00Z');

-- ============================================================================
-- APPLICATIONS TABLE
-- ============================================================================
INSERT INTO applications (id, job_id, worker_id, status, match_score, cover_message, cover_letter, created_at, updated_at) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'accepted', 87, 'I have 5 years of housekeeping experience and am very reliable.', 'Experienced housekeeping professional ready to deliver excellent service', '2026-02-16T10:30:00Z', '2026-02-16T12:00:00Z'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'accepted', 92, 'Perfect match for your mobile app development needs', '4 years React Native experience with 5 shipped apps', '2026-02-16T14:15:00Z', '2026-02-16T15:30:00Z'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'pending', 64, 'I am interested in this opportunity', 'Willing to learn and work hard', '2026-02-17T09:45:00Z', '2026-02-17T09:45:00Z'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'accepted', 89, 'Creative designer with strong branding background', '3 years experience in digital marketing and graphic design', '2026-02-17T11:20:00Z', '2026-02-17T12:45:00Z');

-- ============================================================================
-- CHAT CONVERSATIONS TABLE
-- ============================================================================
INSERT INTO chat_conversations (id, participants, worker_id, employer_id, job_id, application_id, created_at, updated_at) VALUES
('880e8400-e29b-41d4-a716-446655440001', ARRAY['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051']::uuid[], '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '2026-02-16T10:45:00Z', '2026-02-20T16:45:00Z'),
('880e8400-e29b-41d4-a716-446655440002', ARRAY['550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440050']::uuid[], '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440050', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', '2026-02-16T14:30:00Z', '2026-02-21T09:00:00Z'),
('880e8400-e29b-41d4-a716-446655440003', ARRAY['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440050']::uuid[], '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440050', '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440004', '2026-02-17T11:35:00Z', '2026-02-17T13:00:00Z');

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================
INSERT INTO chat_messages (id, conversation_id, sender_id, message, read, created_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', 'Hi Rajesh! Thanks for applying. When can you start?', true, '2026-02-16T11:00:00Z'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'I can start from 25th February. What time should I report?', true, '2026-02-16T11:15:00Z'),
('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440050', 'Hi Arjun! Great to see your experience. Let''s discuss project details.', true, '2026-02-16T14:45:00Z'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'Thanks! I''d love to hear more about your requirements.', true, '2026-02-16T15:00:00Z'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440050', 'Hi Priya! Your portfolio looks amazing. Can we schedule a call?', true, '2026-02-17T12:00:00Z'),
('990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Absolutely! I''m available on video call anytime this week.', false, '2026-02-17T12:10:00Z');

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================
INSERT INTO ratings (id, job_id, application_id, from_user_id, to_user_id, rating, feedback, created_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 5, 'Excellent work! Very professional and reliable. Highly recommended.', '2026-02-20T15:30:00Z'),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', 5, 'Great experience! Clear communication and fair payment. Thank you!', '2026-02-20T16:00:00Z');

-- ============================================================================
-- TRUST SCORES TABLE
-- ============================================================================
INSERT INTO trust_scores (user_id, score, level, job_completion_rate, average_rating, total_ratings, complaint_count, successful_payments, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 78, 'active', 94, 4.8, 15, 0, 14, '2026-02-20T15:45:00Z'),
('550e8400-e29b-41d4-a716-446655440002', 85, 'trusted', 98, 4.9, 22, 0, 21, '2026-02-20T16:15:00Z'),
('550e8400-e29b-41d4-a716-446655440005', 88, 'trusted', 100, 5.0, 12, 0, 12, '2026-02-21T09:00:00Z'),
('550e8400-e29b-41d4-a716-446655440051', 90, 'trusted', 96, 4.8, 18, 0, 18, '2026-02-20T16:30:00Z');

-- ============================================================================
-- ESCROW TRANSACTIONS TABLE
-- ============================================================================
INSERT INTO escrow_transactions (id, job_id, employer_id, worker_id, amount, status, created_at, released_at) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', 3500, 'released', '2026-02-16T10:30:00Z', '2026-02-20T16:30:00Z'),
('bb0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440005', 75000, 'held', '2026-02-16T14:20:00Z', NULL),
('bb0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440002', 5000, 'held', '2026-02-17T11:40:00Z', NULL);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
INSERT INTO notifications (id, user_id, type, title, message, is_read, link, created_at) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'job_match', 'New Job Match', 'You matched 87% with Hotel Room Cleaner job at Nair Hospitality', true, '/worker/jobs/660e8400-e29b-41d4-a716-446655440001', '2026-02-15T10:00:00Z'),
('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'application', 'Application Accepted', 'Your application for Hotel Room Cleaner was accepted!', true, '/worker/applications', '2026-02-16T12:00:00Z'),
('cc0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', 'job_match', 'Perfect Match Found', 'You matched 92% with Mobile App Development role', true, '/worker/jobs/660e8400-e29b-41d4-a716-446655440002', '2026-02-15T14:00:00Z'),
('cc0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440051', 'payment', 'Payment Released', 'Payment of ₹3,500 has been released to Rajesh Kumar', true, '/employer/dashboard', '2026-02-20T16:30:00Z');

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
INSERT INTO reports (id, reporter_id, reported_user_id, type, reason, description, status, resolution, created_at, resolved_at) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'suspicious_behavior', 'Job seems suspicious - asking for upfront payment', 'The employer asked me to pay registration fee before starting', 'resolved', 'Account flagged for review', '2026-02-18T10:00:00Z', '2026-02-19T15:30:00Z');

-- ============================================================================
-- Verify seed data insertion
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM jobs) as total_jobs,
  (SELECT COUNT(*) FROM applications) as total_applications,
  (SELECT COUNT(*) FROM chat_conversations) as chat_conversations,
  (SELECT COUNT(*) FROM ratings) as total_ratings,
  (SELECT COUNT(*) FROM escrow_transactions) as escrow_transactions;
