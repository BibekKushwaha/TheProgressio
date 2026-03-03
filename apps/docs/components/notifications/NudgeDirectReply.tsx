'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NudgeDirectReplyProps {
    isReplying: boolean;
    onSend: (text: string) => Promise<void>;
}

export function NudgeDirectReply({ isReplying, onSend }: NudgeDirectReplyProps) {
    const [draft, setDraft] = useState('');

    const handleSend = async () => {
        const text = draft.trim();
        if (!text) return;
        try {
            await onSend(text);
            setDraft(''); // only clear on success
        } catch {
            // error toast handled in useNudgeActions — draft preserved for retry
        }
    };

    return (
        <div className="mt-3 flex items-center gap-2">
            <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Quick reply from notification..."
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                maxLength={240}
            />
            <Button
                size="sm"
                onClick={handleSend}
                disabled={isReplying || !draft.trim()}
                className="bg-indigo-500 hover:bg-indigo-600"
                title={isReplying ? 'Sending...' : 'Send reply'}
            >
                <Send className="w-3 h-3" />
            </Button>
        </div>
    );
}
