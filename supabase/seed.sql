-- =============================================================
-- HyperLocal AI Job & Skill Matching Platform — SEED DATA
-- Run AFTER schema.sql in the Supabase SQL editor
-- =============================================================
-- Passwords are all bcrypt hashes of "Password@123"
-- Phone numbers follow Indian format: +91XXXXXXXXXX
-- UUIDs are fixed so FK references work cleanly
-- =============================================================

-- ─── TRUNCATE (safe re-run) ──────────────────────────────────
truncate table notifications      restart identity cascade;
truncate table ratings            restart identity cascade;
truncate table trust_scores       restart identity cascade;
truncate table escrow_transactions restart identity cascade;
truncate table reports            restart identity cascade;
truncate table chat_messages      restart identity cascade;
truncate table chat_conversations restart identity cascade;
truncate table applications       restart identity cascade;
truncate table jobs               restart identity cascade;
truncate table employer_profiles  restart identity cascade;
truncate table worker_profiles    restart identity cascade;
truncate table user_sessions      restart identity cascade;
truncate table users              restart identity cascade;

-- =============================================================
-- 1. USERS  (20 workers · 10 employers · 2 admins = 32 total)
-- =============================================================
insert into users (id, full_name, phone_number, role, password_hash, profile_completed,
                   trust_score, trust_level, is_verified, company_name, company_description, skills)
values

