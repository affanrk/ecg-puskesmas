'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useStore, AnalysisResult } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarSidebar from './calendar/CalendarSidebar';
import MonthCalendar from './calendar/MonthCalendar';
import AgendaView from './calendar/AgendaView';

export interface CalendarNode {
    label: string;
    value: number;
    level: string;
    status: 'normal' | 'abnormal' | 'potential' | 'high_potential';
    count: number;
    classifications?: Record<string, number>;
}

export default function CalendarDrillDown() {
    const { 
        user, 
        selectedResult,
        setSelectedResult
    } = useStore();
    const { show: toast } = useToast();
    const [view, setView] = useState<'month' | 'agenda'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [startTime, setStartTime] = useState("00:00:00");
    const [endTime, setEndTime] = useState("23:59:59");
    const [loading, setLoading] = useState(false);
    const [calendarNodes, setCalendarNodes] = useState<CalendarNode[]>([]);
    const [miniCalendarNodes, setMiniCalendarNodes] = useState<CalendarNode[]>([]);
    const [yearNodes, setYearNodes] = useState<CalendarNode[]>([]);
    const [monthNodes, setMonthNodes] = useState<CalendarNode[]>([]);
    const [dayResults, setDayResults] = useState<AnalysisResult[]>([]);
    const [filters, setFilters] = useState({
        highRisk: true,
        potential: true,
        abnormal: true
    });

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const fetchYearData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await api.fetchCalendar({ user_id: user.id });
            setYearNodes(res.nodes || []);
        } catch (error) {
            console.error("Failed to fetch year summary:", error);
        }
    }, [user?.id]);

    const fetchMonthChoices = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await api.fetchCalendar({
                year: currentYear,
                user_id: user.id
            });
            setMonthNodes(res.nodes || []);
        } catch (error) {
            console.error("Failed to fetch month summary:", error);
        }
    }, [currentYear, user?.id]);

    const fetchMonthData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setCalendarNodes([]);
        try {
            const res = await api.fetchCalendar({
                year: currentYear,
                month: currentMonth + 1,
                user_id: user.id
            });
            const nodes = res.nodes || [];
            setCalendarNodes(nodes);
            setMiniCalendarNodes(nodes);
        } catch (error) {
            console.error(error);
            toast("Failed to load calendar data", "error");
        } finally {
            setLoading(false);
        }
    }, [currentYear, currentMonth, user?.id, toast]);

    const handleMiniDateChange = useCallback(async (date: Date) => {
        if (!user?.id) return;
        if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
            setMiniCalendarNodes(calendarNodes);
            return;
        }
        try {
            const res = await api.fetchCalendar({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                user_id: user.id
            });
            setMiniCalendarNodes(res.nodes || []);
        } catch (error) {
            console.error("Failed to fetch mini-calendar indicators:", error);
        }
    }, [currentDate, calendarNodes, user?.id]);

    const fetchDayData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        setDayResults([]);
        try {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const startDt = `${dateStr}T${startTime}`;
            const endDt = `${dateStr}T${endTime}`;
            const results = await api.fetchHistory({
                user_id: user.id,
                start_date: startDt,
                end_date: endDt,
                limit: 200
            });
            const filteredResults = results.filter((r: AnalysisResult) => r.classification !== 'Unknown' && r.classification !== 'Insufficient Data');
            setDayResults(filteredResults);
        } catch (error) {
            console.error(error);
            toast("Failed to load records", "error");
        } finally {
            setLoading(false);
        }
    }, [currentDate, startTime, endTime, user?.id, toast]);

    useEffect(() => {
        fetchYearData();
    }, [fetchYearData]);

    useEffect(() => {
        fetchMonthChoices();
    }, [fetchMonthChoices]);

    useEffect(() => {
        fetchMonthData();
    }, [fetchMonthData]);

    useEffect(() => {
        if (view === 'agenda') {
            fetchDayData();
        }
    }, [view, fetchDayData]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleResetTime = useCallback(() => {
        setStartTime("00:00:00");
        setEndTime("23:59:59");
    }, []);

    const handlePrevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
        handleResetTime();
    };

    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
        handleResetTime();
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    const handleResultClick = (result: AnalysisResult) => {
        setSelectedResult({ data: result });
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <CalendarHeader 
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onDateSelect={setCurrentDate}
                currentDate={currentDate}
                view={view}
                onViewChange={setView}
                monthNodes={monthNodes}
                yearNodes={yearNodes}
                filters={filters}
            />
            <div className="flex flex-1 overflow-hidden">
                <CalendarSidebar 
                    currentDate={currentDate}
                    onDateSelect={handleDateSelect}
                    onMiniDateChange={handleMiniDateChange}
                    filters={filters}
                    onFilterChange={setFilters}
                    nodes={miniCalendarNodes}
                />
                <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/10">
                    <div className={clsx(
                        "flex-1 relative",
                        view === 'agenda' ? "overflow-y-auto" : "overflow-y-auto 2xl:overflow-hidden"
                    )}>
                        {view === 'month' ? (
                            <>
                                {loading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-40 z-20 bg-white/50 backdrop-blur-[1px]">
                                        <div className="animate-spin text-blue-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Syncing Records...</span>
                                    </div>
                                )}
                                <MonthCalendar 
                                    year={currentDate.getFullYear()}
                                    month={currentDate.getMonth() + 1}
                                    nodes={calendarNodes}
                                    onDateClick={handleDateSelect}
                                    onViewChange={setView}
                                    selectedDate={currentDate}
                                    filters={filters}
                                />
                            </>
                        ) : (
                            <div className="min-h-full">
                                <AgendaView 
                                    results={dayResults} 
                                    onResultClick={handleResultClick} 
                                    startTime={startTime}
                                    endTime={endTime}
                                    onStartTimeChange={setStartTime}
                                    onEndTimeChange={setEndTime}
                                    loading={loading}
                                    currentDate={currentDate}
                                    onPrevDay={handlePrevDay}
                                    onNextDay={handleNextDay}
                                    onResetTime={handleResetTime}
                                    filters={filters}
                                    onFilterChange={setFilters}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {selectedResult.data && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setSelectedResult({ data: null })} />
                    <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-hidden rounded-md shadow-xl relative flex flex-col z-10 mx-auto">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Analisis Rekaman</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {new Date(selectedResult.data.changed_dt || selectedResult.data.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedResult({ data: null })} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={clsx(
                                    "p-6 rounded-md border shadow-sm transition-all flex flex-col justify-center",
                                    (selectedResult.data.classification?.toLowerCase() || '').includes('sangat berpotensi') 
                                        ? "bg-rose-50 border-rose-100 text-rose-700" 
                                        : (selectedResult.data.classification?.toLowerCase() || '').includes('berpotensi')
                                        ? "bg-orange-50 border-orange-100 text-orange-700"
                                        : "bg-white border-slate-100 text-slate-700"
                                )}>
                                    <span className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-60">Klasifikasi</span>
                                    <span className="text-xl font-black leading-tight">
                                        {selectedResult.data.classification}
                                    </span>
                                </div>
                                <MetricCard label="Detak Jantung" value={`${Math.round(Number(selectedResult.data.bpm || selectedResult.data.avg_bpm || 0))} BPM`} />
                            </div>
                            <div className="p-5 bg-slate-50 rounded-md border border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Wawasan Klinis AI
                                </h3>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                                    &quot;{(() => {
                                        const cls = selectedResult.data.classification?.toLowerCase() || '';
                                        if (cls.includes('normal')) return "Irama jantung tampak stabil dan dalam batas normal. Lanjutkan pemantauan rutin.";
                                        if (cls.includes('sangat berpotensi')) return "Ketidakteraturan signifikan terdeteksi. Analisis menunjukkan risiko tinggi. Harap segera konsultasikan dengan profesional.";
                                        if (cls.includes('berpotensi')) return "Variasi irama jantung terdeteksi. Harap diskusikan hasil ini dengan tenaga medis untuk memastikan kesehatan jantung Anda.";
                                        return "Ketidakteraturan potensial teridentifikasi. Variasi ini menyarankan tinjauan medis lebih lanjut.";
                                    })()}&quot;
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                            <button onClick={() => setSelectedResult({ data: null })} className="px-8 py-2.5 bg-slate-900 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                                Tutup Analisis
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, color = "text-slate-800" }: { label: string, value: string | number, color?: string }) {
    return (
        <div className="bg-white border border-slate-100 p-6 rounded-md shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{label}</span>
            <span className={clsx("text-xl font-black leading-tight", color)}>{value}</span>
        </div>
    );
}
