import React from 'react';

export function RecordingIndicator() {
    return (
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-md animate-in fade-in slide-in-from-right-2 duration-500 shadow-sm shadow-rose-100">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Recording Live</span>
        </div>
    );
}
