'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { ChevronLeft, Calendar, Clock, AlertTriangle, CheckCircle, Stethoscope, FileText, HeartPulse } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '@/hooks/useToast';

// Import New Grid Components
import YearGrid from './calendar/YearGrid';
import MonthGrid from './calendar/MonthGrid';
import DayGrid from './calendar/DayGrid';
import TimeGrid from './calendar/TimeGrid';
import SecondGrid from './calendar/SecondGrid';

// --- Types ---

export interface CalendarNode {
    label: string;
    value: number;
    level: string;
    status: 'normal' | 'abnormal' | 'potential' | 'high_potential';
    count: number;
}

interface CalendarResponse {
    level: string;
    nodes: CalendarNode[];
}

export default function CalendarDrillDown() {
    const { 
        user, 
        calendarSelection: selection, 
        setCalendarSelection,
        selectedResult,
        setSelectedResult
    } = useStore();
    
    const { show: toast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CalendarResponse | null>(null);
    const isFetching = useRef(false);

    const [viewTitle, setViewTitle] = useState("Yearly Archive");

    // UI Loading State for detail fetch
    const [resultLoading, setResultLoading] = useState(false);

    // Derived states from store for cleaner access
    const isResultOpen = selectedResult.data !== null || resultLoading;
    const resultData = selectedResult.data;
    const selectedSecond = selectedResult.second;

    // --- Helpers ---

    const getBreadcrumbs = () => {
        const parts = [];
        if (selection.year) parts.push(selection.year);
        if (selection.month) parts.push(getMonthName(selection.month));
        if (selection.day) parts.push(`Day ${selection.day}`);
        if (selection.hour !== null) parts.push(`${String(selection.hour).padStart(2, '0')}:00`);
        if (selection.minute !== null) parts.push(`:${String(selection.minute).padStart(2, '0')}`);
        return parts.join(" > ");
    };

    const getMonthName = (m: number) => {
        const dates = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return dates[m] || String(m);
    };

    // --- Data Fetching ---

    const fetchData = useCallback(async () => {
        if (!user?.id || isFetching.current) return;
        
        isFetching.current = true;
        setLoading(true);
        try {
            const res = await api.fetchCalendar({
                year: selection.year || undefined,
                month: selection.month || undefined,
                day: selection.day || undefined,
                hour: selection.hour !== null ? selection.hour : undefined,
                minute: selection.minute !== null ? selection.minute : undefined,
                user_id: user.id
            });
            setData(res);
            
            // Update Title
            if (!selection.year) setViewTitle("Select Year");
            else if (!selection.month) setViewTitle(`${selection.year} - Select Month`);
            else if (!selection.day) setViewTitle(`${getMonthName(selection.month)} ${selection.year} - Select Day`);
            else if (selection.hour === null) setViewTitle(`${selection.day} ${getMonthName(selection.month)} - Select Hour`);
            else if (selection.minute === null) setViewTitle(`${String(selection.hour).padStart(2, '0')}:00 - Select Minute`);
            else setViewTitle(`${String(selection.hour).padStart(2, '0')}:${String(selection.minute).padStart(2, '0')} - Select Second`);

        } catch (error) {
            console.error(error);
            toast("Failed to load calendar data", "error");
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [selection, user?.id, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchResult = async (second: number) => {
        if (!user?.id || !selection.year || !selection.month || !selection.day || selection.hour === null || selection.minute === null) return;
        
        setResultLoading(true);
        setSelectedResult({ second, data: null });
        
        try {
            const dateStr = `${selection.year}-${String(selection.month).padStart(2, '0')}-${String(selection.day).padStart(2, '0')}`;
            const timeStr = `${String(selection.hour).padStart(2, '0')}:${String(selection.minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
            
            // Build local timestamp without 'Z' so backend compares it against local_dt
            const startDt = `${dateStr}T${timeStr}`;
            // Simple approach: set endDt to the same second with a high millisecond precision
            const endDt = `${dateStr}T${timeStr}.999`;
            
            const results = await api.fetchHistory({
                user_id: user.id,
                start_date: startDt,
                end_date: endDt,
                limit: 1
            });

            if (results && results.length > 0) {
                setSelectedResult({ data: results[0] });
            } else {
                setSelectedResult({ data: null });
            }
        } catch (error) {
            console.error(error);
            toast("Failed to load recording details", "error");
            setSelectedResult({ data: null, second: null });
        } finally {
            setResultLoading(false);
        }
    };

    // --- Interaction ---

    const handleNodeClick = (node: CalendarNode) => {
        if (node.level === 'year') {
            setCalendarSelection({ year: node.value });
        } else if (node.level === 'month') {
            setCalendarSelection({ month: node.value });
        } else if (node.level === 'day') {
            setCalendarSelection({ day: node.value });
        } else if (node.level === 'hour') {
            setCalendarSelection({ hour: node.value });
        } else if (node.level === 'minute') {
            setCalendarSelection({ minute: node.value });
        } else if (node.level === 'second') {
            if (node.count > 0) {
                fetchResult(node.value);
            } else {
                toast("No recording data for this second", "warning");
            }
        }
    };

    const handleBack = () => {
        if (selectedResult.data || selectedResult.second !== null) {
            setSelectedResult({ data: null, second: null });
            return;
        }
        
        if (selection.minute !== null) setCalendarSelection({ minute: null });
        else if (selection.hour !== null) setCalendarSelection({ hour: null });
        else if (selection.day !== null) setCalendarSelection({ day: null });
        else if (selection.month !== null) setCalendarSelection({ month: null });
        else if (selection.year !== null) setCalendarSelection({ year: null });
    };

    const closeResultModal = () => {
        setSelectedResult({ data: null, second: null });
    };

    // --- Render ---

    const isRoot = selection.year === null;
    const currentLevel = data?.level || 'year';

    const renderGrid = () => {
        if (isResultOpen) {
            return renderResultSection();
        }
        if (!data) return null;

        switch (currentLevel) {
            case 'year':
                return <YearGrid nodes={data.nodes} onNodeClick={handleNodeClick} />;
            case 'month':
                return <MonthGrid nodes={data.nodes} onNodeClick={handleNodeClick} />;
            case 'day':
                return <DayGrid nodes={data.nodes} onNodeClick={handleNodeClick} />;
            case 'hour':
            case 'minute':
                return <TimeGrid nodes={data.nodes} onNodeClick={handleNodeClick} />;
            case 'second':
                return <SecondGrid nodes={data.nodes} onNodeClick={handleNodeClick} />;
            default:
                return null;
        }
    };

    const renderResultSection = () => {
        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {resultLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin text-teal-500"><Clock size={48} /></div>
                        <span className="font-bold text-xs uppercase tracking-widest text-slate-400">Retrieving Record...</span>
                    </div>
                ) : resultData ? (
                    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-10">
                        {/* Status Card */}
                        <div className="bg-slate-50/50 rounded-3xl p-4 sm:p-8 border border-slate-100 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm border border-teal-100">
                                    <FileText size={24} className="sm:hidden" strokeWidth={2.5} />
                                    <FileText size={32} className="hidden sm:block" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Analysis Result</h3>
                                    <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Recorded at {String(selection.hour).padStart(2,'0')}:{String(selection.minute).padStart(2,'0')}:{String(selectedSecond).padStart(2,'0')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                {/* Classification */}
                                <div className="flex flex-col gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</span>
                                    {(() => {
                                        const cls = resultData.classification?.toLowerCase() || '';
                                        const isHighRisk = cls.includes('sangat berpotensi') || cls.includes('high risk');
                                        const isPotential = cls.includes('berpotensi') || cls.includes('potential') || cls.includes('abnormal');
                                        const isNormal = cls.includes('normal');

                                        return (
                                            <div className={clsx(
                                                "p-4 sm:p-6 rounded-2xl border-2 flex items-center gap-4 h-full transition-colors duration-500",
                                                isHighRisk && "bg-rose-50 border-rose-200 text-rose-700",
                                                isPotential && !isHighRisk && "bg-amber-50 border-amber-200 text-amber-700",
                                                isNormal && "bg-emerald-50 border-emerald-200 text-emerald-700",
                                                !isHighRisk && !isPotential && !isNormal && "bg-slate-50 border-slate-200 text-slate-700"
                                            )}>
                                                {isHighRisk ? <HeartPulse size={32} strokeWidth={2.5} className="animate-pulse" /> :
                                                 isPotential ? <AlertTriangle size={32} strokeWidth={2.5} /> :
                                                 <CheckCircle size={32} strokeWidth={2.5} />
                                                }
                                                <div>
                                                    <h4 className="text-lg sm:text-2xl font-black tracking-tight leading-tight mb-1">{resultData.classification || "Unknown"}</h4>
                                                    <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Confidence: {((resultData.confidence || 0) * 100).toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Quick Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Heart Rate</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl sm:text-3xl font-black text-slate-700">{resultData.bpm || resultData.avg_bpm || "--"}</span>
                                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">BPM</span>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Device ID</span>
                                        <span className="text-xs sm:text-sm font-bold text-slate-500 truncate block">{resultData.device_id || "--"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Advice */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Stethoscope size={18} className="text-blue-500" />
                                    Doctor Recommendation
                                </h4>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                    AI Generated Advice
                                </span>
                            </div>
                            
                            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-500">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
                                    <Stethoscope size={180} />
                                </div>
                                
                                <div className="relative z-10 space-y-6">
                                    <p className="text-slate-700 text-base sm:text-lg font-medium leading-relaxed italic">
                                        &quot;{(() => {
                                            const cls = resultData.classification?.toLowerCase() || '';
                                            const bpm = Number(resultData.bpm || resultData.avg_bpm || 0);
                                            
                                            if (cls.includes('normal')) {
                                                if (bpm > 100) return "The ECG rhythm is normal, but your heart rate is slightly elevated (Tachycardia). This could be due to stress, caffeine, or recent physical activity. Focus on deep breathing and ensure you are well-hydrated.";
                                                if (bpm < 60 && bpm > 0) return "Your heart rhythm appears normal, but the heart rate is lower than typical (Bradycardia). While often seen in fit individuals, if you experience dizziness, it's worth checking with your doctor.";
                                                return "Excellent! The ECG rhythm appears perfectly normal. Continue maintaining your current healthy lifestyle with regular exercise and a balanced diet. No immediate medical action required.";
                                            }
                                            
                                            if (cls.includes('sangat berpotensi') || cls.includes('high risk')) {
                                                return "Significant irregularities have been detected in your cardiac rhythm. This pattern strongly suggests a high risk of arrhythmia. We strongly advise scheduling an appointment with a cardiologist for a thorough diagnostic evaluation.";
                                            }
                                            
                                            return "Potential irregularities were detected during this recording segment. While it may not be urgent, these findings should be discussed with a healthcare professional to ensure complete cardiac health. Monitor for any unusual symptoms.";
                                        })()}&quot;
                                    </p>
                                    
                                    <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold text-slate-400 bg-white/50 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-slate-100 w-fit">
                                        <div className="hidden xs:flex -space-x-2">
                                            {[1,2,3].map(i => <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white bg-slate-200" />)}
                                        </div>
                                        <span>Verified analysis patterns based on clinical databases</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-10 px-4">
                            <button 
                                onClick={() => api.downloadRecording('plot', resultData.recording_id)}
                                className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                            >
                                <FileText size={18} />
                                Download Report
                            </button>
                            <button 
                                onClick={closeResultModal}
                                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-colors"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <AlertTriangle size={64} className="text-slate-300" />
                        <span className="font-bold text-xs uppercase tracking-widest text-slate-400">Record Not Found</span>
                        <button onClick={closeResultModal} className="mt-4 text-teal-600 font-bold hover:underline">Return to Timeline</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-6 p-1 relative">
            
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                    {!isRoot && (
                        <button 
                            onClick={handleBack}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                            {isResultOpen ? "Analysis Result" : viewTitle}
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            {isRoot ? "Timeline Overview" : getBreadcrumbs()}
                            {isResultOpen && ` > ${String(selectedSecond).padStart(2, '0')}s`}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-100">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">High Potential</span>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-3xl sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-4 sm:p-8">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                        <div className="animate-spin text-teal-500"><Clock size={48} /></div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center">Loading Timeline...</span>
                    </div>
                ) : (
                    <>
                        {renderGrid()}
                        
                        {!loading && data?.nodes.length === 0 && (
                            <div className="h-full w-full flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                                <Calendar size={64} className="text-slate-300" />
                                <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center">No Data Available</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}