'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkerNav } from '@/components/worker/WorkerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { User, Loader2, X, Plus, Star, Sparkles, Shield, TrendingUp, Trash2, Camera, FileText, Upload, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { workerProfileOps, userOps, db } from '@/lib/api';
import { WorkerProfile } from '@/lib/types';
import { extractSkills, extractSkillsWithAI, JOB_CATEGORIES } from '@/lib/aiMatching';
import { extractTextFromFile, parseResume, type ParsedResume } from '@/lib/resumeParser';
import { getWorkerProfileCompletion, isWorkerProfileComplete } from '@/lib/profileCompletion';
import { VoiceInput } from '@/components/ui/voice-input';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/contexts/I18nContext';

export default function WorkerProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractingSkills, setExtractingSkills] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    skillInput: '',
    availability: '',
    experience: '',
    categories: [] as string[],
    location: '',
    bio: '',
    profileImage: '',
    resumeUrl: '',
    resumeFileName: '',
  });
  const [resumeUploading, setResumeUploading] = useState(false);
  const [extractedFromResume, setExtractedFromResume] = useState<ParsedResume | null>(null);
  const [resumeRawText, setResumeRawText] = useState<string>('');
  const [selectedExtracted, setSelectedExtracted] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || user.role !== 'worker') {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const findByUserId = workerProfileOps?.findByUserId;
      if (!findByUserId) {
        throw new Error('Worker profile API is unavailable. Please refresh and try again.');
      }

      const workerProfile = await findByUserId(user.id);
      if (workerProfile) {
        setProfile(workerProfile);
        setFormData({
          skills: workerProfile.skills || [],
          skillInput: '',
          availability: workerProfile.availability || '',
          experience: workerProfile.experience || '',
          categories: workerProfile.categories || [],
          location: workerProfile.location || '',
          bio: workerProfile.bio || '',
          profileImage: workerProfile.profilePictureUrl || '',
          resumeUrl: workerProfile.resumeUrl || '',
          resumeFileName: workerProfile.resumeUrl ? 'Resume uploaded' : '',
        });
        // Restore resume data if available
        if (workerProfile.resumeText) {
          setResumeRawText(workerProfile.resumeText);
        }
        if (workerProfile.resumeParsed) {
          setExtractedFromResume(workerProfile.resumeParsed);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSkills = async () => {
    if (!formData.experience) {
      toast({
        title: 'No Experience Provided',
        description: 'Please enter your work experience first',
        variant: 'destructive',
      });
      return;
    }

    setExtractingSkills(true);
    try {
      const extracted = await extractSkillsWithAI(formData.experience);
      const newSkills = [...new Set([...formData.skills, ...extracted])];
      setFormData({ ...formData, skills: newSkills });
      toast({
        title: 'Skills Extracted!',
        description: `AI found ${extracted.length} skill${extracted.length !== 1 ? 's' : ''} from your experience`,
      });
    } catch {
      // fallback
      const extracted = extractSkills(formData.experience);
      const newSkills = [...new Set([...formData.skills, ...extracted])];
      setFormData({ ...formData, skills: newSkills });
      toast({ title: 'Skills Extracted!', description: `Found ${extracted.length} skills` });
    } finally {
      setExtractingSkills(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Use an image under 2MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;
        // Cover-crop to square
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
        setFormData(prev => ({ ...prev, profileImage: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.txt', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      toast({ title: 'Invalid file type', description: 'Please upload PDF, DOC, DOCX, or TXT files only', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB', variant: 'destructive' });
      return;
    }

    setResumeUploading(true);
    setExtractedFromResume(null);
    setResumeRawText('');
    setSelectedExtracted(new Set());

    try {
      // Extract text and parse in parallel with FileReader
      const [text] = await Promise.all([extractTextFromFile(file)]);

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setFormData(prev => ({ ...prev, resumeUrl: dataUrl, resumeFileName: file.name }));

        if (text && text.trim().length > 50) {
          setResumeRawText(text);
          try {
            const parsed = await parseResume(text);
            if (parsed.skills && parsed.skills.length > 0) {
              setExtractedFromResume(parsed);
              setSelectedExtracted(new Set(parsed.skills));
              toast({
                title: 'Resume Parsed Successfully',
                description: `AI identified ${parsed.skills.length} skill${parsed.skills.length !== 1 ? 's' : ''} — review them below`,
              });
            } else {
              toast({ title: 'Resume Uploaded', description: 'No skills detected — try adding them manually' });
            }
          } catch {
            toast({ title: 'Resume Uploaded', description: 'Could not AI-parse skills. Try extracting manually.' });
          }
        } else {
          toast({
            title: 'Resume Uploaded',
            description: 'Very little text found — the file may be image-based',
            variant: 'default',
          });
        }
        setResumeUploading(false);
      };
      reader.onerror = () => {
        setResumeUploading(false);
        toast({ title: 'Upload Failed', description: 'Could not read resume file', variant: 'destructive' });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ title: 'Upload Failed', description: 'Could not process resume file', variant: 'destructive' });
      setResumeUploading(false);
    }
  };

  /** Merge selected extracted skills into profile skills (keep extracted data in state) */
  const handleAddExtractedSkills = (all = false) => {
    const toAdd = all
      ? (extractedFromResume?.skills ?? [])
      : Array.from(selectedExtracted);
    const merged = [...new Set([...formData.skills, ...toAdd])];
    setFormData(prev => ({ ...prev, skills: merged }));
    setSelectedExtracted(new Set());
    toast({ title: 'Skills Added', description: `${toAdd.length} skill(s) added to your profile` });
  };

  const toggleExtractedSkill = (skill: string) => {
    setSelectedExtracted(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  };

  const addSkill = () => {
    if (!formData.skillInput.trim()) return;

    const skill = formData.skillInput.trim();
    if (!formData.skills.includes(skill)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill],
        skillInput: '',
      });
    } else {
      setFormData({ ...formData, skillInput: '' });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    setDeletingAccount(true);
    try {
      await db.deleteAccount(user.id);
      logout();
      router.push('/login');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete account. Please try again.', variant: 'destructive' });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.categories.length === 0) {
      toast({
        title: 'Categories Required',
        description: 'Please select at least one job category',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Compute profile completeness using shared utility
      const isComplete = isWorkerProfileComplete(formData);

      const profileData: WorkerProfile = {
        userId: user!.id,
        skills: formData.skills,
        availability: formData.availability,
        experience: formData.experience,
        categories: formData.categories,
        location: formData.location,
        bio: formData.bio,
        profilePictureUrl: formData.profileImage || undefined,
        resumeUrl: formData.resumeUrl || undefined,
        resumeText: resumeRawText || undefined,
        resumeParsed: extractedFromResume ? {
          summary: extractedFromResume.summary || '',
          skills: extractedFromResume.skills || [],
          experience: extractedFromResume.experience || [],
          education: extractedFromResume.education || [],
          projects: extractedFromResume.projects || [],
          certifications: extractedFromResume.certifications || [],
        } : undefined,
        profileCompleted: !!isComplete,
      };

      if (profile) {
        await workerProfileOps.update(user!.id, profileData);
      } else {
        await workerProfileOps.create(profileData);
      }

      await userOps.update(user!.id, { profileCompleted: !!isComplete });
      updateUser({ profileCompleted: !!isComplete });

      // After successful save, clear the extracted resume data
      setExtractedFromResume(null);
      setResumeRawText('');
      setSelectedExtracted(new Set());

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully',
      });

      router.push('/worker/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // -- Live profile completeness: must be above early-return to satisfy Rules of Hooks --
  const profileCompleteness = useMemo(
    () => getWorkerProfileCompletion(formData),
    [formData.skills, formData.categories, formData.availability, formData.experience, formData.location],
  );

  if (loading) {
    return (
      <div className="app-surface">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8 pb-28 md:pb-8 max-w-4xl">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </Card>
            ))}
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-surface">
      <WorkerNav />

      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('profile.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('profile.subtitle')}
          </p>
          {/* Live Profile Completeness */}
          <div className="mt-4 rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('profile.completeness')}</span>
              <span className="text-sm font-bold text-primary">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2" />
            {profileCompleteness < 100 && (
              <p className="text-xs text-muted-foreground mt-1">
                {profileCompleteness < 50 ? 'Add skills, categories and availability to improve your job matches.' : 'Almost there! Fill in remaining fields for the best recommendations.'}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('profile.personalInfo')}</h2>
                <p className="text-sm text-muted-foreground">{t('profile.personalInfoDesc')}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted transition-all duration-200 hover:scale-[1.03] hover:shadow-md flex items-center justify-center">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <User className="w-9 h-9 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-image-input"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="profile-image-input">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        {formData.profileImage ? t('common.change') || 'Change Photo' : t('common.upload') || 'Upload Photo'}
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">JPG or PNG - max 2 MB - shown at 200×200 px</p>
                </div>
              </div>

              {/* Resume Upload */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">Resume / CV</h3>
                    <p className="text-xs text-muted-foreground">Upload for technical job applications. AI will auto-extract your skills.</p>
                  </div>
                </div>
                {formData.resumeUrl ? (
                  <div className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
                    <FileText className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formData.resumeFileName || 'Resume uploaded'}</p>
                      <p className="text-xs text-muted-foreground">Ready for applications</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, resumeUrl: '', resumeFileName: '' }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      id="resume-upload-input"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={resumeUploading}
                    />
                    <label htmlFor="resume-upload-input">
                      <Button type="button" variant="outline" size="sm" asChild disabled={resumeUploading}>
                        <span className="cursor-pointer flex items-center gap-1.5">
                          {resumeUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing…
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Resume
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, or TXT — max 5 MB</p>
                  </div>
                )}
              </div>

              {/* ── AI Extracted Skills Panel ─────────────────────────── */}
              {extractedFromResume && (extractedFromResume.skills?.length ?? 0) > 0 && (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          AI found {extractedFromResume.skills.length} skills in your resume
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Select the skills you want to add to your profile
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedExtracted(new Set()); }}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Categorized skills */}
                  {extractedFromResume.categorizedSkills && (() => {
                    const cats = [
                      { key: 'technical', label: 'Technical', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700' },
                      { key: 'tools', label: 'Tools & Software', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700' },
                      { key: 'domain', label: 'Domain / Industry', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700' },
                      { key: 'soft', label: 'Soft Skills', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700' },
                    ] as const;

                    const cs = extractedFromResume.categorizedSkills!;

                    return (
                      <div className="space-y-3">
                        {cats.map(({ key, label, color }) => {
                          const skills = cs[key] ?? [];
                          if (skills.length === 0) return null;
                          const isExpanded = showAllCategories[key] ?? true;
                          const shown = isExpanded ? skills : skills.slice(0, 8);
                          return (
                            <div key={key} className="space-y-1.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {shown.map(skill => {
                                  const isSelected = selectedExtracted.has(skill);
                                  const alreadyHave = formData.skills.includes(skill);
                                  return (
                                    <button
                                      key={skill}
                                      type="button"
                                      disabled={alreadyHave}
                                      onClick={() => !alreadyHave && toggleExtractedSkill(skill)}
                                      className={[
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150',
                                        alreadyHave
                                          ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-border'
                                          : isSelected
                                            ? `${color} cursor-pointer shadow-sm scale-[1.02]`
                                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 cursor-pointer',
                                      ].join(' ')}
                                    >
                                      {isSelected && !alreadyHave && <Check className="w-3 h-3 shrink-0" />}
                                      {skill}
                                      {alreadyHave && <span className="ml-0.5 text-[10px]">✓</span>}
                                    </button>
                                  );
                                })}
                                {skills.length > 8 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllCategories(prev => ({ ...prev, [key]: !isExpanded }))}
                                    className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-primary/50 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/5 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <><ChevronUp className="w-3 h-3" />Show less</>
                                    ) : (
                                      <><ChevronDown className="w-3 h-3" />+{skills.length - 8} more</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* If no categorized (fallback), show flat list */}
                  {!extractedFromResume.categorizedSkills && (
                    <div className="flex flex-wrap gap-1.5">
                      {extractedFromResume.skills.map(skill => {
                        const isSelected = selectedExtracted.has(skill);
                        const alreadyHave = formData.skills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={alreadyHave}
                            onClick={() => !alreadyHave && toggleExtractedSkill(skill)}
                            className={[
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150',
                              alreadyHave ? 'opacity-40 cursor-not-allowed bg-muted border-border' : isSelected
                                ? 'bg-primary/10 text-primary border-primary/40 cursor-pointer'
                                : 'bg-background text-muted-foreground border-border hover:border-primary/50 cursor-pointer',
                            ].join(' ')}
                          >
                            {isSelected && !alreadyHave && <Check className="w-3 h-3" />}
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-primary/20">
                    <span className="text-xs text-muted-foreground flex-1">
                      {selectedExtracted.size} of {extractedFromResume.skills.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedExtracted(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Deselect all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExtracted(new Set(extractedFromResume.skills))}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Select all
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={selectedExtracted.size === 0}
                      onClick={() => handleAddExtractedSkills(false)}
                    >
                      Add Selected ({selectedExtracted.size})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddExtractedSkills(true)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Add All {extractedFromResume.skills.length}
                    </Button>
                  </div>

                  {/* Extracted info preview (experience/education) */}
                  {((extractedFromResume.experience?.length ?? 0) > 0 ||
                    (extractedFromResume.education?.length ?? 0) > 0) && (
                    <details className="group">
                      <summary className="text-xs text-primary cursor-pointer select-none list-none flex items-center gap-1 hover:underline">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        View extracted experience & education
                      </summary>
                      <div className="mt-2 space-y-2 text-xs text-muted-foreground border-t border-primary/20 pt-2">
                        {extractedFromResume.experience?.slice(0, 3).map((exp, i) => (
                          <div key={i}>
                            <span className="font-medium text-foreground">{exp.title}</span>
                            {exp.company && <span> @ {exp.company}</span>}
                            {exp.duration && <span className="ml-1 text-muted-foreground/70">({exp.duration})</span>}
                          </div>
                        ))}
                        {extractedFromResume.education?.slice(0, 2).map((edu, i) => (
                          <div key={i}>
                            <span className="font-medium text-foreground">{edu.degree}</span>
                            {edu.institution && <span> — {edu.institution}</span>}
                            {edu.year && <span className="ml-1 text-muted-foreground/70">({edu.year})</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user?.fullName ?? ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={user?.phoneNumber ?? ''} disabled />
                </div>
              </div>

              <div className="space-y-2">              {/* Trust Score Banner */}
              {user && (
                <div className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 hover:shadow-sm ${
                  user.trustLevel === 'trusted' ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' :
                  user.trustLevel === 'active' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' :
                  'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                }`}>
                  <Shield className={`h-5 w-5 shrink-0 ${
                    user.trustLevel === 'trusted' ? 'text-green-600' :
                    user.trustLevel === 'active' ? 'text-blue-600' : 'text-amber-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold capitalize">
                      {user.trustLevel === 'trusted' ? 'Trusted Worker' :
                       user.trustLevel === 'active' ? 'Active Worker' : 'New Worker'}
                    </p>
                    <p className="text-xs text-muted-foreground">Trust Score: {user.trustScore.toFixed(1)} / 100</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold">{user.trustScore.toFixed(1)}</span>
                  </div>
                </div>
              )}                <Label htmlFor="location">Location</Label>
                <LocationInput
                  id="location"
                  placeholder="e.g., Vijayawada, Andhra Pradesh"
                  value={formData.location}
                  onChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell employers about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Job Categories */}
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Job Categories *</h2>
                <p className="text-sm text-muted-foreground">Select categories you're interested in</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={formData.categories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  {formData.categories.includes(category) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Work Experience & Skills */}
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Experience & Skills</h2>
                <p className="text-sm text-muted-foreground">AI will extract skills from your experience</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Work Experience</Label>
                <div className="flex gap-2 items-start">
                  <Textarea
                    id="experience"
                    placeholder="e.g., I worked in a hotel for 5 years doing cleaning and customer service..."
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    rows={4}
                    className="flex-1"
                  />
                  <VoiceInput
                    onResult={(t) => setFormData(prev => ({ ...prev, experience: prev.experience ? prev.experience + ' ' + t : t }))}
                    lang="en-IN"
                    append
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractSkills}
                  disabled={!formData.experience || extractingSkills}
                >
                  {extractingSkills ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Extract Skills with AI</>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skillInput">Skills</Label>
                <div className="flex gap-2">
                  <Input
                    id="skillInput"
                    placeholder="Add a skill and press Enter"
                    value={formData.skillInput}
                    onChange={(e) => setFormData({ ...formData, skillInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" size="icon" onClick={addSkill}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                        {skill}
                        <button
                          type="button"
                          className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 focus:outline-none cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); removeSkill(skill); }}
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="w-3 h-3 hover:text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Availability</h2>
              <p className="text-sm text-muted-foreground">When are you available to work?</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Work Preference</Label>
              <select
                id="availability"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              >
                <option value="">Select availability</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Weekends">Weekends only</option>
                <option value="Flexible">Flexible</option>
                <option value="Evening">Evening shifts</option>
                <option value="Morning">Morning shifts</option>
              </select>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('profile.saveProfile')
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/worker/dashboard')}
            >
              {t('common.cancel')}
            </Button>
          </div>

          {/* Danger Zone */}
          <Card className="border-destructive/40 p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t('profile.deleteDesc')}</p>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</> : t('profile.deleteAccount')}
            </Button>
          </Card>
        </form>
      </main>
    </div>
  );
}
