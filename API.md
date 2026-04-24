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

## 2. SuperAdmin Control (`/superadmin`)

**IMPORTANT**: SuperAdmin has READ-ONLY access to operational data (users, staff, patients). SuperAdmin can only manage system-level resources (locations, admins).

### 2.1 Get All Locations
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/locations`
*   **Query Params:** `skip`, `limit`, `search`, `is_active`
*   **Response (`GenericResponse[List[LocationResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Locations retrieved successfully",
      "data": [ { "id": "LOC...", "name": "Puskesmas A", ... } ]
    }
    ```

### 2.2 Create Location
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

### 2.3 Update Location
*   **Method:** `PUT`
*   **Endpoint:** `/superadmin/locations/{location_id}`
*   **Request Body:** Same as Create Location (Optional fields)
*   **Response:** `GenericResponse[LocationResponse]`

### 2.4 Activate Location
*   **Method:** `PATCH`
*   **Endpoint:** `/superadmin/locations/{location_id}/activate`
*   **Response:** `GenericResponse[LocationResponse]`

### 2.5 Deactivate Location
*   **Method:** `PATCH`
*   **Endpoint:** `/superadmin/locations/{location_id}/deactivate`
*   **Response:** `GenericResponse[LocationResponse]`

### 2.6 Delete Location
*   **Method:** `DELETE`
*   **Endpoint:** `/superadmin/locations/{location_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Location deleted successfully"
    }
    ```

### 2.7 Get Location Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/locations/{location_id}/dashboard`
*   **Response (`GenericResponse[LocationDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "Location dashboard retrieved successfully",
      "data": { "total_users": 50, "total_patients": 30, ... }
    }
    ```

### 2.8 Get All Admins
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/admins`
*   **Query Params:** `skip`, `limit`, `search`, `location_id`, `is_active`
*   **Response (`GenericResponse[List[UserResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Admins retrieved successfully",
      "data": [ { "id": "USR...", "role": "admin", ... } ]
    }
    ```

### 2.9 Create Admin
*   **Method:** `POST`
*   **Endpoint:** `/superadmin/admins`
*   **Request Body (`AdminCreate`):**
    ```json
    {
      "username": "admin_puskesmas_a",
      "email": "admin@puskesmasa.com",
      "password": "SecurePassword123!",
      "location_id": "LOC20240101000001",
      "full_name": "Admin Puskesmas A"
    }
    ```
*   **Response:** `GenericResponse[UserResponse]`

### 2.10 Reassign Admin Location
*   **Method:** `PUT`
*   **Endpoint:** `/superadmin/admins/{admin_id}/location`
*   **Query Params:** `location_id`
*   **Response:** `GenericResponse[UserResponse]`

### 2.11 Activate Admin
*   **Method:** `PATCH`
*   **Endpoint:** `/superadmin/admins/{admin_id}/activate`
*   **Response:** `GenericResponse[UserResponse]`

### 2.12 Deactivate Admin
*   **Method:** `PATCH`
*   **Endpoint:** `/superadmin/admins/{admin_id}/deactivate`
*   **Response:** `GenericResponse[UserResponse]`

### 2.13 Delete Admin
*   **Method:** `DELETE`
*   **Endpoint:** `/superadmin/admins/{admin_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Admin deleted successfully"
    }
    ```

### 2.14 Get All Users (READ-ONLY)
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/users`
*   **Query Params:** `skip`, `limit`, `search`, `role`, `location_id`, `is_active`
*   **Response (`GenericResponse[List[UserResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Users retrieved successfully",
      "data": [ { "id": "USR...", "role": "patient", ... } ]
    }
    ```
*   **Note:** SuperAdmin can only VIEW users. To modify users (activate/deactivate/delete), contact the location Admin.

### 2.15 Get SuperAdmin Dashboard
*   **Method:** `GET`
*   **Endpoint:** `/superadmin/dashboard`
*   **Response (`GenericResponse[SuperAdminDashboardResponse]`):**
    ```json
    {
      "status": "success",
      "message": "SuperAdmin dashboard retrieved successfully",
      "data": { "total_locations": 5, "total_admins": 10, ... }
    }
    ```

### Removed Endpoints (Phase 6 Cleanup)

The following endpoints were removed to enforce SuperAdmin READ-ONLY principle for operational data:

**User Management (Removed)**:
- ~~PATCH `/superadmin/users/{user_id}/activate`~~ - Use Admin role instead
- ~~PATCH `/superadmin/users/{user_id}/deactivate`~~ - Use Admin role instead
- ~~DELETE `/superadmin/users/{user_id}`~~ - Use Admin role instead

**Staff Multi-Location (Removed - Admin-only feature)**:
- ~~POST `/superadmin/staff/{user_id}/locations`~~
- ~~GET `/superadmin/staff/{user_id}/locations`~~
- ~~DELETE `/superadmin/staff/{user_id}/locations/{loc_id}`~~
- ~~PATCH `/superadmin/staff/{user_id}/locations/{loc_id}/primary`~~

**Patient-Doctor Assignment (Removed - Admin-only feature)**:
- ~~POST `/superadmin/patients/{patient_id}/doctors`~~

**Location Detail (Removed - Unused)**:
- ~~GET `/superadmin/locations/{location_id}`~~ - Use location list or dashboard instead

---

## 3. Admin Control (`/admin`)

### 3.1 Get Pending Approvals
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

### 3.2 Get Approval Logs
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

### 3.3 Update User Status
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

### 3.4 Create User (Admin Bypass)
*   **Method:** `POST`
*   **Endpoint:** `/admin/users`
*   **Request Body (`UserAdminCreate`):** Similar to UserCreate but includes profile and status fields.
*   **Response:** `GenericResponse[UserResponse]`

### 3.5 Get All Users
*   **Method:** `GET`
*   **Endpoint:** `/admin/users`
*   **Query Params:** `skip`, `limit`, `search`, `role`
*   **Response:** `GenericResponse[List[UserResponse]]`

### 3.6 Update User
*   **Method:** `PUT`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Response:** `GenericResponse[UserResponse]`

### 3.7 Delete User
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "User deleted successfully"
    }
    ```

### 3.8 Get Staff Locations
*   **Method:** `GET`
*   **Endpoint:** `/admin/staff/{staff_id}/locations`
*   **Response (`GenericResponse[List[StaffLocationResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Staff locations retrieved successfully",
      "data": [
        {
          "id": "UL...",
          "user_id": "USR...",
          "location_id": "LOC...",
          "is_primary": true,
          "location": { "id": "LOC...", "name": "Puskesmas A" }
        }
      ]
    }
    ```

### 3.9 Assign Staff to Location
*   **Method:** `POST`
*   **Endpoint:** `/admin/staff/{staff_id}/locations`
*   **Request Body (`StaffLocationAssign`):**
    ```json
    {
      "location_id": "LOC20240101000001",
      "is_primary": false
    }
    ```
*   **Response:** `GenericResponse[StaffLocationResponse]`

### 3.10 Remove Staff from Location
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/staff/{staff_id}/locations/{location_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Staff removed from location successfully"
    }
    ```
*   **Validation**: Cannot remove last location or primary location without setting new primary

### 3.11 Set Staff Primary Location
*   **Method:** `PATCH`
*   **Endpoint:** `/admin/staff/{staff_id}/locations/{location_id}/primary`
*   **Response:** `GenericResponse[StaffLocationResponse]`

### 3.12 Get Patient's Assigned Doctors
*   **Method:** `GET`
*   **Endpoint:** `/admin/patients/{patient_id}/doctors`
*   **Response (`GenericResponse[List[PatientDoctorResponse]]`):**
    ```json
    {
      "status": "success",
      "message": "Patient doctors retrieved successfully",
      "data": [
        {
          "id": "PD...",
          "patient_id": "USR...",
          "doctor_id": "USR...",
          "assigned_by": "USR...",
          "assigned_dt": "2024-01-01T12:00:00Z",
          "is_active": true,
          "doctor": { "id": "USR...", "full_name": "Dr. Smith" }
        }
      ]
    }
    ```

### 3.13 Assign Doctor to Patient
*   **Method:** `POST`
*   **Endpoint:** `/admin/patients/{patient_id}/doctors`
*   **Request Body (`PatientDoctorAssign`):**
    ```json
    {
      "doctor_id": "USR20240101000005",
      "location_id": "LOC20240101000001"
    }
    ```
*   **Response:** `GenericResponse[PatientDoctorResponse]`
*   **Behavior**: Deactivates old assignment (is_active = false) and creates new assignment (is_active = true)

### 3.14 Remove Doctor from Patient
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/patients/{patient_id}/doctors/{doctor_id}`
*   **Response (`MessageResponse`):**
    ```json
    {
      "status": "success",
      "message": "Doctor removed from patient successfully"
    }
    ```
*   **Behavior**: Soft delete (sets is_active = false) to preserve audit trail

---

## 4. History & Data (`/history`)

### 4.1 Get Calendar View
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

### 4.2 Get History Stats
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

### 4.3 Search Recording History
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

### 4.4 Get Recent History
*   **Method:** `GET`
*   **Endpoint:** `/history/recent`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 4.5 Get Recording Detail
*   **Method:** `GET`
*   **Endpoint:** `/history/{recording_id}`
*   **Response:** `GenericResponse[SessionResponse]`

### 4.6 Get Device History
*   **Method:** `GET`
*   **Endpoint:** `/history/device/{device_id}`
*   **Response:** `GenericResponse[List[SessionResponse]]`

### 4.7 Get User History
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
