import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { calculateAge } from '@/utils/helpers';
import { X, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface PatientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PatientModal({ isOpen, onClose }: PatientModalProps) {
    const { setPatient } = useStore();
    const { show: toast } = useToast();
    const dateInputRef = useRef<HTMLInputElement>(null);
    const fpRef = useRef<any>(null);
    const [formData, setFormData] = useState({
        nik: '',
        name: '',
        dob: '',
        pob: '',
        gender: 'L',
        riwayat: 'Normal'
    });
    const [age, setAge] = useState<number | "">("");
    const [isAgePopping, setIsAgePop] = useState(false);

    // Initialize Flatpickr
    useEffect(() => {
        if (isOpen && dateInputRef.current) {
            fpRef.current = flatpickr(dateInputRef.current, {
                dateFormat: "Y-m-d",
                altInput: false,
                maxDate: "today",
                onChange: (selectedDates, dateStr) => {
                    setFormData(prev => ({ ...prev, dob: dateStr }));
                    if (dateStr) {
                        const newAge = calculateAge(dateStr);
                        setAge(newAge);
                        setIsAgePop(true);
                        setTimeout(() => setIsAgePop(false), 400);
                    }
                }
            });
        }
        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
                fpRef.current = null;
            }
        };
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nik || !formData.name || !formData.pob || !formData.dob) {
            toast("Please complete all fields.", "error");
            return;
        }

        setPatient({
            ...formData,
            age: age === "" ? 0 : age
        });
        toast(`Monitoring started for ${formData.name}`, "success");
        onClose();
        // Reset form
        setFormData({
            nik: '',
            name: '',
            dob: '',
            pob: '',
            gender: 'L',
            riwayat: 'Normal'
        });
        setAge("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
                onClick={onClose}
            ></div>
            
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">New Patient Session</h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Patient ID (NIK)</label>
                                <input 
                                    type="text"
                                    required
                                    value={formData.nik}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nik: e.target.value }))}
                                    className="block w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium placeholder:text-slate-300 transition-all outline-none"
                                    placeholder="16-digit number"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                                <input 
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="block w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium placeholder:text-slate-300 transition-all outline-none"
                                    placeholder="Enter full name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Birthplace</label>
                                <input 
                                    type="text"
                                    required
                                    value={formData.pob}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pob: e.target.value }))}
                                    className="block w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white text-xs font-medium placeholder:text-slate-300 transition-all outline-none"
                                    placeholder="City"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Date of Birth</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    </div>
                                    <input 
                                        type="text"
                                        ref={dateInputRef}
                                        placeholder="Select Date"
                                        className="pl-9 pr-3 py-2 text-xs font-medium w-full rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-brand-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-slate-700 shadow-sm cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 items-end">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Age</label>
                                <div className={clsx(
                                    "h-[38px] w-full rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md shadow-brand-200 text-white font-bold text-lg transition-all",
                                    isAgePopping && "age-pop"
                                )}>
                                    {age === "" ? 0 : age}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                                <select 
                                    value={formData.gender}
                                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                    className="block w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold outline-none cursor-pointer shadow-sm transition-all hover:border-brand-300"
                                >
                                    <option value="L">Male</option>
                                    <option value="P">Female</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Health History</label>
                            <select 
                                value={formData.riwayat}
                                onChange={(e) => setFormData(prev => ({ ...prev, riwayat: e.target.value }))}
                                className="block w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-xs font-semibold outline-none cursor-pointer shadow-sm transition-all hover:border-brand-300"
                            >
                                <option value="Normal">Normal / Healthy</option>
                                <option value="Hipertensi">Hypertension</option>
                                <option value="Jantung">Heart Condition</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-3 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg shadow-sm shadow-brand-200 hover:bg-brand-500 transition-all active:scale-95"
                        >
                            Start Session
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
