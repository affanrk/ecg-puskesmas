# ECG Live Platform - API Documentation

This document provides a comprehensive guide to all REST API endpoints available in the ECG Live Platform.

## Base URL
`http://<server-ip>:<port>/api/v1`

## Authentication
Unless specified otherwise, endpoints require a Bearer Token in the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`

## Common Response Wrapper
All API responses follow a standardized `GenericResponse` structure:

```json
{
  "status": "success",
  "message": "A human-readable message.",
  "data": { ... } // The actual payload
}
```

---

## 1. Authentication & Profile (`/auth`, `/patient`, `/operator`, `/doctor`)

### 1.1 Register
Registers a new basic user account.
*   **Method:** `POST`
*   **Endpoint:** `/auth/register`
*   **Request Body (`UserCreate`):**
    ```json
    {
      "email": "user@example.com",
      "username": "johndoe",
      "password": "SecretPassword123!",
      "role": "user",
      "source": "WEB",
      "location_id": "LOC20240101000001" 
    }
    ```
    *(Note: `location_id` is optional during self-registration but required for operators/doctors)*
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "User registered successfully",
      "data": {
        "id": "USR...",
        "email": "user@example.com",
        "username": "johndoe",
        "role": "user",
        "is_active": true,
        "is_patient": false,
        "is_operator": false,
        "is_doctor": false,
        "status": "APPROVED"
      }
    }
    ```

### 1.2 Login
Authenticates a user and returns a JWT token. Enforces Single Session (Last Login Wins).
*   **Method:** `POST`
*   **Endpoint:** `/auth/login`
*   **Request Body (`UserLogin`):**
    ```json
    {
      "username_or_email": "admin@gmail.com",
      "password": "Admin123!",
      "source": "WEB"
    }
    ```
*   **Response (`GenericResponse[Token]`):**
    ```json
    {
      "status": "success",
      "message": "Login successful",
      "data": {
        "access_token": "eyJhbGci...",
        "token_type": "bearer",
        "role": "admin",
        "user_id": "USR20260213000001",
        "user_name": "Admin",
        "full_name": "System Administrator",
        "is_patient": false,
        "is_operator": true,
        "is_doctor": false
      }
    }
    ```

*   **Errors:**
    - `404 Not Found` — returned when the provided `username_or_email` does not match any account.
    - `401 Unauthorized` — incorrect password.

*   **Client handling:** If `must_reset_password` is set for the user (check `/auth/me`), the client should prompt the user to change password using `/auth/change-password` before allowing protected actions.

### 1.3 Logout
Invalidates the current session ID in the database.
*   **Method:** `POST`
*   **Endpoint:** `/auth/logout`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Logged out successfully"
    }
    ```

### 1.4 Get Current User Profile
*   **Method:** `GET`
*   **Endpoint:** `/auth/me`
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "User profile retrieved successfully",
      "data": {
        "id": "USR20260213000001",
        "email": "admin@example.com",
        "username": "admin",
        "full_name": "System Administrator",
        "must_reset_password": 0,
        "role": "admin",
        "is_active": true,
        "is_patient": false,
        "is_operator": true,
        "is_doctor": false,
        "status": "APPROVED"
      }
    }
    ```

### 1.5 Create Patient Profile
Converts a basic user into a Patient and submits their clinical profile.
*   **Method:** `POST`
*   **Endpoint:** `/patient/profile`
*   **Request Body (`PatientCreate`):**
    ```json
    {
      "full_name": "John Doe",
      "nik": "3201234567890001",
      "pob": "Jakarta",
      "dob": "1990-01-01",
      "gender": "Laki-laki",
      "address": "Jl. Merdeka No. 1",
      "contact_number": "081234567890",
      "medical_history": "Hipertensi",
      "source": "WEB"
    }
    ```
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Patient profile created successfully",
      "data": { ... }
    }
    ```

### 1.6 Create Operator Profile
*   **Method:** `POST`
*   **Endpoint:** `/operator/profile`
*   **Request Body (`OperatorCreate`):**
    ```json
    {
      "full_name": "Nurse Jane",
      "nik": "3201234567890002",
      "pob": "Bandung",
      "dob": "1992-05-15",
      "gender": "Perempuan",
      "str_number": "1234567890",
      "operator_role": "Perawat",
      "address": "Jl. Mawar",
      "contact_number": "081298765432",
      "location_id": "LOC...",
      "source": "WEB"
    }
    ```
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Operator profile created successfully",
      "data": { ... }
    }
    ```

