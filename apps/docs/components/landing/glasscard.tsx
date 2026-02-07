'use client';

import Link from 'next/link';

export interface GlassCardProps {
  title: string;
  subtitle: string;
  description: string;
  href: string;
}

export default function GlassCard({ title, subtitle, description, href }: GlassCardProps) {
  return (
    <Link
      href={href}
      className="group block h-full"
    >
      <article className="h-full p-6 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/60 shadow-sm transition-all duration-300 ease-out hover:bg-white/60 hover:shadow-md hover:-translate-y-1 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:outline-none will-change-transform">
        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-indigo-700">
              {title}
            </h3>
            <p className="text-sm font-medium text-indigo-600 mt-1">
              {subtitle}
            </p>
          </div>
          <p className="text-gray-700 leading-relaxed line-clamp-3">
            {description}
          </p>
          <div className="flex items-center text-sm font-semibold text-indigo-600 transition-transform duration-300 group-hover:translate-x-1">
            <span>Learn more</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>
    </Link>
  );
}