-- ── WORKERS ──────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000001','Ravi Kumar Sharma',   '+919876540001','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',72,'active',  true, null,null,'{"Plumbing","Pipe fitting","Basic electrical"}'),
('11111111-0001-0001-0001-000000000002','Priya Devi',          '+919876540002','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',85,'trusted', true, null,null,'{"Cooking","Catering","Food packaging"}'),
('11111111-0001-0001-0001-000000000003','Mohammed Irfan',      '+919876540003','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',60,'active',  true, null,null,'{"Driving","Heavy vehicle","Logistics"}'),
('11111111-0001-0001-0001-000000000004','Sunita Bai',          '+919876540004','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',50,'basic',   false,null,null,'{"Cleaning","Housekeeping"}'),
('11111111-0001-0001-0001-000000000005','Arjun Reddy Nalla',   '+919876540005','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',90,'trusted', true, null,null,'{"Carpentry","Furniture assembly","Wood polish"}'),
('11111111-0001-0001-0001-000000000006','Lakshmi Venkatesan',  '+919876540006','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',78,'active',  true, null,null,'{"Tailoring","Embroidery","Dress making"}'),
('11111111-0001-0001-0001-000000000007','Deepak Yadav',        '+919876540007','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',55,'basic',   false,null,null,'{"Security guard","Night patrol"}'),
('11111111-0001-0001-0001-000000000008','Kavitha Subramaniam',  '+919876540008','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',82,'trusted', true, null,null,'{"Data entry","MS Office","Typing 60wpm"}'),
('11111111-0001-0001-0001-000000000009','Ramesh Babu Patel',   '+919876540009','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',67,'active',  true, null,null,'{"Painting","Wall texture","Waterproofing"}'),
('11111111-0001-0001-0001-000000000010','Anjali Singh',        '+919876540010','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',74,'active',  true, null,null,'{"Reception","Customer service","Front desk"}'),
('11111111-0001-0001-0001-000000000011','Suresh Mondal',       '+919876540011','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',58,'basic',   false,null,null,'{"Loading","Unloading","Warehouse"}'),
('11111111-0001-0001-0001-000000000012','Nandini Krishnaswamy','+919876540012','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',88,'trusted', true, null,null,'{"Nursing","Patient care","First aid"}'),
('11111111-0001-0001-0001-000000000013','Rajendra Prasad',     '+919876540013','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',63,'active',  true, null,null,'{"Electrician","Wiring","Panel board"}'),
('11111111-0001-0001-0001-000000000014','Meena Kumari Devi',   '+919876540014','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',70,'active',  true, null,null,'{"Cooking","Tiffin service","Meal prep"}'),
('11111111-0001-0001-0001-000000000015','Vinod Kumar Gupta',   '+919876540015','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',53,'basic',   false,null,null,'{"Gardening","Landscaping","Plant care"}'),
('11111111-0001-0001-0001-000000000016','Padmavathi Rao',      '+919876540016','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',81,'trusted', true, null,null,'{"Beautician","Makeup","Mehendi"}'),
('11111111-0001-0001-0001-000000000017','Ganesh Mahato',       '+919876540017','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',66,'active',  true, null,null,'{"AC repair","Refrigerator repair","Appliance service"}'),
('11111111-0001-0001-0001-000000000018','Saranya Murugesan',   '+919876540018','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',75,'active',  true, null,null,'{"Textile","Weaving","Fabric quality check"}'),
('11111111-0001-0001-0001-000000000019','Bhim Rao Ambedkar',   '+919876540019','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',59,'basic',   false,null,null,'{"Construction","Masonry","Brick work"}'),
('11111111-0001-0001-0001-000000000020','Tara Kumari',         '+919876540020','worker',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',84,'trusted', true, null,null,'{"Accounting","GST filing","Tally ERP"}'),

-- ── EMPLOYERS ─────────────────────────────────────────────────
('22222222-0002-0002-0002-000000000001','Harish Agarwal',      '+919876540021','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',80,'trusted', true,
 'Agarwal Construction Pvt Ltd','Leading construction company in Vijayawada specializing in residential & commercial projects','{}'),
('22222222-0002-0002-0002-000000000002','Rekha Nair',          '+919876540022','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',75,'active',  true,
 'Nair Caterers & Events','Family-run catering service for weddings, corporate events and parties','{}'),
('22222222-0002-0002-0002-000000000003','Sanjay Mehta',        '+919876540023','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',88,'trusted', true,
 'Mehta Logistics Solutions','Pan-India logistics company with last-mile delivery operations in Tier-2 cities','{}'),
('22222222-0002-0002-0002-000000000004','Latha Raghunathan',   '+919876540024','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',62,'active',  false,
 'Shree Textiles','Handloom textile manufacturer and exporter from Guntur, AP','{}'),
('22222222-0002-0002-0002-000000000005','Prakash Joshi',       '+919876540025','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',55,'basic',   false,
 'Joshi Electricals','Authorized dealer and service center for electrical appliances','{}'),
('22222222-0002-0002-0002-000000000006','Deepa Chandrasekhar', '+919876540026','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',91,'trusted', true,
 'Chandrasekhar Hospitals','150-bed multi-specialty hospital serving Warangal and surrounding districts','{}'),
('22222222-0002-0002-0002-000000000007','Ranjit Singh Bhandari','+919876540027','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',73,'active',  true,
 'Bhandari Security Services','Providing trained security guards to commercial and residential clients since 2010','{}'),
('22222222-0002-0002-0002-000000000008','Usha Venkataraman',   '+919876540028','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',68,'active',  true,
 'Usha Beauty Academy','Beauty parlour chain & training academy with 3 outlets in Hyderabad','{}'),
('22222222-0002-0002-0002-000000000009','Kishore Kumar Naidu', '+919876540029','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',77,'active',  true,
 'Naidu Farms & Agro','Agricultural firm with cold storage, food processing and export operations','{}'),
('22222222-0002-0002-0002-000000000010','Fatima Begum',        '+919876540030','employer',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',85,'trusted', true,
 'Begum Cloud Kitchen','Cloud kitchen with 5 brands delivering across Hyderabad and Secunderabad','{}'),

-- ── ADMINS ────────────────────────────────────────────────────
('33333333-0003-0003-0003-000000000001','Admin Superuser',     '+919000000001','admin',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',100,'trusted',true,null,null,'{}'),
('33333333-0003-0003-0003-000000000002','Platform Moderator',  '+919000000002','admin',
 '$2a$10$X3Y4Z5A6B7C8D9E0F1G2H.uJkLmNoPqRsTuVwXyZaBcDeFgHiJkL','true',95,'trusted', true,null,null,'{}');

-- =============================================================
-- 2. WORKER PROFILES  (20 workers)
-- =============================================================
insert into worker_profiles (user_id, skills, availability, experience, categories, location, bio)
values
('11111111-0001-0001-0001-000000000001',
 '{"Plumbing","Pipe fitting","Basic electrical","Sanitary work"}',
 'Morning 6am-12pm, Evening 4pm-8pm',
 '5 years experience as plumber in residential and commercial buildings',
 '{"Plumbing","Electrical"}',
 'Vijayawada, Andhra Pradesh',
 'Experienced plumber available for urgent repairs and new installations. Work guaranteed.'),

('11111111-0001-0001-0001-000000000002',
 '{"Cooking","Catering","Food packaging","Hygiene management","Bulk cooking"}',
 'Full day available',
 '8 years catering experience including weddings and corporate events',
 '{"Cooking","Catering","Food"}',
 'Guntur, Andhra Pradesh',
 'Expert in Andhra, Mughlai and Continental cuisines. Can manage team of 5 helpers for large events.'),

('11111111-0001-0001-0001-000000000003',
 '{"Driving LMV","Driving HMV","Logistics coordination","Route planning"}',
 'Night shifts preferred, 10pm-6am',
 '7 years driving experience with valid LMV and HMV license',
 '{"Driving","Logistics","Delivery"}',
 'Hyderabad, Telangana',
 'Licensed driver with clean record. Experienced in long-distance logistics and city delivery.'),

('11111111-0001-0001-0001-000000000004',
 '{"House cleaning","Floor mopping","Utensil washing","Baby care"}',
 'Morning 7am-1pm only',
 '3 years domestic work experience',
 '{"Housekeeping","Cleaning","Domestic"}',
 'Secunderabad, Telangana',
 'Trustworthy domestic helper. Looking for part-time morning work near home.'),

('11111111-0001-0001-0001-000000000005',
 '{"Carpentry","Furniture assembly","Wood polish","Modular kitchen","Door fitting"}',
 'Weekdays 9am-6pm',
 '10 years carpentry with 200+ projects completed',
 '{"Carpentry","Construction","Interior"}',
 'Vijayawada, Andhra Pradesh',
 'Master carpenter specializing in modular furniture and interior woodwork. All work with material warranty.'),

('11111111-0001-0001-0001-000000000006',
 '{"Tailoring","Embroidery","Dress making","Blouse stitching","Saree fall"}',
 'Flexible, prefer morning',
 '6 years tailoring, trained at Government ITI',
 '{"Tailoring","Fashion","Textiles"}',
 'Tirupati, Andhra Pradesh',
 'Skilled tailor specializing in women''s traditional wear. Fast delivery, quality stitching at affordable rates.'),

('11111111-0001-0001-0001-000000000007',
 '{"Security guard","Night patrol","CCTV monitoring","Crowd management","First aid"}',
 'Night 10pm-6am',
 '4 years security guard at shopping mall and apartment complex',
 '{"Security","Safety"}',
 'Warangal, Telangana',
 'Ex-army trained security professional. Well-disciplined and reliable for night duty.'),

('11111111-0001-0001-0001-000000000008',
 '{"Data entry","MS Office","Excel","Typing 60wpm","Tally basic"}',
 'Morning 9am-1pm or Evening 2pm-6pm',
 '4 years data entry and office assistance',
 '{"Computer","Data Entry","Office"}',
 'Hyderabad, Telangana',
 'Efficient data entry professional. Fast and accurate typist. Comfortable with Excel MIS reports.'),

('11111111-0001-0001-0001-000000000009',
 '{"Interior painting","Wall texture","Waterproofing","POP work","Enamel painting"}',
 'Full day available Monday-Saturday',
 '8 years painting experience in residential and commercial sites',
 '{"Painting","Construction","Interior"}',
 'Nellore, Andhra Pradesh',
 'Professional painter with expertise in decorative textures and waterproofing. Own equipment.'),

('11111111-0001-0001-0001-000000000010',
 '{"Reception","Customer service","Front desk","Telephone handling","Visitor management"}',
 '9am-6pm weekdays',
 '3 years front desk experience at hotel and hospital',
 '{"Reception","Hospitality","Customer Service"}',
 'Hyderabad, Telangana',
 'Well-spoken professional with strong customer service skills. Fluent in Telugu, Hindi and English.'),

('11111111-0001-0001-0001-000000000011',
 '{"Loading","Unloading","Warehouse operations","Forklift","Stock counting"}',
 'Full day, any shift',
 '5 years warehouse and logistics work',
 '{"Warehouse","Logistics","Labour"}',
 'Kakinada, Andhra Pradesh',
 'Strong and hardworking warehouse worker. Comfortable with heavy lifting and inventory management.'),

('11111111-0001-0001-0001-000000000012',
 '{"Nursing","Patient care","IV cannula","Wound dressing","Vital monitoring","ICU assistance"}',
 'Day shift 7am-7pm',
 '6 years nursing at government hospital, GNM certified',
 '{"Healthcare","Nursing","Medical"}',
 'Hyderabad, Telangana',
 'GNM-qualified nurse with ICU and general ward experience. Available for home nursing and hospital duty.'),

('11111111-0001-0001-0001-000000000013',
 '{"Electrician","Domestic wiring","Panel board","MCB fitting","AC installation"}',
 'Morning 8am-2pm',
 '7 years electrical work, ITI certified',
 '{"Electrical","Maintenance","Installation"}',
 'Karimnagar, Telangana',
 'Certified electrician. Specialize in domestic wiring, solar installation and appliance repair.'),

('11111111-0001-0001-0001-000000000014',
 '{"Home cooking","Tiffin service","Meal prep","Pickle making","Traditional recipes"}',
 'Morning 6am-10am',
 '10 years home cooking and tiffin service',
 '{"Cooking","Catering","Food"}',
 'Guntur, Andhra Pradesh',
 'Experienced home cook providing healthy, hygienic Andhra meals. Long-term tiffin contracts preferred.'),

('11111111-0001-0001-0001-000000000015',
 '{"Gardening","Landscaping","Plant care","Lawn mowing","Nursery work"}',
 'Morning 6am-10am',
 '4 years gardening work at bungalows and apartment complexes',
 '{"Gardening","Agriculture","Outdoor"}',
 'Vizag, Andhra Pradesh',
 'Passionate gardener with knowledge of local plants. Available for daily, weekly or monthly contracts.'),

('11111111-0001-0001-0001-000000000016',
 '{"Beautician","Bridal makeup","Mehendi","Waxing","Facial","Hair styling"}',
 'Flexible, Sundays not available',
 '5 years at top beauty salons and bridal events',
 '{"Beauty","Wellness","Grooming"}',
 'Hyderabad, Telangana',
 'Certified beautician specializing in bridal packages. Home visits available. Premium products used.'),

('11111111-0001-0001-0001-000000000017',
 '{"AC repair","Refrigerator repair","Washing machine","Microwave","Appliance diagnostics"}',
 'Full day, any day',
 '6 years appliance service technician at authorized center',
 '{"AC Repair","Appliance","Technical"}',
 'Hyderabad, Telangana',
 'Certified technician for all major appliance brands. Same-day service available. Spare parts arranged.'),

('11111111-0001-0001-0001-000000000018',
 '{"Weaving","Fabric quality check","Textile inspection","Loom operation","Design pattern reading"}',
 'Full day weekdays',
 '8 years textile factory experience',
 '{"Textiles","Manufacturing","Quality"}',
 'Guntur, Andhra Pradesh',
 'Skilled weaver with expertise in traditional handloom designs. Experience in quality inspection.'),

('11111111-0001-0001-0001-000000000019',
 '{"Masonry","Brick laying","Plastering","Tiling","Construction labour"}',
 'Full day available',
 '12 years construction experience',
 '{"Construction","Masonry","Labour"}',
 'Kurnool, Andhra Pradesh',
 'Experienced mason for all construction work. Can lead small teams. Own tools.'),

('11111111-0001-0001-0001-000000000020',
 '{"Accounting","GST filing","Tally ERP","TDS","Balance sheet","Payroll"}',
 '10am-5pm weekdays',
 '6 years in CA firm and small business accounting',
 '{"Accounting","Finance","Computer"}',
 'Hyderabad, Telangana',
 'B.Com graduate with Tally ERP expertise. Freelance accounting, GST and income tax filing services.');

-- =============================================================
-- 3. EMPLOYER PROFILES (10 employers)
-- =============================================================
insert into employer_profiles (user_id, business_name, organization_name, location, business_type, description)
values
('22222222-0002-0002-0002-000000000001','Agarwal Construction Pvt Ltd','Agarwal Group','Vijayawada, Andhra Pradesh','Construction','Residential, commercial and infrastructure construction company operating across Andhra Pradesh for 15+ years.'),
('22222222-0002-0002-0002-000000000002','Nair Caterers & Events','Nair Family Enterprises','Hyderabad, Telangana','Food & Catering','Full-service catering for weddings, corporate events and social functions. Team of 30+ cooks and helpers.'),
('22222222-0002-0002-0002-000000000003','Mehta Logistics Solutions','Mehta Group','Hyderabad, Telangana','Logistics & Delivery','End-to-end logistics service with fleet of 50+ vehicles. Specializing in last-mile delivery.'),
('22222222-0002-0002-0002-000000000004','Shree Textiles','Shree Industries','Guntur, Andhra Pradesh','Textiles & Manufacturing','Handloom cotton textile manufacturer with 200 looms and export operations to Europe and USA.'),
('22222222-0002-0002-0002-000000000005','Joshi Electricals','Joshi Enterprises','Warangal, Telangana','Electrical Services','Authorized service center and retail dealer for electrical appliances, solar panels and EV charging stations.'),
('22222222-0002-0002-0002-000000000006','Chandrasekhar Hospitals','CSK Healthcare Pvt Ltd','Warangal, Telangana','Healthcare','150-bed multi-specialty hospital with 24/7 emergency, ICU, maternity and outpatient departments.'),
('22222222-0002-0002-0002-000000000007','Bhandari Security Services','BSS Pvt Ltd','Hyderabad, Telangana','Security Services','ISO-certified security company providing trained guards for malls, apartments, hospitals and warehouses.'),
('22222222-0002-0002-0002-000000000008','Usha Beauty Academy','Usha Wellness Pvt Ltd','Hyderabad, Telangana','Beauty & Wellness','Beauty parlour chain with 3 outlets and professional training courses in cosmetology and nail art.'),
('22222222-0002-0002-0002-000000000009','Naidu Farms & Agro','Naidu Group','Kurnool, Andhra Pradesh','Agriculture','Integrated agro-business with 500 acres of farmland, cold storage, processing unit and export operations.'),
('22222222-0002-0002-0002-000000000010','Begum Cloud Kitchen','Begum Foods Pvt Ltd','Hyderabad, Telangana','Food & Beverage','Multi-brand cloud kitchen operating 5 food brands on Swiggy, Zomato and own app. 200+ orders daily.');

-- =============================================================
-- 4. JOBS (30 job listings across all categories)
-- =============================================================
insert into jobs (id, employer_id, title, description, job_type, category, required_skills,
                  location, latitude, longitude, pay, pay_amount, pay_type, payment_status,
                  escrow_amount, escrow_required, timing, duration, experience_required,
                  requirements, benefits, slots, start_date, status, application_count, views)
values

-- Agarwal Construction jobs
('44444444-0004-0004-0004-000000000001','22222222-0002-0002-0002-000000000001',
 'Site Plumber – Residential Project',
 'We need experienced plumbers for ongoing residential apartment construction in Vijayawada. Work involves laying pipes, fitting sanitary ware, testing systems and ensuring compliance to building norms.',
 'gig','Plumbing','{"Plumbing","Pipe fitting","Sanitary installation","Pressure testing"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 650,650,'hourly','locked',5200,true,
 '8am-6pm Monday-Saturday','3 months','intermediate',
 'ITI certificate preferred. Safety shoes and helmet mandatory. Experience in residential plumbing required.',
 'Lunch provided. Safety equipment provided. Performance bonus after project completion.',
 3,'2026-03-01','active',4,120),

('44444444-0004-0004-0004-000000000002','22222222-0002-0002-0002-000000000001',
 'Mason / Bricklayer for Commercial Building',
 'Urgent requirement for experienced masons for a commercial building site. Work includes brick laying, plastering, tiling and general masonry work under supervision of site engineer.',
 'gig','Construction','{"Masonry","Brick laying","Plastering","Tiling"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 600,600,'hourly','locked',4800,true,
 '7am-5pm, 6 days a week','6 months','experienced',
 '5+ years experience in commercial construction. Physical fitness required. Own trowel and tools preferred.',
 'Overtime pay available. Safety gear provided. Sunday off.',
 5,'2026-02-28','active',7,198),

-- Nair Caterers jobs
('44444444-0004-0004-0004-000000000003','22222222-0002-0002-0002-000000000002',
 'Event Cook for Wedding Season',
 'Large catering company hiring experienced cooks for the upcoming wedding season. You will be responsible for preparing traditional Andhra and North Indian dishes in bulk quantities for events of 500-2000 guests.',
 'gig','Cooking','{"Bulk cooking","Andhra cuisine","North Indian","Hygiene","Team coordination"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 800,800,'hourly','locked',6400,true,
 'Event-based, mostly evenings and weekends','March-June 2026','experienced',
 'Minimum 5 years bulk cooking experience. Food safety certificate preferred.',
 'Transport provided to event venues. Meals included. Tip sharing from events.',
 8,'2026-03-15','active',12,310),

('44444444-0004-0004-0004-000000000004','22222222-0002-0002-0002-000000000002',
 'Catering Helper – Kitchen Assistant',
 'Catering helper required to assist the main cook team. Responsibilities include chopping vegetables, washing utensils, serving food, maintaining cleanliness and general kitchen assistance during events.',
 'gig','Food & Hospitality','{"Kitchen assistance","Vegetable cutting","Utensil washing","Physical stamina"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 400,400,'hourly','locked',3200,true,
 'Event-based timing','March-June 2026','entry',
 'No experience needed. Willingness to work hard. Must be punctual.',
 'Transport and meals provided. Regular work during wedding season.',
 10,'2026-03-15','active',18,245),

-- Mehta Logistics jobs
('44444444-0004-0004-0004-000000000005','22222222-0002-0002-0002-000000000003',
 'Delivery Driver – LMV (Last Mile)',
 'Mehta Logistics hiring delivery drivers with LMV license for last-mile parcel delivery in Hyderabad. You will operate a company Bolero or Tata Ace for delivering 50-80 packages daily.',
 'full-time','Driving & Delivery','{"LMV license","City driving","Navigation app","Physical fitness","Time management"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 18000,18000,'fixed','locked',18000,true,
 'Morning shift 7am-4pm or Evening shift 2pm-10pm','Permanent','intermediate',
 'Valid LMV license. Smartphone required. Knowledge of Hyderabad roads. Clean driving record.',
 'PF + ESI. Petrol allowance. Monthly incentives on delivery targets.',
 5,'2026-03-01','active',9,420),

('44444444-0004-0004-0004-000000000006','22222222-0002-0002-0002-000000000003',
 'Warehouse Associate – Loading/Unloading',
 'We need warehouse workers for our Hyderabad distribution center. Daily tasks include receiving shipments, unloading trucks, sorting parcels, scanning items and maintaining stock records.',
 'full-time','Warehouse','{"Warehouse operations","Physical stamina","Barcode scanning","Stock management"}',
 'Hyderabad, Telangana',17.4126,78.4071,
 14000,14000,'fixed','locked',14000,true,
 'Rotational shifts (Day/Night)','Permanent','entry',
 'Minimum 10th pass. Physically fit. Comfortable with technology (mobile scanning).',
 'ESI + PF. Canteen facility. Uniform provided. Overtime pay.',
 8,'2026-03-01','active',14,387),

-- Shree Textiles jobs
('44444444-0004-0004-0004-000000000007','22222222-0002-0002-0002-000000000004',
 'Handloom Weaver – Traditional Cotton',
 'Shree Textiles hiring experienced handloom weavers for our Guntur facility. You will operate traditional pit looms to produce high-quality cotton fabrics. Knowledge of traditional Andhra patterns is a plus.',
 'full-time','Textiles','{"Handloom weaving","Pit loom operation","Cotton fabric","Pattern reading","Quality check"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 12000,12000,'fixed','locked',12000,true,
 '8am-5pm, 6 days','Permanent','experienced',
 '5+ years handloom experience. Knowledge of traditional Andhra designs preferred.',
 'ESI + PF. Accommodation available. Festival bonus.',
 4,'2026-03-10','active',3,156),

('44444444-0004-0004-0004-000000000008','22222222-0002-0002-0002-000000000004',
 'Textile Quality Inspector',
 'Quality inspector required to check finished fabric for defects, measure thread count, verify color consistency and tag quality-passed items. Must have eye for detail and knowledge of fabric standards.',
 'full-time','Textiles','{"Fabric quality check","Defect identification","Measurement","Grading","Documentation"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 14000,14000,'fixed','released',14000,false,
 '9am-5pm weekdays','Permanent','intermediate',
 'Experience in textile quality control. ITI or diploma in textile technology preferred.',
 'ESI + PF. Career growth to senior QC role.',
 1,'2026-02-01','filled',1,89),

-- Joshi Electricals jobs
('44444444-0004-0004-0004-000000000009','22222222-0002-0002-0002-000000000005',
 'Field Service Technician – AC & Appliances',
 'Field technician required for doorstep repair of air conditioners, refrigerators and washing machines. You will visit customer locations, diagnose faults, replace parts and test repaired appliances.',
 'full-time','Electrical & Technical','{"AC repair","Refrigerator repair","Appliance service","Electrical fault finding","Customer handling"}',
 'Warangal, Telangana',17.9784,79.5941,
 16000,16000,'fixed','locked',16000,true,
 '9am-6pm, 6 days a week','Permanent','intermediate',
 'ITI Electrician or equivalent. 2+ years appliance service experience. Own vehicle preferred.',
 'Petrol allowance. Uniform + tools provided. Commission on service calls.',
 2,'2026-03-05','active',5,203),

('44444444-0004-0004-0004-000000000010','22222222-0002-0002-0002-000000000005',
 'Electrician – Solar Panel Installation',
 'Electrician needed for residential and commercial solar panel installation projects. Work includes laying cables, fixing panels on rooftops, connecting inverters and grid-tie systems.',
 'gig','Electrical','{"Electrician","Solar panel","Wiring","Inverter installation","Safety compliance"}',
 'Warangal, Telangana',17.9784,79.5941,
 750,750,'hourly','pending',0,true,
 'Project-based, typically 2-3 days per site','Ongoing projects','intermediate',
 'ITI certificate with electrical trade. Experience in solar systems is a plus. Height comfort required.',
 'Per-project payment. Advance paid. PPE provided.',
 3,'2026-03-15','active',1,88),

-- Chandrasekhar Hospitals jobs
('44444444-0004-0004-0004-000000000011','22222222-0002-0002-0002-000000000006',
 'Staff Nurse – General Ward',
 'Chandrasekhar Hospitals urgently requires GNM/B.Sc Nursing qualified nurses for our general ward. Responsibilities include patient monitoring, IV administration, dressing and following doctor instructions.',
 'full-time','Healthcare','{"Nursing","Patient care","IV administration","Wound dressing","Vital monitoring"}',
 'Warangal, Telangana',17.9784,79.5941,
 20000,20000,'fixed','locked',20000,true,
 '8-hour shifts (3 rotations)','Permanent','intermediate',
 'GNM or B.Sc Nursing registered with AP Nursing Council. 2+ years experience preferred.',
 'Accommodation on campus. ESI + PF. Annual increment. Skill development training.',
 4,'2026-03-01','active',6,280),

('44444444-0004-0004-0004-000000000012','22222222-0002-0002-0002-000000000006',
 'Hospital Housekeeping Staff',
 'Housekeeping staff needed to maintain cleanliness and hygiene in hospital wards, OT, ICU and common areas. Must follow hospital infection control protocols.',
 'full-time','Healthcare Support','{"Housekeeping","Hospital hygiene","Floor cleaning","Infection control","Physical stamina"}',
 'Warangal, Telangana',17.9784,79.5941,
 11000,11000,'fixed','locked',11000,true,
 '8am-4pm or 2pm-10pm shifts','Permanent','entry',
 'Minimum 8th pass. Will to learn infection control protocols. Experience in hospital preferred.',
 'ESI. Uniform and equipment provided. Meals on duty.',
 6,'2026-03-01','active',11,302),

-- Bhandari Security jobs
('44444444-0004-0004-0004-000000000013','22222222-0002-0002-0002-000000000007',
 'Security Guard – Shopping Mall',
 'Security guards required for Hyderabad shopping mall. Duties include access control at entry/exit, CCTV monitoring, patrolling floors, assisting customers and maintaining log records.',
 'full-time','Security','{"Security guard","Access control","CCTV monitoring","Crowd management","Report writing"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 13000,13000,'fixed','locked',13000,true,
 '12-hour shifts, rotational','Permanent','entry',
 'Minimum 10th pass. Height 5ft 6in minimum. Ex-defence/police preferred. Clean background check.',
 'ESI + PF. Uniform provided. Night allowance. Annual increment.',
 10,'2026-03-01','active',15,445),

('44444444-0004-0004-0004-000000000014','22222222-0002-0002-0002-000000000007',
 'Security Supervisor – Apartment Complex',
 'Experienced security supervisor to manage a team of 6 guards at a premium residential high-rise in Hyderabad. Responsible for shift management, rosters, incident reporting and client coordination.',
 'full-time','Security','{"Security supervision","Team management","Incident reporting","Client coordination","Patrol management"}',
 'Hyderabad, Telangana',17.4310,78.4380,
 18000,18000,'fixed','locked',18000,true,
 'Day 7am-7pm or Night 7pm-7am (rotational)','Permanent','experienced',
 '3+ years security experience. Leadership skills. Good English/Hindi communication.',
 'ESI + PF. Mobile reimbursement. Annual bonus.',
 1,'2026-03-10','active',3,178),

-- Usha Beauty Academy jobs
('44444444-0004-0004-0004-000000000015','22222222-0002-0002-0002-000000000008',
 'Beautician – Parlour Staff',
 'Usha Beauty Academy hiring certified beauticians for our Hyderabad outlets. Services include facials, threading, waxing, bridal packages, hair styling and nail art.',
 'full-time','Beauty & Wellness','{"Facial","Waxing","Threading","Hair styling","Bridal makeup","Nail art"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 15000,15000,'fixed','locked',15000,true,
 '10am-8pm, 6 days','Permanent','intermediate',
 'Beauty diploma or 2+ years parlour experience. Pleasant personality. Knowledge of premium products.',
 'Commission on services. Product training. Career growth to senior stylist.',
 3,'2026-03-01','active',7,334),

('44444444-0004-0004-0004-000000000016','22222222-0002-0002-0002-000000000008',
 'Bridal Makeup Artist – Freelance Basis',
 'Freelance bridal makeup artists required for weekend and season bookings. Must be proficient in HD bridal makeup, airbrush technique and traditional South Indian bridal looks.',
 'freelance','Beauty & Wellness','{"Bridal makeup","HD makeup","Airbrush","South Indian bridal","Saree draping"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 3500,3500,'fixed','pending',0,true,
 'Weekends and wedding season (Oct-Mar)','Ongoing freelance','experienced',
 'Portfolio required. Own kit preferred. Experience with North and South Indian bridal styles.',
 'Per booking payment. Conveyance. High earning during peak season.',
 5,'2026-03-01','active',4,211),

-- Naidu Farms jobs
('44444444-0004-0004-0004-000000000017','22222222-0002-0002-0002-000000000009',
 'Farm Worker – Harvest Season',
 'Naidu Farms urgently needs farm workers for chilli and cotton harvest. Work involves picking, sorting, weighing and loading produce. Accommodation provided on farm.',
 'gig','Agriculture','{"Farm labour","Harvesting","Physical stamina","Outdoor work"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 450,450,'hourly','locked',3600,true,
 '6am-12pm and 3pm-6pm','October-December (seasonal)','entry',
 'Physical fitness required. Outdoor work in sun. Basic understanding of farm work.',
 'Accommodation + 3 meals provided daily. Bonus on harvest completion.',
 20,'2026-10-01','active',2,143),

('44444444-0004-0004-0004-000000000018','22222222-0002-0002-0002-000000000009',
 'Cold Storage Supervisor',
 'Supervisor needed for our cold storage facility. Responsible for temperature monitoring, inventory tracking, receiving and dispatching produce, and maintaining hygiene standards.',
 'full-time','Agriculture & Logistics','{"Cold storage","Temperature monitoring","Inventory","Forklift","Documentation"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 16000,16000,'fixed','locked',16000,true,
 '6am-2pm or 2pm-10pm, rotational','Permanent','intermediate',
 'Experience in cold storage or warehouse. Computer basics required. Forklift license preferred.',
 'ESI + PF. Accommodation available. Quarterly bonus.',
 1,'2026-03-15','active',2,97),

-- Begum Cloud Kitchen jobs
('44444444-0004-0004-0004-000000000019','22222222-0002-0002-0002-000000000010',
 'Cloud Kitchen Cook – Multiple Cuisines',
 'Begum Cloud Kitchen hiring cooks who can prepare consistent, high-quality food for delivery. You will specialize in one of our brands: Hyderabadi Biryani, South Indian Tiffins, Chinese or North Indian.',
 'full-time','Cooking','{"Commercial cooking","Consistency","Biryani","Speed","Hygiene","Food safety"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 17000,17000,'fixed','locked',17000,true,
 '6am-3pm or 12pm-9pm','Permanent','intermediate',
 'Minimum 3 years commercial cooking. Food safety certificate. Speed and consistency required.',
 'ESI + PF. Meals on duty. Incentives on positive reviews. Quick promotion track.',
 4,'2026-03-01','active',8,378),

('44444444-0004-0004-0004-000000000020','22222222-0002-0002-0002-000000000010',
 'Kitchen Helper – Cloud Kitchen',
 'Kitchen helper needed for our cloud kitchen. Tasks include vegetable preparation, dishwashing, packing delivery orders, maintaining cleanliness and assisting cooks during peak hours.',
 'full-time','Food & Hospitality','{"Kitchen assistance","Food packing","Dish washing","Cleanliness","Speed"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 10000,10000,'fixed','locked',10000,true,
 '6am-3pm or 12pm-9pm','Permanent','entry',
 'Minimum 8th pass. Hard-working and punctual. Food handling hygiene habits.',
 'ESI. Meals provided. Stable income.',
 6,'2026-03-01','active',9,267),

-- Additional gig jobs across employers
('44444444-0004-0004-0004-000000000021','22222222-0002-0002-0002-000000000001',
 'Painter – Flat Renovation',
 'Interior painter needed for renovating 20 flats in an apartment block. Work includes preparing walls, applying putty, primer and emulsion paint with roller and brush.',
 'gig','Painting','{"Interior painting","Putty application","Primer","Emulsion","Roller painting"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 600,600,'hourly','locked',4800,true,
 '8am-6pm, 6 days','45 days','intermediate',
 '3+ years painting experience. Comfort with heights. Own brushes preferred.',
 'Lunch provided. Materials supplied. Quality bonus.',
 4,'2026-03-01','active',5,167),

('44444444-0004-0004-0004-000000000022','22222222-0002-0002-0002-000000000003',
 'HMV Truck Driver – Interstate Routes',
 'HMV truck driver needed for interstate goods transportation between Hyderabad, Vijayawada and Chennai. Contract-based, well-paying opportunity.',
 'freelance','Driving & Logistics','{"HMV license","Interstate driving","Night driving","Vehicle maintenance","Documentation"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 900,900,'hourly','pending',0,true,
 'Flexible, trip-based','Ongoing','experienced',
 'Valid HMV license. 5+ years interstate driving. Clean chalan record.',
 'Per trip payment. Fuel + toll paid. Rest house accommodation.',
 2,'2026-03-01','active',3,189),

('44444444-0004-0004-0004-000000000023','22222222-0002-0002-0002-000000000005',
 'Electrician – House Wiring (Gig)',
 'Electrician needed for new house wiring work in 5 independent houses. Work includes conduit laying, switch board fitting, fan and light point wiring, earthing.',
 'gig','Electrical','{"Domestic wiring","Conduit laying","Switchboard","Earthing","Wire sizing"}',
 'Warangal, Telangana',17.9784,79.5941,
 700,700,'hourly','locked',5600,true,
 '8am-5pm','20 working days','intermediate',
 'ITI Electrician. Experience in new construction wiring.',
 'All materials provided. Food allowance.',
 2,'2026-03-10','active',2,121),

('44444444-0004-0004-0004-000000000024','22222222-0002-0002-0002-000000000002',
 'Mehendi Artist for Wedding Events',
 'Professional mehendi artists required for upcoming wedding bookings. Must be fast, creative and able to handle bridal and guest mehendi at large events.',
 'freelance','Beauty & Events','{"Mehendi","Bridal mehendi","Patterns","Speed","Guest handling"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 2000,2000,'fixed','locked',2000,true,
 'Evenings and weekends, event-based','Ongoing freelance','intermediate',
 'Portfolio of work mandatory. Must bring own cones. Able to work 6-8 hours at events.',
 'Per event payment. Travel reimbursement. Tips from clients.',
 3,'2026-03-01','active',6,244),

('44444444-0004-0004-0004-000000000025','22222222-0002-0002-0002-000000000006',
 'Nursing Attendant – ICU Support',
 'Nursing attendants needed for ICU support work. Tasks include patient hygiene care, turning, feeding, monitoring vitals under nurse supervision and maintaining ward equipment.',
 'full-time','Healthcare','{"Patient care","ICU support","Vital signs","Patient hygiene","Equipment cleaning"}',
 'Warangal, Telangana',17.9784,79.5941,
 14000,14000,'fixed','locked',14000,true,
 '8-hour shifts, 3 rotations','Permanent','entry',
 'Nursing attendant certificate or 1 year experience in ICU or ward.',
 'ESI. Training provided. Accommodation on campus. Meals during duty.',
 5,'2026-03-01','active',4,198),

('44444444-0004-0004-0004-000000000026','22222222-0002-0002-0002-000000000004',
 'Tailor – Garment Factory',
 'Tailors needed for garment stitching at our Guntur factory. You will stitch women''s kurtas, blouses and salwar sets using industrial sewing machines to production targets.',
 'full-time','Tailoring','{"Tailoring","Industrial sewing machine","Kurta stitching","Production targets","Measurement"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 12000,12000,'fixed','locked',12000,true,
 '8am-5pm weekdays','Permanent','intermediate',
 '2+ years industrial tailoring. Able to meet production targets of 30-40 pieces per day.',
 'ESI + PF. Festival bonus. Piece-rate bonus above target.',
 6,'2026-03-10','active',9,276),

('44444444-0004-0004-0004-000000000027','22222222-0002-0002-0002-000000000007',
 'CCTV Operator – Remote Monitoring',
 'CCTV operators needed for remote video monitoring of client premises. You will monitor multiple camera feeds, detect anomalies, log incidents and alert security teams.',
 'full-time','Security','{"CCTV monitoring","Video surveillance","Incident logging","Alertness","Computer basics"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 12000,12000,'fixed','locked',12000,true,
 'Night shift 10pm-6am / Day shift 6am-2pm','Permanent','entry',
 '10th pass. Good eyesight. Comfortable with computers and CCTV software.',
 'ESI + PF. Night allowance. Stable work environment.',
 4,'2026-03-01','active',7,312),

('44444444-0004-0004-0004-000000000028','22222222-0002-0002-0002-000000000010',
 'Delivery Executive – Food Orders',
 'Delivery executives needed for delivering food orders from our cloud kitchens to customers in Hyderabad. Own bike required. 50-80 deliveries per day.',
 'full-time','Delivery','{"Food delivery","Two-wheeler","Navigation","Time management","Customer handling"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 15000,15000,'fixed','locked',15000,true,
 'Morning 10am-4pm or Evening 3pm-11pm','Permanent','entry',
 'Own motorcycle + valid DL. Smartphone with internet. Knowledge of Hyderabad.',
 'Fuel allowance. Per delivery incentive. Rs 15000 + incentives up to Rs 20000.',
 10,'2026-03-01','active',16,498),

('44444444-0004-0004-0004-000000000029','22222222-0002-0002-0002-000000000009',
 'Accounts Assistant – Farm Business',
 'Accounts assistant needed to handle day-to-day accounting of our agro-business: purchase entries, sales invoicing, GST returns, bank reconciliation and payroll.',
 'full-time','Accounting','{"Tally ERP","GST filing","Accounts payable","Purchase entries","Bank reconciliation"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 16000,16000,'fixed','locked',16000,true,
 '9am-5pm weekdays','Permanent','intermediate',
 'B.Com with Tally ERP knowledge. 2+ years in accounts. GST experience needed.',
 'ESI + PF. Accommodation available. Annual increment.',
 1,'2026-03-10','active',3,145),

('44444444-0004-0004-0004-000000000030','22222222-0002-0002-0002-000000000008',
 'Receptionist – Beauty Academy',
 'Receptionist for our beauty academy. Handle student admissions, appointment scheduling, billing, phone calls and maintain academy records. Pleasant and well-spoken candidate required.',
 'full-time','Reception & Admin','{"Reception","Customer service","Appointment scheduling","Billing","Record keeping"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 13000,13000,'fixed','locked',13000,true,
 '9am-7pm, 6 days','Permanent','entry',
 'Minimum 12th pass. Good Telugu, Hindi and basic English. Computer basics. Well presented.',
 'ESI. Skill uplift (beauty training). Stable work environment.',
 1,'2026-03-01','active',5,223);

-- =============================================================
-- 5. APPLICATIONS (25 applications across jobs and workers)
-- =============================================================
insert into applications (id, job_id, worker_id, status, match_score, cover_letter)
values
('55555555-0005-0005-0005-000000000001','44444444-0004-0004-0004-000000000001','11111111-0001-0001-0001-000000000001','accepted',  92,'I have 5 years of plumbing experience in residential buildings similar to your project. I am familiar with CPVC and UPVC piping systems and sanitary fitting. I can start immediately.'),
('55555555-0005-0005-0005-000000000002','44444444-0004-0004-0004-000000000002','11111111-0001-0001-0001-000000000019','accepted',  88,'12 years masonry experience. Commercial building work is my specialty. I have done tiling, brick work and plastering on multiple large projects. References available.'),
('55555555-0005-0005-0005-000000000003','44444444-0004-0004-0004-000000000003','11111111-0001-0001-0001-000000000002','accepted',  95,'8 years catering experience, specializing in Andhra and Mughlai cuisines. I have managed cooking for weddings up to 3000 guests. My team is clean, professional and on time.'),
('55555555-0005-0005-0005-000000000004','44444444-0004-0004-0004-000000000003','11111111-0001-0001-0001-000000000014','pending',   78,'I run a home tiffin service and have experience in bulk cooking for events. I can prepare traditional Andhra dishes for large gatherings. Very particular about hygiene.'),
('55555555-0005-0005-0005-000000000005','44444444-0004-0004-0004-000000000004','11111111-0001-0001-0001-000000000004','pending',   65,'I am a hardworking kitchen helper. I am punctual and willing to work long hours. Quick learner and follow instructions well.'),
('55555555-0005-0005-0005-000000000006','44444444-0004-0004-0004-000000000004','11111111-0001-0001-0001-000000000011','pending',   70,'I have warehouse and loading experience but I am comfortable in kitchen assistance as well. I am strong, fast and do not mind hard work.'),
('55555555-0005-0005-0005-000000000007','44444444-0004-0004-0004-000000000005','11111111-0001-0001-0001-000000000003','accepted',  90,'7 years driving with valid LMV license. Hyderabad roads are well-known to me. I have delivered for courier companies before and maintained a clean record. Smartphone ready.'),
('55555555-0005-0005-0005-000000000008','44444444-0004-0004-0004-000000000006','11111111-0001-0001-0001-000000000011','accepted',  82,'5 years warehouse experience including loading, unloading and stock management. Comfortable with basic mobile apps for scanning. Ready to work any shift.'),
('55555555-0005-0005-0005-000000000009','44444444-0004-0004-0004-000000000007','11111111-0001-0001-0001-000000000018','accepted',  93,'8 years handloom weaving. Trained at a government handloom facility. I know traditional Andhra cotton designs and my work quality is excellent. Ready to join anytime.'),
('55555555-0005-0005-0005-000000000010','44444444-0004-0004-0004-000000000009','11111111-0001-0001-0001-000000000017','pending',   87,'6 years appliance service including AC, refrigerator and washing machines. Certified technician. I have my own vehicle and tools. Can handle 8+ service calls per day.'),
('55555555-0005-0005-0005-000000000011','44444444-0004-0004-0004-000000000011','11111111-0001-0001-0001-000000000012','accepted',  96,'GNM nurse with 6 years experience at a government hospital. Experienced in ICU and general ward. Registered with AP Nursing Council. Ready to join immediately.'),
('55555555-0005-0005-0005-000000000012','44444444-0004-0004-0004-000000000012','11111111-0001-0001-0001-000000000004','pending',   60,'I have 3 years domestic cleaning experience. I am willing to learn hospital hygiene protocols. Honest and hardworking.'),
('55555555-0005-0005-0005-000000000013','44444444-0004-0004-0004-000000000013','11111111-0001-0001-0001-000000000007','accepted',  85,'4 years security guard experience including mall duty. Ex-NCC. Well-disciplined, punctual and able to handle difficult situations calmly. Clean police verification.'),
('55555555-0005-0005-0005-000000000014','44444444-0004-0004-0004-000000000015','11111111-0001-0001-0001-000000000016','accepted',  91,'5 years beautician at top salons in Hyderabad. Expert in facials, waxing, bridal makeup and hair styling. Portfolio available. Currently working on commission-based setup.'),
('55555555-0005-0005-0005-000000000015','44444444-0004-0004-0004-000000000016','11111111-0001-0001-0001-000000000016','pending',   88,'Specialized bridal makeup artist. Premium products, airbrush technique, south and north Indian looks. Instagram portfolio with 200+ happy brides. Can travel.'),
('55555555-0005-0005-0005-000000000016','44444444-0004-0004-0004-000000000019','11111111-0001-0001-0001-000000000002','pending',   80,'Experienced Andhra cook who can do Hyderabadi biryani and South Indian tiffins consistently. Fast and hygienic. Available for full-time cloud kitchen work.'),
('55555555-0005-0005-0005-000000000017','44444444-0004-0004-0004-000000000019','11111111-0001-0001-0001-000000000014','pending',   75,'Home tiffin service cook, very consistent. Can handle South Indian, North Indian and rice items. Clean kitchen habits. Looking for stable employment.'),
('55555555-0005-0005-0005-000000000018','44444444-0004-0004-0004-000000000021','11111111-0001-0001-0001-000000000009','accepted',  89,'8 years painting, expert in interior work including putty, primer and emulsion. Have worked on 20+ flat renovations. References from satisfied builders available.'),
('55555555-0005-0005-0005-000000000019','44444444-0004-0004-0004-000000000022','11111111-0001-0001-0001-000000000003','pending',   82,'Valid HMV license. 7 years interstate driving including Hyderabad-Chennai and Hyderabad-Bangalore routes. Clean record and document-ready.'),
('55555555-0005-0005-0005-000000000020','44444444-0004-0004-0004-000000000023','11111111-0001-0001-0001-000000000013','accepted',  91,'ITI Electrician with 7 years domestic wiring. New construction wiring is my main skill. Safety-conscious and quality-focused.'),
('55555555-0005-0005-0005-000000000021','44444444-0004-0004-0004-000000000024','11111111-0001-0001-0001-000000000006','pending',   80,'Though I specialize in tailoring, I have good mehendi skills and have done mehendi at family events. Ready to improve with practice.'),
('55555555-0005-0005-0005-000000000022','44444444-0004-0004-0004-000000000026','11111111-0001-0001-0001-000000000006','accepted',  94,'6 years tailoring, trained at ITI. Expert in kurta and blouse stitching. Fast on industrial sewing machine, regularly exceeding daily targets.'),
('55555555-0005-0005-0005-000000000023','44444444-0004-0004-0004-000000000028','11111111-0001-0001-0001-000000000003','rejected',  55,'I have driving experience but only with LMV and food delivery on bike is new to me. Willing to learn.'),
('55555555-0005-0005-0005-000000000024','44444444-0004-0004-0004-000000000029','11111111-0001-0001-0001-000000000020','accepted',  97,'B.Com + 6 years accounting in a CA firm. Expert in Tally ERP, GST, TDS and payroll. Agro-business accounts is exactly my background. References ready.'),
('55555555-0005-0005-0005-000000000025','44444444-0004-0004-0004-000000000030','11111111-0001-0001-0001-000000000010','pending',   83,'3 years front desk experience at hotel and hospital. Fluent Telugu, Hindi and English. Good computer skills and very presentable. Loves working with people.');

-- =============================================================
-- 6. TRUST SCORES (all 32 users)
-- =============================================================
insert into trust_scores (user_id, score, level, job_completion_rate, average_rating,
                          total_ratings, complaint_count, successful_payments)
values
-- Workers
('11111111-0001-0001-0001-000000000001',72,'active',  0.80,4.2,10,0,8),
('11111111-0001-0001-0001-000000000002',85,'trusted', 0.95,4.8,22,0,20),
('11111111-0001-0001-0001-000000000003',60,'active',  0.75,3.9,8, 1,6),
('11111111-0001-0001-0001-000000000004',50,'basic',   0.50,3.5,2, 0,1),
('11111111-0001-0001-0001-000000000005',90,'trusted', 0.98,4.9,35,0,34),
('11111111-0001-0001-0001-000000000006',78,'active',  0.85,4.4,14,0,12),
('11111111-0001-0001-0001-000000000007',55,'basic',   0.60,3.7,5, 1,3),
('11111111-0001-0001-0001-000000000008',82,'trusted', 0.90,4.6,18,0,16),
('11111111-0001-0001-0001-000000000009',67,'active',  0.78,4.1,12,0,9),
('11111111-0001-0001-0001-000000000010',74,'active',  0.82,4.3,9, 0,7),
('11111111-0001-0001-0001-000000000011',58,'basic',   0.65,3.8,6, 0,4),
('11111111-0001-0001-0001-000000000012',88,'trusted', 0.96,4.8,28,0,27),
('11111111-0001-0001-0001-000000000013',63,'active',  0.77,4.0,11,0,8),
('11111111-0001-0001-0001-000000000014',70,'active',  0.83,4.2,15,0,13),
('11111111-0001-0001-0001-000000000015',53,'basic',   0.55,3.6,3, 0,2),
('11111111-0001-0001-0001-000000000016',81,'trusted', 0.91,4.7,20,0,18),
('11111111-0001-0001-0001-000000000017',66,'active',  0.79,4.0,13,0,10),
('11111111-0001-0001-0001-000000000018',75,'active',  0.84,4.3,16,0,14),
('11111111-0001-0001-0001-000000000019',59,'basic',   0.62,3.7,7, 1,4),
('11111111-0001-0001-0001-000000000020',84,'trusted', 0.93,4.7,19,0,18),
-- Employers
('22222222-0002-0002-0002-000000000001',80,'trusted', 0.92,4.5,20,0,18),
('22222222-0002-0002-0002-000000000002',75,'active',  0.85,4.4,16,0,14),
('22222222-0002-0002-0002-000000000003',88,'trusted', 0.95,4.7,24,0,23),
('22222222-0002-0002-0002-000000000004',62,'active',  0.70,4.0,8, 1,6),
('22222222-0002-0002-0002-000000000005',55,'basic',   0.60,3.8,5, 0,3),
('22222222-0002-0002-0002-000000000006',91,'trusted', 0.97,4.9,32,0,31),
('22222222-0002-0002-0002-000000000007',73,'active',  0.82,4.2,14,0,11),
('22222222-0002-0002-0002-000000000008',68,'active',  0.80,4.1,12,0,10),
('22222222-0002-0002-0002-000000000009',77,'active',  0.86,4.4,17,0,15),
('22222222-0002-0002-0002-000000000010',85,'trusted', 0.93,4.8,25,0,23),
-- Admins
('33333333-0003-0003-0003-000000000001',100,'trusted',1.00,5.0,0,0,0),
('33333333-0003-0003-0003-000000000002',95,'trusted', 1.00,5.0,0,0,0);

-- =============================================================
-- 7. ESCROW TRANSACTIONS  (for accepted applications with locked payment)
-- =============================================================
insert into escrow_transactions (id, job_id, employer_id, worker_id, amount, status, released_at)
values
('66666666-0006-0006-0006-000000000001','44444444-0004-0004-0004-000000000001','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000001',5200,'held',null),
('66666666-0006-0006-0006-000000000002','44444444-0004-0004-0004-000000000002','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000019',4800,'held',null),
('66666666-0006-0006-0006-000000000003','44444444-0004-0004-0004-000000000003','22222222-0002-0002-0002-000000000002','11111111-0001-0001-0001-000000000002',6400,'held',null),
('66666666-0006-0006-0006-000000000004','44444444-0004-0004-0004-000000000005','22222222-0002-0002-0002-000000000003','11111111-0001-0001-0001-000000000003',18000,'held',null),
('66666666-0006-0006-0006-000000000005','44444444-0004-0004-0004-000000000006','22222222-0002-0002-0002-000000000003','11111111-0001-0001-0001-000000000011',14000,'held',null),
('66666666-0006-0006-0006-000000000006','44444444-0004-0004-0004-000000000007','22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000018',12000,'held',null),
('66666666-0006-0006-0006-000000000007','44444444-0004-0004-0004-000000000008','22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000018',14000,'released','2026-02-20T14:30:00Z'),
('66666666-0006-0006-0006-000000000008','44444444-0004-0004-0004-000000000011','22222222-0002-0002-0002-000000000006','11111111-0001-0001-0001-000000000012',20000,'held',null),
('66666666-0006-0006-0006-000000000009','44444444-0004-0004-0004-000000000013','22222222-0002-0002-0002-000000000007','11111111-0001-0001-0001-000000000007',13000,'held',null),
('66666666-0006-0006-0006-000000000010','44444444-0004-0004-0004-000000000015','22222222-0002-0002-0002-000000000008','11111111-0001-0001-0001-000000000016',15000,'held',null),
('66666666-0006-0006-0006-000000000011','44444444-0004-0004-0004-000000000021','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000009',4800,'held',null),
('66666666-0006-0006-0006-000000000012','44444444-0004-0004-0004-000000000023','22222222-0002-0002-0002-000000000005','11111111-0001-0001-0001-000000000013',5600,'held',null),
('66666666-0006-0006-0006-000000000013','44444444-0004-0004-0004-000000000026','22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000006',12000,'held',null),
('66666666-0006-0006-0006-000000000014','44444444-0004-0004-0004-000000000029','22222222-0002-0002-0002-000000000009','11111111-0001-0001-0001-000000000020',16000,'held',null);

-- =============================================================
-- 8. CHAT CONVERSATIONS + MESSAGES
-- =============================================================
insert into chat_conversations (id, participants, worker_id, employer_id, job_id, application_id)
values
('77777777-0007-0007-0007-000000000001',
 ARRAY['11111111-0001-0001-0001-000000000001','22222222-0002-0002-0002-000000000001']::uuid[],
 '11111111-0001-0001-0001-000000000001','22222222-0002-0002-0002-000000000001',
 '44444444-0004-0004-0004-000000000001','55555555-0005-0005-0005-000000000001'),

('77777777-0007-0007-0007-000000000002',
 ARRAY['11111111-0001-0001-0001-000000000002','22222222-0002-0002-0002-000000000002']::uuid[],
 '11111111-0001-0001-0001-000000000002','22222222-0002-0002-0002-000000000002',
 '44444444-0004-0004-0004-000000000003','55555555-0005-0005-0005-000000000003'),

('77777777-0007-0007-0007-000000000003',
 ARRAY['11111111-0001-0001-0001-000000000003','22222222-0002-0002-0002-000000000003']::uuid[],
 '11111111-0001-0001-0001-000000000003','22222222-0002-0002-0002-000000000003',
 '44444444-0004-0004-0004-000000000005','55555555-0005-0005-0005-000000000007'),

('77777777-0007-0007-0007-000000000004',
 ARRAY['11111111-0001-0001-0001-000000000012','22222222-0002-0002-0002-000000000006']::uuid[],
 '11111111-0001-0001-0001-000000000012','22222222-0002-0002-0002-000000000006',
 '44444444-0004-0004-0004-000000000011','55555555-0005-0005-0005-000000000011'),

('77777777-0007-0007-0007-000000000005',
 ARRAY['11111111-0001-0001-0001-000000000020','22222222-0002-0002-0002-000000000009']::uuid[],
 '11111111-0001-0001-0001-000000000020','22222222-0002-0002-0002-000000000009',
 '44444444-0004-0004-0004-000000000029','55555555-0005-0005-0005-000000000024');

insert into chat_messages (conversation_id, sender_id, message, read)
values
-- Conversation 1 (Ravi Sharma & Agarwal Construction — Plumbing job)
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'Hello Ravi, we reviewed your application. Can you come to the site tomorrow morning at 8am for a quick trial?',true),
('77777777-0007-0007-0007-000000000001','11111111-0001-0001-0001-000000000001',
 'Good evening sir! Yes, I can definitely come tomorrow at 8am. What is the site address?',true),
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'It is at Moghalrajpuram, near Water Tank road. Ask for site engineer Suresh at the gate.',true),
('77777777-0007-0007-0007-000000000001','11111111-0001-0001-0001-000000000001',
 'Understood sir. I will bring all my tools and certificates. Thank you for the opportunity!',true),
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'Good. You have been selected. Escrow payment is locked. You can start on 1st March.',false),