### 1.7 Create Doctor Profile
*   **Method:** `POST`
*   **Endpoint:** `/doctor/profile`
*   **Request Body (`DoctorCreate`):**
    ```json
    {
      "full_name": "Dr. Smith, Sp.JP",
      "nik": "3201234567890003",
      "pob": "Surabaya",
      "dob": "1985-10-20",
      "gender": "Laki-laki",
      "str_number": "0987654321",
      "sip_number": "SIP/123/2024",
      "specialty": "Kardiologi",
      "address": "Jl. Melati",
      "contact_number": "081311223344",
      "location_id": "LOC...",
      "source": "WEB"
    }
    ```
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Doctor profile created successfully",
      "data": { ... }
    }
    ```

### 1.8 Update Patient Profile
*   **Method:** `PUT`
*   **Endpoint:** `/patient/profile`
*   **Request Body:** Same as Create Patient Profile (Optional fields).
*   **Response:** `GenericResponse[UserResponse]`

### 1.9 Update Operator Profile
*   **Method:** `PUT`
*   **Endpoint:** `/operator/profile`
*   **Request Body:** Same as Create Operator Profile (Optional fields).
*   **Response:** `GenericResponse[UserResponse]`

### 1.10 Update Doctor Profile
*   **Method:** `PUT`
*   **Endpoint:** `/doctor/profile`
*   **Request Body:** Same as Create Doctor Profile (Optional fields).
*   **Response:** `GenericResponse[UserResponse]`

### 1.11 Change Username
*   **Method:** `PUT`
*   **Endpoint:** `/auth/change-username`
*   **Request Body:** `{ "new_username": "newjohndoe" }`
*   **Response:** `GenericResponse[UserResponse]`

### 1.12 Change Password
*   **Method:** `PUT`
*   **Endpoint:** `/auth/change-password`
*   **Request Body:** `{ "current_password": "...", "new_password": "..." }`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Password updated successfully"
    }
    ```
*   **Behavior:** On success the server clears the `must_reset_password` flag for the user (if set), allowing normal access.

---

## 2. Role Dashboards (`/patient`, `/operator`, `/doctor`)

