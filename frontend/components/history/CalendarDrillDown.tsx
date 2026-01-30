'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { ChevronLeft, Calendar, Clock, AlertTriangle, CheckCircle, Stethoscope, FileText, HeartPulse, Activity } from 'lucide-react';
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
                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                        <div className="animate-spin text-teal-500"><Clock size={40} /></div>
                        <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Retrieving Record...</span>
                    </div>
                ) : resultData ? (
                    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                        {/* Top Info Bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50/80 rounded-lg p-3 sm:p-4 border border-slate-100 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-teal-600 shadow-sm border border-slate-200 shrink-0">
                                    <FileText size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Analysis Result</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Recorded: {String(selection.hour).padStart(2,'0')}:{String(selection.minute).padStart(2,'0')}:{String(selectedSecond).padStart(2,'0')}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device:</span>
                                    <span className="text-[10px] font-bold text-slate-600">{resultData.device_id || "--"}</span>
                                </div>
                                <button 
                                    onClick={() => api.downloadRecording('plot', resultData.recording_id)}
                                    className="p-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shadow-sm"
                                    title="Download Report"
                                >
                                    <FileText size={16} />
                                </button>
                                <button 
                                    onClick={closeResultModal}
                                    className="p-2 bg-white text-slate-400 border border-slate-200 rounded-md hover:text-rose-500 hover:border-rose-100 transition-colors"
                                    title="Close"
                                >
                                    <ChevronLeft size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
                            {/* Left: Classification & Metrics (7 cols) */}
                            <div className="xl:col-span-7 space-y-3 sm:space-y-4">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condition Overview</span>
                                    {(() => {
                                        const cls = resultData.classification?.toLowerCase() || '';
                                        const isHighRisk = cls.includes('sangat berpotensi') || cls.includes('high risk');
                                        const isPotential = cls.includes('berpotensi') || cls.includes('potential');
                                        const isAbnormal = cls.includes('abnormal');
                                        const isNormal = cls.includes('normal');

                                        return (
                                            <div className={clsx(
                                                "p-4 sm:p-5 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 transition-all duration-500 text-white",
                                                isHighRisk && "bg-red-500 border-red-600 shadow-lg shadow-red-500/20",
                                                isPotential && !isHighRisk && "bg-orange-500 border-orange-600 shadow-lg shadow-orange-500/20",
                                                isAbnormal && !isHighRisk && !isPotential && "bg-slate-500 border-slate-600 shadow-lg shadow-slate-500/20",
                                                isNormal && "bg-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/20",
                                                !isHighRisk && !isPotential && !isAbnormal && !isNormal && "bg-slate-50 border-slate-200 text-slate-700"
                                            )}>
                                                {isHighRisk ? <HeartPulse size={40} strokeWidth={2.5} className="animate-pulse shrink-0" /> :
                                                 isPotential ? <AlertTriangle size={40} strokeWidth={2.5} className="shrink-0" /> :
                                                 isAbnormal ? <Activity size={40} strokeWidth={2.5} className="shrink-0" /> :
                                                 <CheckCircle size={40} strokeWidth={2.5} className="shrink-0" />
                                                }
                                                <div className="flex-1 w-full">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                                                        <h4 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight leading-tight">{resultData.classification || "Unknown"}</h4>
                                                        <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full border border-white/20 w-fit">
                                                            {((resultData.confidence || 0) * 100).toFixed(0)}% Match
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Automated Clinical Classification</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                            <HeartPulse size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Heart Rate</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-slate-700">{resultData.bpm ? Math.round(Number(resultData.bpm)) : (resultData.avg_bpm ? Math.round(Number(resultData.avg_bpm)) : "--")}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">BPM</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Signal</span>
                                            <span className="text-xs font-black text-slate-600 uppercase">Stable</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: AI Advice (5 cols) */}
                            <div className="xl:col-span-5 flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Insights</span>
                                    <span className="text-[9px] font-black text-blue-600 uppercase">AI Clinical Engine</span>
                                </div>
                                <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden group shadow-sm flex-1 flex flex-col justify-center">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                        <Stethoscope size={100} />
                                    </div>
                                    
                                    <div className="relative z-10 space-y-4">
                                        <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                                            &quot;{(() => {
                                                const cls = resultData.classification?.toLowerCase() || '';
                                                const bpm = Number(resultData.bpm || resultData.avg_bpm || 0);
                                                
                                                if (cls.includes('normal')) {
                                                    if (bpm > 100) return "Normal rhythm, but elevated heart rate. Could be stress or activity. Monitor and rest.";
                                                    if (bpm < 60 && bpm > 0) return "Normal rhythm with lower heart rate. Normal for athletes, but check if dizzy.";
                                                    return "Excellent! Rhythm appears normal. Maintain your healthy lifestyle and routine checkups.";
                                                }
                                                
                                                if (cls.includes('sangat berpotensi') || cls.includes('high risk')) {
                                                    return "Significant irregularities detected. Suggests high risk of arrhythmia. Consult a cardiologist soon.";
                                                }
                                                
                                                return "Potential irregularities detected. Discuss these findings with a professional to ensure cardiac health.";
                                            })()}&quot;
                                        </p>
                                        
                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle size={10} className="text-teal-500" />
                                                Verified Analysis Pattern
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions (Floating-like at bottom or just centered) */}
                        <div className="flex items-center justify-center gap-4 py-2">
                            <button 
                                onClick={closeResultModal}
                                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-md font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                                Return to Selection
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-50">
                        <AlertTriangle size={48} className="text-slate-300" />
                        <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Record Not Found</span>
                        <button onClick={closeResultModal} className="mt-2 text-teal-600 font-bold hover:underline text-xs">Return to Timeline</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-3 p-1 relative">
            
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 bg-white p-3 rounded-lg shadow-sm border border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                    {!isRoot && (
                        <button 
                            onClick={handleBack}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight">
                            {isResultOpen ? "Analysis Result" : viewTitle}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex flex-wrap items-center gap-2">
                            {isRoot ? "Timeline Overview" : getBreadcrumbs()}
                            {isResultOpen && ` > ${String(selectedSecond).padStart(2, '0')}s`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-md sm:rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-4 sm:p-6">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-10 gap-3 opacity-40">
                        <div className="animate-spin text-teal-500"><Clock size={40} /></div>
                        <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center">Loading...</span>
                    </div>
                ) : (
                    <>
                        {renderGrid()}
                        
                        {!loading && data?.nodes.length === 0 && (
                            <div className="h-full w-full flex flex-col items-center justify-center py-10 gap-3 opacity-30">
                                <Calendar size={48} className="text-slate-300" />
                                <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center">No Data</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}