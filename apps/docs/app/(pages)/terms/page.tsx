import React from 'react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0b0a1a] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Terms of Service (Draft)
        </h1>
        <p className="text-sm text-slate-400">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Educational tool</h2>
          <p className="text-sm text-slate-300">
            This product provides planning and analytics utilities for study workflows. It does not guarantee academic outcomes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Acceptable use</h2>
          <p className="text-sm text-slate-300">
            Do not misuse integrations (e.g., WhatsApp) for spam or harassment. Accounts may be suspended for abuse.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Changes</h2>
          <p className="text-sm text-slate-300">
            Terms may evolve as features ship. This page is a placeholder for deployment operators to customize.
          </p>
        </section>
      </div>
    </main>
  );
}

