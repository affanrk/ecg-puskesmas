'use client';

import { useState, useRef, useEffect } from 'react';

import clsx from 'clsx';
import { MapPin, ChevronDown, Search } from 'lucide-react';

import { LocationResponse } from '@/types/user';

interface LocationFilterSingleProps {
    locations: LocationResponse[];
    selectedLocationId: string | null;
    onChange: (locationId: string | null) => void;
    placeholder?: string;
}

export default function LocationFilterSingle({
    locations,
    selectedLocationId,
    onChange,
    placeholder = 'All Locations'
}: LocationFilterSingleProps) {
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

    const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
    
    const filteredLocations = locations.filter(loc => 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.location_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (locationId: string | null) => {
        onChange(locationId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 min-w-[180px] flex items-center justify-between bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
                <span className={clsx(
                    "truncate",
                    selectedLocation ? "text-slate-700" : "text-slate-400"
                )}>
                    {selectedLocation ? `${selectedLocation.location_code} - ${selectedLocation.name}` : placeholder}
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

                    <div className="max-h-60 overflow-y-auto">
                        <button
                            onClick={() => handleSelect(null)}
                            className={clsx(
                                "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2",
                                !selectedLocationId && "bg-violet-50 text-violet-700 font-medium"
                            )}
                        >
                            <MapPin size={14} className="text-slate-400" />
                            {placeholder}
                        </button>

                        {filteredLocations.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                No locations found
                            </div>
                        ) : (
                            filteredLocations.map(location => (
                                <button
                                    key={location.id}
                                    onClick={() => handleSelect(location.id)}
                                    className={clsx(
                                        "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2",
                                        selectedLocationId === location.id && "bg-violet-50 text-violet-700 font-medium",
                                        !location.is_active && "opacity-50"
                                    )}
                                >
                                    <MapPin size={14} className={clsx(
                                        selectedLocationId === location.id ? "text-violet-500" : "text-slate-400"
                                    )} />
                                    <div className="flex-1 truncate">
                                        <span className="font-medium">{location.location_code}</span>
                                        <span className="text-slate-500"> - {location.name}</span>
                                        {!location.is_active && <span className="text-slate-400 text-xs ml-1">(Inactive)</span>}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