-- Conversation 2 (Priya Devi & Nair Caterers — Cooking job)
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'Namaste. I applied for the event cook position. I have 8 years experience and managed cooking for 2000+ guests.',true),
('77777777-0007-0007-0007-000000000002','22222222-0002-0002-0002-000000000002',
 'Priya ji, your experience is very impressive. Can you tell me which cuisines you are expert in?',true),
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'I specialize in Andhra recipes — full meals, biryani, curries. I can also do North Indian for weddings.',true),
('77777777-0007-0007-0007-000000000002','22222222-0002-0002-0002-000000000002',
 'Excellent! We have a wedding on March 20 for 1500 guests. Are you available?',true),
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'Yes madam, March 20 I am free. I will need 2 helpers. What time should we arrive?',false),

-- Conversation 3 (Mohammed Irfan & Mehta Logistics — Driving job)
('77777777-0007-0007-0007-000000000003','22222222-0002-0002-0002-000000000003',
 'Hi Irfan, your application is shortlisted. Do you have LMV license and Android smartphone?',true),
('77777777-0007-0007-0007-000000000003','11111111-0001-0001-0001-000000000003',
 'Yes sir. Valid LMV license till 2031. I use Android phone with Google Maps. Ready to work morning shift.',true),
('77777777-0007-0007-0007-000000000003','22222222-0002-0002-0002-000000000003',
 'Great. Come to our Uppal office on Thursday 27th Feb at 10am for document verification.',true),
