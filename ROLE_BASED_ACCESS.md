# Role-Based Access Control (RBAC)

This document outlines the Role-Based Access Control (RBAC) logic implemented in the backend architecture. The ECG Platform employs a hybrid RBAC system leveraging both explicit roles (SuperAdmin, Admin) and boolean flags (is_patient, is_operator, is_doctor) to support multi-persona capabilities.

---

## 1. Feature Access by Role (What Each Role Can Do)

### 1.1 SuperAdmin (`role == 'superadmin'`)
The highest level of system-wide access.
- **Data Governance**: Can permanently anonymize user and patient data (GDPR compliance) via the `/api/v1/superadmin/anonymize` endpoints.
- **Global Transfers**: Can review, approve, or reject requests for medical staff to operate across multiple clinics (locations).
- **Master Data Management**: Can manage the master list of `Locations`.
- **Auditing**: Can view all security audit logs globally.

### 1.2 Admin (`role == 'admin'`)
Scoped strictly to their assigned clinic (`location_id`). Cannot view or manage users outside their clinic.
- **User Approval**: Can view the pending queue of new patients, operators, and doctors who registered at their clinic, and can approve or reject their access.
- **Staff Management**: Can assign existing verified staff (operators/doctors) to their clinic.
- **Walk-in Conversion**: Can convert a walk-in patient (created by an operator) into a fully registered user account.
- **Override Access**: Automatically bypasses clinical role checks, allowing them to use Patient, Operator, and Doctor endpoints for administrative oversight (within their location scope).
- **Restrictions**: Cannot assign themselves as medical staff, and cannot modify their own admin profile or location.

### 1.3 Operator (`is_operator == True`)
Medical staff responsible for executing ECG tests.
- **Patient Management**: Can create unregistered "Walk-in Patients" directly from the dashboard. Can search and list both walk-in and registered patients.
- **ECG Recording**: Can lock an ECG device, start a live stream, and trigger recording sessions for any patient.
- **Self-Recording**: Can trigger a self-recording session using the mobile app or web app.
- **Data Access**: Has unrestricted read access to patient sessions within the system to review past recordings and export data (CSV/PNG).

### 1.4 Doctor (`is_doctor == True`)
Heart specialists responsible for diagnosing and reviewing ECGs.
- **Patient Assignment**: Can assign patients to their own care roster.
- **Clinical Review**: Unrestricted read access to view any patient's historical ECG recordings, calendar heatmaps, and classification stats.
- **Exporting**: Can export raw and feature data for further analysis.

### 1.5 Patient (`is_patient == True`)
The end-user whose heart is being monitored.
- **Strict Data Isolation**: Can *only* access their own personal recording sessions, history, and AI classification results.
- **Self-Recording**: Can trigger a self-recording session if they own a personal device.
- **Restrictions**: Any attempt to access an endpoint with another user's `user_id` or `recording_id` results in a `403 Forbidden`.

### 1.6 Unassigned User
A newly registered user with `role = 'user'` and all boolean flags set to `False`. 
- **Onboarding Only**: They can only access the onboarding endpoints to select a role and fill out their profile. They remain in the "Pending" state until an Admin approves them.

---

## 2. Access Enforcement (FastAPI Dependencies)

The backend enforces RBAC using a series of composable FastAPI dependencies located in `backend/core/dependencies/injection.py`.

### Core Authentication
- **`get_current_user`**: Validates the JWT, ensures the session is valid in the `TB_R_SESSION_REGISTRY` (Last Login Wins), and checks that the user is not soft-deleted (`is_active == True`).
- **`get_current_active_user`**: An alias for additional safety checks on user activity.

### Role Authorization
- **`get_superadmin_user`**: Requires `role == 'superadmin'`.
- **`get_admin_user`**: Requires `role == 'admin'`.
- **`get_patient_user`**: Requires `is_patient == True` OR `role == 'admin'`.
- **`get_operator_user`**: Requires `is_operator == True` OR `role == 'admin'`.
- **`get_doctor_user`**: Requires `is_doctor == True` OR `role == 'admin'`.
- **`get_unassigned_user`**: Ensures the user has no assigned clinical flags (unless they are an admin).

### Profile Activation Authorization
Even if a user has a role flag (e.g., `is_patient`), they must be approved by an Admin before they can access live features.
- **`get_activated_user`**: Checks `is_activated == 1`.
- **`get_activated_patient_user`**: Combines `get_patient_user` and `is_activated == 1`.
- **`get_activated_operator_user`**: Combines `get_operator_user` and `is_activated == 1`.

---

## 3. Data Ownership & Scope Limitations

Beyond simple route blocking, dependencies dynamically restrict data payloads.

- **`enforce_data_access(user_id, current_user)`**: 
  - If the user is an Admin, Operator, or Doctor, the requested `user_id` is passed through seamlessly (unrestricted).
  - If the user is a Patient (or Unassigned), the system strictly overrides/checks that the requested `user_id` matches their own `current_user.id`. Any attempt to access another user's ID yields a `403 Forbidden`.
  
- **`verify_session_access(session_user_id, current_user)`**: 
  - Applies the same logic as above but specifically for ECG Recording Sessions, ensuring patients cannot view other patients' recordings.

---

## 4. Admin Security Guardrails

Admins have significant power, so explicit guardrails are hardcoded into dependencies:

1. **`verify_location_authorization`**: Ensures the `target_location_id` of the operation matches the Admin's assigned location. Triggers a `CROSS_LOCATION_ACCESS_ATTEMPT` audit log if violated.
2. **`prevent_self_assignment`**: Prevents an Admin from converting their own account into a Doctor or Operator. Logs a `SELF_ASSIGNMENT_ATTEMPT`.
3. **`prevent_self_modification`**: Prevents an Admin from modifying their own Admin profile or location. Logs a `SELF_MODIFICATION_ATTEMPT`.

## 5. Audit Logging

All RBAC violations, cross-location attempts, and role modifications are captured by the `AuditLoggingService` and recorded in the `TB_R_AUDIT_LOG` table with the actor's ID, role, IP address, and user agent.
