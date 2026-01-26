'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle, Activity, HeartPulse } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getApiUrl } from '@/services/api';
import clsx from 'clsx';

export default function LoginPage() {
    // 1. State
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [showErrorEffect, setShowErrorEffect] = useState(false);

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

    const triggerErrorEffect = () => {
        setShowErrorEffect(true);
        setTimeout(() => setShowErrorEffect(false), 400);
    };

    // 4. Handlers
    const handleFocus = () => {
        if (serverError) setServerError('');
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');

        const userErr = !usernameOrEmail ? "Required" : validateField('usernameOrEmail', usernameOrEmail);
        const passErr = !password ? "Required" : validateField('password', password);

        if (userErr || passErr) {
            setErrors({ usernameOrEmail: userErr, password: passErr });
            
            // Relevant Error Message Logic
            let msg = "Please correct the errors.";
            if (userErr === "Required" || passErr === "Required") {
                msg = "Please enter both username and password.";
            } else if (userErr) {
                msg = userErr;
            } else if (passErr) {
                msg = passErr;
            }

            setServerError(msg);
            triggerErrorEffect();
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
            triggerErrorEffect();
            console.error(err);
            let msg = 'Login failed.';
            if (axios.isAxiosError(err) && err.response?.data?.detail) {
                const detail = err.response.data.detail;
                msg = Array.isArray(detail) ? detail[0].msg : detail;
            } else if (err instanceof Error) {
                // Network errors often appear here
                msg = "Unable to connect to server. Please check your connection.";
            }
            setServerError(msg);
        } finally {
            setLoading(false);
        }
    };

    // 5. Render
    return (
        <div className="flex min-h-screen bg-white overflow-hidden font-sans">
            
            {/* Left Side: Medical Branding & Art */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-brand-600 auth-split-bg medical-grid-pattern items-center justify-center overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-brand-900/20"></div>
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl"></div>
                
                {/* Content */}
                <div className="relative z-10 text-center text-white px-12 max-w-lg animate-float">
                    <div className="mb-8 flex justify-center">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
                            <Activity className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">Advanced ECG Monitoring</h2>
                    <p className="text-brand-100 text-lg leading-relaxed font-medium">
                        Secure, real-time cardiac telemetry platform for healthcare professionals and patients.
                    </p>
                    
                    {/* Simulated ECG Line */}
                    <div className="mt-12 w-full h-24 relative opacity-50">
                        <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                            <path d="M0,50 L50,50 L60,20 L70,80 L80,50 L120,50 L130,20 L140,80 L150,50 L300,50 L310,10 L330,90 L350,50 L500,50" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                className="text-brand-200"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col p-8 bg-slate-50 lg:bg-white relative">
                <div className={clsx(
                    "w-full max-w-[420px] m-auto bg-white lg:bg-transparent p-10 lg:p-0 rounded-3xl lg:rounded-none shadow-xl lg:shadow-none transition-transform",
                    // Removed 'isShaking' from container
                )}>
                    
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2 lg:hidden">
                            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            <span className="font-bold text-xl text-slate-900">ECG Monitor</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h1>
                        <p className="text-slate-400 font-medium mt-2">Sign in to access your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">

                        {/* Error Alert */}
                        {serverError && (
                            <div className={clsx(
                                "py-3 px-4 bg-rose-50 border border-rose-100 rounded-2xl mb-4", 
                                showErrorEffect && "animate-error-pop"
                            )}>
                                <div className="flex items-start gap-3 text-rose-600">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span className="text-sm font-semibold leading-tight">{serverError}</span>
                                </div>
                            </div>
                        )}

                        {/* Inputs */}
                        <div className="space-y-5">
                            <div className="group space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Username or Email</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <User className={clsx("w-5 h-5 transition-colors", errors.usernameOrEmail ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                    </div>
                                    <input
                                        type="text"
                                        value={usernameOrEmail}
                                        onChange={(e) => handleFieldChange('usernameOrEmail', e.target.value)}
                                        onFocus={handleFocus}
                                        className={clsx(
                                            "w-full pl-12 pr-4 py-3.5 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white",
                                            errors.usernameOrEmail
                                                ? "border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                                                : "border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                                        )}
                                        placeholder="Enter your username"
                                        autoFocus
                                    />
                                </div>
                                {errors.usernameOrEmail && <span className="text-xs font-bold text-rose-500 block ml-1">{errors.usernameOrEmail}</span>}
                            </div>

                            <div className="group space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Lock className={clsx("w-5 h-5 transition-colors", errors.password ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => handleFieldChange('password', e.target.value)}
                                        onFocus={handleFocus}
                                        className={clsx(
                                            "w-full pl-12 pr-12 py-3.5 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white",
                                            errors.password
                                                ? "border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                                                : "border-slate-100 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                                        )}
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <span className="text-xs font-bold text-rose-500 block ml-1">{errors.password}</span>}
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 text-sm active:scale-[0.98] flex items-center justify-center gap-3 group"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In to Dashboard</span>
                                        <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Don&apos;t have an account? 
                            <Link href="/register" className="text-brand-600 font-bold hover:underline ml-2 hover:text-brand-700 transition-colors">
                                Register
                            </Link>
                        </p>
                    </div>
                    
                    {/* Compliance/Footer Note */}
                    <div className="mt-12 text-center border-t border-slate-100 pt-6">
                        <div className="flex items-center justify-center gap-2 text-slate-300 text-xs font-medium">
                            <HeartPulse size={14} />
                            <span>HIPAA Compliant Standard</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