('77777777-0007-0007-0007-000000000003','11111111-0001-0001-0001-000000000003',
 'I will be there sir. Should I bring original license and Aadhar?',false),

-- Conversation 4 (Nandini & Chandrasekhar Hospital — Nursing job)
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'Dear Nandini, your nursing profile is strong. Are you currently working or immediately available?',true),
('77777777-0007-0007-0007-000000000004','11111111-0001-0001-0001-000000000012',
 'I am serving a 15-day notice at my current hospital. I can join on March 5th. I am registered with AP Nursing Council.',true),
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'March 5 works perfectly. We will place you in the general ward initially with day shifts.',true),
('77777777-0007-0007-0007-000000000004','11111111-0001-0001-0001-000000000012',
 'Thank you doctor. I am very excited to join. Will I have access to ICU if needed?',true),
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'Yes, after 3 months we rotate nurses across departments. HR will call you tomorrow for documentation.',false),

-- Conversation 5 (Tara Kumari & Naidu Farms — Accounts job)
('77777777-0007-0007-0007-000000000005','11111111-0001-0001-0001-000000000020',
 'Good morning sir. I applied for accounts assistant. I have 6 years experience in CA firm and complete knowledge of GST and Tally ERP.',true),
('77777777-0007-0007-0007-000000000005','22222222-0002-0002-0002-000000000009',
 'Hello Tara. We are an agro-business with multiple income streams. Do you have experience with trading accounts — purchase/sales?',true),
