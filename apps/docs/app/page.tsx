"use client";

import { Navbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ComparisonSection } from "@/components/landing/ComparisionSection";
import { WhatsAppAssistant } from "@/components/landing/WhatsAppAssistant";
import { InsightsSection } from "@/components/landing/InsightsSection";
import { LanguageSection } from "@/components/landing/LanguageSection";
import { BreakdownSection } from "@/components/landing/BreakdownSection";
import { ProgressSection } from "@/components/landing/ProgressSection";
import { Footer } from "@/components/landing/footer";
import { Sparkles, Workflow, Zap, type LucideIcon } from "lucide-react";

interface FeatureBadgeProps {
    icon: LucideIcon;
    text: string;
    color: string;
}

const FeatureBadge = ({ icon: Icon, text, color }: FeatureBadgeProps) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {text}
    </span>
);

export default function HomePage() {
    return (
        <div className="min-h-screen text-white overflow-hidden relative bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_36%),linear-gradient(145deg,_#020617_0%,_#0f172a_45%,_#1e1b4b_100%)]">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-24 -left-12 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-16 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <Navbar />

            <main className="relative z-10">
                <section className="max-w-7xl mx-auto px-4 pt-24">
                    <div className="flex flex-wrap gap-2">
                        <FeatureBadge icon={Sparkles} text="AI-first planning" color="text-cyan-100" />
                        <FeatureBadge icon={Workflow} text="Calendar + habits + analytics" color="text-indigo-100" />
                        <FeatureBadge icon={Zap} text="Built for student velocity" color="text-fuchsia-100" />
                    </div>
                </section>

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
    );
}
