'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { UserPlus, User, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const { show: toast } = useToast();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            const msg = 'Passwords do not match';
            setError(msg);
            toast(msg, "error");
            setLoading(false);
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                full_name: formData.fullName,
                email: formData.email,
                password: formData.password,
                role: 'user'
            });

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Registration failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="relative z-10 text-center mb-6">
                    <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/30">
                        <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Account</h1>
                    <p className="text-slate-500 text-xs mt-1">Real-time ECG Data Platform</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                    {error && (
                        <div className="p-2 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold rounded-lg text-center uppercase tracking-wider">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text" 
                                required 
                                value={formData.fullName}
                                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-medium"
                                placeholder="Patient Name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-medium"
                                placeholder="name@email.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1 ml-1">Password</label>
                            <input 
                                type="password" 
                                required 
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1 ml-1">Confirm</label>
                            <input 
                                type="password" 
                                required 
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500/20 outline-none text-xs font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading || success}
                        className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg transition-all shadow-md text-xs mt-2 active:scale-[0.98] uppercase tracking-widest"
                    >
                        {loading ? 'Processing...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Joined before? <Link href="/login" className="text-brand-600 font-bold hover:underline">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}