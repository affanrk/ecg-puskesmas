'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { UserPlus, User, Mail, Check, AlertCircle, Eye, EyeOff, Sparkles, ShieldCheck, Stethoscope, Lock } from 'lucide-react';
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
    const [showPwdHint, setShowPwdHint] = useState(false);

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
    const [showErrorEffect, setShowErrorEffect] = useState(false);

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

        if (field === 'password') {
            const confirmErr = validateField('confirmPassword', formData.confirmPassword);
            setErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
        }
    };

    const triggerErrorEffect = () => {
        setShowErrorEffect(true);
        setTimeout(() => setShowErrorEffect(false), 400);
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
    const pwdStrengthCount = [checks.length, checks.upper, checks.number, checks.special].filter(Boolean).length;
    
    const getStrengthLabel = () => {
        if (pwdStrengthCount === 0) return { label: 'Enter Password', color: 'text-slate-400' };
        if (pwdStrengthCount <= 2) return { label: 'Weak', color: 'text-rose-500' };
        if (pwdStrengthCount === 3) return { label: 'Good', color: 'text-amber-500' };
        return { label: 'Secure', color: 'text-emerald-600' };
    };
    
    const strengthInfo = getStrengthLabel();

    // 5. Handlers
    const handleFocus = () => {
        if (serverError) setServerError('');
    };

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
            
            // Generate relevant error message
            let msg = "Please correct the highlighted errors.";
            
            if (Object.values(newErrors).some(e => e === "Required")) {
                msg = "Please fill in all required fields.";
            } else if (newErrors.username) {
                msg = `Username: ${newErrors.username}`;
            } else if (newErrors.email) {
                msg = `Email: ${newErrors.email}`;
            } else if (newErrors.password) {
                msg = `Password: ${newErrors.password}`;
            } else if (newErrors.confirmPassword) {
                msg = newErrors.confirmPassword;
            } else if (!isFormValid) {
                msg = "Please meet all password security requirements.";
            }

            setServerError(msg);
            triggerErrorEffect();
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
            triggerErrorEffect();
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
        <div className="flex min-h-screen bg-white overflow-hidden font-sans">
            
            {/* Left Side: Medical Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-brand-600 auth-split-bg medical-grid-pattern items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-brand-900/30 mix-blend-multiply"></div>
                <div className="absolute top-20 right-20 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
                
                <div className="relative z-10 text-center text-white px-12 max-w-lg">
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                            <Stethoscope className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Join the Network</h2>
                    <p className="text-brand-100 text-lg leading-relaxed font-medium">
                        Create an account to start monitoring vital signs with hospital-grade precision.
                    </p>
                    <div className="mt-12 grid grid-cols-2 gap-4 text-left">
                        <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <ShieldCheck className="w-6 h-6 mb-2 text-teal-300" />
                            <h4 className="font-bold text-sm">Secure Data</h4>
                            <p className="text-xs text-brand-100 mt-1">End-to-end encryption for all patient records.</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <Sparkles className="w-6 h-6 mb-2 text-teal-300" />
                            <h4 className="font-bold text-sm">AI Analysis</h4>
                            <p className="text-xs text-brand-100 mt-1">Automated arrhythmia detection and reporting.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Register Form */}
            <div className="w-full lg:w-1/2 h-screen overflow-y-auto flex flex-col p-6 lg:p-12 bg-slate-50 lg:bg-white custom-scrollbar">
                <div className={clsx(
                    "w-full max-w-[450px] mx-auto my-auto bg-white lg:bg-transparent p-8 lg:p-0 rounded-3xl lg:rounded-none shadow-xl lg:shadow-none transition-transform"
                    // Removed 'isShaking' from container
                )}>
                    
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h1>
                        <p className="text-slate-400 font-medium mt-2">Enter your details to register</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-5">

                        {serverError && (
                             <div className={clsx(
                                 "py-3 px-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 mb-4 animate-in fade-in slide-in-from-top-1",
                                 showErrorEffect && "animate-error-pop" // Applied 'pop' effect here
                             )}>
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span className="text-sm font-bold">{serverError}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* Username */}
                            <div className="group space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Username</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <User className={clsx("w-5 h-5 transition-colors", errors.username ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => handleFieldChange('username', e.target.value)}
                                        onFocus={handleFocus}
                                        className={clsx(
                                            "w-full pl-12 pr-10 py-3 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white",
                                            errors.username ? "border-rose-100 focus:border-rose-500" : "border-slate-100 focus:border-brand-500"
                                        )}
                                        placeholder="Choose a username"
                                    />
                                    {checks.username && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                                </div>
                                {errors.username && <span className="text-xs font-bold text-rose-500 ml-1">{errors.username}</span>}
                            </div>

                            {/* Email */}
                            <div className="group space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Email</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Mail className={clsx("w-5 h-5 transition-colors", errors.email ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleFieldChange('email', e.target.value)}
                                        onFocus={handleFocus}
                                        className={clsx(
                                            "w-full pl-12 pr-10 py-3 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white",
                                            errors.email ? "border-rose-100 focus:border-rose-500" : "border-slate-100 focus:border-brand-500"
                                        )}
                                        placeholder="name@hospital.com"
                                    />
                                    {checks.email && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                                </div>
                                {errors.email && <span className="text-xs font-bold text-rose-500 ml-1">{errors.email}</span>}
                            </div>

                            {/* Password Group - Expanded */}
                            <div className="space-y-4">
                                <div className="group space-y-1.5 relative">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
                                        <span className={clsx("text-[10px] font-black uppercase tracking-wider transition-colors duration-300", strengthInfo.color)}>
                                            {formData.password ? strengthInfo.label : ''}
                                        </span>
                                    </div>
                                    
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Lock className={clsx("w-5 h-5 transition-colors", errors.password ? "text-rose-400" : "text-slate-400 group-focus-within:text-brand-500")} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleFieldChange('password', e.target.value)}
                                            onFocus={() => { setShowPwdHint(true); handleFocus(); }}
                                            onBlur={() => setShowPwdHint(false)}
                                            className={clsx(
                                                "w-full pl-12 pr-10 py-3 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white z-20 relative",
                                                errors.password ? "border-rose-100 focus:border-rose-500" : 
                                                (formData.password && isFormValid ? "border-emerald-100 focus:border-emerald-500" : "border-slate-100 focus:border-brand-500")
                                            )}
                                            placeholder="Create password"
                                        />
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors z-30 p-1"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>

                                        {/* Dynamic Hint Popover */}
                                        <div className={clsx(
                                            "absolute left-0 bottom-[calc(100%+8px)] w-full bg-slate-900 text-white p-4 rounded-xl shadow-2xl transition-all duration-300 z-50 pointer-events-none origin-bottom",
                                            showPwdHint ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
                                        )}>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Security Requirements</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { label: '8+ Chars', met: checks.length },
                                                    { label: 'Uppercase', met: checks.upper },
                                                    { label: 'Number', met: checks.number },
                                                    { label: 'Symbol', met: checks.special }
                                                ].map((req, i) => (
                                                    <div key={i} className={clsx("flex items-center gap-2 text-xs font-bold transition-all", req.met ? "text-emerald-400" : "text-slate-500")}>
                                                        {req.met ? <Check size={12} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-slate-600 ml-1 mr-0.5" />}
                                                        {req.label}
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-slate-900 rotate-45"></div>
                                        </div>
                                    </div>

                                    {/* Enhanced Progress Bar */}
                                    <div className="flex gap-1 h-1.5 mt-2 px-1">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div 
                                                key={step}
                                                className={clsx(
                                                    "h-full flex-1 rounded-full transition-all duration-500 ease-out",
                                                    pwdStrengthCount >= step 
                                                        ? (pwdStrengthCount <= 2 ? "bg-rose-400" : pwdStrengthCount === 3 ? "bg-amber-400" : "bg-emerald-500")
                                                        : "bg-slate-100"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="group space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Check className={clsx("w-5 h-5 transition-colors", checks.match && formData.confirmPassword ? "text-emerald-500" : "text-slate-300")} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                            onFocus={handleFocus}
                                            className={clsx(
                                                "w-full pl-12 pr-10 py-3 rounded-xl border-2 outline-none text-sm font-semibold transition-all bg-slate-50 focus:bg-white",
                                                errors.confirmPassword ? "border-rose-100 focus:border-rose-500" : 
                                                (formData.confirmPassword && checks.match ? "border-emerald-100 focus:border-emerald-500" : "border-slate-100 focus:border-brand-500")
                                            )}
                                            placeholder="Repeat password"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || success}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold transition-all shadow-xl text-sm uppercase tracking-wide active:scale-[0.98] flex items-center justify-center gap-2",
                                    loading || success
                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 hover:shadow-brand-500/40"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                        Creating...
                                    </>
                                ) : success ? (
                                    <>
                                        <Check size={18} />
                                        Created!
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <UserPlus size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Already have an account? 
                            <Link href="/login" className="text-brand-600 font-bold hover:underline ml-2 hover:text-brand-700 transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}