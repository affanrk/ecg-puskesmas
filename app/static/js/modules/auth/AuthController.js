import { CONFIG } from '../../config.js';
import { Toast } from '../../shared/Toast.js';

export class AuthController {
    constructor() {
        this.dom = {
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            logoutBtns: document.querySelectorAll('.btn-logout')
        };
        
        this.init();
    }

    init() {
        if (this.dom.loginForm) {
            this.dom.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.dom.registerForm) {
            this.dom.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        this.dom.logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        this.checkAuth();
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = this.dom.loginForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Signing in...";

            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorMessage = "Login failed";
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            
            // Store Token
            localStorage.setItem('ecg_token', data.access_token);
            localStorage.setItem('ecg_user', JSON.stringify({ name: data.user_name, role: data.role }));
            
            Toast.show("Welcome back!");
            
            // Redirect based on Role
            setTimeout(() => {
                if (data.role === 'admin') window.location.href = "/panel/admin";
                else if (data.role === 'doctor') window.location.href = "/panel/doctor";
                else if (data.role === 'user') window.location.href = "/panel/user";
                else window.location.href = "/";
            }, 1000);

        } catch (error) {
            Toast.show(error.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Sign In";
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const fullName = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (password !== confirmPass) return Toast.show("Passwords do not match", "error");

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, email, password, role: 'user' }) // Default to user
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorMessage = "Registration failed";
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            Toast.show("Account created! Please login.");
            setTimeout(() => window.location.href = "/login", 1500);

        } catch (error) {
            Toast.show(error.message, "error");
        }
    }

    logout() {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        window.location.href = "/login";
    }

    checkAuth() {
        // Simple client-side guard
        const token = localStorage.getItem('ecg_token');
        const isAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');

        if (!token && !isAuthPage) {
            window.location.href = "/login";
        } else if (token && isAuthPage) {
            const user = JSON.parse(localStorage.getItem('ecg_user') || '{}');
            if (user.role === 'admin') window.location.href = "/panel/admin";
            else if (user.role === 'doctor') window.location.href = "/panel/doctor";
            else if (user.role === 'user') window.location.href = "/panel/user";
            else window.location.href = "/";
        }

        // Update UI Name Display if logged in
        if (token) {
            const user = JSON.parse(localStorage.getItem('ecg_user') || '{}');
            const nameElements = document.querySelectorAll('.user-name-display');
            nameElements.forEach(el => {
                el.textContent = user.name || 'User';
            });
        }
    }
}
