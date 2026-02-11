"use client";
import { Navbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { ComparisonSection } from '@/components/landing/ComparisionSection';
import { WhatsAppAssistant } from '@/components/landing/WhatsAppAssistant';
import { InsightsSection } from '@/components/landing/InsightsSection';
import { LanguageSection } from '@/components/landing/LanguageSection';
import { BreakdownSection } from '@/components/landing/BreakdownSection';
import { ProgressSection } from '@/components/landing/ProgressSection';
import { Footer } from '@/components/landing/footer';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none"></div>
      
      <Navbar />
        <main className="relative">
      <HeroSection />
      <ComparisonSection />
      <WhatsAppAssistant />
      <InsightsSection />
      <LanguageSection />
      <BreakdownSection />
      <ProgressSection />
        </main>
      <Footer />
    </div>
    </div>
  );
}

export default HomePage;