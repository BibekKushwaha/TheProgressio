import { HeroSection } from '@/components/howitwork/HeroSection';
import { StepOne } from '@/components/howitwork/StepOne';
import { StepTwo } from '@/components/howitwork/StepTwo';
import { StepThree } from '@/components/howitwork/StepThree';
import { StepFour } from '@/components/howitwork/StepFour';
import { FinalCTA } from '@/components/howitwork/FinalCTA';
import { HowItWorkFooter } from '@/components/howitwork/HowItWorkFooter';
import { Navbar } from '@/components/landing/LandingNavbar';

export const metadata = {
    title: 'How It Works — TheProgressio',
    description:
        'Master your academic journey in 4 simple steps. Frictionless capture, AI scaffolding, strategic study and exam conquest — all powered by TheProgressio.',
};

export default function HowItWorkPage() {
    return (
        <div
            className="min-h-screen text-white antialiased"
            style={{
                background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 80%)',
            }}
        >
            {/* Subtle top glow */}
            <div
                className="pointer-events-none fixed inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)' }}
            />

            {/* Step connector line */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute left-1/2 top-[80vh] -translate-x-1/2 w-px"
                    style={{
                        height: 'calc(100% - 80vh)',
                        background: 'linear-gradient(to bottom, rgba(56,189,248,0.15), transparent)',
                    }}
                />
            </div>
            <Navbar />

            <HeroSection />

            {/* Divider */}
            <div className="max-w-7xl mx-auto px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>

            <StepOne />

            <div className="max-w-7xl mx-auto px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>

            <StepTwo />

            <div className="max-w-7xl mx-auto px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>

            <StepThree />

            <div className="max-w-7xl mx-auto px-6">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            </div>

            <StepFour />

            <FinalCTA />

            <HowItWorkFooter />
        </div>
    );
}