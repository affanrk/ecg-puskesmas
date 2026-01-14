'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { LogIn } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { show: toast } = useToast();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                email,
                password
            });

            const data = response.data;
            
            // Store Token & User
            localStorage.setItem('ecg_token', data.access_token);
            localStorage.setItem('ecg_user', JSON.stringify({ 
                name: data.user_name, 
                role: data.role 
            }));
            
            toast("Welcome back!", "success");
            
            // Redirect based on role (similar to legacy)
            setTimeout(() => {
                router.push('/monitor');
            }, 500);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-50 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>

                <div className="relative z-10 text-center mb-10">
                    <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30 rotate-3">
                        <LogIn className="w-8 h-8 text-white -rotate-3" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 text-sm mt-2">Sign in to your ECG Monitoring account</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium rounded-lg animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm placeholder:text-slate-300"
                            placeholder="name@example.com"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold text-slate-700">Password</label>
                        </div>
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm placeholder:text-slate-300"
                            placeholder="••••••••"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-brand-500/30 text-sm mt-2 active:scale-[0.98]"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                    <p className="text-xs font-medium text-slate-500">
                        Don&apos;t have an account yet? <Link href="/register" className="text-brand-600 font-bold hover:underline uppercase tracking-wide">Create an Account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}