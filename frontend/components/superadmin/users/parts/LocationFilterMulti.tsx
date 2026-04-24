'use client';

import { useState, useRef, useEffect } from 'react';
import { LocationResponse } from '@/types/user';
import { MapPin, ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

interface LocationFilterMultiProps {
    locations: LocationResponse[];
    selectedLocationIds: string[];
    onChange: (locationIds: string[]) => void;
    placeholder?: string;
}

export default function LocationFilterMulti({
    locations,
    selectedLocationIds,
    onChange,
    placeholder = 'All Locations'
}: LocationFilterMultiProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredLocations = locations.filter(loc => 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.location_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggle = (locationId: string) => {
        if (selectedLocationIds.includes(locationId)) {
            onChange(selectedLocationIds.filter(id => id !== locationId));
        } else {
            onChange([...selectedLocationIds, locationId]);
        }
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const displayText = selectedLocationIds.length === 0 
        ? placeholder 
        : `${selectedLocationIds.length} location${selectedLocationIds.length > 1 ? 's' : ''}`;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 min-w-[180px] flex items-center justify-between bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
                <span className={clsx(
                    "truncate",
                    selectedLocationIds.length > 0 ? "text-slate-700" : "text-slate-400"
                )}>
                    {displayText}
                </span>
                <ChevronDown size={14} className={clsx("ml-2 transition-transform text-slate-400", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 pb-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search locations..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {selectedLocationIds.length > 0 && (
                        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                {selectedLocationIds.length} selected
                            </span>
                            <button
                                onClick={handleClearAll}
                                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                            >
                                <X size={12} /> Clear all
                            </button>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto">
                        {filteredLocations.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                No locations found
                            </div>
                        ) : (
                            filteredLocations.map(location => {
                                const isSelected = selectedLocationIds.includes(location.id);
                                return (
                                    <label
                                        key={location.id}
                                        className={clsx(
                                            "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer",
                                            isSelected && "bg-violet-50",
                                            !location.is_active && "opacity-50"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggle(location.id)}
                                            className="w-4 h-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500 focus:ring-2 cursor-pointer"
                                        />
                                        <MapPin size={14} className={clsx(
                                            isSelected ? "text-violet-500" : "text-slate-400"
                                        )} />
                                        <div className="flex-1 truncate">
                                            <span className={clsx(
                                                "font-medium",
                                                isSelected && "text-violet-700"
                                            )}>
                                                {location.location_code}
                                            </span>
                                            <span className="text-slate-500"> - {location.name}</span>
                                            {!location.is_active && <span className="text-slate-400 text-xs ml-1">(Inactive)</span>}
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
