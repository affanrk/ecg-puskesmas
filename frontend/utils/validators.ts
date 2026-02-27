export const patterns = {
    username: /^[a-zA-Z0-9_-]{3,}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    name: /^[a-zA-Z\s\.\']+$/,
    nik: /^\d+$/,
    phone: /^\+?\d{9,15}$/,
    password: {
        upper: /[A-Z]/,
        lower: /[a-z]/,
        number: /\d/,
        special: /[!@#$%^&*(),.?":{}|<>]/
    }
};

export const validators = {
    required: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        return '';
    },
    name: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        const str = String(value).trim();
        if (str.length < 2) return 'Name too short';
        if (!patterns.name.test(str)) return 'Invalid characters';
        return '';
    },
    nik: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        const str = String(value).trim();
        if (!patterns.nik.test(str)) return 'Numbers only';
        if (str.length !== 16) return 'Must be exactly 16 digits';
        return '';
    },
    phone: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return '';
        const stripped = String(value).replace(/[\s\-\(\)]/g, '');
        if (!patterns.phone.test(stripped)) return 'Invalid phone format (9-15 digits)';
        return '';
    },
    email: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        const str = String(value).trim();
        if (!patterns.email.test(str)) return 'Invalid email format';
        return '';
    },
    username: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        const str = String(value).trim();
        if (str.length < 3) return 'Min 3 characters';
        if (!patterns.username.test(str)) return 'Alphanumeric, _ or - only';
        return '';
    },
    password: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        const str = String(value);
        if (str.length < 8) return 'Min 8 characters';
        if (!patterns.password.upper.test(str)) return 'Need 1 uppercase letter';
        if (!patterns.password.number.test(str)) return 'Need 1 number';
        if (!patterns.password.special.test(str)) return 'Need 1 symbol';
        return '';
    },
    dob: (value: string | undefined | null) => {
        if (!value || String(value).trim() === '') return 'Required';
        if (new Date(String(value)) > new Date()) return 'Cannot be in future';
        return '';
    }
};
