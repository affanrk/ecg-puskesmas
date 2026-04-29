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
    convertAdminWalkinPatient
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
    reassignAdminLocation
} from './api/admin.api';

import {
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers
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
    createDoctorProfile,
    updateDoctorProfile,
    fetchOperatorDashboard,
    createOperatorProfile,
    updateOperatorProfile,
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
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers,
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
    createDoctorProfile,
    updateDoctorProfile,
    fetchOperatorDashboard,
    createOperatorProfile,
    updateOperatorProfile,
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
    fetchSuperAdminDashboard,
    fetchSuperAdminLocationDashboard,
    fetchSuperAdminUsers,
    fetchCalendar,
    fetchHistory,
    fetchRecentHistory,
    fetchStats,
    downloadRecording,
    fetchPatientDashboard,
    fetchDetailedHealth
};
