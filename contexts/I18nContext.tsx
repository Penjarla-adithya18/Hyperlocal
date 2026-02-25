'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY } from '@/i18n'

export type Locale = 'en' | 'hi' | 'te'

// ──────────────────────────────────────────────────────────────────────────
// Translation dictionaries  (English / Hindi / Telugu)
// Supports {{variable}} interpolation via t(key, { variable: value })
// ──────────────────────────────────────────────────────────────────────────
const translations: Record<Locale, Record<string, string>> = {
  // ── ENGLISH ──────────────────────────────────────────────────────────────
  en: {
    // Nav – shared
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.settings': 'Settings',
    'nav.messages': 'Messages',
    // Nav – worker
    'nav.worker.findJobs': 'Find Jobs',
    'nav.worker.myApps': 'My Applications',
    // Nav – employer
    'nav.employer.postJob': 'Post Job',
    'nav.employer.myJobs': 'My Jobs',
    // Auth – common
    'auth.backHome': 'Back to Home',
    'auth.phoneLabel': 'Phone Number',
    'auth.phonePh': 'Enter your 10-digit mobile number',
    'auth.passwordLabel': 'Password',
    'auth.passwordPh': 'Enter your password',
    // Auth – login
    'auth.login.title': 'Welcome Back',
    'auth.login.subtitle': 'Log in to your account to continue',
    'auth.login.btn': 'Login',
    'auth.login.loading': 'Logging in…',
    'auth.login.forgotPw': 'Forgot password?',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signupLink': 'Sign up',
    // Auth – signup
    'auth.signup.title': 'Create Account',
    'auth.signup.subtitle': 'Join thousands of workers and employers',
    'auth.signup.workerTab': "I'm a Worker",
    'auth.signup.employerTab': "I'm an Employer",
    'auth.signup.fullName': 'Full Name',
    'auth.signup.fullNamePh': 'Enter your full name',
    'auth.signup.sendOtp': 'Send OTP',
    'auth.signup.enterOtp': 'Enter 6-digit OTP',
    'auth.signup.verifyOtp': 'Verify OTP',
    'auth.signup.confirmPassword': 'Confirm Password',
    'auth.signup.businessName': 'Business Name',
    'auth.signup.orgName': 'Organization Name (Optional)',
    'auth.signup.createBtn': 'Create Account',
    'auth.signup.creating': 'Creating account…',
    'auth.signup.hasAccount': 'Already have an account?',
    'auth.signup.loginLink': 'Login',
    'auth.signup.step': 'Step {{n}} of 2',
    'auth.signup.verifying': 'Verifying…',
    'auth.signup.sending': 'Sending…',
    // Worker dashboard
    'worker.dash.welcome': 'Welcome back, {{name}}!',
    'worker.dash.subtitle': "Here's what's happening with your job search",
    'worker.dash.completeProfile': 'Complete Your Profile',
    'worker.dash.completeProfileDesc': 'Complete your profile to get better AI-powered job recommendations',
    'worker.dash.profilePct': 'Profile Completeness',
    'worker.dash.completeBtn': 'Complete Profile',
    'worker.dash.applications': 'Applications',
    'worker.dash.trustScore': 'Trust Score',
    'worker.dash.avgRating': 'Average Rating',
    'worker.dash.completedJobs': 'Completed Jobs',
    'worker.dash.aiRecs': 'AI-Powered Recommendations',
    'worker.dash.recs': 'Recommended Jobs',
    'worker.dash.matchedDesc': 'Jobs matched to your skills and preferences',
    'worker.dash.completeForMatches': 'Complete your profile for personalized matches',
    'worker.dash.viewAllJobs': 'View All Jobs',
    'worker.dash.noRecsTitle': 'No Recommended Jobs Yet',
    'worker.dash.noRecsDesc': 'Complete your profile with skills and experience to get AI-powered job recommendations',
    'worker.dash.recentApps': 'Recent Applications',
    'worker.dash.viewAll': 'View All',
    'worker.dash.match': '{{score}}% Match',
    'worker.dash.appNo': 'Application #{{id}}',
    'worker.dash.appliedOn': 'Applied {{date}}',
    // Employer dashboard
    'employer.dash.welcome': 'Welcome, {{name}}!',
    'employer.dash.subtitle': 'Manage your job postings and find the right talent',
    'employer.dash.postJob': 'Post a Job',
    'employer.dash.activeJobs': 'Active Jobs',
    'employer.dash.totalApps': 'Total Applications',
    'employer.dash.pendingApps': 'Pending Applications',
    'employer.dash.pendingPayments': 'Pending Payments',
    'employer.dash.recentJobs': 'Recent Jobs',
    'employer.dash.viewAllJobs': 'View All Jobs',
    'employer.dash.noJobs': 'No jobs posted yet',
    'employer.dash.postFirst': 'Post your first job to get started',
    'employer.dash.applicants': '{{count}} applicants',
    'employer.dash.pending': 'pending',
    'employer.dash.viewJob': 'View Job',
    'employer.dash.quickActions': 'Quick Actions',
    'job.applyNow': 'Apply Now',
    'job.applied': 'Already Applied',
    'job.location': 'Location',
    'job.pay': 'Pay',
    'job.duration': 'Duration',
    'job.requiredSkills': 'Required Skills',
    'job.description': 'Description',
    'job.postJob': 'Post a Job',
    'job.status.active': 'Active',
    'job.status.draft': 'Pending Payment',
    'job.status.completed': 'Completed',
    'job.status.cancelled': 'Cancelled',
    // Payment
    'payment.escrowSecured': 'Escrow Secured',
    'payment.releasePayment': 'Release Payment',
    'payment.raiseDispute': 'Raise a Dispute',
    // Worker ops
    'worker.hireWorker': 'Hire Worker',
    'worker.matchScore': 'Match Score',
    // App statuses
    'status.pending': 'Pending',
    'status.accepted': 'Accepted',
    'status.rejected': 'Rejected',
    'status.completed': 'Completed',
    // Common
    'common.loading': 'Loading…',
    'common.viewDetails': 'View Details',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.noResults': 'No results found',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.refresh': 'Refresh',
    'common.send': 'Send',
    'common.chat': 'Chat',
    'common.change': 'Change',
    'common.upload': 'Upload',
    'common.apply': 'Apply Now',
    'common.allJobs': 'All Jobs',
    'common.matched': 'AI Matched',
    // Job statuses
    'job.status.filled': 'Filled',
    'job.status.open': 'Open',
    // Settings page
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account preferences',
    'settings.trust': 'Trust & Reputation',
    'settings.trustDesc': 'Your current standing on the platform',
    'settings.changePw': 'Change Password',
    'settings.currentPw': 'Current Password',
    'settings.newPw': 'New Password',
    'settings.confirmPw': 'Confirm New Password',
    'settings.updatePw': 'Update Password',
    'settings.updatingPw': 'Updating…',
    'settings.updatePhone': 'Update Phone Number',
    'settings.sendOtp': 'Send OTP',
    'settings.resendOtp': 'Resend OTP',
    'settings.verifyUpdate': 'Verify & Update',
    'settings.signOut': 'Sign Out',
    'settings.dangerZone': 'Danger Zone',
    // Applications page
    'apps.title': 'My Applications',
    'apps.ratePending': 'Rate Pending',
    'apps.rateEmployer': 'Rate Employer',
    'apps.rated': 'Rated',
    'apps.coverLetter': 'Your Cover Letter',
    'apps.appliedOn': 'Applied',
    'apps.viewJob': 'View Job',
    'apps.noApps': 'No applications yet',
    'apps.noAppsDesc': 'Browse jobs and apply to get started',
    // Job report
    'job.reportThis': 'Report this job',
    'job.reported': '✓ Job Reported',
    'job.backToJobs': 'Back to Jobs',
    // Profile page
    'profile.title': 'Your Profile',
    'profile.subtitle': 'Complete your profile for better AI-powered job recommendations',
    'profile.completeness': 'Profile Completeness',
    'profile.personalInfo': 'Personal Information',
    'profile.personalInfoDesc': 'Basic details about you',
    'profile.categories': 'Job Categories',
    'profile.categoriesDesc': "Select categories you're interested in",
    'profile.expSkills': 'Experience & Skills',
    'profile.expSkillsDesc': 'AI will extract skills from your experience',
    'profile.availability': 'Availability',
    'profile.availDesc': 'When are you available to work?',
    'profile.saveProfile': 'Save Profile',
    'profile.saving': 'Saving…',
    'profile.deleteAccount': 'Delete My Account',
    'profile.deleteTitle': 'Danger Zone',
    'profile.deleteDesc': 'Permanently delete your account and all associated data. This action cannot be undone.',
    'profile.photo': 'Profile Photo',
    'profile.uploadPhoto': 'Upload Photo',
    'profile.changePhoto': 'Change Photo',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.logout': 'लॉगआउट',
    'nav.settings': 'सेटिंग्स',
    'nav.messages': 'संदेश',
    'nav.worker.findJobs': 'नौकरी खोजें',
    'nav.worker.myApps': 'मेरे आवेदन',
    'nav.employer.postJob': 'नौकरी पोस्ट करें',
    'nav.employer.myJobs': 'मेरी नौकरियाँ',
    'auth.backHome': 'होम पर वापस जाएं',
    'auth.phoneLabel': 'फ़ोन नंबर',
    'auth.phonePh': '10 अंकों का मोबाइल नंबर दर्ज करें',
    'auth.passwordLabel': 'पासवर्ड',
    'auth.passwordPh': 'पासवर्ड दर्ज करें',
    'auth.login.title': 'वापस स्वागत है',
    'auth.login.subtitle': 'जारी रखने के लिए लॉग इन करें',
    'auth.login.btn': 'लॉग इन करें',
    'auth.login.loading': 'लॉग इन हो रहा है…',
    'auth.login.forgotPw': 'पासवर्ड भूल गए?',
    'auth.login.noAccount': 'खाता नहीं है?',
    'auth.login.signupLink': 'साइन अप करें',
    'auth.signup.title': 'खाता बनाएं',
    'auth.signup.subtitle': 'हजारों कामगारों और नियोक्ताओं से जुड़ें',
    'auth.signup.workerTab': 'मैं कामगार हूँ',
    'auth.signup.employerTab': 'मैं नियोक्ता हूँ',
    'auth.signup.fullName': 'पूरा नाम',
    'auth.signup.fullNamePh': 'अपना पूरा नाम दर्ज करें',
    'auth.signup.sendOtp': 'OTP भेजें',
    'auth.signup.enterOtp': '6 अंकों का OTP दर्ज करें',
    'auth.signup.verifyOtp': 'OTP सत्यापित करें',
    'auth.signup.confirmPassword': 'पासवर्ड की पुष्टि करें',
    'auth.signup.businessName': 'व्यवसाय का नाम',
    'auth.signup.orgName': 'संगठन का नाम (वैकल्पिक)',
    'auth.signup.createBtn': 'खाता बनाएं',
    'auth.signup.creating': 'खाता बन रहा है…',
    'auth.signup.hasAccount': 'पहले से खाता है?',
    'auth.signup.loginLink': 'लॉग इन करें',
    'auth.signup.step': 'चरण {{n}} / 2',
    'auth.signup.verifying': 'सत्यापित हो रहा है…',
    'auth.signup.sending': 'भेजा जा रहा है…',
    'worker.dash.welcome': 'वापस स्वागत है, {{name}}!',
    'worker.dash.subtitle': 'आपकी नौकरी खोज का हाल',
    'worker.dash.completeProfile': 'प्रोफ़ाइल पूरी करें',
    'worker.dash.completeProfileDesc': 'बेहतर AI नौकरियाँ पाने के लिए प्रोफ़ाइल पूरी करें',
    'worker.dash.profilePct': 'प्रोफ़ाइल पूर्णता',
    'worker.dash.completeBtn': 'प्रोफ़ाइल पूरी करें',
    'worker.dash.applications': 'आवेदन',
    'worker.dash.trustScore': 'विश्वास स्कोर',
    'worker.dash.avgRating': 'औसत रेटिंग',
    'worker.dash.completedJobs': 'पूर्ण नौकरियाँ',
    'worker.dash.aiRecs': 'AI आधारित सिफारिशें',
    'worker.dash.recs': 'अनुशंसित नौकरियाँ',
    'worker.dash.matchedDesc': 'आपके कौशल के अनुसार नौकरियाँ',
    'worker.dash.completeForMatches': 'व्यक्तिगत मेल के लिए प्रोफ़ाइल पूरी करें',
    'worker.dash.viewAllJobs': 'सभी नौकरियाँ देखें',
    'worker.dash.noRecsTitle': 'अभी कोई सिफारिश नहीं',
    'worker.dash.noRecsDesc': 'AI सिफारिशें पाने के लिए कौशल के साथ प्रोफ़ाइल पूरी करें',
    'worker.dash.recentApps': 'हाल के आवेदन',
    'worker.dash.viewAll': 'सभी देखें',
    'worker.dash.match': '{{score}}% मेल',
    'worker.dash.appNo': 'आवेदन #{{id}}',
    'worker.dash.appliedOn': '{{date}} को आवेदन किया',
    'employer.dash.welcome': 'स्वागत है, {{name}}!',
    'employer.dash.subtitle': 'अपनी नौकरियाँ प्रबंधित करें और सही प्रतिभा खोजें',
    'employer.dash.postJob': 'नौकरी पोस्ट करें',
    'employer.dash.activeJobs': 'सक्रिय नौकरियाँ',
    'employer.dash.totalApps': 'कुल आवेदन',
    'employer.dash.pendingApps': 'लंबित आवेदन',
    'employer.dash.pendingPayments': 'लंबित भुगतान',
    'employer.dash.recentJobs': 'हाल की नौकरियाँ',
    'employer.dash.viewAllJobs': 'सभी नौकरियाँ देखें',
    'employer.dash.noJobs': 'अभी कोई नौकरी पोस्ट नहीं',
    'employer.dash.postFirst': 'शुरू करने के लिए पहली नौकरी पोस्ट करें',
    'employer.dash.applicants': '{{count}} आवेदक',
    'employer.dash.pending': 'लंबित',
    'employer.dash.viewJob': 'नौकरी देखें',
    'employer.dash.quickActions': 'त्वरित कार्य',
    'job.applyNow': 'अभी आवेदन करें',
    'job.applied': 'आवेदन हो चुका है',
    'job.location': 'स्थान',
    'job.pay': 'वेतन',
    'job.duration': 'अवधि',
    'job.requiredSkills': 'आवश्यक कौशल',
    'job.description': 'विवरण',
    'job.postJob': 'नौकरी पोस्ट करें',
    'job.status.active': 'सक्रिय',
    'job.status.draft': 'भुगतान लंबित',
    'job.status.completed': 'पूर्ण',
    'job.status.cancelled': 'रद्द',
    'payment.escrowSecured': 'एस्क्रो सुरक्षित',
    'payment.releasePayment': 'भुगतान जारी करें',
    'payment.raiseDispute': 'विवाद दर्ज करें',
    'worker.hireWorker': 'कामगार को काम पर रखें',
    'worker.matchScore': 'मिलान स्कोर',
    'status.pending': 'लंबित',
    'status.accepted': 'स्वीकृत',
    'status.rejected': 'अस्वीकृत',
    'status.completed': 'पूर्ण',
    'common.loading': 'लोड हो रहा है…',
    'common.viewDetails': 'विवरण देखें',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.submit': 'जमा करें',
    'common.back': 'वापस',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.noResults': 'कोई परिणाम नहीं',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.refresh': 'ताज़ा करें',
    'common.send': 'भेजें',
    'common.chat': 'चैट',
    'common.change': 'बदलें',
    'common.upload': 'अपलोड',
    'common.apply': 'अभी आवेदन करें',
    'job.status.filled': 'भरा हुआ',
    'settings.title': 'सेटिंग्स',
    'settings.changePw': 'पासवर्ड बदलें',
    'settings.currentPw': 'वर्तमान पासवर्ड',
    'settings.newPw': 'नया पासवर्ड',
    'settings.confirmPw': 'नया पासवर्ड पुष्टि करें',
    'settings.updatePw': 'पासवर्ड अपडेट करें',
    'settings.signOut': 'साइन आउट',
    'settings.dangerZone': 'खतरनाक क्षेत्र',
    'apps.title': 'मेरे आवेदन',
    'apps.viewJob': 'नौकरी देखें',
    'apps.noApps': 'अभी कोई आवेदन नहीं',
    'job.reportThis': 'इस नौकरी की रिपोर्ट करें',
    'job.reported': '✓ रिपोर्ट की गई',
    'profile.saveProfile': 'प्रोफ़ाइल सहेजें',
  },

  // ── TELUGU ────────────────────────────────────────────────────────────────
  te: {
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.profile': 'ప్రొఫైల్',
    'nav.logout': 'లాగ్అవుట్',
    'nav.settings': 'సెట్టింగులు',
    'nav.messages': 'సందేశాలు',
    'nav.worker.findJobs': 'ఉద్యోగాలు వెతకండి',
    'nav.worker.myApps': 'నా దరఖాస్తులు',
    'nav.employer.postJob': 'ఉద్యోగం పోస్ట్ చేయండి',
    'nav.employer.myJobs': 'నా ఉద్యోగాలు',
    'auth.backHome': 'హోమ్‌కి తిరిగి వెళ్ళు',
    'auth.phoneLabel': 'ఫోన్ నంబర్',
    'auth.phonePh': '10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
    'auth.passwordLabel': 'పాస్‌వర్డ్',
    'auth.passwordPh': 'పాస్‌వర్డ్ నమోదు చేయండి',
    'auth.login.title': 'తిరిగి స్వాగతం',
    'auth.login.subtitle': 'మీ ఖాతాలోకి లాగిన్ చేయండి',
    'auth.login.btn': 'లాగిన్ చేయండి',
    'auth.login.loading': 'లాగిన్ అవుతోంది…',
    'auth.login.forgotPw': 'పాస్‌వర్డ్ మర్చిపోయారా?',
    'auth.login.noAccount': 'ఖాతా లేదా?',
    'auth.login.signupLink': 'సైన్ అప్ చేయండి',
    'auth.signup.title': 'ఖాతా సృష్టించండి',
    'auth.signup.subtitle': 'వేల కార్మికులు మరియు యజమానులతో చేరండి',
    'auth.signup.workerTab': 'నేను కార్మికుడిని',
    'auth.signup.employerTab': 'నేను యజమానిని',
    'auth.signup.fullName': 'పూర్తి పేరు',
    'auth.signup.fullNamePh': 'మీ పూర్తి పేరు నమోదు చేయండి',
    'auth.signup.sendOtp': 'OTP పంపండి',
    'auth.signup.enterOtp': '6-అంకెల OTP నమోదు చేయండి',
    'auth.signup.verifyOtp': 'OTP ధృవీకరించండి',
    'auth.signup.confirmPassword': 'పాస్‌వర్డ్ నిర్ధారించండి',
    'auth.signup.businessName': 'వ్యాపార పేరు',
    'auth.signup.orgName': 'సంస్థ పేరు (ఐచ్ఛికం)',
    'auth.signup.createBtn': 'ఖాతా సృష్టించండి',
    'auth.signup.creating': 'ఖాతా సృష్టిస్తోంది…',
    'auth.signup.hasAccount': 'ఇప్పటికే ఖాతా ఉందా?',
    'auth.signup.loginLink': 'లాగిన్ చేయండి',
    'auth.signup.step': 'దశ {{n}} / 2',
    'auth.signup.verifying': 'ధృవీకరిస్తోంది…',
    'auth.signup.sending': 'పంపుతోంది…',
    'worker.dash.welcome': 'తిరిగి స్వాగతం, {{name}}!',
    'worker.dash.subtitle': 'మీ ఉద్యోగ శోధన స్థితి',
    'worker.dash.completeProfile': 'ప్రొఫైల్ పూర్తి చేయండి',
    'worker.dash.completeProfileDesc': 'మెరుగైన AI సిఫారసుల కోసం ప్రొఫైల్ పూర్తి చేయండి',
    'worker.dash.profilePct': 'ప్రొఫైల్ పూర్తి స్థాయి',
    'worker.dash.completeBtn': 'ప్రొఫైల్ పూర్తి చేయండి',
    'worker.dash.applications': 'దరఖాస్తులు',
    'worker.dash.trustScore': 'విశ్వాస స్కోర్',
    'worker.dash.avgRating': 'సగటు రేటింగ్',
    'worker.dash.completedJobs': 'పూర్తయిన ఉద్యోగాలు',
    'worker.dash.aiRecs': 'AI ఆధారిత సిఫారసులు',
    'worker.dash.recs': 'సిఫారసు చేయబడిన ఉద్యోగాలు',
    'worker.dash.matchedDesc': 'మీ నైపుణ్యాలకు సరిపోయే ఉద్యోగాలు',
    'worker.dash.completeForMatches': 'వ్యక్తిగత మ్యాచ్‌ల కోసం ప్రొఫైల్ పూర్తి చేయండి',
    'worker.dash.viewAllJobs': 'అన్ని ఉద్యోగాలు చూడండి',
    'worker.dash.noRecsTitle': 'ఇంకా సిఫారసులు లేవు',
    'worker.dash.noRecsDesc': 'AI సిఫారసుల కోసం నైపుణ్యాలతో ప్రొఫైల్ పూర్తి చేయండి',
    'worker.dash.recentApps': 'ఇటీవలి దరఖాస్తులు',
    'worker.dash.viewAll': 'అన్నీ చూడండి',
    'worker.dash.match': '{{score}}% మ్యాచ్',
    'worker.dash.appNo': 'దరఖాస్తు #{{id}}',
    'worker.dash.appliedOn': '{{date}}న దరఖాస్తు చేసారు',
    'employer.dash.welcome': 'స్వాగతం, {{name}}!',
    'employer.dash.subtitle': 'మీ ఉద్యోగ పోస్టింగ్‌లు నిర్వహించండి',
    'employer.dash.postJob': 'ఉద్యోగం పోస్ట్ చేయండి',
    'employer.dash.activeJobs': 'క్రియాశీల ఉద్యోగాలు',
    'employer.dash.totalApps': 'మొత్తం దరఖాస్తులు',
    'employer.dash.pendingApps': 'పెండింగ్ దరఖాస్తులు',
    'employer.dash.pendingPayments': 'పెండింగ్ చెల్లింపులు',
    'employer.dash.recentJobs': 'ఇటీవలి ఉద్యోగాలు',
    'employer.dash.viewAllJobs': 'అన్ని ఉద్యోగాలు చూడండి',
    'employer.dash.noJobs': 'ఇంకా ఉద్యోగాలు పోస్ట్ చేయలేదు',
    'employer.dash.postFirst': 'ప్రారంభించడానికి మీ మొదటి ఉద్యోగం పోస్ట్ చేయండి',
    'employer.dash.applicants': '{{count}} దరఖాస్తుదారులు',
    'employer.dash.pending': 'పెండింగ్',
    'employer.dash.viewJob': 'ఉద్యోగం చూడండి',
    'employer.dash.quickActions': 'త్వరిత చర్యలు',
    'job.applyNow': 'ఇప్పుడే దరఖాస్తు చేయండి',
    'job.applied': 'దరఖాస్తు చేసారు',
    'job.location': 'స్థానం',
    'job.pay': 'జీతం',
    'job.duration': 'వ్యవధి',
    'job.requiredSkills': 'అవసరమైన నైపుణ్యాలు',
    'job.description': 'వివరణ',
    'job.postJob': 'ఉద్యోగం పోస్ట్ చేయండి',
    'job.status.active': 'క్రియాశీలం',
    'job.status.draft': 'చెల్లింపు పెండింగ్',
    'job.status.completed': 'పూర్తయింది',
    'job.status.cancelled': 'రద్దు',
    'payment.escrowSecured': 'ఎస్క్రో సురక్షితం',
    'payment.releasePayment': 'చెల్లింపు విడుదల చేయండి',
    'payment.raiseDispute': 'వివాదం నమోదు చేయండి',
    'worker.hireWorker': 'కార్మికుడిని నియమించండి',
    'worker.matchScore': 'మ్యాచ్ స్కోర్',
    'status.pending': 'పెండింగ్',
    'status.accepted': 'స్వీకరించారు',
    'status.rejected': 'తిరస్కరించారు',
    'status.completed': 'పూర్తయింది',
    'common.loading': 'లోడ్ అవుతోంది…',
    'common.viewDetails': 'వివరాలు చూడండి',
    'common.save': 'సేవ్ చేయండి',
    'common.cancel': 'రద్దు చేయండి',
    'common.submit': 'సమర్పించండి',
    'common.back': 'వెనక్కి',
    'common.search': 'వెతకండి',
    'common.filter': 'ఫిల్టర్',
    'common.noResults': 'ఫలితాలు లేవు',
    'common.delete': 'తొలగించండి',
    'common.edit': 'సవరించండి',
    'common.refresh': 'రిఫ్రెష్',
    'common.send': 'పంపండి',
    'common.chat': 'చాట్',
    'common.change': 'మార్చండి',
    'common.upload': 'అప్‌లోడ్',
    'common.apply': 'ఇప్పుడే దరఖాస్తు చేయండి',
    'job.status.filled': 'నిండిపోయింది',
    'settings.title': 'సెట్టింగ్‌లు',
    'settings.changePw': 'పాస్‌వర్డ్ మార్చండి',
    'settings.currentPw': 'ప్రస్తుత పాస్‌వర్డ్',
    'settings.newPw': 'కొత్త పాస్‌వర్డ్',
    'settings.confirmPw': 'పాస్‌వర్డ్ ధ్రువీకరించండి',
    'settings.updatePw': 'పాస్‌వర్డ్ అప్‌డేట్',
    'settings.signOut': 'సైన్ అవుట్',
    'settings.dangerZone': 'ప్రమాదకర జోన్',
    'apps.title': 'నా దరఖాస్తులు',
    'apps.viewJob': 'ఉద్యోగం చూడండి',
    'apps.noApps': 'దరఖాస్తులు లేవు',
    'job.reportThis': 'ఈ ఉద్యోగం నివేదించండి',
    'job.reported': '✓ నివేదించబడింది',
    'profile.saveProfile': 'ప్రొఫైల్ సేవ్ చేయండి',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────
interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Translate a key, with optional {{variable}} interpolation */
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

const LANG_ATTR: Record<Locale, string> = { en: 'en', hi: 'hi', te: 'te' }

/** Read locale cookie set by middleware (server-side detection) */
function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
  return (match?.split('=')?.[1] as Locale) ?? null
}

/** Write locale to cookie so middleware sees it on next request */
function writeLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en'
    // Priority: localStorage → cookie set by middleware → default
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    if (stored && ['en', 'hi', 'te'].includes(stored)) return stored
    const cookie = readLocaleCookie()
    if (cookie && ['en', 'hi', 'te'].includes(cookie)) return cookie
    return 'en'
  })

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, l)
      writeLocaleCookie(l)
    }
  }

  // Keep <html lang="…"> in sync with the selected locale
  useEffect(() => {
    document.documentElement.lang = LANG_ATTR[locale]
  }, [locale])

  // On first mount: if middleware detected a different locale via cookie
  // and localStorage isn't set yet, switch to middleware's detected locale.
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null
    if (!stored) {
      const cookie = readLocaleCookie()
      if (cookie && ['en', 'hi', 'te'].includes(cookie) && cookie !== locale) {
        setLocale(cookie)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = translations[locale]?.[key] ?? translations['en']?.[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      }
    }
    return str
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
  te: 'తెలుగు',
}
