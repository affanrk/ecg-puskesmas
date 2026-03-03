# ECG Live Platform - API Documentation

This document provides a comprehensive guide to all REST API endpoints available in the ECG Live Platform.

## Base URL
`http://<server-ip>:<port>/api/v1`

## Authentication
Unless specified otherwise, endpoints require a Bearer Token in the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`

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
*   **Response:** `UserResponse` (See Common Response Models section at the bottom)

### 1.2 Login
Authenticates a user and returns a JWT token. Enforces Single Session (Last Login Wins).
*   **Method:** `POST`
*   **Endpoint:** `/auth/login`
*   **Request Body (`UserLogin`):**
    ```json
    {
      "username_or_email": "johndoe",
      "password": "SecretPassword123!",
      "source": "WEB"
    }
    ```
*   **Response (`Token`):**
    ```json
    {
      "access_token": "eyJhbGci...",
      "token_type": "bearer",
      "role": "user",
      "user_id": "USR20240101000001",
      "user_name": "johndoe",
      "full_name": "John Doe",
      "is_patient": false,
      "is_operator": false,
      "is_doctor": false
    }
    ```

### 1.3 Logout
Invalidates the current session ID in the database.
*   **Method:** `POST`
*   **Endpoint:** `/auth/logout`
*   **Response:** `{"message": "Logged out successfully"}`

### 1.4 Get Current User Profile
*   **Method:** `GET`
*   **Endpoint:** `/auth/me`
*   **Response:** `UserResponse`

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
*   **Response:** `UserResponse`

### 1.6 Create Operator Profile
Converts a basic user into an Operator (Nurse/GP). Profile goes into `QUEUE` status.
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
*   **Response:** `UserResponse`

### 1.7 Create Doctor Profile
Converts a basic user into a Specialist Doctor. Profile goes into `QUEUE` status.
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
*   **Response:** `UserResponse`

### 1.8 Update Patient Profile
*   **Method:** `PUT`
*   **Endpoint:** `/auth/profile/patient`
*   **Request Body:** Same as Create Patient Profile, but all fields are optional.
*   **Response:** `UserResponse`

### 1.9 Update Operator Profile
*   **Method:** `PUT`
*   **Endpoint:** `/auth/profile/operator`
*   **Request Body:** Same as Create Operator Profile, but all fields are optional.
*   **Response:** `UserResponse`

### 1.10 Update Doctor Profile
*   **Method:** `PUT`
*   **Endpoint:** `/auth/profile/doctor`
*   **Request Body:** Same as Create Doctor Profile, but all fields are optional.
*   **Response:** `UserResponse`

### 1.11 Change Username
*   **Method:** `PUT`
*   **Endpoint:** `/auth/change-username`
*   **Request Body:**
    ```json
    { "new_username": "newjohndoe" }
    ```
*   **Response:** `UserResponse`

### 1.12 Change Password
*   **Method:** `PUT`
*   **Endpoint:** `/auth/change-password`
*   **Request Body:**
    ```json
    { 
      "current_password": "OldPassword1!", 
      "new_password": "NewPassword2@" 
    }
    ```
*   **Response:** `{"message": "Password updated successfully"}`

---

## 2. Admin Control (`/admin`)

*Note: All endpoints in this section require an Admin role.*

### 2.1 Get Pending Approvals
*   **Method:** `GET`
*   **Endpoint:** `/admin/pending-approvals`
*   **Query Params:** 
    *   `skip` (int, default=0)
    *   `limit` (int, default=100)
    *   `search` (str)
    *   `start_date` (str, YYYY-MM-DD)
    *   `end_date` (str, YYYY-MM-DD)
    *   `is_patient` (bool)
    *   `is_operator` (bool)
    *   `is_doctor` (bool)
*   **Response:** `[UserResponse, ...]`

### 2.2 Get Approval Logs
*   **Method:** `GET`
*   **Endpoint:** `/admin/approval-logs`
*   **Query Params:** Same as 2.1
*   **Response:**
    ```json
    [
      {
        "id": "uuid...",
        "user_id": "USR...",
        "username": "dr_smith",
        "full_name": "Dr. Smith",
        "is_patient": false,
        "is_operator": false,
        "is_doctor": true,
        "status": "APPROVED",
        "reason": "Verified STR and SIP",
        "created_dt": "2024-01-01T10:00:00Z",
        "created_by": "ADMIN"
      }
    ]
    ```

### 2.3 Update User Status
*   **Method:** `POST`
*   **Endpoint:** `/admin/update-status/{user_id}`
*   **Path Variable:** `user_id` (str)
*   **Request Body:**
    ```json
    {
      "action": "APPROVE", 
      "reason": "Documents verified"
    }
    ```
    *Valid Actions: `APPROVE`, `REJECT`, `DEACTIVATE`, `ACTIVATE`*
*   **Response:** `UserResponse`

### 2.4 Create User (Admin Bypass)
*   **Method:** `POST`
*   **Endpoint:** `/admin/users`
*   **Request Body (`UserAdminCreate`):**
    ```json
    {
      "email": "new@example.com",
      "username": "newuser",
      "password": "Password123!",
      "role": "patient",
      "account_status": "ACTIVE",
      "activation_status": "APPROVE",
      "patient_profile": {
        "full_name": "New Patient",
        "nik": "3201234567890009",
        "pob": "Jakarta",
        "dob": "1990-01-01",
        "gender": "Laki-laki"
      }
    }
    ```
*   **Response:** `UserResponse`

### 2.5 Get All Users
*   **Method:** `GET`
*   **Endpoint:** `/admin/users`
*   **Query Params:** `skip` (int), `limit` (int), `search` (str), `role` (str)
*   **Response:** `[UserResponse, ...]`

### 2.6 Update User
*   **Method:** `PUT`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Path Variable:** `user_id` (str)
*   **Request Body:** Similar to `UserAdminCreate` but all fields optional.
*   **Response:** `UserResponse`

### 2.7 Delete User
*   **Method:** `DELETE`
*   **Endpoint:** `/admin/users/{user_id}`
*   **Path Variable:** `user_id` (str)
*   **Response:** `{"message": "User deleted successfully"}`

---

## 3. History & Data (`/history`)

### 3.1 Get Calendar View
Retrieves hierarchical data to build interactive calendar heatmaps (drilling down from Year -> Month -> Day -> Hour -> Minute). 
*   **Method:** `GET`
*   **Endpoint:** `/history/calendar`
*   **Query Params:** 
    *   `user_id` (str, optional)
    *   `year` (int, optional)
    *   `month` (int, optional)
    *   `day` (int, optional)
    *   `hour` (int, optional)
    *   `minute` (int, optional)
*   **How it works:** If you only provide `year=2024`, the API returns the 12 months inside that year. If you provide `year=2024` and `month=1`, it returns the days in January, and so on.
*   **Response:**
    ```json
    {
      "level": "month",
      "nodes": [
        {
          "label": "January",
          "value": 1,
          "level": "month",
          "status": "has_data",
          "count": 15,
          "classifications": {
            "Normal": 10,
            "Abnormal": 5
          }
        },
        {
          "label": "February",
          "value": 2,
          "level": "month",
          "status": "empty",
          "count": 0,
          "classifications": {}
        }
      ]
    }
    ```

### 3.2 Get History Stats
*   **Method:** `GET`
*   **Endpoint:** `/history/stats`
*   **Query Params:** `user_id` (str)
*   **Response:**
    ```json
    {
      "total_sessions": 10,
      "classification_counts": [
        {"classification": "Normal", "count": 8},
        {"classification": "Abnormal", "count": 2}
      ]
    }
    ```

### 3.3 Search Recording History
*   **Method:** `GET`
*   **Endpoint:** `/history`
*   **Query Params:** 
    *   `device_id` (str)
    *   `user_id` (str)
    *   `search` (str)
    *   `classification` (str)
    *   `start_date` (str)
    *   `end_date` (str)
    *   `limit` (int, default=200)
*   **Response:** `[SessionResponse, ...]` (See Common Response Models)

### 3.4 Get Recent History
*   **Method:** `GET`
*   **Endpoint:** `/history/recent`
*   **Query Params:** 
    *   `user_id` (str, Required)
    *   `limit` (int, default=10, max=20)
*   **Response:** `[SessionResponse, ...]`

### 3.5 Get Recording Detail
*   **Method:** `GET`
*   **Endpoint:** `/history/{recording_id}`
*   **Path Variable:** `recording_id` (str)
*   **Response:** `SessionResponse`

### 3.6 Get Device History
*   **Method:** `GET`
*   **Endpoint:** `/history/device/{device_id}`
*   **Path Variable:** `device_id` (str)
*   **Query Params:** `limit` (int, default=100)
*   **Response:** `[SessionResponse, ...]`

### 3.7 Get User History
*   **Method:** `GET`
*   **Endpoint:** `/history/user/{user_id}`
*   **Path Variable:** `user_id` (str)
*   **Query Params:** `limit` (int, default=100)
*   **Response:** `[SessionResponse, ...]`

---

## 4. Export (`/export`)

All export endpoints return a downloadable file stream (`StreamingResponse`).

### 4.1 Export Raw CSV
*   **Method:** `GET`
*   **Endpoint:** `/export/raw/{recording_id}`
*   **Path Variable:** `recording_id` (str)
*   **Response:** `text/csv` stream download. File: `ecg_raw_{id}.csv`

### 4.2 Export Features CSV
*   **Method:** `GET`
*   **Endpoint:** `/export/features/{recording_id}`
*   **Path Variable:** `recording_id` (str)
*   **Response:** `text/csv` stream download containing AI metrics. File: `ecg_features_{id}.csv`

### 4.3 Export ECG Plot
*   **Method:** `GET`
*   **Endpoint:** `/export/plot/{recording_id}`
*   **Path Variable:** `recording_id` (str)
*   **Response:** `image/png` stream download. File: `ecg_chart_{id}.png`

### 4.4 Export Complete Package
*   **Method:** `GET`
*   **Endpoint:** `/export/complete/{recording_id}`
*   **Path Variable:** `recording_id` (str)
*   **Response:** Status 501 (Not Implemented).

### 4.5 Export Batch
*   **Method:** `GET`
*   **Endpoint:** `/export/batch`
*   **Query Params:** `recording_ids` (str, comma-separated), `format` (str)
*   **Response:** Status 501 (Not Implemented).

---

## 5. Health & Monitoring (`/health`)

### 5.1 Basic Health Check
*   **Method:** `GET`
*   **Endpoint:** `/health`
*   **Response:** `{"status": "healthy", "timestamp": 1700000000.0}`

### 5.2 Detailed Health Check (Admin)
*   **Method:** `GET`
*   **Endpoint:** `/health/detailed`
*   **Response:**
    ```json
    {
      "status": "healthy",
      "timestamp": 1700000000.0,
      "components": {
        "database": {"status": "healthy", "latency_ms": 2.5},
        "mqtt": {"status": "connected"},
        "ml_model": {"status": "loaded"},
        "devices": {"active": 5, "recording": 1}
      },
      "buffers": {
        "recording_buffer": 1500,
        "performance_buffer": 20
      },
      "performance": {
        "avg_latency_ms": 45.2,
        "avg_jitter_ms": 5.1,
        "avg_packet_loss_pct": 0.02,
        "active_devices": 5
      }
    }
    ```

### 5.3 Device Monitoring
*   **Method:** `GET`
*   **Endpoint:** `/health/monitoring/devices`
*   **Response:**
    ```json
    {
      "devices": [
        {
          "device_id": "ECG001",
          "is_connected": true,
          "is_recording": false,
          "status_message": "Idle",
          "packet_format": "JSON",
          "performance": {
             "avg_latency_ms": 12.5,
             "jitter_ms": 2.1,
             "packet_loss_pct": 0.0,
             "total_packets": 1000,
             "lost_packets": 0
          }
        }
      ],
      "total_devices": 1
    }
    ```

### 5.4 Performance Monitoring (Admin)
*   **Method:** `GET`
*   **Endpoint:** `/health/monitoring/performance`
*   **Query Params:** `hours` (int, default=24)
*   **Response:**
    ```json
    {
      "time_window_hours": 24,
      "system_summary": {
        "avg_latency_ms": 45.2,
        "avg_jitter_ms": 5.1,
        "avg_packet_loss_pct": 0.02,
        "active_devices": 5
      },
      "worst_performers": {
        "by_latency": [
          {"device_id": "ECG002", "avg_latency_ms": 150.0}
        ],
        "by_packet_loss": [
          {"device_id": "ECG003", "avg_packet_loss_pct": 5.5}
        ]
      }
    }
    ```

### 5.5 ML Monitoring
*   **Method:** `GET`
*   **Endpoint:** `/health/monitoring/ml`
*   **Response:**
    ```json
    {
      "model_info": {
        "is_loaded": true,
        "model_type": "h5",
        "scaler_type": "pkl",
        "executor_workers": 4
      },
      "status": "operational"
    }
    ```

### 5.6 Cleanup Old Logs (Admin)
*   **Method:** `POST`
*   **Endpoint:** `/health/admin/cleanup/old-logs`
*   **Query Params:** `days` (int, default=30)
*   **Response:** `{"deleted_count": 500, "cutoff_days": 30}`

---

## Common Response Models

### `UserResponse`
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "id": "USR20240101000001",
  "is_active": true,
  "role": "user",
  "is_patient": true,
  "is_operator": false,
  "is_doctor": false,
  "is_activated": 1,
  "status": "APPROVED",
  "rejection_reason": null,
  "created_dt": "2024-01-01T10:00:00Z",
  "changed_dt": null,
  
  "patient_profile": {
    "full_name": "John Doe",
    "nik": "3201234567890001",
    "pob": "Jakarta",
    "dob": "1990-01-01",
    "gender": "Laki-laki",
    "medical_history": "Hypertension",
    "address": "Jl. Merdeka",
    "contact_number": "081234567890",
    "id": "PAT...",
    "user_id": "USR..."
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
  "changed_dt": "2024-01-09T10:31:05Z",
  "classification": "Normal",
  "confidence": 0.95,
  "bpm": 72.5,
  "avg_rr_ms": 828.0,
  "avg_pr_ms": 160.0,
  "avg_qs_ms": 80.0,
  "avg_qtc_ms": 420.0,
  "avg_st_ms": 120.0,
  "rs_ratio_v1": 0.5
}
```
