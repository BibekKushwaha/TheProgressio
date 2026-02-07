import GlassCard, { GlassCardProps } from './glasscard';

interface GlassCardGridProps {
  cards: GlassCardProps[];
}

export default function GlassCardGrid({ cards }: GlassCardGridProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <GlassCard
            key={`${card.href}-${index}`}
            title={card.title}
            subtitle={card.subtitle}
            description={card.description}
            href={card.href}
          />
        ))}
      </div>
    </div>
  );
}