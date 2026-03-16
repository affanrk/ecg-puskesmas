import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ApprovalsComingSoonProps {
    type: 'operator' | 'doctor';
}

export function ApprovalsComingSoon({ type }: ApprovalsComingSoonProps) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800">Section Coming Soon</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {type === 'operator' ? "Operator & Nurse" : "Specialist Doctor"} module is under development
            </p>
        </div>
    );
}