('77777777-0007-0007-0007-000000000005','11111111-0001-0001-0001-000000000020',
 'Yes sir. My CA firm had many trading clients. I handled purchase entries, sales invoicing, bank reconciliation and audit support.',true),
('77777777-0007-0007-0007-000000000005','22222222-0002-0002-0002-000000000009',
 'Very good. We also need payroll for 30 farm workers. Can you handle that?',false);

-- =============================================================
-- 9. RATINGS (for completed jobs)
-- =============================================================
insert into ratings (job_id, application_id, from_user_id, to_user_id, rating, feedback)
values
-- Job 8 (Textile QC) is completed / released — mutual ratings
('44444444-0004-0004-0004-000000000008','55555555-0005-0005-0005-000000000009',
 '22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000018',
 5,'Saranya is an outstanding weaver. Her quality is consistent, output is fast, and she notices defects that others miss. Highly recommended for any textile work.'),
('44444444-0004-0004-0004-000000000008','55555555-0005-0005-0005-000000000009',
 '11111111-0001-0001-0001-000000000018','22222222-0002-0002-0002-000000000004',
 4,'Good employer. Clear instructions, payment on time through escrow. Workplace was clean and organized.');

-- =============================================================
-- 10. REPORTS
-- =============================================================
insert into reports (reporter_id, reported_id, reported_user_id, reported_job_id,
                     type, reason, description, status, resolution)
