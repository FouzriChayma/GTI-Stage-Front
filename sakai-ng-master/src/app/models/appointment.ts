import { User } from './User';
import { Document } from './document';

export interface Appointment {
  idAppointment?: number;
  user: User;
  appointmentDateTime: Date;
  durationMinutes: number;
  status: string;
  notes?: string;
  isNotified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}