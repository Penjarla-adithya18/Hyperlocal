-- =============================================================================
-- HyperLocal AI Job & Skill Matching Platform — SEED V2 (Comprehensive)
-- =============================================================================
-- Paste & run in Supabase SQL Editor.
-- Safe for repeated execution: cleans only seeded data, preserves real users.
--
-- 5 JOB CATEGORIES
--   1. Construction & Infrastructure
--   2. Food & Hospitality
--   3. Logistics & Transport
--   4. Healthcare & Wellness
--   5. Textiles, Security & Office Services
--
-- 30 jobs  ·  39 applications  ·  15 escrow  ·  8 ratings
-- 5 chats  ·  3 reports  ·  22 notifications  ·  32 trust scores
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 0 — CLEAN OLD SEEDED DATA  (preserves real user rows)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Deleting jobs cascades → applications, ratings, escrow_transactions
DELETE FROM jobs               WHERE employer_id::text LIKE '22222222-%';
DELETE FROM chat_conversations WHERE id::text           LIKE '77777777-%';
DELETE FROM notifications      WHERE user_id::text      LIKE '11111111-%'
                                  OR user_id::text      LIKE '22222222-%'
                                  OR user_id::text      LIKE '33333333-%';
DELETE FROM reports            WHERE reporter_id::text  LIKE '11111111-%'
                                  OR reporter_id::text  LIKE '22222222-%';
DELETE FROM trust_scores       WHERE user_id::text      LIKE '11111111-%'
                                  OR user_id::text      LIKE '22222222-%'
                                  OR user_id::text      LIKE '33333333-%';
DELETE FROM worker_profiles    WHERE user_id::text      LIKE '11111111-%';
DELETE FROM employer_profiles  WHERE user_id::text      LIKE '22222222-%';

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1 — UPDATE SEEDED WORKER SKILLS  (richer skill sets aligned to 5 categories)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Workers: Construction & Infrastructure
UPDATE users SET skills = '{"Plumbing","Pipe fitting","Sanitary installation","Water tank repair","Basic welding","Leak detection"}'
  WHERE id = '11111111-0001-0001-0001-000000000001';   -- Ravi Kumar

UPDATE users SET skills = '{"Carpentry","Furniture assembly","Wood polish","Modular kitchen","Door fitting","Interior woodwork"}'
  WHERE id = '11111111-0001-0001-0001-000000000005';   -- Arjun Reddy

UPDATE users SET skills = '{"Interior painting","Wall texture","Waterproofing","Putty application","POP work","Roller painting"}'
  WHERE id = '11111111-0001-0001-0001-000000000009';   -- Ramesh Babu

UPDATE users SET skills = '{"Electrician","House wiring","Panel board","Solar installation","MCB fitting","Earthing"}'
  WHERE id = '11111111-0001-0001-0001-000000000013';   -- Rajendra Prasad

UPDATE users SET skills = '{"Masonry","Brick laying","Plastering","Tiling","Construction labour","Cement mixing"}'
  WHERE id = '11111111-0001-0001-0001-000000000019';   -- Bhim Rao

-- Workers: Food & Hospitality
UPDATE users SET skills = '{"Cooking","Catering","Bulk cooking","Andhra cuisine","Menu planning","Food hygiene","North Indian"}'
  WHERE id = '11111111-0001-0001-0001-000000000002';   -- Priya Devi

UPDATE users SET skills = '{"Cooking","Tiffin service","Meal prep","Traditional recipes","South Indian cuisine","Hygiene management"}'
  WHERE id = '11111111-0001-0001-0001-000000000014';   -- Meena Kumari

-- Workers: Logistics & Transport
UPDATE users SET skills = '{"LMV driving","HMV driving","Route planning","GPS navigation","Logistics coordination","Vehicle maintenance"}'
  WHERE id = '11111111-0001-0001-0001-000000000003';   -- Mohammed Irfan

UPDATE users SET skills = '{"Loading","Unloading","Warehouse operations","Forklift","Stock counting","Inventory management"}'
  WHERE id = '11111111-0001-0001-0001-000000000011';   -- Suresh Mondal

-- Workers: Healthcare & Wellness
UPDATE users SET skills = '{"Nursing","ICU assistance","IV cannula","Wound dressing","Vital monitoring","Patient care","GNM certified"}'
  WHERE id = '11111111-0001-0001-0001-000000000012';   -- Nandini Krishnaswamy

UPDATE users SET skills = '{"Cleaning","Housekeeping","Hospital hygiene","Baby care","Utensil washing","Floor mopping"}'
  WHERE id = '11111111-0001-0001-0001-000000000004';   -- Sunita Bai

UPDATE users SET skills = '{"Beautician","Bridal makeup","Mehendi","Hair styling","Waxing","Facial","Nail art"}'
  WHERE id = '11111111-0001-0001-0001-000000000016';   -- Padmavathi Rao

-- Workers: Textiles, Security & Office
UPDATE users SET skills = '{"Tailoring","Embroidery","Dress making","Industrial sewing","Blouse stitching","Kurta stitching"}'
  WHERE id = '11111111-0001-0001-0001-000000000006';   -- Lakshmi Venkatesan

UPDATE users SET skills = '{"Security guard","CCTV monitoring","Night patrol","Access control","Report writing","Crowd management"}'
  WHERE id = '11111111-0001-0001-0001-000000000007';   -- Deepak Yadav

UPDATE users SET skills = '{"Data entry","MS Office","Excel","Typing 60wpm","Tally basic","Documentation","Filing"}'
  WHERE id = '11111111-0001-0001-0001-000000000008';   -- Kavitha Subramaniam

UPDATE users SET skills = '{"Reception","Customer service","Front desk","Billing","Telephone handling","Appointment scheduling"}'
  WHERE id = '11111111-0001-0001-0001-000000000010';   -- Anjali Singh

UPDATE users SET skills = '{"Weaving","Fabric quality check","Loom operation","Pattern reading","Textile inspection","Handloom"}'
  WHERE id = '11111111-0001-0001-0001-000000000018';   -- Saranya Murugesan

UPDATE users SET skills = '{"Gardening","Landscaping","Plant care","Farm labour","Harvesting","Nursery work"}'
  WHERE id = '11111111-0001-0001-0001-000000000015';   -- Vinod Kumar

UPDATE users SET skills = '{"Accounting","GST filing","Tally ERP","TDS","Bank reconciliation","Payroll","Purchase entries"}'
  WHERE id = '11111111-0001-0001-0001-000000000020';   -- Tara Kumari

UPDATE users SET skills = '{"AC repair","Refrigerator repair","Washing machine repair","Appliance diagnostics","Electrical troubleshooting"}'
  WHERE id = '11111111-0001-0001-0001-000000000017';   -- Ganesh Mahato

-- ── Real worker accounts (skill assignment) ───────────────────────

UPDATE users SET skills = '{"Plumbing","Pipe fitting","Basic welding","Leak detection","Sanitary installation","Water tank repair"}'
  WHERE id = '025dbb61-b973-4cd1-8815-361453b504df';   -- dhanush  (→ J01 Plumber, J05 Electrician-assist)

UPDATE users SET skills = '{"Cooking","South Indian cuisine","Bulk cooking","Food hygiene","Meal prep","Traditional recipes"}'
  WHERE id = '1ca89631-bde8-44d9-b6ab-df609ee361d0';   -- chaitanya  (→ J09 Biryani, J10 South Indian)

UPDATE users SET skills = '{"Loading","Unloading","Warehouse operations","Stock counting","Forklift","Physical stamina"}'
  WHERE id = '36728fc3-2192-4dbc-bcfa-8789ab6cf8f3';   -- abhiram  (→ J15 Warehouse, J16 Cold Storage)

UPDATE users SET skills = '{"Security guard","CCTV monitoring","Night patrol","Access control","Report writing","Crowd management"}'
  WHERE id = '438fd067-cdaf-4223-8ec3-76f8778c1ccc';   -- KURASALA HARSHA VARDHAN  (→ J28 Guard, J30 CCTV)

UPDATE users SET skills = '{"Electrician","House wiring","AC repair","Solar installation","MCB fitting","Appliance diagnostics"}'
  WHERE id = '8f10d8a9-3297-45a0-9892-6ea66a791a82';   -- Kolli Sriram  (→ J05 Electrician, J06 AC Tech)

UPDATE users SET skills = '{"Data entry","MS Office","Excel","Typing 60wpm","Documentation","Reception","Customer service"}'
  WHERE id = 'c260ec0e-ec97-42e7-aefc-a7b46a4750b8';   -- Adithya  (→ J24 Receptionist, J30 CCTV Operator)

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2 — WORKER PROFILES  (20 workers)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO worker_profiles (user_id, skills, availability, experience, categories, location, bio) VALUES

-- ── Category 1: Construction & Infrastructure ─────────────────────
('11111111-0001-0001-0001-000000000001',
 '{"Plumbing","Pipe fitting","Sanitary installation","Water tank repair","Basic welding","Leak detection"}',
 'Morning 6am-12pm, Evening 4pm-8pm',
 '5 years plumbing in residential and commercial buildings. CPVC and UPVC piping.',
 '{"Construction","Plumbing","Maintenance"}',
 'Vijayawada, Andhra Pradesh',
 'Experienced plumber for urgent repairs and new installations. Safety-conscious, work guaranteed.'),

('11111111-0001-0001-0001-000000000005',
 '{"Carpentry","Furniture assembly","Wood polish","Modular kitchen","Door fitting","Interior woodwork"}',
 'Weekdays 9am-6pm',
 '10 years carpentry with 200+ residential and commercial projects',
 '{"Construction","Carpentry","Interior"}',
 'Vijayawada, Andhra Pradesh',
 'Master carpenter specialising in modular kitchens and premium interior woodwork. Material warranty on all projects.'),

('11111111-0001-0001-0001-000000000009',
 '{"Interior painting","Wall texture","Waterproofing","Putty application","POP work","Roller painting"}',
 'Mon-Sat, full day available',
 '8 years interior & exterior painting in residential complexes and commercial sites',
 '{"Construction","Painting","Interior"}',
 'Nellore, Andhra Pradesh',
 'Professional painter expert in decorative textures and waterproofing on high-rise buildings. Own spray equipment.'),

('11111111-0001-0001-0001-000000000013',
 '{"Electrician","House wiring","Panel board","Solar installation","MCB fitting","Earthing"}',
 'Morning 8am-2pm',
 '7 years electrical work — domestic wiring, solar panels, and appliance installation. ITI certified.',
 '{"Construction","Electrical","Solar"}',
 'Karimnagar, Telangana',
 'Certified electrician specialising in solar rooftop systems and new house wiring. Safety-first approach.'),

('11111111-0001-0001-0001-000000000019',
 '{"Masonry","Brick laying","Plastering","Tiling","Construction labour","Cement mixing"}',
 'Full day, any day',
 '12 years construction — single houses, apartments, and commercial sites',
 '{"Construction","Masonry","Labour"}',
 'Kurnool, Andhra Pradesh',
 'Experienced mason for all structural work. Can lead teams of 5-10 labourers. Own trowels and tools.'),

-- ── Category 2: Food & Hospitality ────────────────────────────────
('11111111-0001-0001-0001-000000000002',
 '{"Cooking","Catering","Bulk cooking","Andhra cuisine","Menu planning","Food hygiene","North Indian"}',
 'Full day available',
 '8 years catering — weddings (up to 3000 guests), corporate events, and cloud kitchens',
 '{"Cooking","Catering","Food & Hospitality"}',
 'Guntur, Andhra Pradesh',
 'Expert in Andhra, Mughlai and Continental cuisines. Team management for large events. FSSAI aware.'),

