'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkerNav } from '@/components/worker/WorkerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { User, Loader2, X, Plus, Star, Sparkles } from 'lucide-react';
import { mockWorkerProfileOps, mockUserOps } from '@/lib/api';
import { WorkerProfile } from '@/lib/types';
import { extractSkills, JOB_CATEGORIES } from '@/lib/aiMatching';
import { VoiceInput } from '@/components/ui/voice-input';
import { useToast } from '@/hooks/use-toast';

export default function WorkerProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    skillInput: '',
    availability: '',
    experience: '',
    categories: [] as string[],
    location: '',
    bio: '',
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
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractSkills = () => {
    if (!formData.experience) {
      toast({
        title: 'No Experience Provided',
        description: 'Please enter your work experience first',
        variant: 'destructive',
      });
      return;
    }

    const extracted = extractSkills(formData.experience);
    const newSkills = [...new Set([...formData.skills, ...extracted])];
    setFormData({ ...formData, skills: newSkills });

    toast({
      title: 'Skills Extracted!',
      description: `Found ${extracted.length} skills from your experience`,
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
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const toggleCategory = (category: string) => {
    if (formData.categories.includes(category)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter((c) => c !== category),
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, category],
      });
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
      };

      if (profile) {
        await mockWorkerProfileOps.update(user!.id, profileData);
      } else {
        await mockWorkerProfileOps.create(profileData);
      }

      // Update user profile completion status
      const isComplete =
        formData.skills.length > 0 &&
        formData.availability &&
        formData.categories.length > 0 &&
        formData.experience;

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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <WorkerNav />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Complete your profile to get better AI-powered job recommendations
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Personal Information</h2>
                <p className="text-sm text-muted-foreground">Basic details about you</p>
              </div>
            </div>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Vijayawada, Andhra Pradesh"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                  disabled={!formData.experience}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Skills with AI
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
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeSkill(skill)}
                        />
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
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/worker/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
