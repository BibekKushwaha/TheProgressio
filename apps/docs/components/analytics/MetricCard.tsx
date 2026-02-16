import { Badge } from '@/components/ui/badge';
import React from 'react';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  colorClass: string;
  colSpan?: number;
}

export function MetricCard({
  label,
  value,
  colorClass,
  colSpan = 1,
}: MetricCardProps) {
  const spanClass = colSpan === 2 ? 'col-span-2' : '';

  return (
    <div
      className={`rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between ${spanClass}`}
    >
      <p className="text-slate-400">{label}</p>
      <Badge className={`text-xl font-bold text-white ${colorClass}`}>
        {value}
      </Badge>
    </div>
  );
}

interface MetricGridProps {
  metrics: MetricCardProps[];
  className?: string;
}

export function MetricGrid({ metrics, className = '' }: MetricGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 text-sm ${className}`}>
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