('11111111-0001-0001-0001-000000000014',
 '{"Cooking","Tiffin service","Meal prep","Traditional recipes","South Indian cuisine","Hygiene management"}',
 'Morning 6am-10am',
 '10 years home cooking and tiffin service for offices and families',
 '{"Cooking","Catering","Food & Hospitality"}',
 'Guntur, Andhra Pradesh',
 'Reliable home cook — healthy, hygienic Andhra meals. Long-term tiffin contracts preferred. 50+ regular clients.'),

-- ── Category 3: Logistics & Transport ─────────────────────────────
('11111111-0001-0001-0001-000000000003',
 '{"LMV driving","HMV driving","Route planning","GPS navigation","Logistics coordination","Vehicle maintenance"}',
 'Night shifts preferred 10pm-6am, flexible for day',
 '7 years driving — LMV city delivery, HMV interstate logistics. Clean chalan record.',
 '{"Driving","Logistics","Delivery"}',
 'Hyderabad, Telangana',
 'Licensed driver (LMV + HMV) with spotless record. Experienced in courier, food delivery, and long-haul logistics.'),

('11111111-0001-0001-0001-000000000011',
 '{"Loading","Unloading","Warehouse operations","Forklift","Stock counting","Inventory management"}',
 'Full day, rotational shifts',
 '5 years warehouse operations — receiving, sorting, inventory, forklift licensed',
 '{"Warehouse","Logistics","Labour"}',
 'Kakinada, Andhra Pradesh',
 'Strong warehouse worker comfortable with heavy lifting, barcode scanning, and inventory systems.'),

('11111111-0001-0001-0001-000000000015',
 '{"Gardening","Landscaping","Plant care","Farm labour","Harvesting","Nursery work"}',
 'Morning 6am-10am',
 '4 years gardening + 2 seasons farm harvest work',
 '{"Agriculture","Gardening","Outdoor"}',
 'Vizag, Andhra Pradesh',
 'Hardworking outdoor labourer. Comfortable with seasonal farm work and urban landscaping.'),

-- ── Category 4: Healthcare & Wellness ─────────────────────────────
('11111111-0001-0001-0001-000000000012',
 '{"Nursing","ICU assistance","IV cannula","Wound dressing","Vital monitoring","Patient care","GNM certified"}',
 'Day shift 7am-7pm',
 '6 years nursing at government hospital — ICU, wards, home care. GNM registered.',
 '{"Healthcare","Nursing","Medical"}',
 'Hyderabad, Telangana',
 'GNM-qualified nurse with ICU and general ward experience. Registered with AP Nursing Council. Available immediately.'),

('11111111-0001-0001-0001-000000000004',
 '{"Cleaning","Housekeeping","Hospital hygiene","Baby care","Utensil washing","Floor mopping"}',
 'Morning 7am-1pm only',
 '3 years domestic work + hospital housekeeping internship',
 '{"Housekeeping","Healthcare Support","Cleaning"}',
 'Secunderabad, Telangana',
 'Trustworthy domestic helper with hospital hygiene knowledge. Looking for part-time morning work.'),

('11111111-0001-0001-0001-000000000016',
 '{"Beautician","Bridal makeup","Mehendi","Hair styling","Waxing","Facial","Nail art"}',
 'Flexible, Sundays off',
 '5 years at premium salons + 100+ bridal events. Certified in cosmetology.',
 '{"Beauty","Wellness","Grooming"}',
 'Hyderabad, Telangana',
 'Certified beautician — bridal packages, HD makeup, airbrush technique. Home visits available. Premium products.'),

-- ── Category 5: Textiles, Security & Office ───────────────────────
('11111111-0001-0001-0001-000000000006',
 '{"Tailoring","Embroidery","Dress making","Industrial sewing","Blouse stitching","Kurta stitching"}',
 'Flexible, prefer mornings',
 '6 years tailoring — ITI trained. Expert on industrial machines.',
 '{"Tailoring","Textiles","Fashion"}',
 'Tirupati, Andhra Pradesh',
 'Skilled tailor for women''s traditional wear and garment factory work. 40+ pieces/day on industrial machine.'),

('11111111-0001-0001-0001-000000000007',
 '{"Security guard","CCTV monitoring","Night patrol","Access control","Report writing","Crowd management"}',
 'Night 10pm-6am preferred',
 '4 years — mall security, apartment complex, CCTV monitoring. NCC B cert.',
 '{"Security","Safety","Surveillance"}',
 'Warangal, Telangana',
 'Disciplined security professional. NCC trained. Well-spoken, maintained logs and incident reports.'),

('11111111-0001-0001-0001-000000000008',
 '{"Data entry","MS Office","Excel","Typing 60wpm","Tally basic","Documentation","Filing"}',
 'Morning 9am-1pm or Evening 2pm-6pm',
 '4 years data entry, office assistance, and MIS reporting',
 '{"Computer","Data Entry","Office"}',
 'Hyderabad, Telangana',
 'Efficient data entry operator — 60 wpm accuracy. Excel MIS reports and Tally basics for small businesses.'),

('11111111-0001-0001-0001-000000000010',
 '{"Reception","Customer service","Front desk","Billing","Telephone handling","Appointment scheduling"}',
 '9am-6pm weekdays',
 '3 years front desk at hotel and hospital. Fluent Telugu, Hindi, English.',
 '{"Reception","Hospitality","Customer Service"}',
 'Hyderabad, Telangana',
 'Well-presented professional with strong communication skills. Comfortable with billing software.'),

('11111111-0001-0001-0001-000000000018',
 '{"Weaving","Fabric quality check","Loom operation","Pattern reading","Textile inspection","Handloom"}',
 'Full day weekdays',
 '8 years handloom weaver — government training center certified. Traditional Andhra cotton designs.',
 '{"Textiles","Manufacturing","Quality"}',
 'Guntur, Andhra Pradesh',
 'Master weaver specialising in traditional handloom cotton. Consistent quality, fast output.'),

('11111111-0001-0001-0001-000000000020',
 '{"Accounting","GST filing","Tally ERP","TDS","Bank reconciliation","Payroll","Purchase entries"}',
 '10am-5pm weekdays',
 '6 years in CA firm + freelance business accounting. B.Com graduate.',
 '{"Accounting","Finance","Office"}',
 'Hyderabad, Telangana',
 'B.Com + Tally ERP expert. Freelance GST, income tax filing, and payroll services. Agro + retail client experience.'),

('11111111-0001-0001-0001-000000000017',
 '{"AC repair","Refrigerator repair","Washing machine repair","Appliance diagnostics","Electrical troubleshooting"}',
 'Full day, any day',
 '6 years appliance technician at authorised service centre. Brand-certified.',
 '{"Technical","AC Repair","Appliance","Electrical"}',
 'Hyderabad, Telangana',
 'Certified technician for all major brands — LG, Samsung, Voltas, Whirlpool. Same-day service. Own tools and vehicle.');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3 — EMPLOYER PROFILES  (10 employers)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO employer_profiles (user_id, business_name, organization_name, location, business_type, description) VALUES
('22222222-0002-0002-0002-000000000001','Agarwal Construction Pvt Ltd','Agarwal Group','Vijayawada, Andhra Pradesh','Construction','Residential, commercial and infrastructure construction across AP for 15+ years. 200+ projects delivered.'),
('22222222-0002-0002-0002-000000000002','Nair Caterers & Events','Nair Family Enterprises','Hyderabad, Telangana','Food & Catering','Full-service catering for weddings, corporate events and parties. Team of 30+ cooks and helpers.'),
('22222222-0002-0002-0002-000000000003','Mehta Logistics Solutions','Mehta Group','Hyderabad, Telangana','Logistics & Delivery','End-to-end logistics with 50+ vehicle fleet. Specialising in Tier-2 last-mile delivery.'),
('22222222-0002-0002-0002-000000000004','Shree Textiles','Shree Industries','Guntur, Andhra Pradesh','Textiles & Manufacturing','Handloom cotton textile manufacturer with 200 looms. Exporting to Europe and USA.'),
('22222222-0002-0002-0002-000000000005','Joshi Electricals','Joshi Enterprises','Warangal, Telangana','Electrical Services','Authorised dealer and service centre for electrical appliances, solar panels and EV charging.'),
('22222222-0002-0002-0002-000000000006','Chandrasekhar Hospitals','CSK Healthcare Pvt Ltd','Warangal, Telangana','Healthcare','150-bed multi-specialty hospital with 24/7 emergency, ICU, maternity and OPD.'),
('22222222-0002-0002-0002-000000000007','Bhandari Security Services','BSS Pvt Ltd','Hyderabad, Telangana','Security Services','ISO-certified security — trained guards for malls, hospitals, apartments and warehouses.'),
('22222222-0002-0002-0002-000000000008','Usha Beauty Academy','Usha Wellness Pvt Ltd','Hyderabad, Telangana','Beauty & Wellness','Beauty parlour chain (3 outlets) + professional cosmetology training academy.'),
('22222222-0002-0002-0002-000000000009','Naidu Farms & Agro','Naidu Group','Kurnool, Andhra Pradesh','Agriculture','500-acre farm + cold storage + food processing + export. Integrated agro-business.'),
('22222222-0002-0002-0002-000000000010','Begum Cloud Kitchen','Begum Foods Pvt Ltd','Hyderabad, Telangana','Food & Beverage','Multi-brand cloud kitchen — 5 brands on Swiggy/Zomato. 200+ food orders daily.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4 — 30 JOBS  (5 categories × 6 each)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO jobs (id, employer_id, title, description, job_type, category, required_skills,
                  location, latitude, longitude, pay, pay_amount, pay_type, payment_status,
                  escrow_amount, escrow_required, timing, duration, experience_required,
                  requirements, benefits, slots, start_date, status, application_count, views,
                  created_at)
VALUES

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  CATEGORY 1 — CONSTRUCTION & INFRASTRUCTURE  (J01-J06)                     │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J01  Site Plumber – Residential Project  (Agarwal)                 FILLED
('44444444-0004-0004-0004-000000000001','22222222-0002-0002-0002-000000000001',
 'Site Plumber – Residential Project',
 'Experienced plumbers for ongoing 3-tower residential apartment construction in Vijayawada. Laying CPVC/UPVC pipes, fitting sanitary ware, pressure testing, compliance with building norms. Large-scale site with professional supervision.',
 'gig','Construction & Infrastructure',
 '{"Plumbing","Pipe fitting","Sanitary installation","Pressure testing","Leak detection"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 650,650,'hourly','locked',5200,true,
 '8am-6pm Monday-Saturday','3 months','intermediate',
 'ITI certificate preferred. Safety shoes and helmet mandatory. 3+ years residential plumbing.',
 'Lunch provided. Safety gear supplied. Performance bonus on project completion.',
 3,'2026-03-01','filled',2,265,
 '2026-02-10T09:00:00Z'),

-- J02  Mason / Bricklayer – Commercial Building  (Agarwal)           ACTIVE
('44444444-0004-0004-0004-000000000002','22222222-0002-0002-0002-000000000001',
 'Mason / Bricklayer – Commercial Building',
 'Experienced masons needed for a 5-storey commercial complex. Brick laying, plastering, tiling, and reinforced concrete finishing under a site engineer.',
 'gig','Construction & Infrastructure',
 '{"Masonry","Brick laying","Plastering","Tiling","Cement mixing"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 600,600,'hourly','locked',4800,true,
 '7am-5pm, 6 days/week','6 months','intermediate',
 '5+ years commercial construction. Physically fit. Own trowel/tools preferred.',
 'Overtime pay. Safety gear provided. Sunday off.',
 5,'2026-03-01','active',2,310,
 '2026-02-12T08:30:00Z'),