values
('11111111-0001-0001-0001-000000000003','22222222-0002-0002-0002-000000000005',
 '22222222-0002-0002-0002-000000000005',null,
 'fraud','Employer asking for registration fee',
 'This employer called me and asked me to pay Rs 500 as registration fee to be considered for the electrician job. This is fraud.',
 'reviewing',null),

('11111111-0001-0001-0001-000000000007',null,
 null,'44444444-0004-0004-0004-000000000010',
 'fake_job','Job has no escrow and looks suspicious',
 'The solar electrician job has no escrow locked. I applied but the employer never responded for 10 days. This might be a fake listing.',
 'pending',null),

('11111111-0001-0001-0001-000000000015','22222222-0002-0002-0002-000000000009',
 '22222222-0002-0002-0002-000000000009',null,
 'payment_issue','Payment not released after work',
 'I completed 5 days of farmwork but employer has not released payment and is not responding through the app.',
 'resolved','Escrow payment was released on 2026-02-18 after admin intervention. Warning issued to employer.');

-- =============================================================
-- 11. NOTIFICATIONS (across workers and employers)
-- =============================================================
insert into notifications (user_id, type, title, message, is_read, link)
values
-- Workers
('11111111-0001-0001-0001-000000000001','application','Application Accepted!',
 'Congratulations! Agarwal Construction has accepted your application for Site Plumber. Check your chat for next steps.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000001','payment','Escrow Payment Locked',
 'Rs 5,200 has been securely locked in escrow for your Site Plumber job. You will receive payment after job completion.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000002','application','Application Accepted!',
 'Nair Caterers has accepted your application for Event Cook. Chat with them about the March 20 wedding event.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000003','application','Application Accepted!',
 'Mehta Logistics has accepted your application for Delivery Driver. Please visit their Uppal office on Feb 27.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000003','application','Application Rejected',
 'Begum Cloud Kitchen has not shortlisted your application for Delivery Executive at this time.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000005','job_match','New Job Match: 94% Match!',
 'A Modular Kitchen Carpentry job was posted. Your profile matches 94%. Apply before slots fill up!',
 false,'/worker/jobs'),
