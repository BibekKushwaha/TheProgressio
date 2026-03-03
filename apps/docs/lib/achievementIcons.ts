import {
    Award,
    Crown,
    Flame,
    Medal,
    Rocket,
    Shield,
    Star,
    Sword,
    Target,
    Trophy,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared icon map for achievement badges.
 * Used by BadgeCard, AchievementDetailModal, and any other
 * component that needs to resolve an icon name → Lucide component.
 */
export const achievementIconMap: Record<string, LucideIcon> = {
    Award,
    Crown,
    Flame,
    Medal,
    Rocket,
    Shield,
    Star,
    Sword,
    Target,
    Trophy,
    Zap,
};