-- J03  Carpenter – Modular Kitchen Installation  (Agarwal)           ACTIVE (accepted)
('44444444-0004-0004-0004-000000000003','22222222-0002-0002-0002-000000000001',
 'Carpenter – Modular Kitchen Installation',
 'Expert carpenter required to install modular kitchens in 15 new apartments. Materials pre-cut; assembly, fitting, and wood polish needed. Quality finish is critical.',
 'gig','Construction & Infrastructure',
 '{"Carpentry","Modular kitchen","Furniture assembly","Wood polish","Door fitting"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 800,800,'hourly','locked',6400,true,
 '9am-5pm weekdays','2 months','intermediate',
 'Modular kitchen installation experience essential. Precision measurement skills.',
 'Materials + fixings provided. Lunch allowance. Bonus for early completion.',
 2,'2026-03-05','active',1,189,
 '2026-02-14T10:00:00Z'),

-- J04  Interior Painter – Flat Renovation  (Agarwal)                 COMPLETED ★
('44444444-0004-0004-0004-000000000004','22222222-0002-0002-0002-000000000001',
 'Interior Painter – 20-Flat Renovation',
 'Interior painting of 20 apartments in an existing complex. Putty application, primer, two coats emulsion (Asian Paints). Roller and brush work on walls and ceilings. Neat and timely finish required.',
 'gig','Construction & Infrastructure',
 '{"Interior painting","Putty application","Roller painting","Waterproofing","POP work"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 600,600,'hourly','released',4800,false,
 '8am-6pm, 6 days','45 days','intermediate',
 '3+ years interior painting. Comfortable with heights. Attention to detail.',
 'Lunch provided. All materials supplied. Quality bonus ₹3000.',
 4,'2026-01-10','completed',2,482,
 '2026-01-05T07:00:00Z'),

-- J05  Electrician – New House Wiring  (Joshi)                       ACTIVE
('44444444-0004-0004-0004-000000000005','22222222-0002-0002-0002-000000000005',
 'Electrician – New House Wiring',
 'Electrician for wiring 5 independent houses. Conduit laying, switch board fitting, fan/light point wiring, earthing. All materials supplied.',
 'gig','Construction & Infrastructure',
 '{"Electrician","House wiring","Panel board","MCB fitting","Earthing"}',
 'Warangal, Telangana',17.9784,79.5941,
 700,700,'hourly','locked',5600,true,
 '8am-5pm','20 working days','intermediate',
 'ITI Electrician trade. Experience in new construction wiring. Safety-conscious.',
 'Materials provided. Tea + lunch. Tool allowance.',
 2,'2026-03-10','active',2,176,
 '2026-02-15T08:00:00Z'),

-- J06  AC & Appliance Service Technician  (Joshi)                    ACTIVE (accepted)
('44444444-0004-0004-0004-000000000006','22222222-0002-0002-0002-000000000005',
 'Field Service Technician – AC & Appliances',
 'Doorstep repair of ACs, refrigerators and washing machines. Diagnose faults, replace parts, test - handle 8+ calls/day across Warangal city. Own vehicle preferred.',
 'full-time','Construction & Infrastructure',
 '{"AC repair","Refrigerator repair","Appliance diagnostics","Electrical troubleshooting","Customer handling"}',
 'Warangal, Telangana',17.9784,79.5941,
 16000,16000,'fixed','locked',16000,true,
 '9am-6pm, 6 days','Permanent','intermediate',
 'ITI or equivalent. 2+ years appliance service. Own vehicle preferred.',
 'Petrol allowance ₹2000. Uniform + tools. Commission ₹50/call above target.',
 2,'2026-03-05','active',1,234,
 '2026-02-13T09:00:00Z'),

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  CATEGORY 2 — FOOD & HOSPITALITY  (J07-J12)                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J07  Event Cook – Wedding Season  (Nair)                           COMPLETED ★
('44444444-0004-0004-0004-000000000007','22222222-0002-0002-0002-000000000002',
 'Event Cook – Wedding Season',
 'Hiring experienced cooks for wedding season. Prepare Andhra and North Indian dishes in bulk (500-2000 guests). You lead a team of 5 helpers per event. Quality, speed and hygiene are non-negotiable.',
 'gig','Food & Hospitality',
 '{"Bulk cooking","Andhra cuisine","North Indian","Food hygiene","Team coordination","Menu planning"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 800,800,'hourly','released',6400,false,
 'Event-based, evenings and weekends','March-June 2026','intermediate',
 '5+ years bulk cooking. FSSAI/food safety certificate preferred.',
 'Transport to venue. Meals included. Tip sharing.',
 8,'2026-01-15','completed',2,440,
 '2026-01-10T07:00:00Z'),

-- J08  Catering Helper – Kitchen Assistant  (Nair)                   ACTIVE
('44444444-0004-0004-0004-000000000008','22222222-0002-0002-0002-000000000002',
 'Catering Helper – Kitchen Assistant',
 'Kitchen helper for event catering. Chopping, utensil washing, serving, maintaining cleanliness. Hard work in fast-paced environment.',
 'gig','Food & Hospitality',
 '{"Kitchen assistance","Utensil washing","Food hygiene","Physical stamina","Cleaning"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 400,400,'hourly','locked',3200,true,
 'Event-based, flexible','March-June 2026','entry',
 'No experience needed. Willingness to work hard. Punctual and clean.',
 'Transport + meals. Regular work during season.',
 10,'2026-03-15','active',1,198,
 '2026-02-18T10:00:00Z'),

-- J09  Cloud Kitchen Chef – Biryani Brand  (Begum)                   ACTIVE
('44444444-0004-0004-0004-000000000009','22222222-0002-0002-0002-000000000010',
 'Cloud Kitchen Chef – Hyderabadi Biryani',
 'Specialist biryani cook for our "Begum Biryani" brand on Swiggy/Zomato. Consistent quality in Hyderabadi dum biryani, raita, salan. 100+ orders/day. Speed and consistency critical.',
 'full-time','Food & Hospitality',
 '{"Cooking","Bulk cooking","Andhra cuisine","Food hygiene","Speed","Consistency"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 18000,18000,'fixed','locked',18000,true,
 '6am-3pm or 12pm-9pm','Permanent','intermediate',
 '3+ years commercial cooking. Biryani specialisation. Food safety awareness.',
 'ESI + PF. Meals on duty. Incentive on 4.5+ Zomato rating. Fast promotion.',
 2,'2026-03-01','active',2,356,
 '2026-02-15T06:00:00Z'),

-- J10  Cloud Kitchen Cook – South Indian Tiffins  (Begum)            ACTIVE (accepted)
('44444444-0004-0004-0004-000000000010','22222222-0002-0002-0002-000000000010',
 'Cloud Kitchen Cook – South Indian Tiffins',
 'Cook for our "Amma Tiffins" brand delivering idli, dosa, vada, pongal, pesarattu daily. Morning shift - consistent taste across 80+ orders. Traditional recipes only.',
 'full-time','Food & Hospitality',
 '{"Cooking","South Indian cuisine","Traditional recipes","Meal prep","Food hygiene","Speed"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 15000,15000,'fixed','locked',15000,true,
 '4am-12pm (morning shift)','Permanent','intermediate',
 'Proven South Indian cooking. Consistency and speed. Hygiene-first mindset.',
 'ESI + PF. Free meals. Quarterly bonus on ratings.',
 2,'2026-03-01','active',1,287,
 '2026-02-16T06:00:00Z'),

-- J11  Kitchen Helper – Cloud Kitchen  (Begum)                       ACTIVE
('44444444-0004-0004-0004-000000000011','22222222-0002-0002-0002-000000000010',
 'Kitchen Helper – Cloud Kitchen',
 'Kitchen helper — vegetable prep, dish washing, packing delivery orders, floor cleanliness, assisting cooks during peak hours. Fast-paced environment.',
 'full-time','Food & Hospitality',
 '{"Kitchen assistance","Food packing","Cleaning","Physical stamina","Speed"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 10000,10000,'fixed','locked',10000,true,
 '6am-3pm or 12pm-9pm','Permanent','entry',
 'Minimum 8th pass. Hard-working and punctual. Food handling hygiene.',
 'ESI. Meals provided. Stable income.',
 6,'2026-03-01','active',1,215,
 '2026-02-17T06:00:00Z'),

-- J12  Food Delivery Executive  (Begum)                              ACTIVE
('44444444-0004-0004-0004-000000000012','22222222-0002-0002-0002-000000000010',
 'Food Delivery Executive',
 'Delivery executives for cloud kitchen food orders across Hyderabad. Own bike required. 50-80 deliveries/day. App-based routing.',
 'full-time','Food & Hospitality',
 '{"LMV driving","GPS navigation","Time management","Customer handling","Physical stamina"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 15000,15000,'fixed','locked',15000,true,
 '10am-4pm or 3pm-11pm','Permanent','entry',
 'Own motorcycle + valid DL. Smartphone with data. Knowledge of Hyderabad areas.',
 'Fuel allowance ₹3000. Per-delivery incentive. Up to ₹20000/month.',
 10,'2026-03-01','active',1,498,
 '2026-02-18T08:00:00Z'),

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  CATEGORY 3 — LOGISTICS & TRANSPORT  (J13-J18)                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J13  LMV Delivery Driver – Last Mile  (Mehta)                      FILLED
('44444444-0004-0004-0004-000000000013','22222222-0002-0002-0002-000000000003',
 'Delivery Driver – LMV Last Mile',
 'Last-mile delivery driver for Hyderabad. Operate company Bolero or Tata Ace — 50-80 parcels/day. Route optimisation via app. City knowledge essential.',
 'full-time','Logistics & Transport',
 '{"LMV driving","GPS navigation","Route planning","Time management","Vehicle maintenance"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 18000,18000,'fixed','locked',18000,true,
 'Shift A: 7am-4pm  |  Shift B: 2pm-10pm','Permanent','intermediate',
 'Valid LMV license. Smartphone required. 2+ years city driving. Clean record.',
 'PF + ESI. Petrol allowance. Monthly target incentives up to ₹5000.',
 5,'2026-03-01','filled',1,420,
 '2026-02-11T07:00:00Z'),

-- J14  HMV Truck Driver – Interstate  (Mehta)                        ACTIVE
('44444444-0004-0004-0004-000000000014','22222222-0002-0002-0002-000000000003',
 'HMV Truck Driver – Interstate Routes',
 'Interstate goods transportation between Hyderabad, Vijayawada, Chennai, and Bangalore. Trip-based — well-paying freelance opportunity for experienced HMV drivers.',
 'freelance','Logistics & Transport',
 '{"HMV driving","Interstate driving","Night driving","Vehicle maintenance","Route planning"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 900,900,'hourly','pending',0,true,
 'Trip-based, flexible schedule','Ongoing','intermediate',
 'Valid HMV license. 5+ years interstate. Clean chalan. Fitness certificate.',
 'Per-trip pay. Fuel + toll covered. Rest house accommodation.',
 2,'2026-03-01','active',1,189,
 '2026-02-19T08:00:00Z'),

-- J15  Warehouse Associate – Loading/Unloading  (Mehta)              ACTIVE (accepted)
('44444444-0004-0004-0004-000000000015','22222222-0002-0002-0002-000000000003',
 'Warehouse Associate – Loading & Unloading',
 'Distribution centre in Uppal, Hyderabad. Receiving shipments, unloading trucks, sorting parcels, barcode scanning, stock records. Physically demanding.',
 'full-time','Logistics & Transport',
 '{"Loading","Unloading","Warehouse operations","Forklift","Stock counting","Inventory management"}',
 'Hyderabad, Telangana',17.4126,78.4071,
 14000,14000,'fixed','locked',14000,true,
 'Rotational shifts (Day 6am-2pm / Night 2pm-10pm)','Permanent','entry',
 'Minimum 10th pass. Physically fit. Comfortable with scanning apps.',
 'ESI + PF. Canteen. Uniform. Overtime pay at 1.5x.',
 8,'2026-03-01','active',1,387,
 '2026-02-12T09:00:00Z'),

