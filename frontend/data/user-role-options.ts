import { SelectOptions } from './types';

export const userRoleOptions: SelectOptions = [
  { value: 'user', label: 'User (Standard Account)' },
  { value: 'patient', label: 'Patient ' },
  { value: 'operator', label: 'Operator (Nurse / General Doctor)' },
  { value: 'doctor', label: 'Doctor (Doctor Specialist)' }
];
