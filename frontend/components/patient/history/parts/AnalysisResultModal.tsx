import clsx from 'clsx';
import { AnalysisResult } from '@/types/models';

interface AnalysisResultModalProps {
    result: AnalysisResult;
    onClose: () => void;
}

export function AnalysisResultModal({ result, onClose }: AnalysisResultModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-hidden rounded-md shadow-xl relative flex flex-col z-10 mx-auto">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Analisis Rekaman</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {new Date(result.changed_dt || result.timestamp).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={clsx(
                            "p-6 rounded-md border shadow-sm transition-all flex flex-col justify-center",
                            ((result.classification || result.classification_result)?.toLowerCase() || '').includes('sangat berpotensi') 
                                ? "bg-rose-50 border-rose-100 text-rose-700" 
                                : ((result.classification || result.classification_result)?.toLowerCase() || '').includes('berpotensi')
                                ? "bg-orange-50 border-orange-100 text-orange-700"
                                : "bg-white border-slate-100 text-slate-700"
                        )}>
                            <span className="text-[10px] font-black uppercase tracking-widest block mb-2 opacity-60">Klasifikasi</span>
                            <span className="text-xl font-black leading-tight">
                                {(result.classification || result.classification_result)}
                            </span>
                        </div>
                        <MetricCard label="Detak Jantung" value={`${Math.round(Number(result.parameters?.find(p => p.heart_rate_bpm)?.heart_rate_bpm || 0))} BPM`} />
                    </div>
                    <div className="p-5 bg-slate-50 rounded-md border border-slate-100">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Wawasan Klinis AI
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                            &quot;{(() => {
                                const cls = (result.classification || result.classification_result)?.toLowerCase() || '';
                                if (cls.includes('normal')) return "Irama jantung tampak stabil dan dalam batas normal. Lanjutkan pemantauan rutin.";
                                if (cls.includes('sangat berpotensi')) return "Ketidakteraturan signifikan terdeteksi. Analisis menunjukkan risiko tinggi. Harap segera konsultasikan dengan profesional.";
                                if (cls.includes('berpotensi')) return "Variasi irama jantung terdeteksi. Harap diskusikan hasil ini dengan tenaga medis untuk memastikan kesehatan jantung Anda.";
                                return "Ketidakteraturan potensial teridentifikasi. Variasi ini menyarankan tinjauan medis lebih lanjut.";
                            })()}&quot;
                        </p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                    <button onClick={onClose} className="px-8 py-2.5 bg-slate-900 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 cursor-pointer">
                        Tutup Analisis
                    </button>
                </div>
            </div>
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