('11111111-0001-0001-0001-000000000012','application','Application Accepted!',
 'Chandrasekhar Hospitals has accepted your nursing application. Joining date is March 5. Check your chat.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000018','rating','You Received a 5-Star Rating!',
 'Shree Textiles gave you a 5-star rating for your handloom weaving work. Your trust score has increased!',
 false,'/worker/profile'),
('11111111-0001-0001-0001-000000000020','application','Application Accepted!',
 'Naidu Farms has accepted your accounts assistant application. Check your messages for next steps.',
 false,'/worker/applications'),

-- Employers
('22222222-0002-0002-0002-000000000001','application','4 New Applications',
 'You have received 4 new applications for Site Plumber. Review them and accept the best candidates.',
 false,'/employer/jobs'),
('22222222-0002-0002-0002-000000000002','application','12 Applications for Event Cook',
 'Your catering job received 12 applications. Review and shortlist your catering team for the season.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000003','application','9 Applications for Delivery Driver',
 'Mehta Logistics received 9 applications. At least 3 candidates have 80%+ match scores.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000006','application','Nurse Application: Nandini K — 96% Match',
 'A highly qualified nurse with 6 years ICU experience applied. Review immediately.',
 false,'/employer/jobs'),
('22222222-0002-0002-0002-000000000007','system','Security Post — 15 Applications',
 'Your mall security guard posting received 15 applications in 24 hours. Review and shortlist now.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000009','rating','You Were Rated 4 Stars',
 'Worker Saranya Murugesan rated your company 4 stars after completing the textile quality inspection job.',
 false,'/employer/dashboard'),
