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
import { User, Loader2, X, Plus, Star, Sparkles, Shield, TrendingUp, Trash2, Camera } from 'lucide-react';
import { mockWorkerProfileOps, mockUserOps, mockDb } from '@/lib/api';
import { WorkerProfile } from '@/lib/types';
import { extractSkills, extractSkillsWithAI, JOB_CATEGORIES } from '@/lib/aiMatching';
import { VoiceInput } from '@/components/ui/voice-input';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/use-toast';
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
  });

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
      const workerProfile = await mockWorkerProfileOps.findByUserId(user.id);
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
        });
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
      await mockDb.deleteAccount(user.id);
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
      const profileData: WorkerProfile = {
        userId: user!.id,
        skills: formData.skills,
        availability: formData.availability,
        experience: formData.experience,
        categories: formData.categories,
        location: formData.location,
        bio: formData.bio,
        profilePictureUrl: formData.profileImage || undefined,
      };

      if (profile) {
        await mockWorkerProfileOps.update(user!.id, profileData);
      } else {
        await mockWorkerProfileOps.create(profileData);
      }

      // Update user profile completion status (bio is optional ï¿½ not counted)
      const isComplete =
        formData.skills.length > 0 &&
        formData.availability &&
        formData.categories.length > 0 &&
        formData.experience &&
        formData.location;

      await mockUserOps.update(user!.id, { profileCompleted: !!isComplete });
      updateUser({ profileCompleted: !!isComplete });

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
  const profileCompleteness = useMemo(() => Math.round(
    (formData.skills.length > 0 ? 25 : 0) +
    (formData.categories.length > 0 ? 25 : 0) +
    (formData.availability ? 20 : 0) +
    (formData.experience ? 20 : 0) +
    (formData.location ? 10 : 0)
  ), [formData.skills, formData.categories, formData.availability, formData.experience, formData.location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/20">
      <WorkerNav />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('profile.title')}</h1>
          <p className="text-muted-foreground">
            {t('profile.subtitle')}
          </p>
          {/* Live Profile Completeness */}
          <div className="mt-4 p-4 rounded-lg border bg-card">
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
          <Card className="p-6">
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
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
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
                  <p className="text-xs text-muted-foreground mt-1">JPG or PNG ï¿½ max 2 MB ï¿½ shown at 200ï¿½200 px</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user?.fullName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={user?.phoneNumber} disabled />
                </div>
              </div>

              <div className="space-y-2">              {/* Trust Score Banner */}
              {user && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
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
                      {user.trustLevel === 'trusted' ? '? Trusted Worker' :
                       user.trustLevel === 'active' ? '?? Active Worker' : '?? New Worker'}
                    </p>
                    <p className="text-xs text-muted-foreground">Trust Score: {user.trustScore.toFixed(1)} / 5.0</p>
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
          <Card className="p-6">
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
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  {formData.categories.includes(category) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Work Experience & Skills */}
          <Card className="p-6">
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
          <Card className="p-6">
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
          <Card className="p-6 border-destructive/40">
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
      </div>
    </div>
  );
}
