'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import clsx from 'clsx';

import AgendaView from './calendar/AgendaView';
import CalendarHeader from './calendar/CalendarHeader';
import CalendarSidebar from './calendar/CalendarSidebar';
import MonthCalendar from './calendar/MonthCalendar';
import { AnalysisResultModal } from './parts/AnalysisResultModal';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { useStore } from '@/store/useStore';
import { AnalysisResult, CalendarNode } from '@/types/models';

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

    const isFetchingYear = useRef(false);
    const isFetchingMonthChoices = useRef(false);
    const isFetchingMonthData = useRef(false);

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const fetchYearData = useCallback(async () => {
        if (!user?.id || isFetchingYear.current) return;
        isFetchingYear.current = true;
        try {
            const res = await api.fetchCalendar({ user_id: user.id });
            setYearNodes(res.nodes || []);
        } catch (error) {
            console.error("Failed to fetch year summary:", error);
        } finally {
            isFetchingYear.current = false;
        }
    }, [user?.id]);

    const fetchMonthChoices = useCallback(async () => {
        if (!user?.id || isFetchingMonthChoices.current) return;
        isFetchingMonthChoices.current = true;
        try {
            const res = await api.fetchCalendar({
                year: currentYear,
                user_id: user.id
            });
            setMonthNodes(res.nodes || []);
        } catch (error) {
            console.error("Failed to fetch month summary:", error);
        } finally {
            isFetchingMonthChoices.current = false;
        }
    }, [currentYear, user?.id]);

    const fetchMonthData = useCallback(async () => {
        if (!user?.id || isFetchingMonthData.current) return;
        isFetchingMonthData.current = true;
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
            isFetchingMonthData.current = false;
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
            const filteredResults = (results as AnalysisResult[]).filter((r: AnalysisResult) => (r.classification || r.classification_result) !== 'Unknown' && (r.classification || r.classification_result) !== 'Insufficient Data');
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
                <AnalysisResultModal result={selectedResult.data} onClose={() => setSelectedResult({ data: null })} />
            )}
        </div>
    );
}