-- J16  Cold Storage Supervisor  (Naidu)                              ACTIVE
('44444444-0004-0004-0004-000000000016','22222222-0002-0002-0002-000000000009',
 'Cold Storage Supervisor',
 'Supervisor for our cold storage facility. Temperature monitoring, inventory tracking, receiving/dispatching produce, hygiene compliance. Computer literacy required.',
 'full-time','Logistics & Transport',
 '{"Cold storage","Temperature monitoring","Inventory management","Forklift","Documentation"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 16000,16000,'fixed','locked',16000,true,
 '6am-2pm or 2pm-10pm','Permanent','intermediate',
 'Warehouse or cold storage experience. Computer basics. Forklift license preferred.',
 'ESI + PF. Accommodation available. Quarterly bonus.',
 1,'2026-03-15','active',1,97,
 '2026-02-20T07:00:00Z'),

-- J17  Farm Worker – Harvest Season  (Naidu)                         ACTIVE
('44444444-0004-0004-0004-000000000017','22222222-0002-0002-0002-000000000009',
 'Farm Worker – Chilli & Cotton Harvest',
 'Seasonal farm workers for chilli and cotton harvest at our 500-acre farm. Picking, sorting, weighing, loading. Accommodation on-site.',
 'gig','Logistics & Transport',
 '{"Farm labour","Harvesting","Physical stamina","Outdoor work","Loading"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 450,450,'hourly','locked',3600,true,
 '6am-12pm and 3pm-6pm','Oct-Dec (seasonal)','entry',
 'Physical fitness. Outdoor work in sun. Basic farm knowledge.',
 'Accommodation + 3 meals daily. Bonus on harvest completion.',
 20,'2026-10-01','active',2,143,
 '2026-02-22T06:00:00Z'),

-- J18  Accounts Assistant – Farm Business  (Naidu)                   ACTIVE (accepted)
('44444444-0004-0004-0004-000000000018','22222222-0002-0002-0002-000000000009',
 'Accounts Assistant – Agro Business',
 'Day-to-day accounting for integrated agro-business. Purchase entries, sales invoicing, GST returns, bank reconciliation, payroll for 30+ farm workers.',
 'full-time','Logistics & Transport',
 '{"Tally ERP","GST filing","Accounting","Bank reconciliation","Payroll","Purchase entries"}',
 'Kurnool, Andhra Pradesh',15.8281,78.0373,
 16000,16000,'fixed','locked',16000,true,
 '9am-5pm weekdays','Permanent','intermediate',
 'B.Com with Tally ERP. 2+ years accounting. GST filing experience mandatory.',
 'ESI + PF. Accommodation. Annual increment + bonus.',
 1,'2026-03-10','active',1,145,
 '2026-02-14T07:00:00Z'),

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  CATEGORY 4 — HEALTHCARE & WELLNESS  (J19-J24)                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J19  Staff Nurse – General Ward  (Chandrasekhar)                   COMPLETED ★
('44444444-0004-0004-0004-000000000019','22222222-0002-0002-0002-000000000006',
 'Staff Nurse – General Ward',
 'GNM/B.Sc Nursing qualified nurse for our 150-bed general ward. Patient monitoring, IV administration, dressing, doctor coordination. 3-rotation shift system.',
 'full-time','Healthcare & Wellness',
 '{"Nursing","Patient care","IV cannula","Wound dressing","Vital monitoring","GNM certified"}',
 'Warangal, Telangana',17.9784,79.5941,
 20000,20000,'fixed','released',20000,false,
 '8-hour shifts (Day/Evening/Night)','Permanent','intermediate',
 'GNM or B.Sc Nursing, registered with AP Nursing Council. 2+ years preferred.',
 'Campus accommodation. ESI + PF. Annual increment. Skill training.',
 4,'2026-01-01','completed',1,390,
 '2025-12-20T08:00:00Z'),

-- J20  Hospital Housekeeping Staff  (Chandrasekhar)                  ACTIVE
('44444444-0004-0004-0004-000000000020','22222222-0002-0002-0002-000000000006',
 'Hospital Housekeeping Staff',
 'Housekeeping in wards, OT, ICU and common areas. Must follow infection control protocols. Cleaning, disinfection, linen management, biomedical waste handling.',
 'full-time','Healthcare & Wellness',
 '{"Housekeeping","Hospital hygiene","Cleaning","Floor mopping","Infection control"}',
 'Warangal, Telangana',17.9784,79.5941,
 11000,11000,'fixed','locked',11000,true,
 'Shift: 8am-4pm or 2pm-10pm','Permanent','entry',
 'Minimum 8th pass. Infection control training provided. Hospital experience preferred.',
 'ESI. Uniform + equipment. Duty meals. Training certificate.',
 6,'2026-03-01','active',1,302,
 '2026-02-13T08:00:00Z'),

-- J21  Nursing Attendant – ICU Support  (Chandrasekhar)              ACTIVE
('44444444-0004-0004-0004-000000000021','22222222-0002-0002-0002-000000000006',
 'Nursing Attendant – ICU Support',
 'ICU support — patient hygiene, turning, feeding, vital monitoring under nurse supervision, ward equipment maintenance. Sensitive role requiring calmness.',
 'full-time','Healthcare & Wellness',
 '{"Patient care","ICU assistance","Vital monitoring","Hospital hygiene","Physical stamina"}',
 'Warangal, Telangana',17.9784,79.5941,
 14000,14000,'fixed','locked',14000,true,
 '8-hour shifts, 3 rotations','Permanent','entry',
 'Nursing attendant certificate or 1 year hospital experience.',
 'ESI. Training. Accommodation. Duty meals.',
 5,'2026-03-01','active',1,198,
 '2026-02-16T10:00:00Z'),

-- J22  Beautician – Parlour Staff  (Usha)                           FILLED
('44444444-0004-0004-0004-000000000022','22222222-0002-0002-0002-000000000008',
 'Beautician – Parlour Staff',
 'Hiring beauticians for Hyderabad outlets. Facials, threading, waxing, bridal packages, hair styling, nail art. Premium product knowledge required.',
 'full-time','Healthcare & Wellness',
 '{"Beautician","Facial","Waxing","Hair styling","Bridal makeup","Nail art"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 15000,15000,'fixed','locked',15000,true,
 '10am-8pm, 6 days','Permanent','intermediate',
 'Beauty diploma or 2+ years. Pleasant personality. Knowledge of L''Oreal / Lakme products.',
 'Commission on services. Product training. Growth to senior stylist.',
 3,'2026-03-01','filled',1,334,
 '2026-02-10T09:00:00Z'),

-- J23  Bridal Makeup Artist – Freelance  (Usha)                     ACTIVE
('44444444-0004-0004-0004-000000000023','22222222-0002-0002-0002-000000000008',
 'Bridal Makeup Artist – Freelance',
 'Freelance bridal makeup for weekend/season bookings. HD + airbrush technique, South & North Indian bridal styles, saree draping support.',
 'freelance','Healthcare & Wellness',
 '{"Bridal makeup","Mehendi","Hair styling","Waxing","Facial","Nail art"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 3500,3500,'fixed','pending',0,true,
 'Weekends and wedding season','Ongoing freelance','intermediate',
 'Portfolio required. Own kit preferred. Experience with multiple bridal styles.',
 'Per-booking payment. Conveyance. High season earnings ₹50000+/month.',
 5,'2026-03-01','active',1,211,
 '2026-02-17T10:00:00Z'),

-- J24  Receptionist – Beauty Academy  (Usha)                        ACTIVE (accepted)
('44444444-0004-0004-0004-000000000024','22222222-0002-0002-0002-000000000008',
 'Receptionist – Beauty Academy',
 'Receptionist for Usha Beauty Academy — student admissions, appointment scheduling, billing, phone calls, academy records. Well-presented and pleasant.',
 'full-time','Healthcare & Wellness',
 '{"Reception","Customer service","Appointment scheduling","Billing","Telephone handling"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 13000,13000,'fixed','locked',13000,true,
 '9am-7pm, 6 days','Permanent','entry',
 '12th pass minimum. Telugu + Hindi + basic English. Computer & billing software basics.',
 'ESI. Free beauty training. Stable environment.',
 1,'2026-03-01','active',2,223,
 '2026-02-14T09:00:00Z'),

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  CATEGORY 5 — TEXTILES, SECURITY & OFFICE SERVICES  (J25-J30)             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J25  Handloom Weaver – Traditional Cotton  (Shree)                 COMPLETED ★
('44444444-0004-0004-0004-000000000025','22222222-0002-0002-0002-000000000004',
 'Handloom Weaver – Traditional Cotton',
 'Experienced weavers for our Guntur handloom facility. Operate pit looms for high-quality cotton fabrics. Traditional Andhra patterns. Consistent quality at target pace.',
 'full-time','Textiles, Security & Office',
 '{"Weaving","Loom operation","Pattern reading","Fabric quality check","Handloom","Textile inspection"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 12000,12000,'fixed','released',12000,false,
 '8am-5pm, 6 days','Permanent','intermediate',
 '5+ years handloom experience. Traditional Andhra cotton designs.',
 'ESI + PF. Accommodation. Festival bonus.',
 4,'2026-01-10','completed',1,245,
 '2025-12-28T07:00:00Z'),

-- J26  Tailor – Garment Factory  (Shree)                             ACTIVE (accepted)
('44444444-0004-0004-0004-000000000026','22222222-0002-0002-0002-000000000004',
 'Tailor – Garment Factory',
 'Industrial tailors for women''s kurtas, blouses, and salwar sets. Production targets of 30-40 pieces/day on industrial sewing machines. Quality + speed.',
 'full-time','Textiles, Security & Office',
 '{"Tailoring","Industrial sewing","Kurta stitching","Blouse stitching","Dress making"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 12000,12000,'fixed','locked',12000,true,
 '8am-5pm weekdays','Permanent','intermediate',
 '2+ years industrial tailoring. Meet daily production targets.',
 'ESI + PF. Festival bonus. Piece-rate bonus above target.',
 6,'2026-03-10','active',1,276,
 '2026-02-15T08:00:00Z'),

-- J27  Textile Quality Inspector  (Shree)                            ACTIVE
('44444444-0004-0004-0004-000000000027','22222222-0002-0002-0002-000000000004',
 'Textile Quality Inspector',
 'QC inspector — check finished fabric for defects, measure thread count, verify colour consistency, tag quality-passed items. Eye for detail and fabric knowledge essential.',
 'full-time','Textiles, Security & Office',
 '{"Fabric quality check","Textile inspection","Pattern reading","Documentation","Handloom"}',
 'Guntur, Andhra Pradesh',16.3067,80.4365,
 14000,14000,'fixed','locked',14000,true,
 '9am-5pm weekdays','Permanent','intermediate',
 'Textile quality experience. ITI/diploma in textile technology preferred.',
 'ESI + PF. Growth to senior QC manager.',
 1,'2026-03-15','active',1,134,
 '2026-02-18T09:00:00Z'),

