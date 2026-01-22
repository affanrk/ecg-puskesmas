'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';

export default function LoginPage() {
    // 1. State
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    
    // 2. Hooks
    const { show: toast } = useToast();

    // 3. Helpers
    const validateField = (field: string, value: string) => {
        let error = "";
        if (field === 'usernameOrEmail') {
            if (value.length > 0 && value.length < 3) error = "Username or email too short";
        } else if (field === 'password') {
            if (value.length > 0 && value.length < 8) error = "Min 8 characters";
        }
        return error;
    };

    const handleFieldChange = (field: string, value: string) => {
        if (field === 'usernameOrEmail') setUsernameOrEmail(value);
        else if (field === 'password') setPassword(value);
        
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const getApiUrl = () => {
        if (typeof window !== 'undefined') {
            const win = window as unknown as { __ENV__?: Record<string, string> };
            if (win.__ENV__) {
                return win.__ENV__.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
            }
        }
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
    };

    // 4. Handlers
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');
        
        const userErr = !usernameOrEmail ? "Required" : validateField('usernameOrEmail', usernameOrEmail);
        const passErr = !password ? "Required" : validateField('password', password);

        if (userErr || passErr) {
            setErrors({ usernameOrEmail: userErr, password: passErr });
            setServerError("Please correct the errors before continuing.");
            triggerShake();
            return;
        }

        setLoading(true);
        
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');

        const API_BASE_URL = getApiUrl();

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username_or_email: usernameOrEmail,
                password
            });

            const data = response.data;
            
            const userData = {
                id: data.user_id,
                username: data.user_name,
                role: data.role,
                is_patient: data.is_patient
            };

            localStorage.setItem('ecg_token', data.access_token);
            localStorage.setItem('ecg_user', JSON.stringify(userData));
            
            toast("Welcome back!", "success");

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);
        } catch (err: unknown) {
            triggerShake();
            console.error(err);
            let msg = 'Login failed.';
            if (axios.isAxiosError(err) && err.response?.data?.detail) {
                const detail = err.response.data.detail;
                msg = Array.isArray(detail) ? detail[0].msg : detail;
            }
            setServerError(msg);
        } finally {
            setLoading(false);
        }
    };

    // 5. Render
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className={clsx(
                "w-full max-w-[400px] bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col relative overflow-hidden",
                isShaking && "animate-light-shake"
            )}>
                
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="relative z-10 text-center mb-8">
                    <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-brand-500/20 rotate-3 transition-transform hover:rotate-0 duration-500 cursor-default">
                        <LogIn className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400 text-xs mt-3 uppercase font-bold tracking-[0.2em]">Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                    
                    <div className={clsx("transition-all duration-300 overflow-hidden", serverError ? "h-12 opacity-100 mb-2" : "h-0 opacity-0")}>
                        <div className="w-full h-full px-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="truncate">{serverError}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="group">
                            <div className="relative">
                                <User className={clsx(
                                    "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10",
                                    errors.usernameOrEmail ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500"
                                )} />
                                <input
                                    type="text"
                                    value={usernameOrEmail}
                                    onChange={(e) => handleFieldChange('usernameOrEmail', e.target.value)}
                                    className={clsx(
                                        "w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                        errors.usernameOrEmail
                                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5"
                                            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5"
                                    )}
                                    placeholder="Username or Email"
                                    autoFocus
                                />
                            </div>
                            {errors.usernameOrEmail && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.usernameOrEmail}</span>}
                        </div>
                        
                        <div className="group">
                            <div className="relative">
                                <Lock className={clsx(
                                    "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10",
                                    errors.password ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500"
                                )} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => handleFieldChange('password', e.target.value)}
                                    className={clsx(
                                        "w-full pl-10 pr-10 py-3 rounded-xl border outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                        errors.password
                                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5"
                                            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5"
                                    )}
                                    placeholder="Password"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1 z-10"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {errors.password && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</span>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-500/25 text-[11px] mt-6 active:scale-[0.98] uppercase tracking-[0.2em] flex items-center justify-center gap-3 group"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                Sign In
                                <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-50 text-center relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Don&apos;t have an account? <Link href="/register" className="text-brand-600 font-black hover:underline ml-2 hover:text-brand-700 transition-colors">Create One</Link>
                    </p>
                </div>
            </div>

            <style jsx global>{`
                @keyframes light-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    50% { transform: translateX(2px); }
                    75% { transform: translateX(-1px); }
                }
                .animate-light-shake {
                    animation: light-shake 0.3s ease-in-out;
                }
            `}</style>
        </div>
    );
}