'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { UserPlus, User, Mail, Check, AlertCircle, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { getApiUrl } from '@/services/api';
import clsx from 'clsx';

export default function RegisterPage() {
    // 1. Hooks & State
    const router = useRouter();
    const { show: toast } = useToast();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [checks, setChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
        match: false,
        username: false,
        email: false
    });

    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // 2. Helpers
    const validateField = (field: string, value: string) => {
        let error = "";
        switch (field) {
            case 'username':
                if (value.length > 0 && value.length < 3) error = "Min 3 characters";
                else if (value.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(value)) error = "Alpha-numeric and _ - only";
                break;
            case 'email':
                if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format";
                break;
            case 'password':
                if (!value) return "";
                if (value.length < 8) return "Min 8 characters";
                if (!/[A-Z]/.test(value)) return "Need 1 uppercase letter";
                if (!/\d/.test(value)) return "Need 1 number";
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Need 1 symbol";
                break;
            case 'confirmPassword':
                if (value && value !== formData.password) error = "Passwords do not match";
                break;
        }
        return error;
    };

    const handleFieldChange = (field: string, value: string) => {
        const newFormData = { ...formData, [field]: value };
        setFormData(newFormData);

        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));

        // For confirm password, if we change password, we should also re-validate confirm
        if (field === 'password') {
            const confirmErr = validateField('confirmPassword', formData.confirmPassword);
            setErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
        }
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
    };

    // 3. Effects
    useEffect(() => {
        const pwd = formData.password;
        const usernameRegex = /^[a-zA-Z0-9_-]{3,}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        setChecks({
            length: pwd.length >= 8,
            upper: /[A-Z]/.test(pwd),
            lower: /[a-z]/.test(pwd),
            number: /\d/.test(pwd),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
            match: pwd.length > 0 && pwd === formData.confirmPassword,
            username: usernameRegex.test(formData.username),
            email: emailRegex.test(formData.email)
        });
    }, [formData]);

    // 4. Computed
    const isFormValid = Object.values(checks).every(Boolean);

    // 5. Handlers
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');

        const newErrors: Record<string, string> = {
            username: !formData.username ? "Required" : validateField('username', formData.username),
            email: !formData.email ? "Required" : validateField('email', formData.email),
            password: !formData.password ? "Required" : validateField('password', formData.password),
            confirmPassword: !formData.confirmPassword ? "Required" : validateField('confirmPassword', formData.confirmPassword)
        };

        if (Object.values(newErrors).some(e => e) || !isFormValid) {
            setErrors(newErrors);
            setServerError("Please fulfill all requirements.");
            triggerShake();
            return;
        }

        setLoading(true);
        const API_BASE_URL = getApiUrl();

        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                username: formData.username.trim(),
                email: formData.email,
                password: formData.password,
                role: 'user'
            });

            setSuccess(true);
            toast("Account created successfully!", "success");
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        } catch (err: unknown) {
            triggerShake();
            let msg = 'Registration failed.';
            if (axios.isAxiosError(err) && err.response?.data?.detail) {
                const detail = err.response.data.detail;
                msg = Array.isArray(detail) ? detail[0].msg : detail;
            }
            setServerError(msg);
        } finally {
            setLoading(false);
        }
    };

    // 7. Render
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className={clsx(
                "w-full max-w-[420px] bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col relative overflow-hidden",
                isShaking && "animate-light-shake"
            )}>

                <div className="text-center mb-8 relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-brand-500/20 group hover:rotate-3 transition-transform duration-500 cursor-default">
                        <UserPlus className="w-10 h-10 text-white" />
                        {isFormValid && !loading && !success && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Join Platform</h1>
                    <p className="text-slate-400 text-xs mt-3 uppercase font-bold tracking-[0.2em]">Create Your Account</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">

                    <div className={clsx("transition-all duration-300 overflow-hidden", serverError ? "h-12 opacity-100 mb-2" : "h-0 opacity-0")}>
                        <div className="w-full h-full px-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="truncate">{serverError}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="group">
                            <div className="relative">
                                <User className={clsx("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", errors.username ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                    className={clsx(
                                        "w-full pl-10 pr-9 py-2.5 rounded-xl border outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                        errors.username
                                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5"
                                            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5"
                                    )}
                                    placeholder="Username"
                                    autoFocus
                                />
                            </div>
                            {errors.username && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.username}</span>}
                        </div>

                        <div className="group">
                            <div className="relative">
                                <Mail className={clsx("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10", errors.email ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleFieldChange('email', e.target.value)}
                                    className={clsx(
                                        "w-full pl-10 pr-9 py-2.5 rounded-xl border outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                        errors.email
                                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5"
                                            : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5"
                                    )}
                                    placeholder="Email Address"
                                />
                            </div>
                            {errors.email && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.email}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-2 relative">
                            <div className="group">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleFieldChange('password', e.target.value)}
                                        className={clsx(
                                            "w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                            errors.password ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-brand-500"
                                        )}
                                        placeholder="Password"
                                    />
                                </div>
                                {errors.password && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.password}</span>}
                            </div>

                            <div className="group">
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                        className={clsx(
                                            "w-full pl-3 pr-8 py-2.5 rounded-xl border outline-none text-xs font-bold transition-all bg-slate-50/50 focus:bg-white relative",
                                            errors.confirmPassword ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-brand-500"
                                        )}
                                        placeholder="Confirm"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1 z-10"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <span className="text-[9px] font-bold text-rose-500 mt-1 block ml-1 animate-in fade-in slide-in-from-top-1">{errors.confirmPassword}</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className={clsx(
                            "w-full font-black py-4 rounded-2xl transition-all shadow-xl text-[11px] uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center gap-3",
                            isFormValid && !loading
                                ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:shadow-brand-500/40"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                Create Account
                                <UserPlus size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Already joined? <Link href="/login" className="text-brand-600 font-black hover:underline ml-2 transition-colors hover:text-brand-700">Sign In</Link>
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
