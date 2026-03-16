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

## 1. Authentication & Profile (`/auth`)

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
      "source": "WEB"
    }
    ```
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
      "data": { "id": "USR...", "username": "admin", ... }
    }
    ```

### 1.5 Create Patient Profile
Converts a basic user into a Patient and submits their clinical profile.
*   **Method:** `POST`
*   **Endpoint:** `/auth/profile/patient`
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
      "medical_history": "Hypertension",
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
*   **Endpoint:** `/auth/profile/operator`
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
      "work_location": "Puskesmas A",
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
*   **Endpoint:** `/auth/profile/doctor`
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
      "work_location": "RSUD B",
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
*   **Endpoint:** `/auth/profile/patient`
*   **Request Body:** Same as Create Patient Profile (Optional fields).
*   **Response:** `GenericResponse[UserResponse]`

### 1.9 Update Operator Profile
*   **Method:** `PUT`
*   **Endpoint:** `/auth/profile/operator`
*   **Request Body:** Same as Create Operator Profile (Optional fields).
*   **Response:** `GenericResponse[UserResponse]`

### 1.10 Update Doctor Profile
*   **Method:** `PUT`
*   **Endpoint:** `/auth/profile/doctor`
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

---

## 2. Admin Control (`/admin`)

### 2.1 Get Pending Approvals
*   **Method:** `GET`
*   **Endpoint:** `/admin/pending-approvals`
*   **Query Params:** `skip`, `limit`, `search`, `start_date`, `end_date`, `is_patient`, `is_operator`, `is_doctor`
*   **Response (`GenericResponse[List[UserResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Pending approvals retrieved successfully",
      "data": [ { ... }, { ... } ]
    }
    ```

### 2.2 Get Approval Logs
*   **Method:** `GET`
*   **Endpoint:** `/admin/approval-logs`
*   **Response (`GenericResponse[List[ApprovalLogResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Approval logs retrieved successfully",
      "data": [ { "id": "APP...", "status": "APPROVED", ... } ]
    }
    ```

### 2.3 Update User Status
*   **Method:** `POST`
*   **Endpoint:** `/admin/update-status/{user_id}`
*   **Request Body:** `{ "action": "APPROVE", "reason": "..." }`
*   **Response (`GenericResponse[UserResponse]`):**
    ```json
    {
      "status": "success",
      "message": "User status updated to APPROVE successfully",
      "data": { "id": "USR...", "status": "APPROVED", ... }
    }
    ```

### 2.4 Create User (Admin Bypass)
*   **Method:** `POST`
*   **Endpoint:** `/admin/users`
*   **Request Body (`UserAdminCreate`):** Similar to UserCreate but includes profile and status fields.
*   **Response:** `GenericResponse[UserResponse]`

### 2.5 Get All Users
*   **Method:** `GET`
*   **Endpoint:** `/admin/users`
*   **Query Params:** `skip`, `limit`, `search`, `role`
*   **Response:** `GenericResponse[List[UserResponse]]`

### 2.6 Update User
*   **Method:** `PUT`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Response:** `GenericResponse[UserResponse]`

### 2.7 Delete User
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "User deleted successfully"
    }
    ```

---

## 3. History & Data (`/history`)

### 3.1 Get Calendar View
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

### 3.2 Get History Stats
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

### 3.3 Search Recording History
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

### 3.4 Get Recent History
*   **Method:** `GET`
*   **Endpoint:** `/history/recent`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 3.5 Get Recording Detail
*   **Method:** `GET`
*   **Endpoint:** `/history/{recording_id}`
*   **Response:** `GenericResponse[SessionResponse]`

### 3.6 Get Device History
*   **Method:** `GET`
*   **Endpoint:** `/history/device/{device_id}`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 3.7 Get User History
*   **Method:** `GET`
*   **Endpoint:** `/history/user/{user_id}`
*   **Response:** `GenericResponse[List[SessionResponse]]`

---

## 4. Export (`/export`)

Export endpoints return a direct file stream (`StreamingResponse`) and do **not** use the `GenericResponse` wrapper.

---

## 5. Health & Monitoring (`/health`)

### 5.1 Basic Health Check
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

### 5.2 Detailed Health Check (Admin)
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

### 5.3 Device Monitoring
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

### 5.4 Performance Monitoring (Admin)
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
  "id": "USR20260213000001",
  "username": "johndoe",
  "email": "user@example.com",
  "is_active": true,
  "role": "patient",
  "is_patient": true,
  "is_operator": false,
  "is_doctor": false,
  "status": "APPROVED",
  "patient_profile": { ... },
  "operator_profile": null,
  "doctor_profile": null
}
```

### `SessionResponse`
```json
{
  "recording_id": "uuid-...",
  "device_id": "ECG001",
  "patient_name": "John Doe",
  "classification": "Normal",
  "confidence": 0.98,
  "bpm": 72.0,
  "avg_rr_ms": 833.3,
  "avg_pr_ms": 160.0,
  "avg_qs_ms": 80.0,
  "avg_qtc_ms": 420.0,
  "avg_st_ms": 120.0,
  "rs_ratio_v1": 0.5,
  "device_type": "12LEADS"
}
```
