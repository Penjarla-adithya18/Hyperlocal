'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Shield, Sparkles, MessageSquare, Clock, MapPin, Star, TrendingUp } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary">HyperLocal Jobs</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              {t('landing.nav.features')}
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              {t('landing.nav.how')}
            </Link>
            <Link href="#safety" className="text-sm font-medium hover:text-primary transition-colors">
              {t('landing.nav.safety')}
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link href="/login">
              <Button variant="ghost" size="sm">{t('landing.login')}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">{t('landing.getStarted')}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {t('landing.badge')}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6 bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {t('landing.hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance mb-10 leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=worker">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg px-8">
                {t('landing.hero.findJobs')}
              </Button>
            </Link>
            <Link href="/signup?role=employer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                {t('landing.hero.postJob')}
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            {t('landing.hero.join')}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: '10,000+', label: t('landing.stats.activeUsers') },
            { value: '5,000+', label: t('landing.stats.jobsPosted') },
            { value: '95%', label: t('landing.stats.paymentSuccess') },
            { value: '4.8/5', label: t('landing.stats.avgRating') },
          ].map((stat, i) => (
            <Card key={i} className="p-6 text-center border-2 hover:border-primary/50 transition-colors">
              <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: t('landing.features.ai.title'),
                description: t('landing.features.ai.desc'),
                color: 'text-primary',
              },
              {
                icon: Shield,
                title: t('landing.features.escrow.title'),
                description: t('landing.features.escrow.desc'),
                color: 'text-accent',
              },
              {
                icon: MessageSquare,
                title: t('landing.features.chat.title'),
                description: t('landing.features.chat.desc'),
                color: 'text-primary',
              },
              {
                icon: Star,
                title: t('landing.features.trust.title'),
                description: t('landing.features.trust.desc'),
                color: 'text-accent',
              },
              {
                icon: MapPin,
                title: t('landing.features.local.title'),
                description: t('landing.features.local.desc'),
                color: 'text-primary',
              },
              {
                icon: Clock,
                title: t('landing.features.flex.title'),
                description: t('landing.features.flex.desc'),
                color: 'text-accent',
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-all hover:scale-105 hover:border-primary/50">
                <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.how.title')}</h2>
            <p className="text-lg text-muted-foreground">{t('landing.how.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* For Workers */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-primary">{t('landing.how.workers')}</h3>
              <div className="space-y-6">
                {[
                  { step: '1', title: t('landing.how.worker.step1.title'), desc: t('landing.how.worker.step1.desc') },
                  { step: '2', title: t('landing.how.worker.step2.title'), desc: t('landing.how.worker.step2.desc') },
                  { step: '3', title: t('landing.how.worker.step3.title'), desc: t('landing.how.worker.step3.desc') },
                  { step: '4', title: t('landing.how.worker.step4.title'), desc: t('landing.how.worker.step4.desc') },
                  { step: '5', title: t('landing.how.worker.step5.title'), desc: t('landing.how.worker.step5.desc') },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Employers */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-accent">{t('landing.how.employers')}</h3>
              <div className="space-y-6">
                {[
                  { step: '1', title: t('landing.how.employer.step1.title'), desc: t('landing.how.employer.step1.desc') },
                  { step: '2', title: t('landing.how.employer.step2.title'), desc: t('landing.how.employer.step2.desc') },
                  { step: '3', title: t('landing.how.employer.step3.title'), desc: t('landing.how.employer.step3.desc') },
                  { step: '4', title: t('landing.how.employer.step4.title'), desc: t('landing.how.employer.step4.desc') },
                  { step: '5', title: t('landing.how.employer.step5.title'), desc: t('landing.how.employer.step5.desc') },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.safety.title')}</h2>
              <p className="text-lg text-muted-foreground">
                {t('landing.safety.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: t('landing.safety.item1.title'),
                  desc: t('landing.safety.item1.desc'),
                },
                {
                  title: t('landing.safety.item2.title'),
                  desc: t('landing.safety.item2.desc'),
                },
                {
                  title: t('landing.safety.item3.title'),
                  desc: t('landing.safety.item3.desc'),
                },
                {
                  title: t('landing.safety.item4.title'),
                  desc: t('landing.safety.item4.desc'),
                },
                {
                  title: t('landing.safety.item5.title'),
                  desc: t('landing.safety.item5.desc'),
                },
                {
                  title: t('landing.safety.item6.title'),
                  desc: t('landing.safety.item6.desc'),
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg bg-background">
                  <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-10 md:p-16 text-center bg-linear-to-br from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/20">
            <TrendingUp className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.cta.title')}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('landing.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup?role=worker">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  {t('landing.cta.worker')}
                </Button>
              </Link>
              <Link href="/signup?role=employer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {t('landing.cta.employer')}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-primary">HyperLocal Jobs</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('landing.footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.forWorkers')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup?role=worker" className="hover:text-primary transition-colors">{t('landing.footer.findJobs')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.how')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.safety')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.forEmployers')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup?role=employer" className="hover:text-primary transition-colors">{t('landing.footer.postJobs')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.pricing')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.guidelines')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('landing.footer.support')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.helpCenter')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.contact')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.terms')}</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">{t('landing.footer.privacy')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>{t('landing.footer.copy')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