-- J28  Security Guard – Shopping Mall  (Bhandari)                    ACTIVE (accepted)
('44444444-0004-0004-0004-000000000028','22222222-0002-0002-0002-000000000007',
 'Security Guard – Shopping Mall',
 'Security for busy Hyderabad mall. Access control, CCTV monitoring, floor patrol, customer assistance, log records. 12-hour rotating shifts.',
 'full-time','Textiles, Security & Office',
 '{"Security guard","Access control","CCTV monitoring","Crowd management","Report writing"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 13000,13000,'fixed','locked',13000,true,
 '12-hour rotational shifts','Permanent','entry',
 '10th pass. Height 5''6" minimum. Ex-NCC/defence preferred. Background check.',
 'ESI + PF. Uniform. Night allowance ₹100/shift. Annual increment.',
 10,'2026-03-01','active',1,445,
 '2026-02-10T08:00:00Z'),

-- J29  Security Supervisor – Apartment Complex  (Bhandari)           ACTIVE
('44444444-0004-0004-0004-000000000029','22222222-0002-0002-0002-000000000007',
 'Security Supervisor – Premium Apartment',
 'Supervisor for a team of 6 guards at a luxury high-rise. Shift management, rosters, incident reporting, client meetings. Leadership required.',
 'full-time','Textiles, Security & Office',
 '{"Security guard","CCTV monitoring","Report writing","Crowd management","Access control"}',
 'Hyderabad, Telangana',17.4310,78.4380,
 18000,18000,'fixed','locked',18000,true,
 'Day 7am-7pm or Night 7pm-7am','Permanent','intermediate',
 '3+ years security experience. Leadership. Hindi + English communication.',
 'ESI + PF. Mobile reimbursement. Annual bonus.',
 1,'2026-03-10','active',1,178,
 '2026-02-20T09:00:00Z'),

-- J30  CCTV Operator – Remote Monitoring  (Bhandari)                 ACTIVE
('44444444-0004-0004-0004-000000000030','22222222-0002-0002-0002-000000000007',
 'CCTV Operator – Remote Monitoring Centre',
 'Monitor multiple camera feeds at our central monitoring hub. Detect anomalies, log incidents, alert field teams. Comfortable sitting and watching screens for long hours.',
 'full-time','Textiles, Security & Office',
 '{"CCTV monitoring","Report writing","Data entry","Documentation","Access control"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 12000,12000,'fixed','locked',12000,true,
 'Night 10pm-6am or Day 6am-2pm','Permanent','entry',
 '10th pass. Good eyesight. Computer basics. Alert and focused personality.',
 'ESI + PF. Night allowance. Stable AC-office environment.',
 4,'2026-03-01','active',2,312,
 '2026-02-16T08:00:00Z'),

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  NEW JOBS FOR REAL WORKERS  (J31-J35)                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- J31  Plumber – Apartment Maintenance  (Agarwal)                    ACTIVE  → dhanush
('44444444-0004-0004-0004-000000000031','22222222-0002-0002-0002-000000000001',
 'Plumber – Apartment Maintenance & Repair',
 'On-call plumber for a 200-flat residential complex in Vijayawada. Handle leak repairs, pipe fitting, sanitary installation, water tank maintenance, and basic welding for metal fixtures. Must respond within 30 minutes during shift hours.',
 'part-time','Construction & Infrastructure',
 '{"Plumbing","Pipe fitting","Sanitary installation","Water tank repair","Basic welding","Leak detection"}',
 'Vijayawada, Andhra Pradesh',16.5062,80.6480,
 12000,12000,'fixed','pending',12000,true,
 '8am-2pm Monday-Saturday, on-call evenings','Ongoing','entry',
 'Basic plumbing experience. CPVC/UPVC knowledge helpful. Own tools preferred. Punctual and reliable.',
 'Free lunch. Tool allowance ₹500/month. Overtime at 1.5x. Stable monthly income.',
 2,'2026-03-05','active',0,145,
 '2026-02-27T09:00:00Z'),

-- J32  South Indian Tiffin Cook – Office Catering  (Begum)           ACTIVE  → chaitanya
('44444444-0004-0004-0004-000000000032','22222222-0002-0002-0002-000000000010',
 'South Indian Tiffin Cook – Office Catering',
 'Cook fresh South Indian breakfast and lunch for daily office tiffin deliveries (50-80 boxes). Idli, dosa, pesarattu, upma, rice meals. Traditional recipes, consistent taste, and strict food hygiene required. Morning shift, bulk preparation.',
 'full-time','Food & Hospitality',
 '{"Cooking","South Indian cuisine","Bulk cooking","Food hygiene","Meal prep","Traditional recipes"}',
 'Hyderabad, Telangana',17.3850,78.4867,
 14000,14000,'fixed','pending',14000,true,
 '5am-1pm Monday-Saturday','Permanent','entry',
 'South Indian cooking experience. Consistent taste across batches. Hygiene-first mindset. Punctual for early morning shift.',
 'ESI + PF. Free meals on duty. Monthly bonus on positive reviews. Growth to head cook.',
 2,'2026-03-01','active',0,198,
 '2026-02-27T10:00:00Z'),

-- J33  Warehouse Loader – E-commerce Hub  (Mehta)                    ACTIVE  → abhiram
('44444444-0004-0004-0004-000000000033','22222222-0002-0002-0002-000000000003',
 'Warehouse Loader – E-commerce Fulfilment Hub',
 'Loading, unloading, and sorting parcels at our e-commerce fulfilment centre in Uppal. Barcode scanning, stock counting, packing, and forklift operation. Fast-paced environment with daily targets of 500+ parcels handled.',
 'full-time','Logistics & Transport',
 '{"Loading","Unloading","Warehouse operations","Stock counting","Forklift","Physical stamina"}',
 'Hyderabad, Telangana',17.4126,78.4071,
 13000,13000,'fixed','pending',13000,true,
 'Rotational shifts: Day 6am-2pm / Night 2pm-10pm','Permanent','entry',
 'Physically fit. Comfortable with handheld scanner. Basic reading/writing. Forklift experience is a plus.',
 'ESI + PF. Canteen meals. Uniform provided. Overtime at 1.5x. Festival bonus.',
 6,'2026-03-01','active',0,267,
 '2026-02-27T08:00:00Z'),

-- J34  Night Security Guard – IT Park  (Bhandari)                    ACTIVE  → KURASALA HARSHA VARDHAN + Adithya (CCTV)
('44444444-0004-0004-0004-000000000034','22222222-0002-0002-0002-000000000007',
 'Night Security Guard & CCTV Monitor – IT Park',
 'Night shift security for a premium IT park. Patrol floors, monitor 40+ CCTV feeds, maintain access control logs, write incident reports. Must be alert, disciplined, and comfortable with night work. Data entry for visitor management system.',
 'full-time','Textiles, Security & Office',
 '{"Security guard","CCTV monitoring","Night patrol","Access control","Report writing","Data entry","Crowd management"}',
 'Hyderabad, Telangana',17.4310,78.4380,
 14000,14000,'fixed','pending',14000,true,
 'Night 8pm-8am, 6 days/week','Permanent','entry',
 '10th pass minimum. Alert and disciplined. Computer basics for log entry. NCC/defence background preferred.',
 'ESI + PF. Night allowance ₹150/shift. Uniform + torch. AC guard room. Annual increment.',
 4,'2026-03-01','active',0,189,
 '2026-02-27T11:00:00Z'),

-- J35  AC & Electrical Repair Technician – Home Service  (Joshi)     ACTIVE  → Kolli Sriram
('44444444-0004-0004-0004-000000000035','22222222-0002-0002-0002-000000000005',
 'AC & Electrical Repair Technician – Home Service',
 'Doorstep AC installation, repair, and electrical troubleshooting across Warangal city. Handle split/window AC servicing, house wiring faults, MCB panel issues, and basic solar inverter checks. Own two-wheeler required for field visits. 6-8 calls/day.',
 'full-time','Construction & Infrastructure',
 '{"Electrician","AC repair","House wiring","Solar installation","MCB fitting","Appliance diagnostics"}',
 'Warangal, Telangana',17.9784,79.5941,
 15000,15000,'fixed','pending',15000,true,
 '9am-6pm, 6 days/week','Permanent','entry',
 'ITI Electrician or equivalent. AC servicing knowledge. Own two-wheeler. Customer-friendly attitude.',
 'Petrol allowance ₹2000. Tool kit provided. Commission ₹75/call above target. Brand training.',
 3,'2026-03-05','active',0,134,
 '2026-02-27T12:00:00Z');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5 — 44 APPLICATIONS  (proper skill-to-job matching)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, job_id, worker_id, status, match_score, cover_letter, created_at) VALUES

-- ── Category 1: Construction & Infrastructure ────────────────────────────────

-- J01 Plumber (FILLED) — Ravi Kumar ✓accepted, Rajendra ✗rejected
('55555555-0005-0005-0005-000000000001','44444444-0004-0004-0004-000000000001',
 '11111111-0001-0001-0001-000000000001','accepted',94,
 'I have 5 years residential plumbing experience — CPVC and UPVC piping, sanitary fittings, pressure testing. ITI certified. Can start immediately on your Vijayawada site.',
 '2026-02-11T10:00:00Z'),

('55555555-0005-0005-0005-000000000002','44444444-0004-0004-0004-000000000001',
 '11111111-0001-0001-0001-000000000013','rejected',62,
 'I am an electrician but have some plumbing knowledge from construction sites. Willing to work on plumbing if given a chance.',
 '2026-02-12T14:00:00Z'),

-- J02 Mason (ACTIVE) — Bhim pending, Arjun pending
('55555555-0005-0005-0005-000000000003','44444444-0004-0004-0004-000000000002',
 '11111111-0001-0001-0001-000000000019','pending',91,
 '12 years masonry experience including large commercial buildings. Expert in brick laying, plastering, and tiling. Own tools. Can lead a team of 5-10.',
 '2026-02-13T08:30:00Z'),

('55555555-0005-0005-0005-000000000004','44444444-0004-0004-0004-000000000002',
 '11111111-0001-0001-0001-000000000005','pending',68,
 'I am a carpenter by trade but have done masonry support work on construction sites. Can help with tiling and finishing work.',
 '2026-02-14T11:00:00Z'),

-- J03 Carpenter (ACTIVE, accepted) — Arjun ✓accepted
('55555555-0005-0005-0005-000000000005','44444444-0004-0004-0004-000000000003',
 '11111111-0001-0001-0001-000000000005','accepted',96,
 '10 years carpentry — 200+ modular kitchen installations. Precision measurement, clean finishing, own tools. Can deliver 15 kitchens in 2 months easily.',
 '2026-02-15T09:00:00Z'),

-- J04 Painter (COMPLETED) — Ramesh ✓completed, Bhim ✗rejected
('55555555-0005-0005-0005-000000000006','44444444-0004-0004-0004-000000000004',
 '11111111-0001-0001-0001-000000000009','completed',93,
 '8 years painting experience on apartment renovations. Expert putty, primer, emulsion. Neat roller work. Own spray equipment for ceilings. References available.',
 '2026-01-06T08:00:00Z'),

('55555555-0005-0005-0005-000000000007','44444444-0004-0004-0004-000000000004',
 '11111111-0001-0001-0001-000000000019','rejected',55,
 'I can do basic whitewash and primer but interior emulsion is not my specialty. Still applying in case you need helpers.',
 '2026-01-07T12:00:00Z'),

-- J05 Electrician (ACTIVE) — Rajendra pending, Ravi rejected
('55555555-0005-0005-0005-000000000008','44444444-0004-0004-0004-000000000005',
 '11111111-0001-0001-0001-000000000013','pending',92,
 'ITI Electrician — 7 years domestic wiring including new houses. Panel boards, MCB fitting, earthing, solar prep. Safety-conscious.',
 '2026-02-16T10:00:00Z'),

