/**
 * Role → Skills mapping for the job post form.
 *
 * When an employer selects a role/category, we show ONLY the relevant skills
 * so the employer doesn't have to scroll through 100+ unrelated options.
 *
 * Structure:
 *   - JOB_ROLE_SKILLS: Map<category, string[]>  — skills per role
 *   - TECHNICAL_CATEGORIES: Set<string>          — categories that require resume
 *   - getRoleSkills(category): string[]           — returns role-specific skills
 *   - isRoleTechnical(category): boolean          — tells if resume is required
 */

// ── Technical categories (resume required) ────────────────────────────────

export const TECHNICAL_CATEGORIES = new Set([
  'IT & Tech Support',
  'Data Entry',
  'Content Writing',
  'Photography',
  'Event Management',
  'Data Analytics',
  'Software Development',
  'UI/UX Design',
  'Digital Marketing',
  'Accounting & Finance',
])

// ── Non-technical (blue-collar, no resume needed) ─────────────────────────

export const NON_TECHNICAL_CATEGORIES = new Set([
  'Hospitality',
  'Cooking',
  'Cleaning',
  'Delivery',
  'Driving',
  'Sales',
  'Retail',
  'Construction',
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Painting',
  'Mechanical',
  'Security',
  'Gardening',
  'Teaching',
  'Healthcare',
  'Beauty & Wellness',
  'Office Work',
  'Other',
])

// ── Role → Skills map ─────────────────────────────────────────────────────

