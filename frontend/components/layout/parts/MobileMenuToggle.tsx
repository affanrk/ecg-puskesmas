import React from 'react';
import { Menu, X } from 'lucide-react';

interface MobileMenuToggleProps {
    isOpen: boolean;
    onClick: () => void;
}

export function MobileMenuToggle({ isOpen, onClick }: MobileMenuToggleProps) {
    return (
        <button
            className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-md shadow-md border border-slate-200 text-slate-600 hover:text-teal-600 transition-colors cursor-pointer"
            onClick={onClick}
        >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
    );
}