### 2.1 Get Patient Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/patient/dashboard`
*   **Response (`GenericResponse[PatientDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Patient dashboard data retrieved successfully",
      "data": {
        "patient_name": "John Doe",
        "total_recordings": 5,
        "recent_records": [...],
        "stats": { ... }
      }
    }
    ```

### 2.2 Get Operator Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/operator/dashboard`
*   **Response (`GenericResponse[OperatorDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Operator dashboard data retrieved successfully",
      "data": {
        "operator_name": "Nurse Jane",
        "operator_role": "Perawat",
        "work_location": "Puskesmas A",
        "str_number": "1234567890",
        "total_recorded": 150,
        "arrhythmia_count": 12,
        "last_sync": "2024-01-01T12:00:00Z",
        "recent_sessions": [...],
        "notifications": [...],
        "classification_counts": [...]
      }
    }
    ```

### 2.3 Get Doctor Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/doctor/dashboard`
*   **Response (`GenericResponse[DoctorDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Doctor dashboard data retrieved successfully",
      "data": {
        "doctor_name": "Dr. Smith",
        "specialty": "Kardiologi",
        "work_location": "Puskesmas A",
        "sip_number": "SIP/123",
        "total_consultations": 45,
        "recent_sessions": [...],
        "notifications": [...],
        "classification_counts": [...]
      }
    }
    ```

---

## 3. Operator Controls (`/operator`)

### 3.1 Create Walk-in Patient
Creates a walk-in patient profile managed by the operator.
*   **Method:** `POST`
*   **Endpoint:** `/operator/patients`
*   **Request Body (`WalkinPatientCreate`):**
    ```json
    {
      "full_name": "Walk-in John",
      "nik": "3201234567890005",
      "pob": "Jakarta",
      "dob": "1990-01-01",
      "gender": "L",
      "address": "Jl. Karet",
      "contact_number": "081233334444",
      "medical_history": "None"
    }
    ```
*   **Response:** `GenericResponse[WalkinPatientResponse]`

### 3.2 List All Patients
Lists all patients (walk-in and registered) visible to the operator (based on location).
*   **Method:** `GET`
*   **Endpoint:** `/operator/patients`
*   **Query Params:** `skip`, `limit`, `search`, `status`
*   **Response:** `GenericResponse[PaginatedData[WalkinPatientResponse]]`

### 3.3 Lock Patient for Monitoring
Locks a walk-in patient exclusively to this operator for recording.
*   **Method:** `POST`
*   **Endpoint:** `/operator/patients/{patient_id}/lock`
*   **Response:** `GenericResponse[dict]`

### 3.4 Unlock Patient
Releases a locked patient.
*   **Method:** `DELETE`
*   **Endpoint:** `/operator/patients/{patient_id}/lock`
*   **Response:** `GenericResponse[dict]`

---

## 4. Admin Control (`/admin`)

### 4.1 Get Admin Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/admin/dashboard`
*   **Response (`GenericResponse[AdminDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Admin dashboard retrieved successfully",
      "data": {
        "total_users": 120,
        "pending_approvals": 5,
        "total_patients": 80,
        "total_operators": 10,
        "total_doctors": 5,
        "recent_pending": [...],
        "recent_logs": [...]
      }
    }
    ```

### 4.2 Get Admin Locations
Returns the locations the current admin is assigned to manage.
*   **Method:** `GET`
*   **Endpoint:** `/admin/locations`
*   **Response:** `GenericResponse[List[LocationResponse]]`

### 4.3 Get Pending Approvals
*   **Method:** `GET`
*   **Endpoint:** `/admin/approvals/users/pending`
*   **Query Params:** `skip`, `limit`, `search`, `start_date`, `end_date`, `is_patient`, `is_operator`, `is_doctor`
*   **Response:** `GenericResponse[List[UserResponse]]`

### 4.4 Get Approval Logs
*   **Method:** `GET`
*   **Endpoint:** `/admin/approvals/users/history`
*   **Response:** `GenericResponse[List[ApprovalLogResponse]]`

### 4.5 Update User Status
*   **Method:** `PUT`
*   **Endpoint:** `/admin/users/{user_id}/account-status`
*   **Request Body:** `{ "action": "APPROVE", "reason": "..." }`
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "User status updated to APPROVE successfully",
      "data": { "id": "USR...", "status": "APPROVED", ... }
    }
    ```

### 4.6 Create User (Admin Bypass)
*   **Method:** `POST`
*   **Endpoint:** `/admin/users`
*   **Request Body (`UserAdminCreate`):** Similar to UserCreate but includes profile and status fields.
*   **Response:** `GenericResponse[UserResponse]`

### 4.7 Get All Users
*   **Method:** `GET`
*   **Endpoint:** `/admin/users`
*   **Query Params:** `skip`, `limit`, `search`, `role`, `include_resigned`, `exclude_staff`
*   **Response:** `GenericResponse[List[UserResponse]]`

### 4.8 Update User
*   **Method:** `PUT`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Response:** `GenericResponse[UserResponse]`

### 4.9 Delete User
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Note:** Users must be in `QUEUE` or `REJECTED` status to be permanently deleted.
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "User deleted successfully"
    }
    ```

### 4.10 Get Walk-in Patients
*   **Method:** `GET`
*   **Endpoint:** `/admin/patients/walkin`
*   **Query Params:** `skip`, `limit`, `search`, `status`
*   **Response:** `GenericResponse[PaginatedData[WalkinPatientResponse]]`

### 4.11 Update Walk-in Patient
*   **Method:** `PUT`
*   **Endpoint:** `/admin/patients/walkin/{patient_id}`
*   **Request Body:** `WalkinPatientUpdate`
*   **Response:** `GenericResponse[WalkinPatientResponse]`

### 4.12 Delete Walk-in Patient
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/patients/walkin/{patient_id}`
*   **Response:** `MessageResponse`

### 4.13 Convert Walk-in Patient to User
*   **Method:** `POST`
*   **Endpoint:** `/admin/patients/walkin/{patient_id}/registration`
*   **Request Body (`ConvertWalkinRequest`):** `{ "username": "walkin_user", "email": "walkin@example.com", "password": "..." }`
*   **Response:** `GenericResponse[UserResponse]`

### 4.14 Staff Location Management
*   `GET /admin/staff/{staff_id}/locations` — Get staff locations.
*   `POST /admin/staff/{staff_id}/locations` — Assign staff to location.
*   `DELETE /admin/staff/{staff_id}/locations/{location_id}` — Remove staff from location.
*   `PATCH /admin/staff/{staff_id}/locations/{location_id}/primary` — Set primary location.

### 4.15 Add Existing Staff
Adds staff from another location to this admin's location. Creates an approval request if cross-location.
*   **Method:** `POST`
*   **Endpoint:** `/admin/staff/add-existing`
*   **Query Params:** `user_id`, `reason`
*   **Response:** `GenericResponse[AddExistingStaffResponse]`

### 4.16 Process Staff Resignation
*   **Method:** `POST`
*   **Endpoint:** `/admin/staff/{staff_id}/resignation`
*   **Request Body:** `{ "resignation_date": "2024-12-31", "reason": "..." }`
*   **Response:** `GenericResponse[StaffResignResponse]`

### 4.17 Validate Staff Credentials
Checks for duplicate NIK or email.
*   **Method:** `GET`
*   **Endpoint:** `/admin/staff/validate-credentials`
*   **Query Params:** `nik`, `email`
*   **Response:** `GenericResponse[CheckDuplicateResponse]`

### 4.18 Get Expiring Credentials
*   **Method:** `GET`
*   **Endpoint:** `/admin/staff/credentials/expiring`
*   **Query Params:** `days`, `credential_type`
*   **Response:** `GenericResponse[List[ExpiringCredentialInfo]]`

### 4.19 Send Credential Notifications
*   **Method:** `POST`
*   **Endpoint:** `/admin/staff/credentials/notifications`
*   **Request Body:** `{ "user_ids": ["..."], "credential_type": "STR" }`
*   **Response:** `GenericResponse[CredentialNotificationResponse]`

### 4.20 Assign/Remove Doctor to Patient
*   `GET /admin/patients/{patient_id}/doctors`
*   `POST /admin/patients/{patient_id}/doctors`
*   `DELETE /admin/patients/{patient_id}/doctors/{doctor_id}`

---

## 5. SuperAdmin Control (`/superadmin`)

**IMPORTANT**: SuperAdmin has READ-ONLY access to operational data (users, staff, patients). SuperAdmin can only manage system-level resources (locations, admins) and specific global actions.

### 5.1 Get All Locations
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/locations`
*   **Query Params:** `skip`, `limit`, `search`, `is_active`, `location_type`
*   **Response (`GenericResponse[List[LocationResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Locations retrieved successfully",
      "data": [ { "id": "LOC...", "name": "Puskesmas A", ... } ]
    }
    ```

### 5.2 Create Location
*   **Method:** `POST`
*   **Endpoint:** `/superadmin/locations`
*   **Request Body (`LocationCreate`):**
    ```json
    {
      "name": "Puskesmas A",
      "address": "Jl. Merdeka No. 1",
      "contact_number": "081234567890"
    }
    ```
*   **Response:** `GenericResponse[LocationResponse]`

### 5.3 Update Location
*   **Method:** `PUT`
*   **Endpoint:** `/superadmin/locations/{location_id}`
*   **Request Body:** Same as Create Location (Optional fields)
*   **Response:** `GenericResponse[LocationResponse]`

### 5.4 Activate/Deactivate Location
*   `PATCH /superadmin/locations/{location_id}/activate`
*   `PATCH /superadmin/locations/{location_id}/deactivate`

### 5.5 Delete Location
*   **Method:** `DELETE`
*   **Endpoint:** `/superadmin/locations/{location_id}`
*   **Note:** Location must be deactivated before deletion.
*   **Response:** `MessageResponse`

### 5.6 Get Location Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/locations/{location_id}/dashboard`
*   **Response:** `GenericResponse[dict]`

### 5.7 Admins Management
*   `GET /superadmin/admins`
*   `POST /superadmin/admins`
*   `PUT /superadmin/admins/{admin_id}/location`
*   `PATCH /superadmin/admins/{admin_id}/activate`
*   `PATCH /superadmin/admins/{admin_id}/deactivate`
*   `DELETE /superadmin/admins/{admin_id}` (Must be deactivated first)

### 5.8 Get All Users (READ-ONLY)
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/users`
*   **Query Params:** `skip`, `limit`, `search`, `role`
*   **Response:** `GenericResponse[List[UserResponse]]`

### 5.9 Get SuperAdmin Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/dashboard`
*   **Response:** `GenericResponse[dict]`

### 5.10 Anonymize Staff
Anonymize a staff member's profile for GDPR compliance.
*   **Method:** `POST`
*   **Endpoint:** `/superadmin/staff/{user_id}/anonymize`
*   **Request Body:** `{ "legal_basis": "USER_REQUEST", "reason": "..." }`
*   **Response:** `GenericResponse[StaffAnonymizeResponse]`

### 5.11 Transfer Requests
Manage staff transfer requests between locations.
*   `GET /superadmin/approvals/transfers`
*   `POST /superadmin/approvals/transfers/{request_id}/approve`
*   `POST /superadmin/approvals/transfers/{request_id}/reject`

---

## 6. History & Data (`/history`)

### 6.1 Get Calendar View
*   **Method:** `GET`
*   **Endpoint:** `/history/calendar`
*   **Query Params:** `user_id`, `year`, `month`, `day`, `hour`, `minute`
*   **Response (`GenericResponse[CalendarResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Calendar data for level: month",
      "data": {
        "level": "month",
        "nodes": [ { "label": "January", "count": 15, ... } ]
      }
    }
    ```

### 6.2 Get History Stats
*   **Method:** `GET`
*   **Endpoint:** `/history/stats`
*   **Response (`GenericResponse[ClassificationStatsResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Classification statistics retrieved successfully",
      "data": { "total_sessions": 10, "classification_counts": [...] }
    }
    ```

### 6.3 Search Recording History
*   **Method:** `GET`
*   **Endpoint:** `/history`
*   **Query Params:** `device_id`, `user_id`, `search`, `classification`, `start_date`, `end_date`, `limit`
*   **Response (`GenericResponse[List[SessionResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Retrieved 15 recording history records",
      "data": [ { "recording_id": "uuid-...", "classification": "Normal", ... } ]
    }
    ```

### 6.4 Get Recent History
*   **Method:** `GET`
*   **Endpoint:** `/history/recent`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 6.5 Get Recording Detail
*   **Method:** `GET`
*   **Endpoint:** `/history/{recording_id}`
*   **Response:** `GenericResponse[SessionResponse]`

### 6.6 Get Device History
*   **Method:** `GET`
*   **Endpoint:** `/history/device/{device_id}`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 6.7 Get User History
*   **Method:** `GET`
*   **Endpoint:** `/history/user/{user_id}`
*   **Response:** `GenericResponse[List[SessionResponse]]`

---

## 7. Export (`/export`)

Export endpoints return a direct file stream (`StreamingResponse`) and do **not** use the `GenericResponse` wrapper.

### 7.1 Export Raw ECG Data (CSV)
*   **Method:** `GET`
*   **Endpoint:** `/export/raw/{recording_id}`
*   **Response:** CSV file download.

### 7.2 Export Analysis Features (CSV)
*   **Method:** `GET`
*   **Endpoint:** `/export/features/{recording_id}`
*   **Response:** CSV file download.

### 7.3 Export ECG Chart (PNG)
*   **Method:** `GET`
*   **Endpoint:** `/export/plot/{recording_id}`
*   **Response:** PNG image download.

### 7.4 Complete Package (ZIP) - Reserved
*   **Method:** `GET`
*   **Endpoint:** `/export/complete/{recording_id}`
*   **Note:** Returns HTTP 501 (Not Implemented)

### 7.5 Batch Export - Reserved
*   **Method:** `GET`
*   **Endpoint:** `/export/batch`
*   **Note:** Returns HTTP 501 (Not Implemented)

---

## 8. Health & Monitoring (`/health`)

### 8.1 Basic Health Check
*   **Method:** `GET`
*   **Endpoint:** `/health`
*   **Response (`GenericResponse[HealthCheckResponse]`):**
    ```json
    {
      "status": "success",
      "message": "System is healthy",
      "data": { "status": "healthy", "timestamp": 1700000000.0 }
    }
    ```

### 8.2 Detailed Health Check (Admin)
*   **Method:** `GET`
*   **Endpoint:** `/health/detailed`
*   **Response (`GenericResponse[DetailedHealthCheckResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Detailed health status retrieved",
      "data": {
        "status": "healthy",
        "components": { "database": {"status": "healthy"}, "mqtt": {"status": "connected"}, ... },
        "buffers": { "recording_buffer": 1500, ... },
        "performance": { "avg_latency_ms": 45.2, ... }
      }
    }
    ```

### 8.3 Device Monitoring
*   **Method:** `GET`
*   **Endpoint:** `/health/monitoring/devices`
*   **Response (`GenericResponse[DeviceMonitoringResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Device monitoring data retrieved",
      "data": {
        "devices": [ { "device_id": "ECG001", "is_connected": true, ... } ],
        "total_devices": 1
      }
    }
    ```

### 8.4 Performance Monitoring (Admin)
*   **Method:** `GET`
*   **Endpoint:** `/health/monitoring/performance`
*   **Response (`GenericResponse[PerformanceMonitoringResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Performance monitoring data retrieved",
      "data": { "time_window_hours": 24, "system_summary": { ... }, "worst_performers": { ... } }
    }
    ```

---

## Common Response Models

### `UserResponse`
```json
{
  "id": "usr_12345",
  "email": "user@example.com",
  "username": "user123",
  "full_name": "John Doe",
  "must_reset_password": 1,
  "role": "patient",
  "is_active": true,
  "is_patient": true,
  "is_operator": false,
  "is_doctor": false,
  "is_activated": 1,
  "status": "APPROVED",
  "created_dt": "2024-01-01T12:00:00Z",
  "changed_dt": "2024-01-01T12:00:00Z",
  "patient_profile": {
    "id": "PAT20240101000001",
    "user_id": "usr_12345",
    "full_name": "John Doe",
    "nik": "3201234567890001",
    "pob": "Jakarta",
    "dob": "1990-01-01",
    "gender": "L",
    "address": "Jl. Merdeka No. 1",
    "contact_number": "081234567890",
    "status": "APPROVED"
  },
  "operator_profile": null,
  "doctor_profile": null
}
```

### `SessionResponse`
```json
{
  "recording_id": "123e4567-e89b-12d3-a456-426614174000",
  "device_id": "ECG001",
  "subject_id": "1234567890123456",
  "patient_name": "John Doe",
  "timestamp": "2024-01-09T10:30:00Z",
  "changed_dt": "2024-01-09T10:35:00Z",
  "classification": "Normal",
  "is_normal": true,
  "confidence": 0.95,
  "device_type": "12LEADS",
  "parameters": [
    {
      "lead_name": "lead_ii",
      "heart_rate_bpm": 72.5,
      "rr_ms": 828.0,
      "pr_ms": 160.0,
      "qrs_ms": 80.0,
      "qtc_ms": 420.0
    }
  ]
}
```