('55555555-0005-0005-0005-000000000009','44444444-0004-0004-0004-000000000005',
 '11111111-0001-0001-0001-000000000001','rejected',58,
 'I have basic electrical knowledge from plumbing sites — switch boards and light points. Looking to expand my skills.',
 '2026-02-16T14:00:00Z'),

-- J06 AC Technician (ACTIVE, accepted) — Ganesh ✓accepted
('55555555-0005-0005-0005-000000000010','44444444-0004-0004-0004-000000000006',
 '11111111-0001-0001-0001-000000000017','accepted',95,
 '6 years appliance service — LG, Samsung, Voltas authorised. Own bike and tools. 8+ calls/day consistently. Customer feedback 4.5+ average.',
 '2026-02-14T09:00:00Z'),

-- ── Category 2: Food & Hospitality ───────────────────────────────────────────

-- J07 Event Cook (COMPLETED) — Priya ✓completed, Meena ✗rejected
('55555555-0005-0005-0005-000000000011','44444444-0004-0004-0004-000000000007',
 '11111111-0001-0001-0001-000000000002','completed',97,
 '8 years catering — managed cooking for weddings up to 3000 guests. Expert Andhra and North Indian. Team leader for 5 helpers. FSSAI trained.',
 '2026-01-11T07:00:00Z'),

('55555555-0005-0005-0005-000000000012','44444444-0004-0004-0004-000000000007',
 '11111111-0001-0001-0001-000000000014','rejected',76,
 'I run a home tiffin service with consistent quality. Bulk cooking for events is slightly different but I can handle up to 500 guests.',
 '2026-01-12T10:00:00Z'),

-- J08 Catering Helper (ACTIVE) — Sunita pending
('55555555-0005-0005-0005-000000000013','44444444-0004-0004-0004-000000000008',
 '11111111-0001-0001-0001-000000000004','pending',72,
 'I am hardworking and experienced in utensil washing, cleaning, and kitchen assistance. Punctual and follow instructions well.',
 '2026-02-19T10:00:00Z'),

-- J09 Biryani Chef (ACTIVE) — Priya pending, Meena pending
('55555555-0005-0005-0005-000000000014','44444444-0004-0004-0004-000000000009',
 '11111111-0001-0001-0001-000000000002','pending',85,
 'Expert in Hyderabadi dum biryani. 8 years cooking experience. Fast and consistent. Hygiene is my priority. Can handle 100+ orders.',
 '2026-02-16T08:00:00Z'),

('55555555-0005-0005-0005-000000000015','44444444-0004-0004-0004-000000000009',
 '11111111-0001-0001-0001-000000000014','pending',78,
 'I cook excellent biryani for my tiffin clients. Consistent taste across batches. Willing to work full-time in a cloud kitchen.',
 '2026-02-17T09:00:00Z'),

-- J10 South Indian Cook (ACTIVE, accepted) — Meena ✓accepted
('55555555-0005-0005-0005-000000000016','44444444-0004-0004-0004-000000000010',
 '11111111-0001-0001-0001-000000000014','accepted',88,
 '10 years South Indian cooking — idli, dosa, vada, pesarattu, pongal. Traditional recipes, consistent taste. 50+ tiffin clients daily. Hygiene-first.',
 '2026-02-17T06:00:00Z'),

-- J11 Kitchen Helper (ACTIVE) — Sunita pending
('55555555-0005-0005-0005-000000000017','44444444-0004-0004-0004-000000000011',
 '11111111-0001-0001-0001-000000000004','pending',70,
 'Experienced in kitchen cleaning, chopping, and assisting cooks. Fast and hardworking. Available for full-day cloud kitchen shifts.',
 '2026-02-18T08:00:00Z'),

-- J12 Food Delivery (ACTIVE) — Irfan rejected
('55555555-0005-0005-0005-000000000018','44444444-0004-0004-0004-000000000012',
 '11111111-0001-0001-0001-000000000003','rejected',60,
 'I drive LMV and HMV but have not done two-wheeler food delivery before. Willing to learn if given a chance.',
 '2026-02-19T08:00:00Z'),

-- ── Category 3: Logistics & Transport ────────────────────────────────────────

-- J13 LMV Driver (FILLED) — Irfan ✓accepted
('55555555-0005-0005-0005-000000000019','44444444-0004-0004-0004-000000000013',
 '11111111-0001-0001-0001-000000000003','accepted',93,
 '7 years driving with valid LMV + HMV. Hyderabad roads well known. Clean driving record. Smartphone ready. Google Maps expert.',
 '2026-02-12T09:00:00Z'),

-- J14 HMV Driver (ACTIVE) — Irfan pending
('55555555-0005-0005-0005-000000000020','44444444-0004-0004-0004-000000000014',
 '11111111-0001-0001-0001-000000000003','pending',85,
 'Valid HMV license till 2031. 7 years Hyderabad-Chennai-Bangalore interstate experience. Clean chalan. Comfortable with night driving.',
 '2026-02-20T10:00:00Z'),

-- J15 Warehouse (ACTIVE, accepted) — Suresh ✓accepted
('55555555-0005-0005-0005-000000000021','44444444-0004-0004-0004-000000000015',
 '11111111-0001-0001-0001-000000000011','accepted',90,
 '5 years warehouse operations — loading, unloading, scanning, inventory. Forklift licensed. Strong and dependable. Ready for any shift.',
 '2026-02-13T08:00:00Z'),

-- J16 Cold Storage (ACTIVE) — Suresh pending (busy at warehouse)
('55555555-0005-0005-0005-000000000022','44444444-0004-0004-0004-000000000016',
 '11111111-0001-0001-0001-000000000011','pending',72,
 'I have warehouse and inventory experience which should transfer to cold storage supervision. Temperature monitoring is something I can learn quickly.',
 '2026-02-21T07:00:00Z'),

-- J17 Farm Worker (ACTIVE) — Vinod pending, Bhim pending
('55555555-0005-0005-0005-000000000023','44444444-0004-0004-0004-000000000017',
 '11111111-0001-0001-0001-000000000015','pending',78,
 '4 years gardening and nursery plus 2 seasons of harvest work. Comfortable in outdoor sun. Strong and hardworking.',
 '2026-02-23T06:00:00Z'),

('55555555-0005-0005-0005-000000000024','44444444-0004-0004-0004-000000000017',
 '11111111-0001-0001-0001-000000000019','pending',65,
 'I am a mason by profession but have done farm labor during off-season. Strong and comfortable with harvest work.',
 '2026-02-23T08:00:00Z'),

-- J18 Accounts Assistant (ACTIVE, accepted) — Tara ✓accepted
('55555555-0005-0005-0005-000000000025','44444444-0004-0004-0004-000000000018',
 '11111111-0001-0001-0001-000000000020','accepted',97,
 'B.Com + 6 years at CA firm. Expert Tally ERP, GST, TDS, payroll. Have managed agro-business trading accounts. References ready.',
 '2026-02-15T08:00:00Z'),

-- ── Category 4: Healthcare & Wellness ────────────────────────────────────────

-- J19 Staff Nurse (COMPLETED) — Nandini ✓completed
('55555555-0005-0005-0005-000000000026','44444444-0004-0004-0004-000000000019',
 '11111111-0001-0001-0001-000000000012','completed',98,
 'GNM nurse — 6 years government hospital ICU + general ward. Registered AP Nursing Council. IV, dressing, vitals — all core nursing skills. Available immediately.',
 '2025-12-22T08:00:00Z'),

-- J20 Hospital HK (ACTIVE) — Sunita pending
('55555555-0005-0005-0005-000000000027','44444444-0004-0004-0004-000000000020',
 '11111111-0001-0001-0001-000000000004','pending',75,
 '3 years domestic cleaning + hospital housekeeping internship. I understand infection control basics and am ready to learn more protocols.',
 '2026-02-14T09:00:00Z'),

-- J21 Nursing Attendant (ACTIVE) — Nandini pending
('55555555-0005-0005-0005-000000000028','44444444-0004-0004-0004-000000000021',
 '11111111-0001-0001-0001-000000000012','pending',90,
 'GNM nurse with ICU experience. Though overqualified for attendant role, I am interested if it allows me to also take nurse duties.',
 '2026-02-17T10:00:00Z'),

-- J22 Beautician (FILLED) — Padmavathi ✓accepted
('55555555-0005-0005-0005-000000000029','44444444-0004-0004-0004-000000000022',
 '11111111-0001-0001-0001-000000000016','accepted',94,
 '5 years at premium Hyderabad salons. Expert in facials, waxing, bridal, hair styling, nail art. Know L''Oreal and Lakme product lines. Portfolio available.',
 '2026-02-11T10:00:00Z'),

-- J23 Bridal Makeup (ACTIVE) — Padmavathi pending
('55555555-0005-0005-0005-000000000030','44444444-0004-0004-0004-000000000023',
 '11111111-0001-0001-0001-000000000016','pending',92,
 'Specialised bridal artist. HD + airbrush. South & North Indian looks. Instagram portfolio with 100+ happy brides. Own kit, can travel.',
 '2026-02-18T11:00:00Z'),

-- J24 Receptionist (ACTIVE, accepted) — Anjali ✓accepted, Kavitha pending
('55555555-0005-0005-0005-000000000031','44444444-0004-0004-0004-000000000024',
 '11111111-0001-0001-0001-000000000010','accepted',88,
 '3 years front desk at hotel and hospital. Fluent Telugu, Hindi, English. Computer-literate. Billing software experience.',
 '2026-02-15T09:00:00Z'),

('55555555-0005-0005-0005-000000000039','44444444-0004-0004-0004-000000000024',
 '11111111-0001-0001-0001-000000000008','pending',80,
 'Data entry professional with computer and phone handling skills. Want to transition into reception work for better hours.',
 '2026-02-16T11:00:00Z'),

-- ── Category 5: Textiles, Security & Office ──────────────────────────────────

-- J25 Handloom Weaver (COMPLETED) — Saranya ✓completed
('55555555-0005-0005-0005-000000000032','44444444-0004-0004-0004-000000000025',
 '11111111-0001-0001-0001-000000000018','completed',96,
 '8 years handloom weaving — government training cert. Traditional Andhra cotton patterns are my specialty. Consistent quality, fast output.',
 '2025-12-29T07:00:00Z'),

-- J26 Tailor (ACTIVE, accepted) — Lakshmi ✓accepted
('55555555-0005-0005-0005-000000000033','44444444-0004-0004-0004-000000000026',
 '11111111-0001-0001-0001-000000000006','accepted',93,
 '6 years tailoring — ITI trained. Expert on industrial sewing machines. Regularly exceed 40 pieces/day. Quality stitching in kurtas and blouses.',
 '2026-02-16T08:00:00Z'),

-- J27 Textile QC (ACTIVE) — Saranya pending
('55555555-0005-0005-0005-000000000034','44444444-0004-0004-0004-000000000027',
 '11111111-0001-0001-0001-000000000018','pending',87,
 '8 years at Shree Textiles as weaver gives me deep knowledge of fabric defects and quality standards. Ready to transition to QC inspector.',
 '2026-02-19T09:00:00Z'),

-- J28 Security Guard (ACTIVE, accepted) — Deepak ✓accepted
('55555555-0005-0005-0005-000000000035','44444444-0004-0004-0004-000000000028',
 '11111111-0001-0001-0001-000000000007','accepted',89,
 '4 years security — mall and apartments. NCC B cert. Well-disciplined. CCTV monitoring experience. Good at crowd management and incident reporting.',
 '2026-02-11T08:00:00Z'),