export const JOB_ROLE_SKILLS: Record<string, string[]> = {
  // ── Non-technical ──
  'Hospitality': [
    'Customer Service', 'Cleaning', 'Housekeeping', 'Food Service',
    'Room Service', 'Front Desk', 'Laundry', 'Communication',
  ],
  'Cooking': [
    'Indian Cuisine', 'Chinese Cuisine', 'South Indian', 'Baking',
    'Food Preparation', 'Kitchen Management', 'Hygiene Standards', 'Recipe Knowledge',
  ],
  'Cleaning': [
    'Deep Cleaning', 'Floor Mopping', 'Window Cleaning', 'Laundry',
    'Sanitization', 'Housekeeping', 'Carpet Cleaning', 'Waste Management',
  ],
  'Delivery': [
    'Two-wheeler Driving', 'Navigation', 'Time Management', 'Customer Service',
    'Package Handling', 'Route Planning', 'Bike Maintenance', 'Cash Handling',
  ],
  'Driving': [
    'Car Driving', 'Commercial Vehicle', 'Auto Rickshaw', 'Navigation',
    'Vehicle Maintenance', 'Road Safety', 'Time Management', 'First Aid',
  ],
  'Sales': [
    'Communication', 'Negotiation', 'Product Knowledge', 'Customer Relations',
    'CRM', 'Cold Calling', 'Lead Generation', 'Upselling',
  ],
  'Retail': [
    'Inventory Management', 'Billing', 'Visual Merchandising', 'Customer Service',
    'Stock Management', 'POS Systems', 'Cash Handling', 'Product Display',
  ],
  'Construction': [
    'Masonry', 'Concrete Work', 'Scaffolding', 'Blueprint Reading',
    'Safety Protocols', 'Material Handling', 'Heavy Lifting', 'Welding',
  ],
  'Carpentry': [
    'Woodwork', 'Furniture Making', 'Cabinet Installation', 'Tool Handling',
    'Measurements', 'Polishing', 'Wood Finishing', 'Blueprint Reading',
  ],
  'Plumbing': [
    'Pipe Fitting', 'Leak Repair', 'Drainage Systems', 'Water Heater',
    'Fixture Installation', 'Soldering', 'PVC Piping', 'Problem Solving',
  ],
  'Electrical': [
    'Wiring', 'Circuit Breakers', 'Troubleshooting', 'Panel Installation',
    'Motor Repair', 'Lighting', 'Safety Protocols', 'Inverter Installation',
  ],
  'Painting': [
    'Interior Painting', 'Exterior Painting', 'Color Mixing', 'Surface Preparation',
    'Wall Putty', 'Texture Finish', 'Spray Painting', 'Waterproofing',
  ],
  'Mechanical': [
    'Engine Repair', 'Two-wheeler Repair', 'Car Servicing', 'AC Repair',
    'Welding', 'Lathe Operation', 'Diagnostics', 'Oil Change',
  ],
  'Security': [
    'Surveillance', 'Access Control', 'Fire Safety', 'Communication',
    'CCTV Monitoring', 'Physical Fitness', 'First Aid', 'Crowd Management',
  ],
  'Gardening': [
    'Plant Care', 'Landscaping', 'Lawn Mowing', 'Pruning',
    'Irrigation', 'Pesticide Application', 'Composting', 'Tree Trimming',
  ],
  'Teaching': [
    'Subject Knowledge', 'Communication', 'Patience', 'Lesson Planning',
    'Classroom Management', 'English Teaching', 'Math Teaching', 'Hindi Teaching',
  ],
  'Healthcare': [
    'Patient Care', 'First Aid', 'Vitals Monitoring', 'Medication Administration',
    'Elderly Care', 'Physiotherapy Assist', 'Hygiene Protocols', 'Record Keeping',
  ],
  'Beauty & Wellness': [
    'Hair Cutting', 'Hair Styling', 'Facial', 'Makeup',
    'Manicure', 'Pedicure', 'Massage', 'Waxing',
  ],
  'Office Work': [
    'Filing', 'Phone Handling', 'Scheduling', 'Record Keeping',
    'MS Office', 'Typing', 'Data Entry', 'Communication',
  ],

  // ── Technical ──
  'IT & Tech Support': [
    'Networking', 'Hardware Troubleshooting', 'Windows/Linux', 'Cloud Computing',
    'Cybersecurity', 'Help Desk', 'Server Management', 'Active Directory',
  ],
  'Data Entry': [
    'Typing Speed 40+ WPM', 'MS Excel', 'Data Verification', 'Accuracy',
    'Google Sheets', 'Database Entry', 'Formatting', 'Attention to Detail',
  ],
  'Content Writing': [
    'Blog Writing', 'SEO Writing', 'Copywriting', 'Technical Writing',
    'Social Media Content', 'Editing', 'Research', 'Grammar',
  ],
  'Photography': [
    'Portrait Photography', 'Event Photography', 'Photo Editing', 'Lightroom',
    'Photoshop', 'Video Editing', 'Drone Photography', 'Studio Lighting',
  ],
  'Event Management': [
    'Planning', 'Vendor Coordination', 'Budgeting', 'Logistics',
    'Decoration', 'Sound & Lighting', 'Client Communication', 'Timeline Management',
  ],
  'Data Analytics': [
    'Python', 'SQL', 'Excel Advanced', 'Power BI',
    'Tableau', 'Statistical Analysis', 'Data Visualization', 'R Programming',
  ],
  'Software Development': [
    'JavaScript', 'TypeScript', 'React', 'Node.js',
    'Python', 'Java', 'SQL', 'Git', 'REST APIs', 'Docker',
  ],
  'UI/UX Design': [
    'Figma', 'Adobe XD', 'Wireframing', 'Prototyping',
    'User Research', 'Design Systems', 'Responsive Design', 'Accessibility',
  ],
  'Digital Marketing': [
    'SEO', 'Google Ads', 'Meta Ads', 'Email Marketing',
    'Social Media Marketing', 'Analytics', 'Content Strategy', 'A/B Testing',
  ],
  'Accounting & Finance': [
    'Tally', 'GST Filing', 'Bookkeeping', 'Invoice Management',
    'Excel Advanced', 'SAP', 'Payroll', 'Tax Planning',
  ],
  'Other': [],
}

// ── Updated JOB_CATEGORIES (replaces the one in aiMatching.ts) ────────────

export const JOB_CATEGORIES_V2 = [
  // Non-technical
  'Hospitality', 'Cooking', 'Cleaning', 'Delivery', 'Driving',
  'Sales', 'Retail', 'Construction', 'Carpentry', 'Plumbing',
  'Electrical', 'Painting', 'Mechanical', 'Security', 'Gardening',
  'Teaching', 'Healthcare', 'Beauty & Wellness', 'Office Work',
  // Technical
  'IT & Tech Support', 'Data Entry', 'Content Writing', 'Photography',
  'Event Management', 'Data Analytics', 'Software Development',
  'UI/UX Design', 'Digital Marketing', 'Accounting & Finance',
  // Fallback
  'Other',
] as const

// ── Helper functions ──────────────────────────────────────────────────────

/** Get skills to show for a given category. Returns empty array for unknown categories. */
export function getRoleSkills(category: string): string[] {
  return JOB_ROLE_SKILLS[category] ?? []
}

/** Returns true when the category is considered technical (resume required). */
export function isRoleTechnical(category: string): boolean {
  return TECHNICAL_CATEGORIES.has(category)
}

/** Infer jobNature from category automatically. */
export function inferJobNature(category: string): 'technical' | 'non-technical' {
  return isRoleTechnical(category) ? 'technical' : 'non-technical'
}
