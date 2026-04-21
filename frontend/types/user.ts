export interface ProfileData {
    id?: string;
    user_id?: string;
    full_name?: string;
    nik?: string;
    pob?: string;
    dob?: string;
    gender?: string;
    address?: string;
    contact_number?: string;
    medical_history?: string;
    str_number?: string;
    sip_number?: string;
    specialty?: string;
    operator_role?: string;
    work_location?: string;
    location_id?: string;
    status?: string;
}

export interface AdminProfileData {
    id?: string;
    full_name?: string;
    nik?: string;
    location_id?: string | null;
    status?: string;
}

export interface User {
    id?: string;
    username: string;
    email?: string;
    role: string;
    is_patient: boolean;
    is_walkin?: boolean;
    is_active: boolean;
    is_doctor?: boolean;
    is_operator?: boolean;
    is_activated: number;
    must_reset_password?: number;
    status?: string;
    rejection_reason?: string;
    patient_profile?: ProfileData;
    operator_profile?: ProfileData;
    doctor_profile?: ProfileData;
    admin_profile?: AdminProfileData;
    location_id?: string;
    created_dt?: string | Date;
    changed_dt?: string | Date;
}

export interface ApprovalLog {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    is_patient: boolean;
    is_operator: boolean;
    is_doctor: boolean;
    status: 'QUEUE' | 'APPROVED' | 'REJECTED';
    reason?: string;
    created_dt: string;
    created_by: string;
    patient_profile?: ProfileData;
    operator_profile?: ProfileData;
    doctor_profile?: ProfileData;
}

export interface UserFormPayload {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    account_status?: string;
    activation_status?: string;
    full_name?: string;
    nik?: string;
    pob?: string;
    dob?: string;
    gender?: string;
    address?: string;
    contact_number?: string;
    medical_history?: string;
    str_number?: string;
    sip_number?: string;
    specialty?: string;
    operator_role?: string;
    work_location?: string;
    source?: string;
}

export interface AdminUserPayload {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    account_status?: string;
    activation_status?: string;
    patient_profile?: ProfilePayload;
    operator_profile?: ProfilePayload;
    doctor_profile?: ProfilePayload;
}

export interface AuthPayload {
    username?: string;
    email?: string;
    password?: string;
    username_or_email?: string;
    source?: string;
}

export interface ProfilePayload {
    full_name?: string | null;
    nik?: string | null;
    pob?: string | null;
    dob?: string | null;
    gender?: string | null;
    address?: string | null;
    contact_number?: string | null;
    medical_history?: string | null;
    str_number?: string | null;
    sip_number?: string | null;
    specialty?: string | null;
    operator_role?: string | null;
    work_location?: string | null;
    location_id?: string | null;
    source?: string | null;
}

export interface WalkinPatient {
    id: string;
    user_id?: string | null;
    full_name: string;
    nik?: string | null;
    pob: string;
    dob: string;
    gender: string;
    address?: string | null;
    contact_number?: string | null;
    medical_history?: string | null;
    status: string;
    created_by?: string | null;
    created_dt?: string | null;
    changed_dt?: string | null;
}

export interface WalkinPatientPayload {
    full_name: string;
    nik?: string | null;
    pob: string;
    dob: string;
    gender: string;
    address?: string | null;
    contact_number?: string | null;
    medical_history?: string | null;
}

export interface ConvertWalkinPayload {
    username: string;
    email: string;
    password?: string;
}

export interface ProfileFormPayload {
    full_name: string;
    nik: string;
    pob: string;
    dob: string;
    gender: string;
    contact_number: string;
    address: string;
    medical_history: string;
    str_number: string;
    sip_number: string;
    specialty: string;
    work_location: string;
}

export interface SecurityFormPayload {
    new_username: string;
    current_password: string;
    new_password: string;
    confirm_password: string;
}

export type MedicalFormFields = ProfileFormPayload;

export type SecurityFormFields = SecurityFormPayload;


export interface LocationResponse {
    id: string;
    location_code: string;
    name: string;
    location_type: string;
    address: string;
    city?: string | null;
    province?: string | null;
    phone?: string | null;
    is_active: boolean;
    created_dt?: string | Date;
    changed_dt?: string | Date;
}

export interface LocationCreatePayload {
    name: string;
    location_type: string;
    address: string;
    city?: string | null;
    province?: string | null;
    phone?: string | null;
}

export interface LocationUpdatePayload {
    name?: string;
    location_type?: string;
    address?: string;
    city?: string | null;
    province?: string | null;
    phone?: string | null;
    is_active?: boolean;
}

export interface StaffLocationResponse {
    id: string;
    user_id: string;
    location_id: string;
    is_primary: boolean;
    assigned_by?: string;
    assigned_dt?: string | Date;
    location?: LocationResponse;
}