-- J29 Security Supervisor (ACTIVE) — Deepak rejected (too junior)
('55555555-0005-0005-0005-000000000036','44444444-0004-0004-0004-000000000029',
 '11111111-0001-0001-0001-000000000007','rejected',60,
 '4 years security experience. I am disciplined and can manage a team. Looking to grow into supervisory roles.',
 '2026-02-21T09:00:00Z'),

-- J30 CCTV Operator (ACTIVE) — Kavitha pending, Deepak pending
('55555555-0005-0005-0005-000000000037','44444444-0004-0004-0004-000000000030',
 '11111111-0001-0001-0001-000000000008','pending',74,
 'Data entry professional with excellent computer skills. CCTV software and incident logging are similar to system monitoring I already do.',
 '2026-02-17T10:00:00Z'),

('55555555-0005-0005-0005-000000000038','44444444-0004-0004-0004-000000000030',
 '11111111-0001-0001-0001-000000000007','pending',82,
 '4 years security with CCTV monitoring experience at mall. Comfortable watching screens for long hours. Night shift preferred.',
 '2026-02-17T14:00:00Z');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6 — TRUST SCORES  (all 32 seeded users)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO trust_scores (user_id, score, level, job_completion_rate, average_rating,
                          total_ratings, complaint_count, successful_payments) VALUES
-- Workers (scores reflect experience, ratings, and job history)
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7 — ESCROW TRANSACTIONS  (15 — for all accepted/completed applications)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO escrow_transactions (id, job_id, employer_id, worker_id, amount, status, released_at) VALUES
-- Completed (released)
('66666666-0006-0006-0006-000000000001','44444444-0004-0004-0004-000000000004','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000009',4800,'released','2026-02-18T14:00:00Z'),
('66666666-0006-0006-0006-000000000002','44444444-0004-0004-0004-000000000007','22222222-0002-0002-0002-000000000002','11111111-0001-0001-0001-000000000002',6400,'released','2026-02-15T16:00:00Z'),
('66666666-0006-0006-0006-000000000003','44444444-0004-0004-0004-000000000019','22222222-0002-0002-0002-000000000006','11111111-0001-0001-0001-000000000012',20000,'released','2026-02-10T14:00:00Z'),
('66666666-0006-0006-0006-000000000004','44444444-0004-0004-0004-000000000025','22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000018',12000,'released','2026-02-12T14:00:00Z'),
-- Held (active/filled)
('66666666-0006-0006-0006-000000000005','44444444-0004-0004-0004-000000000001','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000001',5200,'held',null),
('66666666-0006-0006-0006-000000000006','44444444-0004-0004-0004-000000000003','22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000005',6400,'held',null),
('66666666-0006-0006-0006-000000000007','44444444-0004-0004-0004-000000000006','22222222-0002-0002-0002-000000000005','11111111-0001-0001-0001-000000000017',16000,'held',null),
('66666666-0006-0006-0006-000000000008','44444444-0004-0004-0004-000000000010','22222222-0002-0002-0002-000000000010','11111111-0001-0001-0001-000000000014',15000,'held',null),
('66666666-0006-0006-0006-000000000009','44444444-0004-0004-0004-000000000013','22222222-0002-0002-0002-000000000003','11111111-0001-0001-0001-000000000003',18000,'held',null),
('66666666-0006-0006-0006-000000000010','44444444-0004-0004-0004-000000000015','22222222-0002-0002-0002-000000000003','11111111-0001-0001-0001-000000000011',14000,'held',null),
('66666666-0006-0006-0006-000000000011','44444444-0004-0004-0004-000000000018','22222222-0002-0002-0002-000000000009','11111111-0001-0001-0001-000000000020',16000,'held',null),
('66666666-0006-0006-0006-000000000012','44444444-0004-0004-0004-000000000022','22222222-0002-0002-0002-000000000008','11111111-0001-0001-0001-000000000016',15000,'held',null),
('66666666-0006-0006-0006-000000000013','44444444-0004-0004-0004-000000000024','22222222-0002-0002-0002-000000000008','11111111-0001-0001-0001-000000000010',13000,'held',null),
('66666666-0006-0006-0006-000000000014','44444444-0004-0004-0004-000000000026','22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000006',12000,'held',null),
('66666666-0006-0006-0006-000000000015','44444444-0004-0004-0004-000000000028','22222222-0002-0002-0002-000000000007','11111111-0001-0001-0001-000000000007',13000,'held',null);


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 8 — CHAT CONVERSATIONS + MESSAGES  (5 conversations)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO chat_conversations (id, participants, worker_id, employer_id, job_id, application_id) VALUES
('77777777-0007-0007-0007-000000000001',
 ARRAY['11111111-0001-0001-0001-000000000001','22222222-0002-0002-0002-000000000001']::uuid[],
 '11111111-0001-0001-0001-000000000001','22222222-0002-0002-0002-000000000001',
 '44444444-0004-0004-0004-000000000001','55555555-0005-0005-0005-000000000001'),

('77777777-0007-0007-0007-000000000002',
 ARRAY['11111111-0001-0001-0001-000000000002','22222222-0002-0002-0002-000000000002']::uuid[],
 '11111111-0001-0001-0001-000000000002','22222222-0002-0002-0002-000000000002',
 '44444444-0004-0004-0004-000000000007','55555555-0005-0005-0005-000000000011'),

('77777777-0007-0007-0007-000000000003',
 ARRAY['11111111-0001-0001-0001-000000000003','22222222-0002-0002-0002-000000000003']::uuid[],
 '11111111-0001-0001-0001-000000000003','22222222-0002-0002-0002-000000000003',
 '44444444-0004-0004-0004-000000000013','55555555-0005-0005-0005-000000000019'),

('77777777-0007-0007-0007-000000000004',
 ARRAY['11111111-0001-0001-0001-000000000012','22222222-0002-0002-0002-000000000006']::uuid[],
 '11111111-0001-0001-0001-000000000012','22222222-0002-0002-0002-000000000006',
 '44444444-0004-0004-0004-000000000019','55555555-0005-0005-0005-000000000026'),

('77777777-0007-0007-0007-000000000005',
 ARRAY['11111111-0001-0001-0001-000000000020','22222222-0002-0002-0002-000000000009']::uuid[],
 '11111111-0001-0001-0001-000000000020','22222222-0002-0002-0002-000000000009',
 '44444444-0004-0004-0004-000000000018','55555555-0005-0005-0005-000000000025');

INSERT INTO chat_messages (conversation_id, sender_id, message, read) VALUES
-- Chat 1: Ravi ↔ Agarwal (Plumber job — accepted)
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'Hello Ravi, your plumbing application looks strong. Can you come to the Moghalrajpuram site tomorrow at 8am for a trial?',true),
('77777777-0007-0007-0007-000000000001','11111111-0001-0001-0001-000000000001',
 'Good evening sir! Yes, I will be there at 8am sharp. Should I bring my own pipe-cutting tools or are they provided?',true),
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'Bring your personal tools. We supply CPVC pipes and fittings. Ask for site engineer Suresh at the main gate.',true),
('77777777-0007-0007-0007-000000000001','11111111-0001-0001-0001-000000000001',
 'Understood sir. I will bring tools and my ITI certificate. Thank you for the opportunity!',true),
('77777777-0007-0007-0007-000000000001','22222222-0002-0002-0002-000000000001',
 'Trial went well — you are selected. Escrow is locked at ₹5200. Start date is March 1st. Welcome aboard!',false),

-- Chat 2: Priya ↔ Nair (Event Cook — completed)
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'Namaste madam. I applied for the event cook role. I have managed weddings for 3000+ guests and specialize in Andhra cuisine.',true),
('77777777-0007-0007-0007-000000000002','22222222-0002-0002-0002-000000000002',
 'Priya ji, your experience is exactly what we need. We have a wedding on March 20 for 1500 guests. Can you prepare a sample menu?',true),
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'Sure! Menu: Veg biryani, chicken curry, dal fry, raita, 3 sweets, papad, pickle. Non-veg: mutton biryani as add-on. Cost estimate ready.',true),
('77777777-0007-0007-0007-000000000002','22222222-0002-0002-0002-000000000002',
 'Menu approved! Escrow locked. The event went beautifully — guests loved the food. Payment has been released. 5-star rating from us!',true),
('77777777-0007-0007-0007-000000000002','11111111-0001-0001-0001-000000000002',
 'Thank you madam! It was a pleasure working with your team. I have also given you a 5-star rating. Looking forward to more events!',false),

-- Chat 3: Irfan ↔ Mehta (LMV Driver — accepted)
('77777777-0007-0007-0007-000000000003','22222222-0002-0002-0002-000000000003',
 'Hi Irfan, your application is shortlisted. Do you have a valid LMV license and Android smartphone with Google Maps?',true),
('77777777-0007-0007-0007-000000000003','11111111-0001-0001-0001-000000000003',
 'Yes sir. LMV valid till 2031. Samsung phone with Google Maps. I know Hyderabad roads very well — 7 years driving in this city.',true),
('77777777-0007-0007-0007-000000000003','22222222-0002-0002-0002-000000000003',
 'Come to our Uppal office on Thursday at 10am with original license and Aadhar. Document verification + short driving test.',true),
('77777777-0007-0007-0007-000000000003','11111111-0001-0001-0001-000000000003',
 'I will be there sir. Thank you! Looking forward to joining Mehta Logistics.',false),

-- Chat 4: Nandini ↔ Chandrasekhar (Nurse — completed)
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'Dear Nandini, your nursing credentials are impressive. GNM with 6 years ICU experience is exactly what our general ward needs. When can you join?',true),
('77777777-0007-0007-0007-000000000004','11111111-0001-0001-0001-000000000012',
 'Thank you doctor. I joined on Jan 5th as discussed. The ward staff are very supportive. Duty has been going smoothly.',true),
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'Excellent work in your first month. Patients have specifically appreciated your care. We are releasing your first month payment via escrow.',true),
('77777777-0007-0007-0007-000000000004','11111111-0001-0001-0001-000000000012',
 'Thank you doctor! Payment received. I am very happy here. Will I rotate to ICU next quarter as discussed?',true),
('77777777-0007-0007-0007-000000000004','22222222-0002-0002-0002-000000000006',
 'Yes, after 3 months you rotate to ICU. HR will update your schedule. Keep up the great work — 5-star rating given!',false),

-- Chat 5: Tara ↔ Naidu (Accounts — accepted)
('77777777-0007-0007-0007-000000000005','11111111-0001-0001-0001-000000000020',
 'Good morning sir. I applied for accounts assistant. 6 years at a CA firm with expert Tally ERP, GST, and payroll experience.',true),
('77777777-0007-0007-0007-000000000005','22222222-0002-0002-0002-000000000009',
 'Hello Tara. Our agro-business has purchase/sales trading, GST, and payroll for 30+ workers. Have you managed trading accounts?',true),
('77777777-0007-0007-0007-000000000005','11111111-0001-0001-0001-000000000020',
 'Yes sir. My CA firm had many trading clients. Purchase entries, sales invoicing, bank reconciliation, and audit support are my core skills.',true),
('77777777-0007-0007-0007-000000000005','22222222-0002-0002-0002-000000000009',
 'Perfect. You are selected. Escrow locked at ₹16,000. Can you start on March 10? We will arrange accommodation at the farm.',false);


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 9 — RATINGS  (8 mutual ratings for 4 completed jobs)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO ratings (job_id, application_id, from_user_id, to_user_id, rating, feedback) VALUES

-- J04 (Painter — completed) — Employer ↔ Worker
('44444444-0004-0004-0004-000000000004','55555555-0005-0005-0005-000000000006',
 '22222222-0002-0002-0002-000000000001','11111111-0001-0001-0001-000000000009',
 5,'Ramesh did an outstanding job painting 20 flats. Clean finish, no drip marks, completed 3 days early. Highly recommended for any interior painting work.'),
