import {
    fetchUserProfile,
    login,
    logout,
    register
} from './api/auth.api';

import {
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
} from './api/user.api';

import {
    fetchAdminPatients,
    fetchOperatorPatients,
    fetchPatientDoctors,
    createOperatorPatient,
    createPatientProfile,
    updateAdminWalkinPatient,
    updatePatientProfile,
    deleteAdminWalkinPatient,
    removePatientDoctor,
    assignPatientDoctor,
    convertAdminWalkinPatient,
    lockPatient,
    unlockPatient
} from './api/patient.api';

import {
    createDoctorProfile,
    updateDoctorProfile
} from './api/doctor.api';

import {
    fetchOperatorDashboard,
    createOperatorProfile,
    updateOperatorProfile
} from './api/operator.api';

import {
    fetchPublicLocations,
    fetchLocations,
    fetchStaffLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    removeStaffLocation,
    activateLocation,
    assignStaffLocation,
    deactivateLocation,
    setStaffPrimaryLocation
} from './api/location.api';

import {
    fetchAdminDashboard,
    fetchAdmins,
    fetchApprovalLogs,
    fetchPendingApprovals,
    createSuperAdminUser,
    updateUserStatus,
    deleteAdmin,
    activateAdmin,
    deactivateAdmin,
    reassignAdminLocation,
    fetchPendingAdditionalLocationRequests,
    approveAdditionalLocationRequest,
    rejectAdditionalLocationRequest,
    resignStaff,
    checkStaffDuplicate,
    getExpiringCredentials,
    sendCredentialNotifications
} from './api/admin.api';

import {
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers,
    fetchSuperAdminLocations
} from './api/superadmin.api';

import {
    fetchCalendar,
    fetchHistory,
    fetchRecentHistory,
    fetchStats,
    downloadRecording
} from './api/history.api';

import {
    fetchPatientDashboard
} from './api/dashboard.api';

import {
    fetchDetailedHealth
} from './api/health.api';

export {
    fetchUserProfile,
    login,
    logout,
    register,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    fetchAdminPatients,
    fetchOperatorPatients,
    fetchPatientDoctors,
    createOperatorPatient,
    createPatientProfile,
    updateAdminWalkinPatient,
    updatePatientProfile,
    deleteAdminWalkinPatient,
    removePatientDoctor,
    assignPatientDoctor,
    convertAdminWalkinPatient,
    lockPatient,
    unlockPatient,
    createDoctorProfile,
    updateDoctorProfile,
    fetchOperatorDashboard,
    createOperatorProfile,
    updateOperatorProfile,
    fetchPublicLocations,
    fetchLocations,
    fetchStaffLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    removeStaffLocation,
    activateLocation,
    assignStaffLocation,
    deactivateLocation,
    setStaffPrimaryLocation,
    fetchAdminDashboard,
    fetchAdmins,
    fetchApprovalLogs,
    fetchPendingApprovals,
    createSuperAdminUser,
    updateUserStatus,
    deleteAdmin,
    activateAdmin,
    deactivateAdmin,
    reassignAdminLocation,
    fetchPendingAdditionalLocationRequests,
    approveAdditionalLocationRequest,
    rejectAdditionalLocationRequest,
    resignStaff,
    checkStaffDuplicate,
    getExpiringCredentials,
    sendCredentialNotifications,
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers,
    fetchSuperAdminLocations,
    fetchCalendar,
    fetchHistory,
    fetchRecentHistory,
    fetchStats,
    downloadRecording,
    fetchPatientDashboard,
    fetchDetailedHealth
};

export const api = {
    fetchUserProfile,
    login,
    logout,
    register,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    fetchAdminPatients,
    fetchOperatorPatients,
    fetchPatientDoctors,
    createOperatorPatient,
    createPatientProfile,
    updateAdminWalkinPatient,
    updatePatientProfile,
    deleteAdminWalkinPatient,
    removePatientDoctor,
    assignPatientDoctor,
    convertAdminWalkinPatient,
    lockPatient,
    unlockPatient,
    createDoctorProfile,
    updateDoctorProfile,
    fetchOperatorDashboard,
    createOperatorProfile,
    updateOperatorProfile,
    fetchPublicLocations,
    fetchLocations,
    fetchStaffLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    removeStaffLocation,
    activateLocation,
    assignStaffLocation,
    deactivateLocation,
    setStaffPrimaryLocation,
    fetchAdminDashboard,
    fetchAdmins,
    fetchApprovalLogs,
    fetchPendingApprovals,
    createSuperAdminUser,
    updateUserStatus,
    deleteAdmin,
    activateAdmin,
    deactivateAdmin,
    reassignAdminLocation,
    fetchPendingAdditionalLocationRequests,
    approveAdditionalLocationRequest,
    rejectAdditionalLocationRequest,
    resignStaff,
    checkStaffDuplicate,
    getExpiringCredentials,
    sendCredentialNotifications,
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers,
    fetchSuperAdminLocations,
    fetchCalendar,
    fetchHistory,
    fetchRecentHistory,
    fetchStats,
    downloadRecording,
    fetchPatientDashboard,
    fetchDetailedHealth
};
