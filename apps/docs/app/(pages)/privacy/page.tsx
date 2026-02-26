import React from 'react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0b0a1a] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Privacy Policy (Draft)
        </h1>
        <p className="text-sm text-slate-400">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">What we store</h2>
          <ul className="list-disc pl-6 text-sm text-slate-300 space-y-1">
            <li>Account data (email, username) and authentication session cookies.</li>
            <li>Planner data (tasks, subtasks, attachments metadata, notes, timetable, attendance).</li>
            <li>Habit data (habits, logs, streak metadata, nudge settings).</li>
            <li>Analytics inputs you provide (grade entries) and derived insights (rank bands, SWOT summaries).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Sharing & mentorship</h2>
          <p className="text-sm text-slate-300">
            If you create mentor/parent share links, they grant read-only visibility for the configured duration and can be revoked at any time in Settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">AI features</h2>
          <p className="text-sm text-slate-300">
            AI-assisted parsing and syllabus scanning may call external AI providers. You can disable AI assistance from Settings to use fallback-only behavior.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Your controls</h2>
          <ul className="list-disc pl-6 text-sm text-slate-300 space-y-1">
            <li>Export your data (JSON) from Settings.</li>
            <li>Delete your account from Settings (this removes associated data from our database).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p className="text-sm text-slate-300">
            For privacy questions, contact your administrator/operator of this deployment.
          </p>
        </section>
      </div>
    </main>
  );
}

