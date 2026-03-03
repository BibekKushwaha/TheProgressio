'use client';

import Image from 'next/image';
import type { RichMediaInfo } from './notificationUtils';

interface NudgeRichMediaProps {
    media: RichMediaInfo;
}

export function NudgeRichMedia({ media }: NudgeRichMediaProps) {
    if (media.type.toUpperCase() === 'VIDEO') {
        return (
            <div className="mb-3 rounded-lg border border-white/10 overflow-hidden bg-black/20">
                <video src={media.url} controls className="w-full max-h-52 object-cover" />
            </div>
        );
    }

    return (
        <div className="mb-3 rounded-lg border border-white/10 overflow-hidden bg-black/20">
            <div className="relative w-full h-52">
                <Image
                    src={media.url}
                    alt="Notification media"
                    fill
                    sizes="(max-width: 500px) 93vw, 468px"
                    className="object-cover"
                />
            </div>
        </div>
    );
}