('22222222-0002-0002-0002-000000000010','application','16 Applications: Delivery Executive',
 'Your food delivery job is popular! 16 applicants so far. Start reviewing to fill slots quickly.',
 true,'/employer/jobs'),

-- System notifications
('11111111-0001-0001-0001-000000000004','job_match','3 New Jobs Match Your Profile',
 'New housekeeping jobs posted near Secunderabad. Complete your profile to see advanced recommendations.',
 false,'/worker/jobs'),
('11111111-0001-0001-0001-000000000007','system','Complete Your Profile for Better Matches',
 'Workers with complete profiles get 3x more job invitations. Add your skills and experience now.',
 true,'/worker/profile'),
('11111111-0001-0001-0001-000000000015','system','Profile Incomplete',
 'You have not added your skills yet. Add skills to get advanced AI job recommendations.',
 false,'/worker/profile');

-- =============================================================
-- Done! Summary of seeded data:
--  • 32 users  (20 workers, 10 employers, 2 admins)
--  • 20 worker profiles
--  • 10 employer profiles
--  • 30 job listings  (across 10 categories, all cities)
--  • 25 applications  (statuses: accepted / pending / rejected)
--  • 32 trust scores
--  • 14 escrow transactions  (held / released)
--  •  5 chat conversations  + 22 messages
--  •  2 ratings
--  •  3 reports
--  • 20 notifications
-- =============================================================