('44444444-0004-0004-0004-000000000004','55555555-0005-0005-0005-000000000006',
 '11111111-0001-0001-0001-000000000009','22222222-0002-0002-0002-000000000001',
 4,'Good employer. All materials were ready on time. Lunch provided daily. Payment released promptly through escrow. Professional site management.'),

-- J07 (Event Cook — completed) — Employer ↔ Worker
('44444444-0004-0004-0004-000000000007','55555555-0005-0005-0005-000000000011',
 '22222222-0002-0002-0002-000000000002','11111111-0001-0001-0001-000000000002',
 5,'Priya''s cooking was exceptional. 1500 guests and not a single complaint. Menu was creative, hygiene was perfect, and she managed her team brilliantly.'),
('44444444-0004-0004-0004-000000000007','55555555-0005-0005-0005-000000000011',
 '11111111-0001-0001-0001-000000000002','22222222-0002-0002-0002-000000000002',
 5,'Excellent employer. Transport to venue, all ingredients pre-arranged, payments on time. Very respectful and professional throughout. Will gladly work again.'),

-- J19 (Staff Nurse — completed) — Employer ↔ Worker
('44444444-0004-0004-0004-000000000019','55555555-0005-0005-0005-000000000026',
 '22222222-0002-0002-0002-000000000006','11111111-0001-0001-0001-000000000012',
 5,'Nandini is one of our best nurses. Patients love her care and attention. Her ICU skills are invaluable. A real asset to our hospital.'),
('44444444-0004-0004-0004-000000000019','55555555-0005-0005-0005-000000000026',
 '11111111-0001-0001-0001-000000000012','22222222-0002-0002-0002-000000000006',
 4,'Great hospital to work at. Fair shifts, campus accommodation, good equipment. Administration is responsive. Escrow payment released on time.'),

-- J25 (Handloom Weaver — completed) — Employer ↔ Worker
('44444444-0004-0004-0004-000000000025','55555555-0005-0005-0005-000000000032',
 '22222222-0002-0002-0002-000000000004','11111111-0001-0001-0001-000000000018',
 5,'Saranya produces excellent handloom fabric. Consistent quality, fast output, zero defects. Truly a master weaver. We have expanded her loom assignment.'),
('44444444-0004-0004-0004-000000000025','55555555-0005-0005-0005-000000000032',
 '11111111-0001-0001-0001-000000000018','22222222-0002-0002-0002-000000000004',
 4,'Good employer. Fair wages, accommodation, and the loom quality is maintained well. Festival bonus was appreciated. Only improvement: canteen food could be better.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 10 — REPORTS  (3 reports across categories)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO reports (reporter_id, reported_id, reported_user_id, reported_job_id,
                     type, reason, description, status, resolution) VALUES
-- Report 1: Worker reports employer for asking registration fee (fraud)
('11111111-0001-0001-0001-000000000013',
 '22222222-0002-0002-0002-000000000005','22222222-0002-0002-0002-000000000005',null,
 'fraud','Employer requesting registration fee',
 'Joshi Electricals called me asking ₹500 registration fee before considering my electrician application. This is clearly fraudulent — platform never charges workers.',
 'pending',null),

-- Report 2: Worker reports suspicious job listing (no escrow)
('11111111-0001-0001-0001-000000000007',
 null,null,'44444444-0004-0004-0004-000000000014',
 'fake_job','Suspicious job listing — no escrow',
 'The HMV truck driver job has no escrow locked even though it says escrow_required. I applied 10 days ago with no response. May be a fake listing to collect phone numbers.',
 'pending',null),

-- Report 3: Employer reports farm payment issue (resolved)
('11111111-0001-0001-0001-000000000015',
 '22222222-0002-0002-0002-000000000009','22222222-0002-0002-0002-000000000009',null,
 'payment_issue','Farm work payment not released',
 'I completed 5 days of farm labour at Naidu Farms but escrow payment has not been released and the employer is not responding through chat.',
 'resolved','Escrow payment released on 2026-02-25 after admin contact with employer. Warning issued to Naidu Farms for delayed payment response.');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 11 — NOTIFICATIONS  (22 across workers & employers)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, type, title, message, is_read, link) VALUES

-- ── Worker notifications ──────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000001','application','Application Accepted!',
 'Agarwal Construction has accepted your plumbing application. Escrow ₹5,200 locked. Check chat for next steps.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000002','application','Application Accepted!',
 'Nair Caterers accepted your event cook application. Wedding event on March 20. Check messages.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000002','rating','You Received a 5-Star Rating!',
 'Nair Caterers gave you 5 stars for the wedding event cooking. Your trust score has been updated!',
 false,'/worker/profile'),
('11111111-0001-0001-0001-000000000003','application','Application Accepted!',
 'Mehta Logistics accepted your delivery driver application. Visit Uppal office for document verification.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000003','application','Application Not Selected',
 'Begum Cloud Kitchen has not shortlisted your food delivery application at this time.',
 true,'/worker/applications'),
('11111111-0001-0001-0001-000000000005','job_match','New Job Match: 96% Match!',
 'Modular Kitchen Carpentry posted by Agarwal Construction matches your skills. Apply now before slots fill!',
 false,'/worker/jobs'),
('11111111-0001-0001-0001-000000000009','rating','You Received a 5-Star Rating!',
 'Agarwal Construction gave you 5 stars for the flat painting project. Excellent work!',
 false,'/worker/profile'),
('11111111-0001-0001-0001-000000000012','application','Application Accepted!',
 'Chandrasekhar Hospitals accepted your nursing application. Check chat for joining details.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000012','rating','You Received a 5-Star Rating!',
 'Chandrasekhar Hospitals rated you 5 stars for your general ward nursing performance!',
 false,'/worker/profile'),
('11111111-0001-0001-0001-000000000018','rating','You Received a 5-Star Rating!',
 'Shree Textiles gave you 5 stars for your handloom weaving. Your trust score increased!',
 false,'/worker/profile'),
('11111111-0001-0001-0001-000000000020','application','Application Accepted!',
 'Naidu Farms accepted your accounts assistant application. Joining March 10. Messages have details.',
 false,'/worker/applications'),
('11111111-0001-0001-0001-000000000004','job_match','3 New Jobs Match Your Profile',
 'New housekeeping and kitchen helper jobs near Secunderabad. Complete your profile for better matches!',
 false,'/worker/jobs'),
('11111111-0001-0001-0001-000000000007','system','Profile Tip: Add More Skills',
 'Workers with 5+ skills get 3x more interview invitations. Consider adding CCTV and report writing.',
 true,'/worker/profile'),

-- ── Employer notifications ────────────────────────────────────────────────
('22222222-0002-0002-0002-000000000001','application','New Application: 94% Match',
 'Ravi Kumar Sharma applied to Site Plumber with 94% skill match. Review the application.',
 false,'/employer/jobs'),
('22222222-0002-0002-0002-000000000002','application','Event Cook: 2 Applications',
 'You received 2 applications for Event Cook. Priya Devi has a 97% match — review now.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000003','application','Delivery Driver: Application Received',
 'Mohammed Irfan applied to LMV Delivery Driver with 93% match. Shortlist now.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000006','application','Staff Nurse: 98% Match',
 'Nandini K with 6 yrs ICU experience applied to Staff Nurse. Outstanding profile — review immediately.',
 false,'/employer/jobs'),
('22222222-0002-0002-0002-000000000007','application','Security Guard: 1 Application',
 'Deepak Yadav applied to Mall Security Guard with 89% match. NCC certified, 4 years experience.',
 true,'/employer/jobs'),
('22222222-0002-0002-0002-000000000009','rating','You Were Rated 4 Stars',
 'Saranya Murugesan rated Shree Textiles 4 stars after completing the handloom weaving contract.',
 false,'/employer/dashboard'),
('22222222-0002-0002-0002-000000000010','application','Cloud Kitchen: 4 Applications',
 'Your biryani and South Indian cook jobs received 4 applications. Review and schedule trials.',
 true,'/employer/jobs'),

-- ── System notification ───────────────────────────────────────────────────
('11111111-0001-0001-0001-000000000015','system','Profile Incomplete',
 'Add your skills and experience to get AI-powered job recommendations. Complete workers get 3x more views.',
 false,'/worker/profile');

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE — COMMIT TRANSACTION
-- ═══════════════════════════════════════════════════════════════════════════════
COMMIT;

-- =============================================================================
-- SEED V2 SUMMARY
-- =============================================================================
--
-- PRESERVED: All real user accounts and their data (sessions, custom jobs, etc.)
--
-- UPDATED:
--   • 20 seeded worker skills — richer, aligned to 5 job categories
--
-- INSERTED FRESH:
--   • 20 worker profiles + 10 employer profiles
--   • 30 jobs across 5 categories:
--       Cat 1 — Construction & Infrastructure   (J01-J06)  6 jobs
--       Cat 2 — Food & Hospitality              (J07-J12)  6 jobs
--       Cat 3 — Logistics & Transport           (J13-J18)  6 jobs
--       Cat 4 — Healthcare & Wellness           (J19-J24)  6 jobs
--       Cat 5 — Textiles, Security & Office     (J25-J30)  6 jobs
--   • 39 applications (accepted/pending/rejected/completed mix)
--   • 32 trust scores (all seeded users)
--   • 15 escrow transactions (4 released, 11 held)
--   • 5 chat conversations + 23 messages
--   • 8 ratings (mutual for 4 completed jobs)
--   • 3 reports (2 pending, 1 resolved)
--   • 22 notifications
--
-- JOB STATUS DISTRIBUTION:
--   • 4 completed  (J04 Painter, J07 Cook, J19 Nurse, J25 Weaver)
--   • 3 filled     (J01 Plumber, J13 Driver, J22 Beautician)
--   • 23 active    (with various application stages)
--
-- WORKER ↔ JOB MAPPING (skill-matched):
--   Ravi Kumar (Plumber)       → J01 Plumber ✓
--   Priya Devi (Cook)          → J07 Event Cook ✓, J09 Biryani
--   Mohammed Irfan (Driver)    → J13 LMV Driver ✓, J14 HMV
--   Sunita Bai (Housekeeping)  → J08 Helper, J11 Kitchen, J20 HK
--   Arjun Reddy (Carpenter)    → J03 Modular Kitchen ✓, J02 Mason
--   Lakshmi V (Tailor)         → J26 Tailor ✓
--   Deepak Yadav (Security)    → J28 Mall Guard ✓, J29, J30
--   Kavitha S (Data Entry)     → J30 CCTV, J24 Receptionist
--   Ramesh Babu (Painter)      → J04 Painter ✓ (completed)
--   Anjali Singh (Reception)   → J24 Receptionist ✓
--   Suresh Mondal (Warehouse)  → J15 Warehouse ✓, J16 Cold Storage
--   Nandini K (Nurse)          → J19 Nurse ✓ (completed), J21
--   Rajendra P (Electrician)   → J05 Electrician, J01 (rejected)
--   Meena Kumari (Cook)        → J10 South Indian ✓, J07, J09
--   Vinod Kumar (Garden/Farm)  → J17 Farm Worker
--   Padmavathi (Beautician)    → J22 Parlour ✓, J23 Bridal
--   Ganesh Mahato (AC Tech)    → J06 Technician ✓
--   Saranya M (Weaver)         → J25 Weaver ✓ (completed), J27 QC
--   Bhim Rao (Mason)           → J02 Mason, J04, J17
--   Tara Kumari (Accounts)     → J18 Accounts ✓
-- =============================================================================
